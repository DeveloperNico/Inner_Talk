from rest_framework.generics import ListCreateAPIView, RetrieveDestroyAPIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from openai import OpenAI
from django.conf import settings
from .serializers import UserSerializer, LoginSerializer, ChatMessageSerializer, MessageSerializer
from .models import User, ChatMessage

class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer

# Cadastro (POST) e listagem (GET) de usuários
class UserListCreateView(ListCreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    def get_permissions(self):
        if self.request.method == 'POST':
            return [AllowAny()]
        return [IsAuthenticated()]
    
# Listagem e envio de mensagens do usuário autenticado
class ChatMessageListCreateView(ListCreateAPIView):
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatMessage.objects.filter(User=self.request.user).order_by('-timestamp')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

# Deletar mensagem por ID
class ChatMessageDeleteView(RetrieveDestroyAPIView):
    queryset = ChatMessage.objects.all()
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

class ChatBotAPIView(APIView):
    def post(self, request):
        serializer = MessageSerializer(data=request.data)
        if serializer.is_valid():
            user_input = serializer.validated_data["text"]
            response = self.generate_response(user_input)
            return Response({"response": response})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def generate_response(self, text):
        try:
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Você é um terapeuta virtual acolhedor e empático."},
                    {"role": "user", "content": text}
                ]
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Erro ao gerar resposta: {str(e)}"