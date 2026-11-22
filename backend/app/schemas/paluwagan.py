from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.domain.goals import Frequency


class PaluwaganCreate(BaseModel):
    space_id: UUID
    name: str = Field(min_length=1, max_length=80)
    contribution_centavos: int = Field(ge=100, le=10_000_000_000)
    frequency: Frequency
    start_date: date
    # payout order: the first person gets round 1's pot, and so on
    member_ids: list[UUID] = Field(min_length=2, max_length=60)


class Paluwagan(BaseModel):
    id: UUID
    space_id: UUID
    name: str
    contribution_centavos: int
    frequency: str
    start_date: date
    status: str


class Member(BaseModel):
    user_id: UUID
    display_name: str | None
    payout_order: int


class Payment(BaseModel):
    user_id: UUID
    paid_at: datetime | None


class Round(BaseModel):
    round_number: int
    due_date: date
    recipient_id: UUID | None
    pot_centavos: int
    paid_count: int
    payments: list[Payment]


class Schedule(BaseModel):
    paluwagan: Paluwagan
    members: list[Member]
    rounds: list[Round]
    current_round: int | None  # the first round with an unpaid contribution


class PayIn(BaseModel):
    user_id: UUID | None = None  # default: yourself; owners/admins can mark anyone
    paid: bool = True


class Paid(BaseModel):
    round_number: int
    user_id: UUID
    paid_at: datetime | None
