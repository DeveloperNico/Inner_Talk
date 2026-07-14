import logging
import re

import requests
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils.crypto import get_random_string
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenRefreshView

from .models import Message, UserProfile
from .services import crisis_message, detect_crisis, generate_response

logger = logging.getLogger(__name__)
User = get_user_model()

FAREWELL_WORDS = [
    'tchau',
    'adeus',
    'ate mais',
    'ate',
    'ate logo',
    'ate breve',
    'ate mais tarde',
    'obrigado',
    'obrigada',
    'valeu',
]

CRP_DIGITS_PATTERN = re.compile(r'^\d{8}$')


def is_farewell(text: str) -> bool:
    text = text.lower().strip()
    return any(word in text for word in FAREWELL_WORDS)


def normalize_email(email: str) -> str:
    return (email or '').strip().lower()


def normalize_crp(crp: str) -> str:
    return re.sub(r'\D', '', crp or '')


def format_crp(crp_digits: str) -> str:
    return f'{crp_digits[:2]}/{crp_digits[2:]}' if len(crp_digits) == 8 else crp_digits


def serialize_user(user):
    profile = getattr(user, 'profile', None)
    return {
        'id': user.id,
        'email': user.email,
        'name': user.get_full_name() or user.username,
        'role': profile.role if profile else UserProfile.ROLE_PATIENT,
        'authProvider': profile.auth_provider if profile else UserProfile.PROVIDER_EMAIL,
        'crp': profile.crp if profile else None,
    }


def build_auth_response(user):
    refresh = TokenObtainPairSerializer.get_token(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': serialize_user(user),
    }


def upsert_profile(user, role, provider, crp=None, google_sub=None):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = role
    profile.auth_provider = provider
    profile.crp = crp or profile.crp
    profile.google_sub = google_sub or profile.google_sub
    profile.save()
    return profile


def verify_google_token(id_token):
    response = requests.get(
        'https://oauth2.googleapis.com/tokeninfo',
        params={'id_token': id_token},
        timeout=10,
    )
    if response.status_code != 200:
        raise ValueError('Nao foi possivel validar o token do Google.')

    payload = response.json()
    expected_audience = settings.GOOGLE_OAUTH_CLIENT_ID

    if expected_audience and payload.get('aud') != expected_audience:
        raise ValueError('O token do Google nao pertence a este aplicativo.')

    if payload.get('email_verified') != 'true':
        raise ValueError('A conta do Google precisa ter e-mail verificado.')

    email = normalize_email(payload.get('email'))
    google_sub = payload.get('sub')
    if not email or not google_sub:
        raise ValueError('O token do Google nao retornou os dados obrigatorios do usuario.')

    return {
        'email': email,
        'name': (payload.get('name') or '').strip(),
        'google_sub': google_sub,
    }


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        role = request.data.get('role') or UserProfile.ROLE_PATIENT
        name = (request.data.get('name') or '').strip()
        password = request.data.get('password') or ''
        confirm_password = request.data.get('confirmPassword') or ''

        if role not in {choice for choice, _ in UserProfile.ROLE_CHOICES}:
            return Response({'error': 'Perfil invalido.'}, status=400)

        if password != confirm_password:
            return Response({'error': 'As senhas nao coincidem.'}, status=400)

        if role == UserProfile.ROLE_PSYCHOLOGIST:
            crp_digits = normalize_crp(request.data.get('crp'))
            if not CRP_DIGITS_PATTERN.match(crp_digits):
                return Response({'error': 'CRP invalido. Use apenas 8 numeros.'}, status=400)

            identifier = format_crp(crp_digits)
            if UserProfile.objects.filter(crp=identifier).exists():
                return Response({'error': 'Ja existe um psicologo com este CRP.'}, status=400)

            if User.objects.filter(username__iexact=identifier).exists():
                return Response({'error': 'Ja existe uma conta com este CRP.'}, status=400)

            try:
                validate_password(password)
            except ValidationError as exc:
                return Response({'error': 'Senha invalida.', 'details': exc.messages}, status=400)

            with transaction.atomic():
                user = User.objects.create_user(
                    username=identifier,
                    email='',
                    password=password,
                    first_name=name,
                )
                upsert_profile(user, role, UserProfile.PROVIDER_EMAIL, crp=identifier)

            return Response(build_auth_response(user), status=201)

        email = normalize_email(request.data.get('email'))
        if not email:
            return Response({'error': 'E-mail obrigatorio.'}, status=400)

        if User.objects.filter(email__iexact=email).exists():
            return Response({'error': 'Ja existe uma conta com este e-mail.'}, status=400)

        try:
            validate_password(password)
        except ValidationError as exc:
            return Response({'error': 'Senha invalida.', 'details': exc.messages}, status=400)

        with transaction.atomic():
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=name,
            )
            upsert_profile(user, role, UserProfile.PROVIDER_EMAIL)

        return Response(build_auth_response(user), status=201)


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        role = request.data.get('role') or UserProfile.ROLE_PATIENT
        password = request.data.get('password') or ''

        if role == UserProfile.ROLE_PSYCHOLOGIST:
            crp_digits = normalize_crp(request.data.get('crp'))
            if not CRP_DIGITS_PATTERN.match(crp_digits):
                return Response({'error': 'CRP invalido. Use apenas 8 numeros.'}, status=400)

            identifier = format_crp(crp_digits)
            user = User.objects.filter(username__iexact=identifier).first()
            if not user:
                return Response({'error': 'Credenciais invalidas.'}, status=401)

            authenticated_user = authenticate(request, username=user.username, password=password)
            if not authenticated_user:
                return Response({'error': 'Credenciais invalidas.'}, status=401)

            return Response(build_auth_response(authenticated_user))

        email = normalize_email(request.data.get('email'))
        if not email or not password:
            return Response({'error': 'E-mail e senha sao obrigatorios.'}, status=400)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'error': 'Credenciais invalidas.'}, status=401)

        authenticated_user = authenticate(request, username=user.username, password=password)
        if not authenticated_user:
            return Response({'error': 'Credenciais invalidas.'}, status=401)

        return Response(build_auth_response(authenticated_user))


