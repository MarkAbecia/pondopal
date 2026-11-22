from fastapi import APIRouter

from app.api.v1 import challenges, invites

router = APIRouter()
router.include_router(invites.router)
router.include_router(challenges.router)
