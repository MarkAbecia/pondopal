from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.db import UserDb
from app.core.ratelimit import rate_limit
from app.core.security import CurrentUser
from app.schemas.challenges import (
    Challenge,
    ChallengeCreate,
    ChallengeProgress,
    ChallengeTemplate,
    Entry,
    EntryCreate,
)
from app.schemas.goals import GoalPlan
from app.services import challenges as service

router = APIRouter(prefix="/v1", tags=["ipon"])


@router.get("/challenges/templates")
async def list_templates(db: UserDb) -> list[ChallengeTemplate]:
    return await service.templates(db)


@router.post(
    "/challenges",
    status_code=201,
    dependencies=[Depends(rate_limit("challenge-create", limit=30, window_s=3600))],
)
async def create_challenge(body: ChallengeCreate, db: UserDb) -> Challenge:
    return await service.create(db, body)


@router.post(
    "/challenges/{challenge_id}/entries",
    status_code=201,
    dependencies=[Depends(rate_limit("challenge-entry", limit=120, window_s=60))],
)
async def add_entry(challenge_id: UUID, body: EntryCreate, db: UserDb) -> Entry:
    return await service.add_entry(db, challenge_id, body)


@router.get("/challenges/{challenge_id}/progress")
async def challenge_progress(
    challenge_id: UUID, db: UserDb, user: CurrentUser
) -> ChallengeProgress:
    return await service.progress(db, challenge_id, user.id)


@router.post("/goals/{goal_id}/plan")
async def goal_plan(goal_id: UUID, db: UserDb) -> GoalPlan:
    return await service.goal_plan(db, goal_id)