class GoogleAuthView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        role = request.data.get('role') or UserProfile.ROLE_PATIENT
        if role != UserProfile.ROLE_PATIENT:
            return Response({'error': 'Login com Google disponivel apenas para paciente.'}, status=400)

        credential = request.data.get('credential')
        if not credential:
            return Response({'error': 'Token do Google obrigatorio.'}, status=400)

        try:
            google_user = verify_google_token(credential)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=400)
        except requests.RequestException:
            logger.exception('Falha de rede ao validar token Google.')
            return Response({'error': 'Falha ao validar login Google.'}, status=502)

        email = google_user['email']

        with transaction.atomic():
            profile = UserProfile.objects.select_related('user').filter(google_sub=google_user['google_sub']).first()
            if profile:
                user = profile.user
            else:
                user = User.objects.filter(email__iexact=email).first()
                if not user:
                    user = User.objects.create_user(
                        username=email,
                        email=email,
                        first_name=google_user['name'],
                        password=get_random_string(32),
                    )

            if google_user['name'] and not user.get_full_name():
                user.first_name = google_user['name']
                user.save(update_fields=['first_name'])

            upsert_profile(user, role, UserProfile.PROVIDER_GOOGLE, google_sub=google_user['google_sub'])

        return Response(build_auth_response(user))


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'user': serialize_user(request.user)})


class SendMessageView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        user_text = request.data.get('message')

        if not user_text:
            return Response({'error': 'Mensagem vazia'}, status=400)

        try:
            Message.objects.create(role='user', content=user_text)

            if detect_crisis(user_text):
                bot_reply = crisis_message()
            else:
                history = Message.objects.all().order_by('created_at')
                bot_reply = generate_response(history)

            is_first_bot_message = not Message.objects.filter(role='bot').exists()
            if is_first_bot_message or is_farewell(user_text):
                bot_reply += '\n\nLembre-se de que estou aqui para ajudar, mas nao substituo a ajuda profissional.'

            Message.objects.create(role='bot', content=bot_reply)
            return Response({'reply': bot_reply})

        except Exception:
            logger.exception('Falha ao processar mensagem no endpoint /api/chat/')
            return Response(
                {
                    'error': 'Falha interna ao gerar resposta.',
                    'detail': 'Verifique os logs do backend para mais detalhes.',
                },
                status=500,
            )


class AuthTokenRefreshView(TokenRefreshView):
    authentication_classes = []
    permission_classes = [AllowAny]