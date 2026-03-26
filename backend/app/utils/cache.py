from __future__ import annotations

from datetime import datetime
from typing import Any, Callable, Dict, Optional, Tuple


class TTLCache:
    """Simple in-memory TTL cache for API responses."""

    def __init__(self) -> None:
        self._store: Dict[str, Tuple[datetime, Any]] = {}

    def get(self, key: str, ttl_seconds: int) -> Optional[Any]:
        cached = self._store.get(key)
        if not cached:
            return None
        timestamp, payload = cached
        if (datetime.utcnow() - timestamp).total_seconds() > ttl_seconds:
            self._store.pop(key, None)
            return None
        return payload

    def set(self, key: str, payload: Any) -> None:
        self._store[key] = (datetime.utcnow(), payload)

    def get_or_set(self, key: str, ttl_seconds: int, factory: Callable[[], Any]) -> Any:
        cached = self.get(key, ttl_seconds)
        if cached is not None:
            return cached
        payload = factory()
        self.set(key, payload)
        return payload


cache = TTLCache()