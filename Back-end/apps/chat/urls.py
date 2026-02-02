from django.urls import path
from .views import SendMessageView

urlpatterns = [
    path("send/", SendMessageView.as_view()),
    path("chat/", SendMessageView.as_view()),
]