import os
from pyexpat.errors import messages
from openai import OpenAI
from .prompts import BASE_PROMPT

client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama", 
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
            "role": msg.role,
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

    response = client.chat.completions.create(
        model="llama3",
        messages=messages,
        temperature=0.7,
    )

    return response.choices[0].message.content

