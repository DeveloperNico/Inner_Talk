import logging
from collections import Counter
from datetime import date
from os import getenv
from statistics import mean

from openai import APIStatusError, AuthenticationError, OpenAI, RateLimitError

from .prompts import BASE_PROMPT

logger = logging.getLogger(__name__)

OPENROUTER_BASE_URL = getenv('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1')
OPENROUTER_MODEL = getenv('OPENROUTER_MODEL', '').strip()
MAX_TOKENS = 512

CRISIS_WORDS = [
    'suicídio',
    'me matar',
    'quero morrer',
    'não aguento mais',
    'acabar com tudo',
]

MOOD_LABELS = {
    1: 'muito ruim',
    2: 'ruim',
    3: 'estável',
    4: 'bom',
    5: 'muito bom',
}

DAILY_PROMPT_FALLBACKS = [
    'Escreva 3 coisas que trouxeram calma hoje, mesmo que pequenas.',
    'Qual foi o momento mais desafiador do dia e como você reagiu a ele?',
    'Que necessidade sua ficou mais evidente hoje: descanso, conexão, segurança ou reconhecimento?',
    'Descreva uma situação de hoje em que você gostaria de ter sido mais gentil com você mesmo.',
    'Complete a frase: "Hoje eu percebi que..." e explore o que isso significa para você.',
    'Anote um pensamento que se repetiu hoje e o que pode ter ativado esse padrão.',
    'Que atitude concreta pode te ajudar amanhã a se sentir 1% melhor?',
]


def get_client():
    api_key = getenv('OPENROUTER_API_KEY')
    if not api_key:
        return None

    return OpenAI(
        base_url=OPENROUTER_BASE_URL,
        api_key=api_key,
    )


def detect_crisis(text):
    text = text.lower()
    return any(word in text for word in CRISIS_WORDS)


def crisis_message():
    return (
        'Sinto muito que você esteja passando por isso. '
        'Eu não substituo a ajuda de um profissional, mas recomendo fortemente que você procure apoio imediato. '
        'Por favor procure ajuda imediata: CVV 188 (Brasil) ou ligue para o serviço de emergência local.'
    )


def build_ai_unavailable_message(exc):
    if isinstance(exc, RateLimitError):
        return (
            f'Resumo por IA indisponível no momento para o modelo {OPENROUTER_MODEL}: '
            'o provedor está temporariamente sem cota. Usando resumo local.'
        )

    if isinstance(exc, AuthenticationError):
        return 'Resumo por IA indisponível: a chave do OpenRouter foi rejeitada. Usando resumo local.'

    if isinstance(exc, APIStatusError):
        if exc.status_code == 402:
            return (
                'Resumo por IA indisponível: o provedor retornou 402 (Payment Required), '
                'normalmente por falta de crédito/plano para o modelo selecionado. Usando resumo local.'
            )
        return f'Resumo por IA indisponível: erro da API ({exc.status_code}). Usando resumo local.'

    return 'Resumo por IA indisponível no momento. Usando resumo local.'


def request_openrouter(messages, temperature, max_tokens):
    client = get_client()
    if not client:
        return None, 'OPENROUTER_API_KEY não configurada no ambiente.'
    if not OPENROUTER_MODEL:
        return None, 'OPENROUTER_MODEL não configurado no ambiente.'

    try:
        response = client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return (response.choices[0].message.content or '').strip(), None
    except (RateLimitError, AuthenticationError, APIStatusError) as exc:
        error_message = build_ai_unavailable_message(exc)
        logger.warning(error_message)
        return None, error_message
    except Exception:
        logger.exception('Falha inesperada ao chamar OpenRouter.')
        return None, 'Resumo por IA indisponível no momento. Usando resumo local.'


def generate_response(history_queryset):
    messages = [
        {
            'role': 'assistant' if msg.role == 'bot' else msg.role,
            'content': msg.content,
        }
        for msg in history_queryset
        if msg.content
    ]

    messages.insert(0, {
        'role': 'system',
        'content': BASE_PROMPT,
    })

    content, error_message = request_openrouter(messages, temperature=0.7, max_tokens=MAX_TOKENS)
    if content:
        return content
    return error_message


def top_terms_from_checkins(checkins, key, limit=3):
    counter = Counter()
    for entry in checkins:
        values = entry.get(key) or []
        if not isinstance(values, list):
            continue
        for value in values:
            normalized = str(value).strip()
            if normalized:
                counter[normalized] += 1

    return [item for item, _ in counter.most_common(limit)]


