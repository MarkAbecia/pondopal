"""Splits, settle-up and paluwagan against a real Supabase Postgres (see test_invites_db.py)."""

import os
import uuid
from collections.abc import AsyncIterator
from datetime import datetime, timedelta

import httpx
import pytest
from sqlalchemy import text

from app import jobs
from app.core.config import Settings
from app.core.db import make_engine
from app.domain.time import MANILA
from app.integrations.expo_push import Push
from app.main import create_app
from tests.conftest import FakeRedis, make_token

pytestmark = pytest.mark.integration

DB_URL = os.environ.get("DATABASE_URL", "")
SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
ANA, BEN, CHI, VIC, DAVE = (uuid.uuid4() for _ in range(5))
SPACE = uuid.uuid4()
DINNER, GRAB, SALARY = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
TODAY = datetime.now(MANILA).date()


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
    people = {ANA: "Ana", BEN: "Ben", CHI: "Chi", VIC: "Vic", DAVE: "Dave"}
    for uid, name in people.items():
        await sql(
            "insert into auth.users (id, email) values (:id, :e)", id=uid, e=f"{uid}@int.test"
        )
        await sql(
            "update public.profiles set display_name = :n where user_id = :id", n=name, id=uid
        )
    await sql(
        "insert into public.spaces (id, name, type, created_by) "
        "values (:s, 'Boracay trip', 'group', :ana)",
        s=SPACE,
        ana=ANA,
    )
    await sql(
        "insert into public.space_members (space_id, user_id, role) values "
        "(:s, :ben, 'member'), (:s, :chi, 'member'), (:s, :vic, 'viewer')",
        s=SPACE,
        ben=BEN,
        chi=CHI,
        vic=VIC,
    )
    await sql(
        "insert into public.transactions (id, space_id, user_id, type, amount_centavos) values "
        "(:d, :s, :ana, 'expense', 300000), (:g, :s, :ben, 'expense', 60000), "
        "(:i, :s, :ana, 'income', 100000)",
        d=DINNER,
        g=GRAB,
        i=SALARY,
        s=SPACE,
        ana=ANA,
        ben=BEN,
    )
    settings = Settings(database_url=DB_URL, supabase_jwt_secret=SECRET, supabase_jwks_url="")
    app = create_app(settings)
    app.state.engine = make_engine(DB_URL)
    app.state.redis = FakeRedis()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        yield c
    await app.state.engine.dispose()
    await sql("delete from public.spaces where id = :s", s=SPACE)
    await sql("delete from auth.users where id = any(:ids)", ids=list(people))


def as_user(uid: uuid.UUID) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(uid, secret=SECRET)}"}


def shares(*people: uuid.UUID, values: list[int] | None = None) -> list[dict[str, object]]:
    return [
        {"user_id": str(p), "value": values[i] if values else None} for i, p in enumerate(people)
    ]


async def test_splits_and_settle_up(api: httpx.AsyncClient) -> None:
    url = f"/v1/transactions/{DINNER}/splits"
    equal = {"method": "equal", "shares": shares(ANA, BEN, CHI)}
    assert (await api.put(url, json=equal, headers=as_user(BEN))).status_code == 403  # not payer
    assert (await api.put(url, json=equal, headers=as_user(DAVE))).status_code == 404
    bad = {"method": "percent", "shares": shares(ANA, BEN, values=[5000, 4000])}
    assert (await api.put(url, json=bad, headers=as_user(ANA))).status_code == 422
    outsider = {"method": "equal", "shares": shares(ANA, DAVE)}
    assert (await api.put(url, json=outsider, headers=as_user(ANA))).status_code == 422
    income = {"method": "equal", "shares": shares(ANA, BEN)}
    r = await api.put(f"/v1/transactions/{SALARY}/splits", json=income, headers=as_user(ANA))
    assert r.status_code == 409

    # a first split, then a replacement
    r = await api.put(
        url, json={"method": "equal", "shares": shares(ANA, BEN)}, headers=as_user(ANA)
    )
    assert r.status_code == 200, r.text
    r = await api.put(url, json=equal, headers=as_user(ANA))
    assert [s["share_centavos"] for s in r.json()] == [100_000, 100_000, 100_000]
    exact = {"method": "exact", "shares": shares(BEN, CHI, values=[30_000, 30_000])}
    r = await api.put(f"/v1/transactions/{GRAB}/splits", json=exact, headers=as_user(BEN))
    assert r.status_code == 200, r.text
    await sql(
        "insert into public.settlements (space_id, from_user, to_user, amount_centavos) "
        "values (:s, :chi, :ana, 50000)",
        s=SPACE,
        chi=CHI,
        ana=ANA,
    )

    r = await api.get(f"/v1/spaces/{SPACE}/settle-up", headers=as_user(VIC))
    assert r.status_code == 200, r.text
    data = r.json()
    assert {b["display_name"]: b["net_centavos"] for b in data["balances"]} == {
        "Ana": 150_000,
        "Ben": -70_000,
        "Chi": -80_000,
        "Vic": 0,
    }
    assert [(t["from_user"], t["to_user"], t["amount_centavos"]) for t in data["transfers"]] == [
        (str(CHI), str(ANA), 80_000),
        (str(BEN), str(ANA), 70_000),
    ]
    assert (
        await api.get(f"/v1/spaces/{SPACE}/settle-up", headers=as_user(DAVE))
    ).status_code == 404


