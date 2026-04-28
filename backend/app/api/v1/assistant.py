from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.openrouter_service import (
    OpenRouterMissingKeyError,
    OpenRouterResponseError,
    OpenRouterTimeoutError,
    ask_openrouter,
)


router = APIRouter()


class AssistantQueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    include_screen_context: bool = True
    screen_context: Optional[str] = Field(default=None, max_length=12000)


class AssistantQueryResponse(BaseModel):
    answer: str
    source: str = "openrouter"
    confidence: float = 0.85
    model: Optional[str] = None


@router.post("/query", response_model=AssistantQueryResponse)
def query_assistant(payload: AssistantQueryRequest):
    screen_context = payload.screen_context if payload.include_screen_context else None

    try:
        result = ask_openrouter(
            question=payload.question.strip(),
            screen_context=screen_context,
        )
        return AssistantQueryResponse(
            answer=result.answer,
            source="openrouter",
            confidence=0.9,
            model=result.model,
        )
    except OpenRouterMissingKeyError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except OpenRouterTimeoutError as exc:
        raise HTTPException(
            status_code=504,
            detail="Assistant service timeout ho gaya. Thodi der baad dobara try karein.",
        ) from exc
    except OpenRouterResponseError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Assistant provider error: {str(exc)}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Assistant se response process karte waqt unexpected error aaya.",
        ) from exc
