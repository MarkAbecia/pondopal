import time
import uuid
from collections.abc import AsyncIterator, Iterator
from typing import Any

import jwt
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.db import user_db
from app.main import create_app

SECRET = "test-secret-at-least-32-characters-long!"


def make_token(sub: uuid.UUID | str, *, secret: str = SECRET, **overrides: Any) -> str:
    claims = {
        "sub": str(sub),
        "aud": "authenticated",
        "role": "authenticated",
        "exp": int(time.time()) + 300,
        **overrides,
    }
    return jwt.encode(claims, secret, algorithm="HS256")


class FakeRedis:
    def __init__(self) -> None:
        self.counts: dict[str, int] = {}

    async def incr(self, name: str) -> int:
        self.counts[name] = self.counts.get(name, 0) + 1
        return self.counts[name]

    async def expire(self, name: str, time: int) -> bool:
        return True

    async def aclose(self) -> None:
        pass


@pytest.fixture
def app() -> FastAPI:
    return create_app(Settings(supabase_jwt_secret=SECRET, supabase_jwks_url=""))


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    async def no_db() -> AsyncIterator[object]:
        yield object()  # repositories are monkeypatched in API tests

    app.dependency_overrides[user_db] = no_db
    with TestClient(app) as c:
        app.state.redis = FakeRedis()
        yield c
