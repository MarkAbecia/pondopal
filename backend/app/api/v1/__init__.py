from fastapi import APIRouter

from app.api.v1 import account, challenges, invites

router = APIRouter()
router.include_router(invites.router)
router.include_router(challenges.router)
router.include_router(account.router)
