import os
import openai import OpenAI
from .prompts import BASE_PROMPT

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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

def generate_response(history):
    messages = [
        {"role": "system", "content": BASE_PROMPT}
    ]

    for msg in history:
        messages.append({
            "role": msg.role,
            "cotent": msg.content
        })

        response = client.chat.completions.create(
            model="gpt-4-mini",
            messages=messages
        )

        return response.choices[0].message.content