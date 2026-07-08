import os
from openai import OpenAI, APIStatusError
from .prompts import BASE_PROMPT


# ==============================
# CONFIGURACAO OPENROUTER
# ==============================

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# MODELO GRATUITO FIXO
OPENROUTER_MODEL = "poolside/laguna-xs-2.1:free"

MAX_TOKENS = 512


def get_client():
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return None

    return OpenAI(
        base_url=OPENROUTER_BASE_URL,
        api_key=api_key,
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
# GERACAO DE RESPOSTA
# ==============================


def generate_response(history_queryset):
    client = get_client()
    if not client:
        return "OPENROUTER_API_KEY não configurada no ambiente."

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
