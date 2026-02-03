from django.urls import path
from .views import SendMessageView

urlpatterns = [
    path("chat/", SendMessageView.as_view()),
]