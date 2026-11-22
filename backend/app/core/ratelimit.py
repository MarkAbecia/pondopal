"""Fixed-window rate limiting in Redis, keyed per user (or client IP when anonymous)."""

from collections.abc import Awaitable, Callable
from typing import Protocol

from fastapi import HTTPException, Request
from redis.exceptions import RedisError

from app.core.logging import log
from app.core.security import CurrentUser


class Counter(Protocol):
    async def incr(self, name: str) -> int: ...
    async def expire(self, name: str, time: int) -> bool: ...


async def hit(redis: Counter, key: str, limit: int, window_s: int) -> bool:
    """Count one request; True while within the limit."""
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, window_s)
    return count <= limit


def rate_limit(name: str, limit: int, window_s: int) -> Callable[..., Awaitable[None]]:
    async def dependency(request: Request, user: CurrentUser) -> None:
        try:
            allowed = await hit(request.app.state.redis, f"rl:{name}:{user.id}", limit, window_s)
        except RedisError:
            # fail open: an outage of the limiter shouldn't take the endpoint down
            log.warning("rate limiter unavailable", extra={"extra_fields": {"limit": name}})
            return
        if not allowed:
            raise HTTPException(429, "Too many requests", headers={"Retry-After": str(window_s)})

    return dependency
