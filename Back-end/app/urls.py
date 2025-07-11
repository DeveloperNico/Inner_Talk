from django.urls import path
from .views import UserListCreateView, ChatMessageListCreateView, ChatMessageDeleteView

urlpatterns = [
    path('users/', UserListCreateView.as_view(), name='user-list-create'),
    path('chat/', ChatMessageListCreateView.as_view(), name='chat-list-crate'),
    path('chat/<int:pk>/', ChatMessageDeleteView.as_view(), name='chat-delete'),
]