def fallback_weekly_summary(patient_name, checkins, diary_entries):
    if not checkins and not diary_entries:
        return (
            'Ainda não há registros suficientes nesta semana para montar um resumo. '
            'Incentive o paciente a registrar humor e diário ao longo dos próximos dias.'
        )

    parts = []
    if checkins:
        average = mean(entry['mood'] for entry in checkins)
        low_mood_days = sum(1 for entry in checkins if entry['mood'] <= 2)
        mood_label = MOOD_LABELS.get(round(average), 'variável')
        parts.append(
            f"{patient_name or 'O paciente'} registrou {len(checkins)} check-in(s) na semana, "
            f"com humor médio {average:.1f} ({mood_label})."
        )

        top_emotions = top_terms_from_checkins(checkins, 'emotions')
        if top_emotions:
            parts.append('Emoções mais frequentes nos check-ins: ' + ', '.join(top_emotions) + '.')

        top_factors = top_terms_from_checkins(checkins, 'factors')
        if top_factors:
            parts.append('Fatores associados recorrentes: ' + ', '.join(top_factors) + '.')

        if low_mood_days:
            parts.append(f'Houve {low_mood_days} dia(s) com humor baixo, sugerindo ponto de atenção para a sessão.')
    else:
        parts.append('Não houve check-ins registrados nesta semana.')

    if diary_entries:
        parts.append(f'Foram registradas {len(diary_entries)} entrada(s) no diário.')
        excerpts = []
        for entry in diary_entries[:3]:
            title = (entry.get('title') or '').strip()
            content = (entry.get('content') or '').strip().replace('\n', ' ')
            snippet = content[:120].strip()
            if title and snippet:
                excerpts.append(f'[{title}] {snippet}')
            elif snippet:
                excerpts.append(snippet)

        if excerpts:
            parts.append('Trechos recentes: ' + ' | '.join(excerpts) + '.')
    else:
        parts.append('Não houve entradas de diário nesta semana.')

    parts.append('Este texto foi montado localmente por fallback e pode não capturar nuances semânticas completas.')
    return ' '.join(parts)


def build_weekly_summary_prompt(patient_name, checkins, diary_entries):
    return [
        {
            'role': 'system',
            'content': (
                'Você é um assistente clínico de apoio para psicólogos. '
                'Crie um resumo semanal detalhado, sem diagnóstico, em português do Brasil. '
                'Priorize conteúdo do diário e evolução temporal dos check-ins. '
                'Considere explicitamente emoções e fatores selecionados no check-in. '
                'Use linguagem técnica leve, humanizada e objetiva.'
            ),
        },
        {
            'role': 'user',
            'content': (
                f"Paciente: {patient_name or 'Não informado'}\n"
                f"Check-ins semanais: {checkins}\n"
                f"Entradas de diário: {diary_entries}\n"
                'Escreva de 5 a 8 frases cobrindo: padrões emocionais, gatilhos prováveis, recursos de enfrentamento '
                'observados, riscos/sinais de atenção e uma sugestão de foco para a próxima sessão. '
                'Apoie o texto em exemplos explícitos do diário quando disponíveis.'
            ),
        },
    ]


def fallback_daily_diary_suggestion():
    day_index = date.today().toordinal() % len(DAILY_PROMPT_FALLBACKS)
    return DAILY_PROMPT_FALLBACKS[day_index]


def generate_daily_diary_suggestion_result(patient_name=None):
    messages = [
        {
            'role': 'system',
            'content': (
                'Você cria prompts terapêuticos curtos para diário emocional. '
                'Responda em português do Brasil com apenas uma frase de até 20 palavras, '
                'objetiva, acolhedora e prática. Não use listas.'
            ),
        },
        {
            'role': 'user',
            'content': (
                f'Gere uma sugestão de escrita para hoje para {patient_name or "o paciente"}. '
                'Foque em autoconsciência, regulação emocional e observação do dia a dia.'
            ),
        },
    ]

    content, error_message = request_openrouter(messages, temperature=0.7, max_tokens=90)
    if content:
        return {
            'text': content.strip().strip('"'),
            'source': 'ai',
            'model': OPENROUTER_MODEL,
            'fallbackReason': None,
        }

    if not error_message:
        error_message = 'O provedor não retornou conteúdo para a sugestão do diário.'

    return {
        'text': fallback_daily_diary_suggestion(),
        'source': 'fallback',
        'model': OPENROUTER_MODEL,
        'fallbackReason': error_message,
    }


def generate_weekly_summary_result(patient_name, checkins, diary_entries):
    messages = build_weekly_summary_prompt(patient_name, checkins, diary_entries)
    content, error_message = request_openrouter(messages, temperature=0.35, max_tokens=1200)

    if content:
        return {
            'text': content,
            'source': 'ai',
            'model': OPENROUTER_MODEL,
            'fallbackReason': None,
        }

    if not error_message:
        error_message = 'O provedor não retornou conteúdo para este resumo.'
    logger.info(error_message)

    return {
        'text': fallback_weekly_summary(patient_name, checkins, diary_entries),
        'source': 'fallback',
        'model': OPENROUTER_MODEL,
        'fallbackReason': error_message,
    }


def generate_weekly_summary(patient_name, checkins, diary_entries):
    return generate_weekly_summary_result(patient_name, checkins, diary_entries)['text']