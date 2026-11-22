"""RA 10173 export and deletion against a real Supabase Postgres (see test_invites_db.py)."""

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
ANA, BEN, CHI = (uuid.uuid4() for _ in range(3))
KEPT, SOLO = uuid.uuid4(), uuid.uuid4()


async def sql(query: str, **params: object) -> list[dict[str, object]]:
    engine = make_engine(DB_URL)
    try:
        async with engine.begin() as conn:
            res = await conn.execute(text(query), params)
            return [dict(r) for r in res.mappings()] if res.returns_rows else []
    finally:
        await engine.dispose()


@pytest.fixture
async def api() -> AsyncIterator[httpx.AsyncClient]:
    if not DB_URL or not SECRET:
        pytest.skip("DATABASE_URL and SUPABASE_JWT_SECRET are required")
    for uid in (ANA, BEN, CHI):
        await sql(
            "insert into auth.users (id, email) values (:id, :e)", id=uid, e=f"{uid}@int.test"
        )
    # Ana owns KEPT (Ben is a member, Chi an admin) and SOLO (nobody else)
    await sql(
        "insert into public.spaces (id, name, type, created_by) values "
        "(:k, 'Barkada', 'group', :ana), (:s, 'Solo', 'group', :ana)",
        k=KEPT,
        s=SOLO,
        ana=ANA,
    )
    await sql(
        "insert into public.space_members (space_id, user_id, role) values "
        "(:k, :ben, 'member'), (:k, :chi, 'admin')",
        k=KEPT,
        ben=BEN,
        chi=CHI,
    )
    await sql(
        "insert into public.transactions (space_id, user_id, type, amount_centavos, note) "
        "values (:k, :ana, 'expense', 12345, 'pizza'), "
        "((select id from public.spaces where created_by = :ana and type = 'personal'), "
        "  :ana, 'expense', 500, 'secret')",
        k=KEPT,
        ana=ANA,
    )
    settings = Settings(
        database_url=DB_URL,
        supabase_jwt_secret=SECRET,
        supabase_jwks_url="",
        supabase_service_role_key="",
    )
    app = create_app(settings)
    app.state.engine = make_engine(DB_URL)
    app.state.redis = FakeRedis()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        yield c
    await app.state.engine.dispose()
    await sql("delete from public.spaces where id = any(:ids)", ids=[KEPT, SOLO])
    await sql("delete from auth.users where id = any(:ids)", ids=[ANA, BEN, CHI])


def as_user(uid: uuid.UUID) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(uid, secret=SECRET)}"}


async def test_export_has_only_my_data(api: httpx.AsyncClient) -> None:
    r = await api.get("/v1/me/export", headers=as_user(ANA))
    assert r.status_code == 200, r.text
    data = r.json()
    assert sorted(t["note"] for t in data["transactions"]) == ["pizza", "secret"]
    assert {s["name"] for s in data["spaces"]} >= {"Barkada", "Solo"}
    assert (await api.get("/v1/me/export", headers=as_user(BEN))).json()["transactions"] == []


async def test_delete_account(api: httpx.AsyncClient) -> None:
    personal = await sql(
        "select id from public.spaces where created_by = :u and type = 'personal'", u=ANA
    )
    r = await api.delete("/v1/me", headers=as_user(ANA))
    assert r.status_code == 204, r.text

    assert await sql("select 1 from auth.users where id = :u", u=ANA) == []
    assert await sql("select 1 from public.profiles where user_id = :u", u=ANA) == []
    assert await sql("select 1 from public.spaces where id = :s", s=personal[0]["id"]) == []
    assert await sql("select 1 from public.spaces where id = :s", s=SOLO) == []  # nobody left
    # the admin outranks the earlier-joined member as heir
    roles = await sql(
        "select user_id, role::text from public.space_members where space_id = :k", k=KEPT
    )
    assert {r["user_id"]: r["role"] for r in roles} == {BEN: "member", CHI: "owner"}
    # the shared space's history survives without the link to Ana
    kept = await sql("select user_id, note from public.transactions where space_id = :k", k=KEPT)
    assert kept == [{"user_id": None, "note": "pizza"}]
