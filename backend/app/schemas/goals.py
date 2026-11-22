from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class GoalPlan(BaseModel):
    goal_id: UUID
    target_centavos: int
    contributed_centavos: int
    remaining_centavos: int
    deadline: date
    pay_frequency: str
    periods_left: int
    per_period_centavos: int
    per_day_centavos: int
    per_week_centavos: int
    per_payday_centavos: int
    status: Literal["on_track", "behind", "done"]
    projected_finish: date | None
