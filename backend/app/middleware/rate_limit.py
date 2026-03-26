from __future__ import annotations

from datetime import datetime
from typing import Dict, Tuple

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiting middleware keyed by client IP + path."""

    def __init__(self, app):
        super().__init__(app)
        self._requests: Dict[str, Tuple[datetime, int]] = {}

    def _limit_for_path(self, path: str) -> int:
        if path.startswith("/api/v1/auth"):
            return settings.RATE_LIMIT_AUTH_MAX_REQUESTS
        return settings.RATE_LIMIT_MAX_REQUESTS

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        key = f"{client_ip}:{request.url.path}"
        window_seconds = settings.RATE_LIMIT_WINDOW_SECONDS
        max_requests = self._limit_for_path(request.url.path)

        now = datetime.utcnow()
        timestamp, count = self._requests.get(key, (now, 0))
        if (now - timestamp).total_seconds() > window_seconds:
            timestamp, count = now, 0

        count += 1
        self._requests[key] = (timestamp, count)

        if count > max_requests:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down."},
            )

        return await call_next(request)