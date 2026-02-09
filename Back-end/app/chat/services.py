import os
from openai import OpenAI, APIStatusError
from .prompts import BASE_PROMPT

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-5.2")
OPENROUTER_MAX_TOKENS = int(os.getenv("OPENROUTER_MAX_TOKENS", "512"))
OPENROUTER_SITE_URL = os.getenv("OPENROUTER_SITE_URL", "")
OPENROUTER_SITE_NAME = os.getenv("OPENROUTER_SITE_NAME", "")

client = OpenAI(
        base_url=OPENROUTER_BASE_URL,
        api_key=OPENROUTER_API_KEY,
)

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

def generate_response(history_queryset):
    # monta lista do histórico
    messages = [
        {
            "role": "assistant" if msg.role == "bot" else msg.role,
            "content": msg.content
        }
        for msg in history_queryset
        if msg.content
    ]

    # adiciona system prompt no início
    messages.insert(0, {
        "role": "system",
        "content": BASE_PROMPT
    })

    extra_headers = {}
    if OPENROUTER_SITE_URL:
        extra_headers["HTTP-Referer"] = OPENROUTER_SITE_URL
    if OPENROUTER_SITE_NAME:
        extra_headers["X-Title"] = OPENROUTER_SITE_NAME

    max_tokens = OPENROUTER_MAX_TOKENS
    while True:
        try:
            response = client.chat.completions.create(
                model=OPENROUTER_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=max_tokens,
                extra_headers=extra_headers or None,
            )
            break
        except APIStatusError as exc:
            if exc.status_code == 402 and max_tokens > 128:
                max_tokens = max(128, max_tokens // 2)
                continue
            raise

    return response.choices[0].message.content