async def test_paluwagan(api: httpx.AsyncClient) -> None:
    body = {
        "space_id": str(SPACE),
        "name": "Paluwagan sa opisina",
        "contribution_centavos": 100_000,
        "frequency": "weekly",
        "start_date": TODAY.isoformat(),
        "member_ids": [str(BEN), str(ANA), str(CHI)],
    }
    assert (await api.post("/v1/paluwagan", json=body, headers=as_user(BEN))).status_code == 403
    outsider = {**body, "member_ids": [str(ANA), str(DAVE)]}
    assert (await api.post("/v1/paluwagan", json=outsider, headers=as_user(ANA))).status_code == 422
    twice = {**body, "member_ids": [str(ANA), str(ANA)]}
    assert (await api.post("/v1/paluwagan", json=twice, headers=as_user(ANA))).status_code == 422
    r = await api.post("/v1/paluwagan", json=body, headers=as_user(ANA))
    assert r.status_code == 201, r.text
    url = f"/v1/paluwagan/{r.json()['id']}"

    s = (await api.get(f"{url}/schedule", headers=as_user(VIC))).json()
    assert [m["display_name"] for m in s["members"]] == ["Ben", "Ana", "Chi"]
    assert [
        (x["round_number"], x["due_date"], x["recipient_id"], x["pot_centavos"])
        for x in s["rounds"]
    ] == [
        (1, TODAY.isoformat(), str(BEN), 300_000),
        (2, (TODAY + timedelta(days=7)).isoformat(), str(ANA), 300_000),
        (3, (TODAY + timedelta(days=14)).isoformat(), str(CHI), 300_000),
    ]
    assert s["current_round"] == 1

    # round 1 is due today and nobody has paid: each of the 3 payers gets a reminder
    sent: list[Push] = []

    async def send(pushes: list[Push]) -> list[str]:
        sent.extend(pushes)
        return []

    engine = make_engine(DB_URL)
    try:
        async with engine.begin() as conn:
            assert await jobs.paluwagan_alerts(conn, send, TODAY) == 3
    finally:
        await engine.dispose()
    notes = await sql(
        "select payload->>'paluwagan_id' pid from public.notifications "
        "where user_id = :u and kind = 'paluwagan_due'",
        u=BEN,
    )
    assert notes == [{"pid": url.rsplit("/", 1)[1]}]

    r = await api.post(f"{url}/rounds/1/pay", headers=as_user(BEN))
    assert r.status_code == 200, r.text
    assert r.json()["paid_at"] is not None
    other = {"user_id": str(ANA)}
    assert (
        await api.post(f"{url}/rounds/1/pay", json=other, headers=as_user(BEN))
    ).status_code == 403
    assert (await api.post(f"{url}/rounds/1/pay", headers=as_user(VIC))).status_code == 403
    assert (await api.post(f"{url}/rounds/9/pay", headers=as_user(ANA))).status_code == 404
    assert (await api.get(f"{url}/schedule", headers=as_user(DAVE))).status_code == 404
    for uid in (ANA, CHI):  # the owner records the rest of round 1
        r = await api.post(f"{url}/rounds/1/pay", json={"user_id": str(uid)}, headers=as_user(ANA))
        assert r.status_code == 200, r.text

    s = (await api.get(f"{url}/schedule", headers=as_user(BEN))).json()
    assert s["rounds"][0]["paid_count"] == 3
    assert s["current_round"] == 2
    assert s["paluwagan"]["status"] == "active"
