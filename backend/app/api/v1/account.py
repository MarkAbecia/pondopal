from typing import Any

import httpx
from fastapi import APIRouter, Depends, Request, Response

from app.core.config import Settings
from app.core.db import AdminDb
from app.core.logging import log
from app.core.ratelimit import rate_limit
from app.core.security import CurrentUser
from app.integrations import storage
from app.repositories import account as repo

router = APIRouter(prefix="/v1", tags=["account"])


@router.get(
    "/me/export", dependencies=[Depends(rate_limit("account-export", limit=5, window_s=3600))]
)
async def export_my_data(user: CurrentUser, db: AdminDb) -> dict[str, list[dict[str, Any]]]:
    """Everything you've put into PondoPal, as JSON (RA 10173 right to data portability)."""
    return await repo.export(db, user.id)


@router.delete(
    "/me",
    status_code=204,
    dependencies=[Depends(rate_limit("account-delete", limit=3, window_s=3600))],
)
async def delete_my_account(request: Request, user: CurrentUser, db: AdminDb) -> Response:
    """Deletes the account and personal data (RA 10173 right to erasure). Shared spaces you own
    pass to another member; transactions you logged there stay, no longer linked to you."""
    personal = await repo.personal_space(db, user.id)
    await repo.delete(db, user.id)
    await db.commit()  # the account is gone even if file cleanup below fails

    settings: Settings = request.app.state.settings
    folders = [("avatars", str(user.id))] + ([("receipts", str(personal))] if personal else [])
    if not settings.supabase_service_role_key:
        log.warning("account deleted without storage cleanup: no service role key")
        return Response(status_code=204)
    async with httpx.AsyncClient(timeout=30) as client:
        for bucket, folder in folders:
            try:
                await storage.remove_folder(
                    client,
                    settings.supabase_url,
                    settings.supabase_service_role_key,
                    bucket,
                    folder,
                )
            except httpx.HTTPError as e:
                # shortcut: orphaned files are unreachable (their space/user is gone) but stay
                # in the bucket; add a sweeper job if this ever logs in production
                log.error(
                    "storage cleanup failed",
                    extra={"extra_fields": {"bucket": bucket, "error": type(e).__name__}},
                )
    return Response(status_code=204)
