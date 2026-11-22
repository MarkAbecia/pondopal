from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path

from app.core.db import UserDb
from app.core.ratelimit import rate_limit
from app.schemas.invites import Invite, InviteAccepted, InviteCreate
from app.services import invites as service

# prefix on the leaf router keeps route.path (logs, problem "instance") the full template
router = APIRouter(prefix="/v1", tags=["invites"])


@router.post(
    "/spaces/{space_id}/invites",
    status_code=201,
    dependencies=[Depends(rate_limit("invite-create", limit=20, window_s=3600))],
)
async def create_invite(space_id: UUID, body: InviteCreate, db: UserDb) -> Invite:
    return await service.create_invite(db, space_id, body)


@router.post(
    "/invites/{code}/accept",
    dependencies=[Depends(rate_limit("invite-accept", limit=10, window_s=600))],
)
async def accept_invite(
    code: Annotated[str, Path(min_length=4, max_length=32, pattern=r"^[A-Za-z0-9 ]+$")],
    db: UserDb,
) -> InviteAccepted:
    return InviteAccepted(space_id=await service.accept_invite(db, code))
