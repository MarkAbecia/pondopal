"""Challenges, goal plans and scheduled jobs against a real Supabase Postgres.
Same setup as test_invites_db.py: DATABASE_URL (superuser) and SUPABASE_JWT_SECRET."""

import os
import uuid
from collections.abc import AsyncIterator
from datetime import date, datetime, timedelta

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
ALICE, BOB, VIC, DAVE = (uuid.uuid4() for _ in range(4))
SPACE = uuid.uuid4()
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
    for uid, name in ((ALICE, "Alice"), (BOB, "Bob"), (VIC, "Vic"), (DAVE, "Dave")):
        await sql(
            "insert into auth.users (id, email) values (:id, :email)",
            id=uid,
            email=f"{uid}@integration.test",
        )
        await sql(
            "update public.profiles set display_name = :n, expo_push_token = :t "
            "where user_id = :id",
            n=name,
            t=f"ExponentPushToken[{name}]",
            id=uid,
        )
    await sql(
        "insert into public.spaces (id, name, type, created_by) "
        "values (:id, 'Ipon crew', 'group', :owner)",
        id=SPACE,
        owner=ALICE,
    )
    await sql(
        "insert into public.space_members (space_id, user_id, role) "
        "values (:s, :bob, 'member'), (:s, :vic, 'viewer')",
        s=SPACE,
        bob=BOB,
        vic=VIC,
    )
    app = create_app(
        Settings(database_url=DB_URL, supabase_jwt_secret=SECRET, supabase_jwks_url="")
    )
    app.state.engine = make_engine(DB_URL)
    app.state.redis = FakeRedis()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        yield c
    await app.state.engine.dispose()
    await sql("delete from public.spaces where id = :id", id=SPACE)
    await sql("delete from auth.users where id = any(:ids)", ids=[ALICE, BOB, VIC, DAVE])


def as_user(uid: uuid.UUID) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(uid, secret=SECRET)}"}


async def test_week_52_challenge(api: httpx.AsyncClient) -> None:
    r = await api.get("/v1/challenges/templates", headers=as_user(BOB))
    assert {"week_52", "day_365", "bill_50", "no_spend", "custom"} <= {t["key"] for t in r.json()}

    body = {
        "space_id": str(SPACE),
        "template_key": "week_52",
        "name": "52 weeks",
        "settings": {"leaderboard": True},
    }
    assert (await api.post("/v1/challenges", json=body, headers=as_user(BOB))).status_code == 403
    assert (await api.post("/v1/challenges", json=body, headers=as_user(DAVE))).status_code == 404
    r = await api.post("/v1/challenges", json=body, headers=as_user(ALICE))
    assert r.status_code == 201, r.text
    ch = r.json()
    assert ch["base_centavos"] == 5000  # template default
    assert ch["start_date"] == TODAY.isoformat()
    url = f"/v1/challenges/{ch['id']}"

    r = await api.post(f"{url}/entries", json={"cell_index": 3}, headers=as_user(BOB))
    assert r.status_code == 201, r.text
    assert r.json()["amount_centavos"] == 15_000
    assert (
        await api.post(f"{url}/entries", json={"cell_index": 3}, headers=as_user(BOB))
    ).status_code == 409
    assert (
        await api.post(f"{url}/entries", json={"cell_index": 53}, headers=as_user(BOB))
    ).status_code == 422
    assert (await api.post(f"{url}/entries", json={}, headers=as_user(BOB))).status_code == 422
    assert (
        await api.post(f"{url}/entries", json={"cell_index": 1}, headers=as_user(VIC))
    ).status_code == 403
    assert (
        await api.post(f"{url}/entries", json={"cell_index": 1}, headers=as_user(DAVE))
    ).status_code == 404
    await api.post(f"{url}/entries", json={"cell_index": 1}, headers=as_user(ALICE))

    r = await api.get(f"{url}/progress", headers=as_user(BOB))
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["cells"] == [3]
    assert p["me"] | {"user_id": None} == {
        "user_id": None,
        "display_name": "Bob",
        "saved_centavos": 15_000,
        "target_centavos": 6_890_000,
        "cells_done": 1,
        "total_cells": 52,
        "percent": 0,
        "streak": 1,
    }
    assert [(m["display_name"], m["saved_centavos"]) for m in p["members"]] == [
        ("Bob", 15_000),
        ("Alice", 5_000),
        ("Vic", 0),
    ]
    assert (await api.get(f"{url}/progress", headers=as_user(DAVE))).status_code == 404


async def test_bill_50_and_no_spend(api: httpx.AsyncClient) -> None:
    r = await api.post(
        "/v1/challenges",
        json={
            "space_id": str(SPACE),
            "template_key": "bill_50",
            "name": "Alkansya",
            "settings": {"target_bills": 10},
        },
        headers=as_user(ALICE),
    )
    url = f"/v1/challenges/{r.json()['id']}"
    r1 = await api.post(f"{url}/entries", json={"bills": 2}, headers=as_user(BOB))
    r2 = await api.post(f"{url}/entries", json={"bills": 1}, headers=as_user(BOB))
    assert [r1.json()["cell_index"], r2.json()["cell_index"]] == [1, 2]
    me = (await api.get(f"{url}/progress", headers=as_user(BOB))).json()["me"]
    assert (me["saved_centavos"], me["target_centavos"], me["percent"]) == (15_000, 50_000, 30)

    start = TODAY - timedelta(days=4)
    r = await api.post(
        "/v1/challenges",
        json={
            "space_id": str(SPACE),
            "template_key": "no_spend",
            "name": "No-spend",
            "start_date": start.isoformat(),
        },
        headers=as_user(ALICE),
    )
    url = f"/v1/challenges/{r.json()['id']}"
    assert (await api.post(f"{url}/entries", json={}, headers=as_user(BOB))).status_code == 409
    # an expense on day 2 (23:30 Manila, which is still the same Manila day)
    spent_at = datetime.combine(start + timedelta(days=1), datetime.min.time(), MANILA) + timedelta(
        hours=23, minutes=30
    )
    await sql(
        "insert into public.transactions (space_id, user_id, type, amount_centavos, occurred_at) "
        "values (:s, :u, 'expense', 1000, :at)",
        s=SPACE,
        u=ALICE,
        at=spent_at,
    )
    p = (await api.get(f"{url}/progress", headers=as_user(BOB))).json()
    assert p["cells"] == [1, 3, 4]  # days 1..4 are over; day 2 had an expense; today never counts
    assert (p["me"]["cells_done"], p["me"]["streak"]) == (3, 2)
    assert {m["cells_done"] for m in p["members"]} == {3}  # space-wide


