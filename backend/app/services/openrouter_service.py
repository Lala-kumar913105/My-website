from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import requests

from app.core.config import settings


class OpenRouterError(Exception):
    pass


class OpenRouterMissingKeyError(OpenRouterError):
    pass


class OpenRouterTimeoutError(OpenRouterError):
    pass


class OpenRouterResponseError(OpenRouterError):
    pass


@dataclass
class OpenRouterResult:
    answer: str
    model: str


def _build_prompt(question: str, screen_context: Optional[str]) -> str:
    base = (
        "Tum ek helpful AI assistant ho. Har jawab simple Hindi mein do. "
        "Jitna possible ho utna seedha, practical aur short rakho."
    )
    if screen_context:
        return (
            f"{base}\n\n"
            "Screen context (agar relevant ho to use karo):\n"
            f"{screen_context}\n\n"
            f"User question: {question}"
        )
    return f"{base}\n\nUser question: {question}"


def ask_openrouter(question: str, screen_context: Optional[str] = None) -> OpenRouterResult:
    api_key = settings.OPENROUTER_API_KEY.strip()
    if not api_key:
        raise OpenRouterMissingKeyError("OPENROUTER_API_KEY missing hai")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": settings.OPENROUTER_HTTP_REFERER,
        "X-OpenRouter-Title": settings.OPENROUTER_APP_TITLE,
    }

    payload = {
        "model": settings.OPENROUTER_MODEL,
        "messages": [
            {
                "role": "user",
                "content": _build_prompt(question=question, screen_context=screen_context),
            }
        ],
        "temperature": 0.4,
    }

    try:
        response = requests.post(
            settings.OPENROUTER_URL,
            headers=headers,
            json=payload,
            timeout=settings.OPENROUTER_TIMEOUT_SECONDS,
        )
    except requests.Timeout as exc:
        raise OpenRouterTimeoutError("OpenRouter request timeout ho gaya") from exc
    except requests.RequestException as exc:
        raise OpenRouterResponseError("OpenRouter se connect nahi ho paya") from exc

    if not response.ok:
        details = response.text[:300]
        raise OpenRouterResponseError(
            f"OpenRouter API failure ({response.status_code}): {details}"
        )

    try:
        data = response.json() if response.content else {}
    except ValueError as exc:
        raise OpenRouterResponseError("OpenRouter response invalid JSON hai") from exc
    choices = data.get("choices") if isinstance(data, dict) else None
    if not isinstance(choices, list) or not choices:
        raise OpenRouterResponseError("OpenRouter response invalid hai (choices missing)")

    first = choices[0] if isinstance(choices[0], dict) else {}
    message = first.get("message") if isinstance(first, dict) else None
    content = message.get("content") if isinstance(message, dict) else None
    if isinstance(content, list):
        content = "\n".join(
            part.get("text", "") for part in content if isinstance(part, dict)
        ).strip()

    if not isinstance(content, str) or not content.strip():
        raise OpenRouterResponseError("OpenRouter response invalid hai (answer missing)")

    model_name = str(data.get("model") or settings.OPENROUTER_MODEL)
    return OpenRouterResult(answer=content.strip(), model=model_name)
