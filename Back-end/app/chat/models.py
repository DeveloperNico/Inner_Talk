from datetime import time as datetime_time

from django.conf import settings
from django.db import models


def default_working_days():
    return [1, 2, 3, 4, 5]


def default_start_time():
    return datetime_time(8, 0)


def default_end_time():
    return datetime_time(18, 0)


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
    psychologist = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='assigned_patients',
        null=True,
        blank=True,
    )
    next_session_at = models.DateTimeField(null=True, blank=True)
    working_days = models.JSONField(default=default_working_days, blank=True)
    blocked_dates = models.JSONField(default=list, blank=True)
    availability_start_time = models.TimeField(default=default_start_time)
    availability_end_time = models.TimeField(default=default_end_time)
    availability_slot_duration = models.PositiveSmallIntegerField(default=60)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email or self.user.username} ({self.role})"


class CheckIn(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='checkins')
    mood = models.PositiveSmallIntegerField()
    emotions = models.JSONField(default=list, blank=True)
    factors = models.JSONField(default=list, blank=True)
    note = models.TextField(blank=True)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-updated_at']
        constraints = [
            models.UniqueConstraint(fields=['user', 'date'], name='unique_daily_checkin_per_user'),
        ]

    def __str__(self):
        return f"{self.user_id} - {self.date} - {self.mood}"


class DiaryEntry(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='diary_entries')
    title = models.CharField(max_length=255, blank=True)
    sentimento = models.CharField(max_length=50, blank=True)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user_id} - {self.created_at:%Y-%m-%d %H:%M}"


class CalendarAppointment(models.Model):
    STATUS_SCHEDULED = 'scheduled'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = (
        (STATUS_SCHEDULED, 'Scheduled'),
        (STATUS_CANCELLED, 'Cancelled'),
    )

    psychologist = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='calendar_appointments_as_psychologist',
    )
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='calendar_appointments_as_patient',
    )
    start_at = models.DateTimeField(db_index=True)
    duration_minutes = models.PositiveSmallIntegerField(default=60)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SCHEDULED)
    cancellation_message = models.TextField(blank=True)
    reschedule_message = models.TextField(blank=True)
    rescheduled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='+',
        null=True,
        blank=True,
    )
    rescheduled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='+',
        null=True,
        blank=True,
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_at']

    def __str__(self):
        return f"{self.psychologist_id} - {self.patient_id} - {self.start_at:%Y-%m-%d %H:%M}"