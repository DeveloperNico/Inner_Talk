from django.conf import settings
from django.db import models


class Message(models.Model):
    ROLE_CHOICES = (
        ('user', 'User'),
        ('bot', 'Bot'),
    )

    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.role}: {self.content[:50]}"


class UserProfile(models.Model):
    ROLE_PATIENT = 'paciente'
    ROLE_PSYCHOLOGIST = 'psicologo'

    ROLE_CHOICES = (
        (ROLE_PATIENT, 'Paciente'),
        (ROLE_PSYCHOLOGIST, 'Psicologo'),
    )

    PROVIDER_EMAIL = 'email'
    PROVIDER_GOOGLE = 'google'

    AUTH_PROVIDER_CHOICES = (
        (PROVIDER_EMAIL, 'Email'),
        (PROVIDER_GOOGLE, 'Google'),
    )

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_PATIENT)
    auth_provider = models.CharField(max_length=20, choices=AUTH_PROVIDER_CHOICES, default=PROVIDER_EMAIL)
    crp = models.CharField(max_length=9, unique=True, null=True, blank=True)
    google_sub = models.CharField(max_length=255, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} ({self.role})"