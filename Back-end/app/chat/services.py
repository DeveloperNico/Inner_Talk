import os
from openai import OpenAI, APIStatusError
from .prompts import BASE_PROMPT


# ==============================
# CONFIGURAÇÃO OPENROUTER
# ==============================

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# MODELO GRATUITO FIXO
OPENROUTER_MODEL = "arcee-ai/trinity-large-preview"

MAX_TOKENS = 512

client = OpenAI(
    base_url=OPENROUTER_BASE_URL,
    api_key=OPENROUTER_API_KEY,
)


# ==============================
# PALAVRAS DE CRISE
# ==============================

CRISIS_WORDS = [
    "suicídio",
    "me matar",
    "quero morrer",
    "não aguento mais",
    "acabar com tudo",
]


def detect_crisis(text):
    text = text.lower()
    return any(word in text for word in CRISIS_WORDS)


def crisis_message():
    return (
        "Sinto muito que você esteja passando por isso. "
        "Eu não substituo a ajuda de um profissional, mas recomendo fortemente que você procure apoio imediato. "
        "Por favor procure ajuda imediata: CVV 188 (Brasil) ou ligue para o serviço de emergência local."
    )


# ==============================
# GERAÇÃO DE RESPOSTA
# ==============================

def generate_response(history_queryset):

    if not OPENROUTER_API_KEY:
        raise Exception("OPENROUTER_API_KEY não configurada no ambiente.")

    # monta histórico
    messages = [
        {
            "role": "assistant" if msg.role == "bot" else msg.role,
            "content": msg.content
        }
        for msg in history_queryset
        if msg.content
    ]

    # adiciona system prompt
    messages.insert(0, {
        "role": "system",
        "content": BASE_PROMPT
    })

    try:
        response = client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=MAX_TOKENS,
        )

        return response.choices[0].message.content

    except APIStatusError as exc:
        return f"Erro da API ({exc.status_code}): {str(exc)}"

    except Exception as e:
        return f"Erro interno: {str(e)}"
