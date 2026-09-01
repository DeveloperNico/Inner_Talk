import logging
import re
from datetime import timedelta

import requests
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Avg
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.crypto import get_random_string
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenRefreshView

from .models import CheckIn, DiaryEntry, Message, UserProfile
from .services import crisis_message, detect_crisis, generate_daily_diary_suggestion_result, generate_response, generate_weekly_summary_result

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
        'psychologistId': profile.psychologist_id if profile else None,
        'nextSession': profile.next_session_at.isoformat() if profile and profile.next_session_at else None,
    }


def get_or_create_profile_for_role(user, role, provider=UserProfile.PROVIDER_EMAIL):
    profile = getattr(user, 'profile', None)
    if profile:
        return profile

    if role != UserProfile.ROLE_PATIENT:
        return None

    profile, _ = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            'role': role,
            'auth_provider': provider,
        },
    )
    return profile


def build_auth_response(user, role_hint=None):
    if role_hint:
        get_or_create_profile_for_role(user, role_hint)

    refresh = TokenObtainPairSerializer.get_token(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': serialize_user(user),
    }


def upsert_profile(user, role, provider, crp=None, google_sub=None, psychologist=None):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = role
    profile.auth_provider = provider
    profile.crp = crp or profile.crp
    profile.google_sub = google_sub or profile.google_sub
    if role == UserProfile.ROLE_PATIENT:
        profile.psychologist = psychologist
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


def get_optional_psychologist(crp_value):
    normalized = normalize_crp(crp_value)
    if not normalized:
        return None

    if not CRP_DIGITS_PATTERN.match(normalized):
        raise ValueError('CRP invalido. Use apenas 8 numeros.')

    psychologist_profile = UserProfile.objects.select_related('user').filter(
        role=UserProfile.ROLE_PSYCHOLOGIST,
        crp=format_crp(normalized),
    ).first()
    if not psychologist_profile:
        raise ValueError('Psicologo informado nao encontrado.')

    return psychologist_profile.user


def ensure_role(user, expected_role):
    profile = getattr(user, 'profile', None)
    if not profile and expected_role == UserProfile.ROLE_PATIENT:
        profile = get_or_create_profile_for_role(user, expected_role)

    if not profile or profile.role != expected_role:
        return Response({'error': 'Voce nao tem permissao para acessar este recurso.'}, status=403)
    return None


def serialize_psychologist_user(user):
    profile = getattr(user, 'profile', None)
    return {
        'id': user.id,
        'name': user.get_full_name() or user.username,
        'crp': profile.crp if profile else None,
        'patientsCount': user.assigned_patients.count(),
    }


def serialize_checkin(entry):
    return {
        'id': entry.id,
        'mood': entry.mood,
        'emotions': entry.emotions or [],
        'factors': entry.factors or [],
        'note': entry.note,
        'date': entry.date.isoformat(),
    }


def serialize_diary_entry(entry):
    return {
        'id': entry.id,
        'title': entry.title,
        'sentimento': entry.sentimento,
        'content': entry.content,
        'date': entry.created_at.isoformat(),
    }


def build_week_dates():
    today = timezone.localdate()
    return [today - timedelta(days=offset) for offset in range(6, -1, -1)]


def build_weekly_moods(checkins_by_date):
    return [checkins_by_date.get(date.isoformat()) for date in build_week_dates()]


def build_week_series(checkins_by_date):
    series = []
    for date in build_week_dates():
        series.append({
            'label': date.strftime('%a').lower(),
            'date': date.isoformat(),
            'mood': checkins_by_date.get(date.isoformat()),
        })
    return series


def build_last_checkin_label(checkins):
    if not checkins:
        return 'Sem registros'

    last_date = checkins[0].date
    today = timezone.localdate()
    if last_date == today:
        return 'Hoje'
    if last_date == today - timedelta(days=1):
        return 'Ontem'
    return last_date.strftime('%A').capitalize()


