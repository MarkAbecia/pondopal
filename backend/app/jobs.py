"""Scheduled jobs (run by app/worker.py). They use the privileged connection, so RLS doesn't
apply: every query scopes rows itself. Logs carry counts only, never names or amounts."""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import bindparam, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncConnection

from app.core.logging import log
from app.domain.bills import format_php, roll_forward
from app.integrations.expo_push import Push

Sender = Callable[[list[Push]], Awaitable[list[str]]]  # returns dead tokens

MANILA_DAY = "at time zone 'Asia/Manila')::date"
DAILY_TEMPLATES = ["day_365", "bill_50", "custom"]


@dataclass(frozen=True)
class Note:
    user_id: UUID
    kind: str
    title: str
    body: str
    payload: dict[str, Any]


async def notify(conn: AsyncConnection, send: Sender, notes: list[Note]) -> int:
    """Stores each note in the in-app inbox, then pushes to users who have a device token."""
    if not notes:
        return 0
    await conn.execute(
        text(
            "insert into public.notifications (user_id, kind, payload) "
            "values (:user_id, :kind, :payload)"
        ).bindparams(bindparam("payload", type_=JSONB)),
        [
            {
                "user_id": n.user_id,
                "kind": n.kind,
                "payload": {**n.payload, "title": n.title, "body": n.body},
            }
            for n in notes
        ],
    )
    rows = await conn.execute(
        text(
            "select user_id, expo_push_token from public.profiles "
            "where user_id = any(:ids) and expo_push_token is not null"
        ),
        {"ids": list({n.user_id for n in notes})},
    )
    tokens = {r.user_id: r.expo_push_token for r in rows}
    pushes = [
        Push(tokens[n.user_id], n.title, n.body, {"kind": n.kind, **n.payload})
        for n in notes
        if n.user_id in tokens
    ]
    dead = await send(pushes) if pushes else []
    if dead:
        await conn.execute(
            text(
                "update public.profiles set expo_push_token = null where expo_push_token = any(:t)"
            ),
            {"t": dead},
        )
    return len(pushes)


def _when(due: date, today: date) -> str:
    return "today" if due == today else "tomorrow"


async def bill_reminders(conn: AsyncConnection, send: Sender, today: date) -> int:
    """08:00 daily: move past due dates to their next occurrence, then remind every non-viewer
    member about bills due today or tomorrow."""
    stale = await conn.execute(
        text(
            f"""
            select id, frequency::text, due_day, (next_due_at {MANILA_DAY} due
            from public.recurring_bills where (next_due_at {MANILA_DAY} < :today
            """  # noqa: S608 - constant
        ),
        {"today": today},
    )
    updates = [
        {"id": r.id, "due": roll_forward(r.due, r.frequency, r.due_day, today)} for r in stale
    ]
    if updates:
        await conn.execute(
            text(
                "update public.recurring_bills "
                "set next_due_at = cast(:due as date)::timestamp at time zone 'Asia/Manila' "
                "where id = :id"
            ),
            updates,
        )

    rows = await conn.execute(
        text(
            f"""
            select b.id, b.space_id, b.name, b.amount_centavos, (b.next_due_at {MANILA_DAY} due,
                   m.user_id
            from public.recurring_bills b
            join public.space_members m
              on m.space_id = b.space_id and m.left_at is null and m.role <> 'viewer'
            where (b.next_due_at {MANILA_DAY} between :today and :tomorrow
            """  # noqa: S608
        ),
        {"today": today, "tomorrow": today + timedelta(days=1)},
    )
    notes = [
        Note(
            r.user_id,
            "bill_due",
            f"{r.name} is due {_when(r.due, today)}",
            f"{format_php(r.amount_centavos)} due on {r.due:%b %d}",
            {"bill_id": str(r.id), "space_id": str(r.space_id), "due": r.due.isoformat()},
        )
        for r in rows
    ]
    sent = await notify(conn, send, notes)
    log.info(
        "bill reminders",
        extra={"extra_fields": {"rolled": len(updates), "notes": len(notes), "pushed": sent}},
    )
    return len(notes)


async def streak_nudges(conn: AsyncConnection, send: Sender, today: date) -> int:
    """20:00 daily: nudge members who saved in the last period but not yet in this one, so the
    streak survives. Daily challenges every day; the 52-week challenge on Sundays."""
    periods = [(DAILY_TEMPLATES, today - timedelta(days=1), today)]
    if today.weekday() == 6:
        monday = today - timedelta(days=6)
        periods.append((["week_52"], monday - timedelta(days=7), monday))

    notes: list[Note] = []
    for keys, last_start, current_start in periods:
        rows = await conn.execute(
            text(
                f"""
                select distinct c.id, c.space_id, c.name, e.user_id
                from public.challenges c
                join public.challenge_entries e on e.challenge_id = c.id
                join public.space_members m
                  on m.space_id = c.space_id and m.user_id = e.user_id and m.left_at is null
                where c.status = 'active' and c.template_key = any(:keys)
                  and (e.saved_at {MANILA_DAY} >= :last_start
                  and (e.saved_at {MANILA_DAY} < :current_start
                  and not exists (
                    select 1 from public.challenge_entries x
                    where x.challenge_id = c.id and x.user_id = e.user_id
                      and (x.saved_at {MANILA_DAY} >= :current_start)
                """  # noqa: S608
            ),
            {"keys": keys, "last_start": last_start, "current_start": current_start},
        )
        notes += [
            Note(
                r.user_id,
                "streak_nudge",
                "Keep your streak going",
                f"You haven't saved for {r.name} yet. Add an entry before the day ends."
                if keys is DAILY_TEMPLATES
                else f"This week's {r.name} entry is still open.",
                {"challenge_id": str(r.id), "space_id": str(r.space_id)},
            )
            for r in rows
        ]
    sent = await notify(conn, send, notes)
    log.info("streak nudges", extra={"extra_fields": {"notes": len(notes), "pushed": sent}})
    return len(notes)


async def paluwagan_alerts(conn: AsyncConnection, send: Sender, today: date) -> int:
    """08:00 daily: remind payers of unpaid paluwagan rounds due today or tomorrow."""
    rows = await conn.execute(
        text(
            """
            select r.id, r.space_id, r.user_id, r.due_date, p.name, p.contribution_centavos
            from public.paluwagan_rounds r
            join public.paluwagan p on p.id = r.paluwagan_id
            where r.paid_at is null and p.status = 'active'
              and r.due_date between :today and :tomorrow
            """
        ),
        {"today": today, "tomorrow": today + timedelta(days=1)},
    )
    notes = [
        Note(
            r.user_id,
            "paluwagan_due",
            f"{r.name} hulog is due {_when(r.due_date, today)}",
            f"{format_php(r.contribution_centavos)} on {r.due_date:%b %d}",
            {"round_id": str(r.id), "space_id": str(r.space_id), "due": r.due_date.isoformat()},
        )
        for r in rows
    ]
    sent = await notify(conn, send, notes)
    log.info("paluwagan alerts", extra={"extra_fields": {"notes": len(notes), "pushed": sent}})
    return len(notes)
