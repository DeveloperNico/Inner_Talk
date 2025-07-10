from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.contrib.contenttypes.models import ContentType

class User(AbstractUser):
    CARGO = [
        ('C', 'Comum')
    ]

    cargo = models.CharField(max_length=1, choices=CARGO, default='C')

    def __str__(self):
        return self.username
    
class ChatMessage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='messages')
    message = models.TextField()
    response = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} - {self.timestamp.strftime("%d/%m/%Y %H:%M")}'
    
# class Feedback(models.Model):
#     user = models.ForeignKey(User, on_delete=models.CASCADE)
#     message = models.ForeignKey(ChatMessage, on_delete=models.CASCADE)
#     liked = models.BooleanField()
#     comment = models.TextField(blank=True)
#     created_at = models.DateTimeField(auto_now_add=True)