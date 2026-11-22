from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class InviteCreate(BaseModel):
    role: Literal["admin", "member", "viewer"] = "member"
    expires_in_hours: int = Field(168, ge=1, le=720)
    max_uses: int | None = Field(None, ge=1, le=100)


class Invite(BaseModel):
    code: str
    space_id: UUID
    role: str
    expires_at: datetime
    max_uses: int | None


class InviteAccepted(BaseModel):
    space_id: UUID
