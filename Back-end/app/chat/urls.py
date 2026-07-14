from django.urls import path

from .views import (
    AuthTokenRefreshView,
    CurrentUserView,
    GoogleAuthView,
    LoginView,
    RegisterView,
    SendMessageView,
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view()),
    path('auth/login/', LoginView.as_view()),
    path('auth/google/', GoogleAuthView.as_view()),
    path('auth/me/', CurrentUserView.as_view()),
    path('auth/token/refresh/', AuthTokenRefreshView.as_view()),
    path('chat/', SendMessageView.as_view()),
]
