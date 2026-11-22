"""End to end against a real Supabase Postgres (run by misc/ci/database.sh after `supabase start`).

Needs DATABASE_URL (superuser, for setup) and SUPABASE_JWT_SECRET (local legacy secret) in env.
"""

import os
import uuid
from collections.abc import AsyncIterator

import httpx
import pytest
from sqlalchemy import text

from app.core.config import Settings
from app.core.db import make_engine
from app.main import create_app
from tests.conftest import FakeRedis, make_token

pytestmark = pytest.mark.integration

DB_URL = os.environ.get("DATABASE_URL", "")
SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
ALICE, BOB, DAVE = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
SPACE = uuid.uuid4()


@pytest.fixture
async def seeded() -> AsyncIterator[None]:
    if not DB_URL or not SECRET:
        pytest.skip("DATABASE_URL and SUPABASE_JWT_SECRET are required")
    engine = make_engine(DB_URL)
    async with engine.begin() as conn:
        for uid in (ALICE, BOB, DAVE):
            await conn.execute(
                text("insert into auth.users (id, email) values (:id, :email)"),
                {"id": uid, "email": f"{uid}@integration.test"},
            )
        await conn.execute(
            text(
                "insert into public.spaces (id, name, type, created_by) "
                "values (:id, 'Integration', 'group', :owner)"
            ),
            {"id": SPACE, "owner": ALICE},
        )
        await conn.execute(
            text(
                "insert into public.space_members (space_id, user_id, role) "
                "values (:id, :bob, 'member')"
            ),
            {"id": SPACE, "bob": BOB},
        )
    await engine.dispose()  # don't hold a pooled superuser connection during the test
    yield
    async with engine.begin() as conn:
        await conn.execute(text("delete from public.spaces where id = :id"), {"id": SPACE})
        await conn.execute(
            text("delete from auth.users where id = any(:ids)"), {"ids": [ALICE, BOB, DAVE]}
        )
    await engine.dispose()


@pytest.fixture
async def api(seeded: None) -> AsyncIterator[httpx.AsyncClient]:
    settings = Settings(database_url=DB_URL, supabase_jwt_secret=SECRET, supabase_jwks_url="")
    app = create_app(settings)
    # ASGITransport doesn't run lifespan, so wire state here
    app.state.engine = make_engine(DB_URL)
    app.state.redis = FakeRedis()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        yield c
    await app.state.engine.dispose()


def as_user(uid: uuid.UUID) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(uid, secret=SECRET)}"}


async def test_invite_flow_under_rls(api: httpx.AsyncClient) -> None:
    # member can't invite; owner can
    r = await api.post(f"/v1/spaces/{SPACE}/invites", json={}, headers=as_user(BOB))
    assert r.status_code == 403
    r = await api.post(f"/v1/spaces/{SPACE}/invites", json={"max_uses": 1}, headers=as_user(ALICE))
    assert r.status_code == 201, r.text
    code = r.json()["code"]

    # outsider can't even see the space
    r = await api.post(f"/v1/spaces/{SPACE}/invites", json={}, headers=as_user(DAVE))
    assert r.status_code == 404

    # accept: works once, code is then used up
    r = await api.post(f"/v1/invites/{code.lower()}/accept", headers=as_user(DAVE))
    assert r.status_code == 200 and r.json() == {"space_id": str(SPACE)}
    r = await api.post(f"/v1/invites/{code}/accept", headers=as_user(BOB))
    assert r.status_code == 404
    assert r.json()["detail"] == "invite is invalid or expired"
