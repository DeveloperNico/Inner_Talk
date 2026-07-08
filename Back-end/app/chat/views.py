import logging

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Message
from .services import crisis_message, detect_crisis, generate_response

logger = logging.getLogger(__name__)

FAREWELL_WORDS = [
    "tchau",
    "adeus",
    "ate mais",
    "ate",
    "ate logo",
    "ate breve",
    "ate mais tarde",
    "obrigado",
    "obrigada",
    "valeu",
]


def is_farewell(text: str) -> bool:
    text = text.lower().strip()
    return any(word in text for word in FAREWELL_WORDS)


class SendMessageView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        user_text = request.data.get("message")

        if not user_text:
            return Response({"error": "Mensagem vazia"}, status=400)

        try:
            Message.objects.create(role="user", content=user_text)

            if detect_crisis(user_text):
                bot_reply = crisis_message()
            else:
                history = Message.objects.all().order_by("created_at")
                bot_reply = generate_response(history)

            is_first_bot_message = not Message.objects.filter(role="bot").exists()
            if is_first_bot_message or is_farewell(user_text):
                bot_reply += "\n\nLembre-se de que estou aqui para ajudar, mas não substituo a ajuda profissional."

            Message.objects.create(role="bot", content=bot_reply)
            return Response({"reply": bot_reply})

        except Exception:
            logger.exception("Falha ao processar mensagem no endpoint /api/chat/")
            return Response(
                {
                    "error": "Falha interna ao gerar resposta.",
                    "detail": "Verifique os logs do backend para mais detalhes."
                },
                status=500,
            )
