from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

MAX_CENTAVOS = 10_000_000_000  # ₱100M; keeps totals well inside bigint


class ChallengeTemplate(BaseModel):
    key: str
    name: str
    description: str | None
    rules: dict[str, Any]


class ChallengeSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reverse: bool = False  # week_52: save the big weeks first
    target_bills: int | None = Field(None, ge=1, le=100_000)  # bill_50
    target_centavos: int | None = Field(None, ge=1, le=MAX_CENTAVOS)  # custom
    leaderboard: bool = False  # shared spaces: rank members by amount saved


class ChallengeCreate(BaseModel):
    space_id: UUID
    template_key: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=80)
    base_centavos: int | None = Field(None, ge=1, le=10_000_000)  # None: template default
    settings: ChallengeSettings = ChallengeSettings()
    start_date: date | None = None  # None: today in Manila


class Challenge(BaseModel):
    id: UUID
    space_id: UUID
    template_key: str
    name: str
    base_centavos: int
    settings: dict[str, Any]
    start_date: date
    status: str


class EntryCreate(BaseModel):
    """Grid templates need cell_index; bill_50 needs bills; custom needs amount_centavos."""

    cell_index: int | None = Field(None, ge=1, le=365)
    bills: int | None = Field(None, ge=1, le=10_000)
    amount_centavos: int | None = Field(None, ge=1, le=MAX_CENTAVOS)


class Entry(BaseModel):
    id: UUID
    cell_index: int
    amount_centavos: int
    saved_at: datetime


class MemberProgress(BaseModel):
    user_id: UUID
    display_name: str | None
    saved_centavos: int
    target_centavos: int | None
    cells_done: int
    total_cells: int | None
    percent: int | None
    streak: int


class ChallengeProgress(BaseModel):
    challenge: Challenge
    me: MemberProgress
    cells: list[int]  # my done cells; no_spend: day numbers (1 = start_date)
    members: list[MemberProgress]  # everyone in the space, highest saved first
