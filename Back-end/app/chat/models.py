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