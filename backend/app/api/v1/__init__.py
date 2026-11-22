from fastapi import APIRouter

from app.api.v1 import account, challenges, invites, v2

router = APIRouter()
router.include_router(invites.router)
router.include_router(challenges.router)
router.include_router(v2.router)
router.include_router(account.router)
