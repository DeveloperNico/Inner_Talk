from rest_framework.generics import ListCreateAPIView, RetrieveDestroyAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from .serializers import UserSerializer, ChatMessageSerializer
from .models import User, ChatMessage

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