def calculate_mood_trend(weekly_moods):
    values = [mood for mood in weekly_moods if mood is not None]
    if len(values) < 2:
        return 'stable'

    half = max(1, len(values) // 2)
    first_average = sum(values[:half]) / len(values[:half])
    second_average = sum(values[half:]) / len(values[half:])
    difference = second_average - first_average

    if difference >= 0.35:
        return 'up'
    if difference <= -0.35:
        return 'down'
    return 'stable'


def build_highlights(weekly_moods, diary_entries):
    mood_points = [(index, mood) for index, mood in enumerate(weekly_moods) if mood is not None]
    week_dates = build_week_dates()

    def label_for_index(index):
        return week_dates[index].strftime('%A').capitalize()

    best_day = label_for_index(max(mood_points, key=lambda item: item[1])[0]) if mood_points else 'Sem dados'
    worst_day = label_for_index(min(mood_points, key=lambda item: item[1])[0]) if mood_points else 'Sem dados'

    resource = 'Consistência de registros' if len(weekly_moods) >= 4 else 'Nenhum destacado'
    if diary_entries:
        first_titled = next((entry.title for entry in diary_entries if entry.title), None)
        if first_titled:
            resource = first_titled

    low_days = sum(1 for mood in weekly_moods if mood is not None and mood <= 2)
    if low_days >= 2:
        attention = 'Humor baixo recorrente'
    elif len([mood for mood in weekly_moods if mood is not None]) <= 2:
        attention = 'Poucos registros na semana'
    else:
        attention = 'Sem alerta relevante'

    return {
        'melhorDia': best_day,
        'diaDificil': worst_day,
        'pontoAtencao': attention,
        'recursoPositivo': resource,
    }


def build_patient_summary_context(patient_user, include_ai_summary=True):
    today = timezone.localdate()
    start_date = today - timedelta(days=6)
    profile = patient_user.profile

    week_checkins = list(
        CheckIn.objects.filter(user=patient_user, date__gte=start_date, date__lte=today).order_by('-date', '-updated_at')
    )
    week_diary_entries = list(
        DiaryEntry.objects.filter(user=patient_user, created_at__date__gte=start_date, created_at__date__lte=today)
        .order_by('-created_at')
    )

    checkins_by_date = {entry.date.isoformat(): entry.mood for entry in week_checkins}
    weekly_moods = build_weekly_moods(checkins_by_date)
    average_value = round(sum(entry.mood for entry in week_checkins) / len(week_checkins), 1) if week_checkins else None
    serialized_checkins = [serialize_checkin(entry) for entry in week_checkins]
    serialized_diary = [serialize_diary_entry(entry) for entry in week_diary_entries]
    ai_summary = None
    ai_summary_meta = {
        'source': 'skipped' if not include_ai_summary else 'fallback',
        'model': None,
        'fallbackReason': None,
    }
    if include_ai_summary:
        ai_result = generate_weekly_summary_result(
            patient_user.get_full_name() or patient_user.username,
            serialized_checkins,
            serialized_diary,
        )
        ai_summary = ai_result['text']
        ai_summary_meta = {
            'source': ai_result['source'],
            'model': ai_result['model'],
            'fallbackReason': ai_result['fallbackReason'],
        }

    return {
        'id': patient_user.id,
        'name': patient_user.get_full_name() or patient_user.username,
        'email': patient_user.email,
        'nextSession': profile.next_session_at.isoformat() if profile.next_session_at else None,
        'lastCheckinLabel': build_last_checkin_label(week_checkins),
        'moodAverage': average_value,
        'moodTrend': calculate_mood_trend(weekly_moods),
        'weeklyMoods': weekly_moods,
        'weekSeries': build_week_series(checkins_by_date),
        'checkinsThisWeek': len(week_checkins),
        'diaryEntriesCount': len(week_diary_entries),
        'alertsCount': sum(1 for entry in week_checkins if entry.mood <= 2),
        'aiSummary': ai_summary,
        'aiSummaryMeta': ai_summary_meta,
        'highlights': build_highlights(weekly_moods, week_diary_entries),
        'diaryExcerpts': [
            {
                'id': entry.id,
                'date': entry.created_at.isoformat(),
                'text': entry.content,
                'title': entry.title,
            }
            for entry in week_diary_entries[:5]
        ],
        'checkIns': serialized_checkins,
        'diaryEntries': serialized_diary,
    }


def get_psychologist_patients_queryset(psychologist_user):
    assigned_queryset = User.objects.select_related('profile').filter(
        profile__role=UserProfile.ROLE_PATIENT,
        profile__psychologist=psychologist_user,
    )
    if assigned_queryset.exists():
        return assigned_queryset.order_by('first_name', 'username')

    return User.objects.select_related('profile').filter(
        profile__role=UserProfile.ROLE_PATIENT,
    ).exclude(id=psychologist_user.id).order_by('first_name', 'username')


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
            psychologist = get_optional_psychologist(request.data.get('psychologistCrp'))
        except ValidationError as exc:
            return Response({'error': 'Senha invalida.', 'details': exc.messages}, status=400)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=400)

        with transaction.atomic():
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=name,
            )
            upsert_profile(user, role, UserProfile.PROVIDER_EMAIL, psychologist=psychologist)

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

            return Response(build_auth_response(authenticated_user, role_hint=UserProfile.ROLE_PSYCHOLOGIST))

        email = normalize_email(request.data.get('email'))
        if not email or not password:
            return Response({'error': 'E-mail e senha sao obrigatorios.'}, status=400)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'error': 'Credenciais invalidas.'}, status=401)

        authenticated_user = authenticate(request, username=user.username, password=password)
        if not authenticated_user:
            return Response({'error': 'Credenciais invalidas.'}, status=401)

        return Response(build_auth_response(authenticated_user, role_hint=UserProfile.ROLE_PATIENT))


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
        get_or_create_profile_for_role(request.user, UserProfile.ROLE_PATIENT)
        return Response({'user': serialize_user(request.user)})


class CheckInListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        permission_error = ensure_role(request.user, UserProfile.ROLE_PATIENT)
        if permission_error:
            return permission_error

        checkins = CheckIn.objects.filter(user=request.user).order_by('-date', '-updated_at')
        return Response({'items': [serialize_checkin(entry) for entry in checkins]})

    def post(self, request):
        permission_error = ensure_role(request.user, UserProfile.ROLE_PATIENT)
        if permission_error:
            return permission_error

        mood = request.data.get('mood')
        note = (request.data.get('note') or '').strip()
        emotions = request.data.get('emotions') or []
        factors = request.data.get('factors') or []

        try:
            mood = int(mood)
        except (TypeError, ValueError):
            return Response({'error': 'Humor invalido.'}, status=400)

        if mood < 1 or mood > 5:
            return Response({'error': 'Humor deve estar entre 1 e 5.'}, status=400)

        if not isinstance(emotions, list):
            return Response({'error': 'Emocoes invalidas.'}, status=400)

        if not isinstance(factors, list):
            return Response({'error': 'Fatores invalidos.'}, status=400)

        cleaned_emotions = []
        seen_emotions = set()
        for item in emotions:
            value = str(item).strip()
            if not value:
                continue
            lowered = value.lower()
            if lowered in seen_emotions:
                continue
            seen_emotions.add(lowered)
            cleaned_emotions.append(value)

        cleaned_factors = []
        seen_factors = set()
        for item in factors:
            value = str(item).strip()
            if not value:
                continue
            lowered = value.lower()
            if lowered in seen_factors:
                continue
            seen_factors.add(lowered)
            cleaned_factors.append(value)

        if not cleaned_emotions:
            return Response({'error': 'Selecione ao menos uma emocao.'}, status=400)

        if not cleaned_factors:
            return Response({'error': 'Selecione ao menos um fator.'}, status=400)

        today = timezone.localdate()
        entry, _ = CheckIn.objects.update_or_create(
            user=request.user,
            date=today,
            defaults={
                'mood': mood,
                'emotions': cleaned_emotions,
                'factors': cleaned_factors,
                'note': note,
            },
        )
        return Response({'item': serialize_checkin(entry)})


class DiaryEntryListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        permission_error = ensure_role(request.user, UserProfile.ROLE_PATIENT)
        if permission_error:
            return permission_error

        entries = DiaryEntry.objects.filter(user=request.user).order_by('-created_at')
        return Response({'items': [serialize_diary_entry(entry) for entry in entries]})

    def post(self, request):
        permission_error = ensure_role(request.user, UserProfile.ROLE_PATIENT)
        if permission_error:
            return permission_error

        title = (request.data.get('title') or '').strip()
        content = (request.data.get('content') or '').strip()
        if not content:
            return Response({'error': 'Conteudo obrigatorio.'}, status=400)

        entry = DiaryEntry.objects.create(user=request.user, title=title, content=content)
        return Response({'item': serialize_diary_entry(entry)}, status=201)


class DiaryEntryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, entry_id):
        permission_error = ensure_role(request.user, UserProfile.ROLE_PATIENT)
        if permission_error:
            return permission_error

        entry = get_object_or_404(DiaryEntry, id=entry_id, user=request.user)
        title = (request.data.get('title') or '').strip()
        sentimento = (request.data.get('sentimento') or '').strip()
        content = (request.data.get('content') or '').strip()

        if not content:
            return Response({'error': 'Conteudo obrigatorio.'}, status=400)

        entry.title = title
        entry.sentimento = sentimento
        entry.content = content
        entry.save(update_fields=['title', 'sentimento', 'content', 'updated_at'])
        return Response({'item': serialize_diary_entry(entry)})

    def delete(self, request, entry_id):
        permission_error = ensure_role(request.user, UserProfile.ROLE_PATIENT)
        if permission_error:
            return permission_error

        entry = get_object_or_404(DiaryEntry, id=entry_id, user=request.user)
        entry.delete()
        return Response(status=204)

class DiarySuggestionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        permission_error = ensure_role(request.user, UserProfile.ROLE_PATIENT)
        if permission_error:
            return permission_error

        patient_name = request.user.get_full_name() or request.user.username or 'Paciente'
        suggestion = generate_daily_diary_suggestion_result(patient_name)
        return Response({
            'suggestion': suggestion['text'],
            'source': suggestion['source'],
            'model': suggestion['model'],
            'fallbackReason': suggestion['fallbackReason'],
        })


class WeeklySummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        permission_error = ensure_role(request.user, UserProfile.ROLE_PATIENT)
        if permission_error:
            return permission_error

        return Response(build_patient_summary_context(request.user))


class PsychologistListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        psychologists = User.objects.select_related('profile').filter(
            profile__role=UserProfile.ROLE_PSYCHOLOGIST,
        ).order_by('first_name', 'username')

        return Response({'items': [serialize_psychologist_user(user) for user in psychologists]})


class PatientPsychologistView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        permission_error = ensure_role(request.user, UserProfile.ROLE_PATIENT)
        if permission_error:
            return permission_error

        profile = request.user.profile
        psychologist = profile.psychologist

        return Response({
            'psychologist': serialize_psychologist_user(psychologist) if psychologist else None,
        })

    def patch(self, request):
        permission_error = ensure_role(request.user, UserProfile.ROLE_PATIENT)
        if permission_error:
            return permission_error

        psychologist_id = request.data.get('psychologistId')
        if psychologist_id in (None, ''):
            return Response({'error': 'Psicologo obrigatorio.'}, status=400)

        try:
            psychologist_id = int(psychologist_id)
        except (TypeError, ValueError):
            return Response({'error': 'Psicologo invalido.'}, status=400)

        psychologist = User.objects.select_related('profile').filter(
            id=psychologist_id,
            profile__role=UserProfile.ROLE_PSYCHOLOGIST,
        ).first()
        if not psychologist:
            return Response({'error': 'Psicologo nao encontrado.'}, status=404)

        profile = request.user.profile
        profile.psychologist = psychologist
        profile.next_session_at = None
        profile.save(update_fields=['psychologist', 'next_session_at', 'updated_at'])

        return Response({
            'psychologist': serialize_psychologist_user(psychologist),
        })


class PsychologistPatientsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        permission_error = ensure_role(request.user, UserProfile.ROLE_PSYCHOLOGIST)
        if permission_error:
            return permission_error

        items = [build_patient_summary_context(patient, include_ai_summary=False) for patient in get_psychologist_patients_queryset(request.user)]
        return Response({'items': items})


class PsychologistPatientDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id):
        permission_error = ensure_role(request.user, UserProfile.ROLE_PSYCHOLOGIST)
        if permission_error:
            return permission_error

        patient = get_object_or_404(get_psychologist_patients_queryset(request.user), id=patient_id)
        return Response(build_patient_summary_context(patient))


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