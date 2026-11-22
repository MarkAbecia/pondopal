from fastapi import APIRouter

from app.api.v1 import invites

router = APIRouter()
router.include_router(invites.router)
