"""Challenge and goal queries. Runs on a user-scoped connection, so RLS applies."""

from datetime import date
from typing import Any
from uuid import UUID

from sqlalchemy import bindparam, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncConnection

COLS = "id, space_id, template_key, name, base_centavos, settings, start_date, status::text"
MANILA_TODAY = "(now() at time zone 'Asia/Manila')::date"


async def templates(conn: AsyncConnection) -> list[dict[str, Any]]:
    rows = await conn.execute(
        text("select key, name, description, rules from public.challenge_templates order by name")
    )
    return [dict(r) for r in rows.mappings()]


async def template_rules(conn: AsyncConnection, key: str) -> dict[str, Any] | None:
    rules = await conn.scalar(
        text("select rules from public.challenge_templates where key = :key"), {"key": key}
    )
    return dict(rules) if rules is not None else None


async def create(conn: AsyncConnection, values: dict[str, Any]) -> dict[str, Any]:
    row = await conn.execute(
        text(
            f"""
            insert into public.challenges
              (space_id, template_key, name, base_centavos, settings, start_date)
            values (:space_id, :template_key, :name, :base_centavos, :settings,
                    coalesce(cast(:start_date as date), {MANILA_TODAY}))
            returning {COLS}
            """  # noqa: S608 - module constants only
        ).bindparams(bindparam("settings", type_=JSONB)),
        values,
    )
    return dict(row.mappings().one())


async def get(conn: AsyncConnection, challenge_id: UUID) -> dict[str, Any] | None:
    row = await conn.execute(
        text(f"select {COLS} from public.challenges where id = :id"),  # noqa: S608
        {"id": challenge_id},
    )
    found = row.mappings().one_or_none()
    return dict(found) if found else None


async def next_cell(conn: AsyncConnection, challenge_id: UUID) -> int:
    n = await conn.scalar(
        text(
            """
            select coalesce(max(cell_index), 0) + 1 from public.challenge_entries
            where challenge_id = :id and user_id = auth.uid()
            """
        ),
        {"id": challenge_id},
    )
    return int(n)


async def add_entry(
    conn: AsyncConnection, challenge_id: UUID, space_id: UUID, cell_index: int, amount: int
) -> dict[str, Any]:
    row = await conn.execute(
        text(
            """
            insert into public.challenge_entries
              (challenge_id, space_id, cell_index, amount_centavos)
            values (:challenge_id, :space_id, :cell_index, :amount)
            returning id, cell_index, amount_centavos, saved_at
            """
        ),
        {
            "challenge_id": challenge_id,
            "space_id": space_id,
            "cell_index": cell_index,
            "amount": amount,
        },
    )
    return dict(row.mappings().one())


async def entries(conn: AsyncConnection, challenge_id: UUID) -> list[dict[str, Any]]:
    rows = await conn.execute(
        text(
            """
            select user_id, cell_index, amount_centavos,
                   (saved_at at time zone 'Asia/Manila')::date saved_on
            from public.challenge_entries where challenge_id = :id
            """
        ),
        {"id": challenge_id},
    )
    return [dict(r) for r in rows.mappings()]


async def members(conn: AsyncConnection, space_id: UUID) -> list[dict[str, Any]]:
    rows = await conn.execute(
        text(
            """
            select m.user_id, p.display_name from public.space_members m
            left join public.profiles p on p.user_id = m.user_id
            where m.space_id = :id and m.left_at is null
            """
        ),
        {"id": space_id},
    )
    return [dict(r) for r in rows.mappings()]


async def expense_days(conn: AsyncConnection, space_id: UUID, since: date) -> list[date]:
    rows = await conn.scalars(
        text(
            """
            select distinct (occurred_at at time zone 'Asia/Manila')::date
            from public.transactions
            where space_id = :id and type = 'expense'
              and occurred_at >= (cast(:since as date)::timestamp at time zone 'Asia/Manila')
            """
        ),
        {"id": space_id, "since": since},
    )
    return list(rows)


async def goal_with_total(conn: AsyncConnection, goal_id: UUID) -> dict[str, Any] | None:
    row = await conn.execute(
        text(
            """
            select g.id, g.target_centavos, g.deadline, g.pay_frequency::text pay_frequency,
                   (g.created_at at time zone 'Asia/Manila')::date started_on,
                   coalesce((select sum(c.amount_centavos) from public.goal_contributions c
                             where c.goal_id = g.id), 0)::bigint contributed
            from public.goals g where g.id = :id
            """
        ),
        {"id": goal_id},
    )
    found = row.mappings().one_or_none()
    return dict(found) if found else None
