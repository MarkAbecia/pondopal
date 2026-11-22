"""Account export and deletion (RA 10173). These run on the privileged connection (ADR 0004),
so every query is scoped to the user id explicitly."""

from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

# What the user put in: their own rows. Rows in shared spaces written by others aren't theirs.
EXPORT_QUERIES = {
    "profile": "select display_name, avatar_url, locale, timezone, created_at "
    "from public.profiles where user_id = :u",
    "spaces": "select s.id, s.name, s.type::text, m.role::text, m.joined_at, m.left_at "
    "from public.space_members m join public.spaces s on s.id = m.space_id where m.user_id = :u",
    "payment_sources": "select id, name, kind::text, created_at from public.payment_sources "
    "where user_id = :u",
    "transactions": "select t.id, t.space_id, t.type::text, t.amount_centavos, t.occurred_at, "
    "t.note, c.name category, p.name payment_source, t.receipt_path "
    "from public.transactions t left join public.categories c on c.id = t.category_id "
    "left join public.payment_sources p on p.id = t.payment_source_id "
    "where t.user_id = :u order by t.occurred_at",
    "goal_contributions": "select g.name goal, c.amount_centavos, c.contributed_at "
    "from public.goal_contributions c join public.goals g on g.id = c.goal_id "
    "where c.user_id = :u order by c.contributed_at",
    "challenge_entries": "select ch.name challenge, e.cell_index, e.amount_centavos, e.saved_at "
    "from public.challenge_entries e join public.challenges ch on ch.id = e.challenge_id "
    "where e.user_id = :u order by e.saved_at",
    "split_shares": "select x.transaction_id, x.share_centavos, x.created_at "
    "from public.transaction_splits x where x.user_id = :u order by x.created_at",
    "settlements": "select space_id, from_user = :u as paid_by_me, amount_centavos, settled_at "
    "from public.settlements where from_user = :u or to_user = :u order by settled_at",
    "paluwagan_contributions": "select p.name paluwagan, r.round_number, r.due_date, r.paid_at "
    "from public.paluwagan_rounds r join public.paluwagan p on p.id = r.paluwagan_id "
    "where r.user_id = :u order by r.due_date",
    "notifications": "select kind, payload, read_at, created_at from public.notifications "
    "where user_id = :u order by created_at",
}


async def export(conn: AsyncConnection, user_id: UUID) -> dict[str, list[dict[str, Any]]]:
    out = {}
    for name, query in EXPORT_QUERIES.items():
        rows = await conn.execute(text(query), {"u": user_id})
        out[name] = [dict(r) for r in rows.mappings()]
    return out


async def personal_space(conn: AsyncConnection, user_id: UUID) -> UUID | None:
    sid = await conn.scalar(
        text("select id from public.spaces where created_by = :u and type = 'personal'"),
        {"u": user_id},
    )
    return UUID(str(sid)) if sid else None


async def delete(conn: AsyncConnection, user_id: UUID) -> None:
    """Shared spaces the user owns pass to the next admin, then member, then viewer (earliest
    joined first). Owned shared spaces with nobody else in them are deleted. Then the auth user
    goes, which cascades to their rows and (trigger) their personal space. Transactions they
    logged in shared spaces stay, with user_id set to null, so the space's history still adds up."""
    params = {"u": user_id}
    await conn.execute(
        text(
            """
            update public.space_members m set role = 'owner'
            from (
              select distinct on (o.space_id) o.space_id, h.user_id
              from public.space_members o
              join public.spaces s on s.id = o.space_id and s.type <> 'personal'
              join public.space_members h
                on h.space_id = o.space_id and h.user_id <> o.user_id and h.left_at is null
              where o.user_id = :u and o.role = 'owner' and o.left_at is null
              order by o.space_id, h.role, h.joined_at
            ) heir
            where m.space_id = heir.space_id and m.user_id = heir.user_id
            """
        ),
        params,
    )
    await conn.execute(
        text(
            """
            delete from public.spaces s
            where s.type <> 'personal'
              and exists (select 1 from public.space_members o where o.space_id = s.id
                          and o.user_id = :u and o.role = 'owner' and o.left_at is null)
              and not exists (select 1 from public.space_members h where h.space_id = s.id
                              and h.user_id <> :u and h.left_at is null)
            """
        ),
        params,
    )
    await conn.execute(text("delete from auth.users where id = :u"), params)
