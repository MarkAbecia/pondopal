from uuid import UUID

from pydantic import BaseModel, Field

from app.domain.splits import SplitMethod


class ShareIn(BaseModel):
    user_id: UUID
    # percent: basis points (2500 = 25%); exact: centavos; equal: leave out
    value: int | None = Field(None, ge=0, le=10_000_000_000)


class SplitIn(BaseModel):
    method: SplitMethod
    shares: list[ShareIn] = Field(min_length=1, max_length=50)


class Share(BaseModel):
    user_id: UUID
    share_centavos: int


class Balance(BaseModel):
    user_id: UUID
    display_name: str | None
    net_centavos: int  # positive: is owed; negative: owes


class TransferOut(BaseModel):
    from_user: UUID
    to_user: UUID
    amount_centavos: int


class SettleUp(BaseModel):
    balances: list[Balance]
    transfers: list[TransferOut]  # the fewest payments that zero everyone out
