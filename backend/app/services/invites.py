from datetime import timedelta
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncConnection

from app.repositories import spaces as repo
from app.schemas.invites import Invite, InviteCreate


async def create_invite(conn: AsyncConnection, space_id: UUID, body: InviteCreate) -> Invite:
    # RLS would reject these too; checking first gives clear 404/403/409 instead of a bare 403.
    role = await repo.my_role(conn, space_id)
    if role is None:
        raise HTTPException(404, "Space not found")
    if role not in ("owner", "admin"):
        raise HTTPException(403, "Only owners and admins can invite")
    if await repo.space_type(conn, space_id) == "personal":
        raise HTTPException(409, "Personal spaces can't have invites")
    row = await repo.create_invite(
        conn, space_id, body.role, timedelta(hours=body.expires_in_hours), body.max_uses
    )
    return Invite.model_validate(row)


async def accept_invite(conn: AsyncConnection, code: str) -> UUID:
    # accept_invite() validates expiry, uses, personal/partner rules and raises P000x -> 404/409
    return await repo.accept_invite(conn, code)
