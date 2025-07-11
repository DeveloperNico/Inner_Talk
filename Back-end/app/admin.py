from django.contrib import admin
from .models import User, ChatMessage

admin.site.register(User)
admin.site.register(ChatMessage)