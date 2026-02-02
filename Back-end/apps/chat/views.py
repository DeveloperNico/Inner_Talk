from rest_framework import APIView
from rest_framework.response import Response
from .models import Message
from .services import generate_response, detect_crisis, crisis_message

class SendMessageView(APIView):
    def post(self, request):
        user_text = request.data.get("message")

        if not user_text:
            return Response({"error": "Mensagem vazia"}, status=400)
        
        Message.objects.create(role="user", content=user_text)

        if detect_crisis(user_text):
            bot_reply = crisis_message()
        else:
            history = Message.objects.all().order_by("created_at")
            bot_reply = generate_response(history)

        bot_reply += "\n\nLembre-se de que estou aqui para ajudar, mas não substituo a ajuda profissional."

        Message.objects.create(role="bot", content=bot_reply)

        return Response({"reply": bot_reply})