"""Goal plan: how much to save per period to hit a target by a deadline. Pure; centavos."""

import calendar
from dataclasses import dataclass
from datetime import date, timedelta
from enum import StrEnum
from typing import Literal

from app.domain.time import ceil_div


class Frequency(StrEnum):
    DAILY = "daily"
    WEEKLY = "weekly"
    SEMI_MONTHLY = "semi_monthly"  # kinsenas (15th) and katapusan (last day)
    MONTHLY = "monthly"  # katapusan


@dataclass(frozen=True)
class GoalPlan:
    remaining_centavos: int
    periods_left: int
    per_period_centavos: int
    per_day_centavos: int
    per_week_centavos: int
    per_payday_centavos: int  # semi-monthly paydays
    status: Literal["on_track", "behind", "done"]
    projected_finish: date | None  # at the current pace; None without enough history


def _month_end(year: int, month: int) -> date:
    return date(year, month, calendar.monthrange(year, month)[1])


def _paydays(today: date, deadline: date, semi_monthly: bool) -> int:
    count = 0
    year, month = today.year, today.month
    while date(year, month, 1) <= deadline:
        days = [_month_end(year, month)]
        if semi_monthly:
            days.append(date(year, month, 15))
        count += sum(today <= d <= deadline for d in days)
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)
    return count


def periods_left(today: date, deadline: date, frequency: Frequency) -> int:
    """Due dates in [today, deadline] at this frequency."""
    if deadline < today:
        return 0
    days = (deadline - today).days
    match frequency:
        case Frequency.DAILY:
            return days + 1
        case Frequency.WEEKLY:
            return days // 7 + 1
        case Frequency.SEMI_MONTHLY:
            return _paydays(today, deadline, semi_monthly=True)
        case Frequency.MONTHLY:
            return _paydays(today, deadline, semi_monthly=False)


def plan(
    *,
    target_centavos: int,
    contributed_centavos: int,
    deadline: date,
    frequency: Frequency,
    today: date,
    started_on: date,
) -> GoalPlan:
    remaining = max(target_centavos - contributed_centavos, 0)
    if remaining == 0:
        return GoalPlan(0, 0, 0, 0, 0, 0, "done", None)

    def per(freq: Frequency) -> int:
        # no due date left (deadline passed, or none before it): the whole remainder is due now
        return ceil_div(remaining, max(periods_left(today, deadline, freq), 1))

    # On track = saved at least the straight-line share of the target for the time elapsed.
    elapsed = max((today - started_on).days, 0)
    total = max((deadline - started_on).days, 1)
    expected = target_centavos * min(elapsed, total) // total
    status: Literal["on_track", "behind"] = (
        "on_track" if contributed_centavos >= expected else "behind"
    )

    projected = None
    if contributed_centavos > 0 and elapsed > 0:
        projected = today + timedelta(days=ceil_div(remaining * elapsed, contributed_centavos))

    return GoalPlan(
        remaining_centavos=remaining,
        periods_left=periods_left(today, deadline, frequency),
        per_period_centavos=per(frequency),
        per_day_centavos=per(Frequency.DAILY),
        per_week_centavos=per(Frequency.WEEKLY),
        per_payday_centavos=per(Frequency.SEMI_MONTHLY),
        status=status,
        projected_finish=projected,
    )
