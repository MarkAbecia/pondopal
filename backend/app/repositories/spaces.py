"""Space, membership and invite queries. Runs on a user-scoped connection, so RLS applies."""

from datetime import timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection


async def my_role(conn: AsyncConnection, space_id: UUID) -> str | None:
    role = await conn.scalar(text("select public.space_role(:id)::text"), {"id": space_id})
    return str(role) if role else None


async def space_type(conn: AsyncConnection, space_id: UUID) -> str | None:
    kind = await conn.scalar(
        text("select type::text from public.spaces where id = :id"), {"id": space_id}
    )
    return str(kind) if kind else None


async def create_invite(
    conn: AsyncConnection, space_id: UUID, role: str, expires_in: timedelta, max_uses: int | None
) -> dict[str, Any]:
    row = await conn.execute(
        text(
            """
            insert into public.invites (space_id, role, expires_at, max_uses)
            values (:space_id, cast(:role as public.space_role), now() + :expires_in, :max_uses)
            returning code, space_id, role::text, expires_at, max_uses
            """
        ),
        {"space_id": space_id, "role": role, "expires_in": expires_in, "max_uses": max_uses},
    )
    return dict(row.mappings().one())


async def accept_invite(conn: AsyncConnection, code: str) -> UUID:
    space_id = await conn.scalar(text("select public.accept_invite(:code)"), {"code": code})
    return UUID(str(space_id))
