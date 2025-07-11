from django.urls import path
from .views import *

urlpatterns = [
    path('login/', LoginView.as_view(), name='login-view'),
    path('cadastro/', UserListCreateView.as_view(), name='user-list-create'),
    path('chat/', ChatMessageListCreateView.as_view(), name='chat-list-crate'),
    path('chat/<int:pk>/', ChatMessageDeleteView.as_view(), name='chat-delete'),
    path('chatbot/', ChatBotAPIView.as_view(), name='chat-bot'),
]