async def test_goal_plan(api: httpx.AsyncClient) -> None:
    goal = uuid.uuid4()
    await sql(
        "insert into public.goals (id, space_id, name, target_centavos, deadline, pay_frequency, "
        "created_at) values (:g, :s, 'Boracay', 3000000, :d, 'semi_monthly', "
        "now() - interval '30 days')",
        g=goal,
        s=SPACE,
        d=TODAY + timedelta(days=90),
    )
    await sql(
        "insert into public.goal_contributions (goal_id, space_id, user_id, amount_centavos) "
        "values (:g, :s, :u, 1000000)",
        g=goal,
        s=SPACE,
        u=BOB,
    )
    r = await api.post(f"/v1/goals/{goal}/plan", headers=as_user(VIC))
    assert r.status_code == 200, r.text
    p = r.json()
    assert (p["contributed_centavos"], p["remaining_centavos"]) == (1_000_000, 2_000_000)
    assert p["status"] == "on_track"  # 1/3 saved after 1/4 of the time
    assert p["per_day_centavos"] == -(-2_000_000 // 91)
    assert p["projected_finish"] == (TODAY + timedelta(days=60)).isoformat()
    assert (await api.post(f"/v1/goals/{goal}/plan", headers=as_user(DAVE))).status_code == 404


async def test_jobs(api: httpx.AsyncClient) -> None:
    sent: list[Push] = []

    async def send(pushes: list[Push]) -> list[str]:
        sent.extend(pushes)
        return ["ExponentPushToken[Alice]"]  # Expo says Alice's device is gone

    # a monthly bill last due on the 31st, 3 months ago -> rolls to this month
    old_due = date(TODAY.year, TODAY.month, 1) - timedelta(days=70)
    await sql(
        "insert into public.recurring_bills (space_id, name, amount_centavos, due_day, frequency, "
        "next_due_at) values (:s, 'Meralco', 245050, :d, 'monthly', :old), "
        "(:s, 'Netflix', 54900, 1, 'monthly', :tomorrow)",
        s=SPACE,
        d=TODAY.day,
        old=datetime.combine(old_due, datetime.min.time(), MANILA),
        tomorrow=datetime.combine(TODAY + timedelta(days=1), datetime.min.time(), MANILA),
    )
    engine = make_engine(DB_URL)
    try:
        async with engine.begin() as conn:
            count = await jobs.bill_reminders(conn, send, TODAY)
    finally:
        await engine.dispose()

    assert count == 4  # 2 bills x Alice and Bob (the viewer isn't reminded)
    titles = sorted({p.title for p in sent})
    assert titles == ["Meralco is due today", "Netflix is due tomorrow"]
    assert {p.to for p in sent} == {"ExponentPushToken[Alice]", "ExponentPushToken[Bob]"}
    meralco = next(p for p in sent if p.title.startswith("Meralco"))
    assert meralco.body.startswith("₱2,450.50")
    rows = await sql(
        "select (next_due_at at time zone 'Asia/Manila')::date due from public.recurring_bills "
        "where space_id = :s and name = 'Meralco'",
        s=SPACE,
    )
    assert rows[0]["due"] == TODAY
    inbox = await sql(
        "select count(*) n from public.notifications where user_id = :u and kind = 'bill_due'",
        u=BOB,
    )
    assert inbox[0]["n"] == 2
    tokens = await sql(
        "select user_id, expo_push_token from public.profiles where user_id = any(:ids)",
        ids=[ALICE, BOB],
    )
    assert {r["user_id"]: r["expo_push_token"] for r in tokens} == {
        ALICE: None,
        BOB: "ExponentPushToken[Bob]",
    }


async def test_streak_nudge(api: httpx.AsyncClient) -> None:
    r = await api.post(
        "/v1/challenges",
        json={"space_id": str(SPACE), "template_key": "day_365", "name": "365"},
        headers=as_user(ALICE),
    )
    ch = uuid.UUID(r.json()["id"])
    yesterday = datetime.now(MANILA) - timedelta(days=1)
    await sql(
        "insert into public.challenge_entries (challenge_id, space_id, user_id, cell_index, "
        "amount_centavos, saved_at) values (:c, :s, :bob, 5, 500, :y), "
        "(:c, :s, :alice, 6, 600, :y), "
        "(:c, :s, :alice, 7, 700, now())",
        c=ch,
        s=SPACE,
        bob=BOB,
        alice=ALICE,
        y=yesterday,
    )
    sent: list[Push] = []

    async def send(pushes: list[Push]) -> list[str]:
        sent.extend(pushes)
        return []

    engine = make_engine(DB_URL)
    try:
        async with engine.begin() as conn:
            assert await jobs.streak_nudges(conn, send, TODAY) == 1
    finally:
        await engine.dispose()
    assert [p.to for p in sent] == ["ExponentPushToken[Bob]"]  # Alice already saved today
