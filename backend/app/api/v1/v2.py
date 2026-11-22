from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path

from app.core.db import UserDb
from app.core.ratelimit import rate_limit
from app.core.security import CurrentUser
from app.schemas.paluwagan import Paid, Paluwagan, PaluwaganCreate, PayIn, Schedule
from app.schemas.splits import SettleUp, Share, SplitIn
from app.services import v2 as service

router = APIRouter(prefix="/v1", tags=["splits & paluwagan"])


@router.put(
    "/transactions/{txn_id}/splits",
    dependencies=[Depends(rate_limit("splits", limit=120, window_s=60))],
)
async def set_splits(txn_id: UUID, body: SplitIn, db: UserDb, user: CurrentUser) -> list[Share]:
    """Split an expense equally, by percentage (basis points) or by exact amounts.
    Replaces any earlier split of the same expense."""
    return await service.set_splits(db, user.id, txn_id, body)


@router.get("/spaces/{space_id}/settle-up")
async def settle_up(space_id: UUID, db: UserDb) -> SettleUp:
    """Who owes whom, as the fewest transfers that settle everyone."""
    return await service.settle_up(db, space_id)


@router.post(
    "/paluwagan",
    status_code=201,
    dependencies=[Depends(rate_limit("paluwagan-create", limit=20, window_s=3600))],
)
async def create_paluwagan(body: PaluwaganCreate, db: UserDb) -> Paluwagan:
    return await service.create_paluwagan(db, body)


@router.get("/paluwagan/{pal_id}/schedule")
async def paluwagan_schedule(pal_id: UUID, db: UserDb) -> Schedule:
    return await service.schedule(db, pal_id)


@router.post("/paluwagan/{pal_id}/rounds/{n}/pay")
async def pay_round(
    pal_id: UUID,
    n: Annotated[int, Path(ge=1, le=1000)],
    db: UserDb,
    user: CurrentUser,
    body: PayIn | None = None,
) -> Paid:
    """Mark a contribution as paid (or unpaid with "paid": false). Members mark their own;
    owners and admins can mark anyone's."""
    return await service.pay(db, user.id, pal_id, n, body or PayIn())
