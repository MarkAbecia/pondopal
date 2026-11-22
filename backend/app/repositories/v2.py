"""Splits, settle-up and paluwagan queries. Runs on a user-scoped connection, so RLS applies."""

from datetime import date
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection


async def transaction(conn: AsyncConnection, txn_id: UUID) -> dict[str, Any] | None:
    row = await conn.execute(
        text(
            "select t.id, t.space_id, t.user_id, t.type::text, t.amount_centavos, s.type::text "
            "space_type from public.transactions t join public.spaces s on s.id = t.space_id "
            "where t.id = :id"
        ),
        {"id": txn_id},
    )
    found = row.mappings().one_or_none()
    return dict(found) if found else None


async def active_members(conn: AsyncConnection, space_id: UUID) -> dict[UUID, str | None]:
    """user_id -> display name of everyone currently in the space."""
    rows = await conn.execute(
        text(
            "select m.user_id, p.display_name from public.space_members m "
            "left join public.profiles p on p.user_id = m.user_id "
            "where m.space_id = :id and m.left_at is null"
        ),
        {"id": space_id},
    )
    return {r.user_id: r.display_name for r in rows}


async def replace_splits(
    conn: AsyncConnection, txn_id: UUID, space_id: UUID, shares: list[tuple[UUID, int]]
) -> None:
    await conn.execute(
        text("delete from public.transaction_splits where transaction_id = :id"), {"id": txn_id}
    )
    await conn.execute(
        text(
            "insert into public.transaction_splits "
            "(transaction_id, space_id, user_id, share_centavos) values (:t, :s, :u, :share)"
        ),
        [{"t": txn_id, "s": space_id, "u": u, "share": share} for u, share in shares],
    )


async def split_rows(conn: AsyncConnection, space_id: UUID) -> list[dict[str, Any]]:
    """Every split share in the space with its payer. Expenses whose payer deleted their
    account (user_id null) are left out: nobody is left to pay back."""
    rows = await conn.execute(
        text(
            "select t.id txn, t.user_id payer, x.user_id, x.share_centavos "
            "from public.transaction_splits x "
            "join public.transactions t on t.id = x.transaction_id "
            "where x.space_id = :id and t.user_id is not null"
        ),
        {"id": space_id},
    )
    return [dict(r) for r in rows.mappings()]


async def settlement_rows(conn: AsyncConnection, space_id: UUID) -> list[tuple[UUID, UUID, int]]:
    rows = await conn.execute(
        text(
            "select from_user, to_user, amount_centavos from public.settlements "
            "where space_id = :id and from_user is not null and to_user is not null"
        ),
        {"id": space_id},
    )
    return [(r.from_user, r.to_user, r.amount_centavos) for r in rows]


async def create_paluwagan(
    conn: AsyncConnection,
    values: dict[str, Any],
    member_ids: list[UUID],
    due: list[date],
) -> dict[str, Any]:
    row = await conn.execute(
        text(
            "insert into public.paluwagan (space_id, name, contribution_centavos, frequency, "
            "start_date) values (:space_id, :name, :contribution_centavos, "
            "cast(:frequency as public.pay_frequency), :start_date) "
            "returning id, space_id, name, contribution_centavos, frequency::text, start_date, "
            "status::text"
        ),
        values,
    )
    pal = dict(row.mappings().one())
    base = {"p": pal["id"], "s": pal["space_id"]}
    await conn.execute(
        text(
            "insert into public.paluwagan_members (paluwagan_id, space_id, user_id, payout_order) "
            "values (:p, :s, :u, :n)"
        ),
        [{**base, "u": u, "n": i} for i, u in enumerate(member_ids, start=1)],
    )
    # everyone pays every round, the recipient included: pot = N x contribution
    await conn.execute(
        text(
            "insert into public.paluwagan_rounds "
            "(paluwagan_id, space_id, round_number, user_id, due_date) values (:p, :s, :r, :u, :d)"
        ),
        [{**base, "r": r, "u": u, "d": d} for r, d in enumerate(due, start=1) for u in member_ids],
    )
    return pal


async def paluwagan(conn: AsyncConnection, pal_id: UUID) -> dict[str, Any] | None:
    row = await conn.execute(
        text(
            "select id, space_id, name, contribution_centavos, frequency::text, start_date, "
            "status::text from public.paluwagan where id = :id"
        ),
        {"id": pal_id},
    )
    found = row.mappings().one_or_none()
    return dict(found) if found else None


async def paluwagan_members(conn: AsyncConnection, pal_id: UUID) -> list[dict[str, Any]]:
    rows = await conn.execute(
        text(
            "select m.user_id, p.display_name, m.payout_order from public.paluwagan_members m "
            "left join public.profiles p on p.user_id = m.user_id "
            "where m.paluwagan_id = :id order by m.payout_order"
        ),
        {"id": pal_id},
    )
    return [dict(r) for r in rows.mappings()]


async def paluwagan_rounds(conn: AsyncConnection, pal_id: UUID) -> list[dict[str, Any]]:
    rows = await conn.execute(
        text(
            "select round_number, user_id, due_date, paid_at from public.paluwagan_rounds "
            "where paluwagan_id = :id order by round_number, user_id"
        ),
        {"id": pal_id},
    )
    return [dict(r) for r in rows.mappings()]


async def pay(
    conn: AsyncConnection, pal_id: UUID, round_number: int, user_id: UUID, paid: bool
) -> Any:
    # the function checks who may mark whom (database/.../20261122000500_v2_paluwagan_pay.sql)
    return await conn.scalar(
        text("select public.pay_paluwagan_round(:p, :r, :u, :paid)"),
        {"p": pal_id, "r": round_number, "u": user_id, "paid": paid},
    )
