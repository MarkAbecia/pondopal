from datetime import UTC, date, datetime

import pytest

from app.domain.goals import Frequency, periods_left, plan
from app.domain.time import ceil_div, manila_date

TODAY = date(2026, 11, 22)


@pytest.mark.parametrize(
    ("deadline", "freq", "expected"),
    [
        (date(2026, 12, 6), Frequency.DAILY, 15),
        (date(2026, 12, 6), Frequency.WEEKLY, 3),  # Nov 22, Nov 29, Dec 6
        (date(2026, 12, 31), Frequency.SEMI_MONTHLY, 3),  # Nov 30, Dec 15, Dec 31
        (date(2027, 1, 15), Frequency.MONTHLY, 2),  # Nov 30, Dec 31
        (TODAY, Frequency.DAILY, 1),
        (date(2026, 11, 25), Frequency.MONTHLY, 0),  # no month-end before the deadline
        (date(2026, 11, 1), Frequency.WEEKLY, 0),  # deadline passed
    ],
)
def test_periods_left(deadline: date, freq: Frequency, expected: int) -> None:
    assert periods_left(TODAY, deadline, freq) == expected


def test_semi_monthly_february() -> None:
    assert periods_left(date(2027, 2, 10), date(2027, 2, 28), Frequency.SEMI_MONTHLY) == 2
    assert periods_left(date(2028, 2, 16), date(2028, 2, 29), Frequency.SEMI_MONTHLY) == 1  # leap


def test_plan_behind_with_projection() -> None:
    p = plan(
        target_centavos=6_000_000,
        contributed_centavos=1_000_000,
        deadline=date(2026, 12, 31),
        frequency=Frequency.SEMI_MONTHLY,
        today=TODAY,
        started_on=date(2026, 11, 1),
    )
    assert p.remaining_centavos == 5_000_000
    assert p.periods_left == 3
    assert p.per_period_centavos == 1_666_667  # ceil, never under-save
    assert p.per_payday_centavos == 1_666_667
    assert p.per_day_centavos == 125_000  # 40 days
    assert p.per_week_centavos == 833_334  # 6 weeks
    assert p.status == "behind"  # expected 21/60 of target = 2,100,000
    assert p.projected_finish == date(2027, 3, 7)  # 105 days at 1,000,000 per 21 days


def test_plan_on_track() -> None:
    p = plan(
        target_centavos=6_000_000,
        contributed_centavos=3_000_000,
        deadline=date(2026, 12, 31),
        frequency=Frequency.MONTHLY,
        today=TODAY,
        started_on=date(2026, 11, 1),
    )
    assert p.status == "on_track"
    assert p.periods_left == 2
    assert p.projected_finish is not None and p.projected_finish <= date(2026, 12, 31)


def test_plan_new_goal_is_on_track_without_projection() -> None:
    p = plan(
        target_centavos=100_000,
        contributed_centavos=0,
        deadline=date(2027, 1, 1),
        frequency=Frequency.WEEKLY,
        today=TODAY,
        started_on=TODAY,
    )
    assert p.status == "on_track"
    assert p.projected_finish is None


def test_plan_done() -> None:
    p = plan(
        target_centavos=100,
        contributed_centavos=150,
        deadline=TODAY,
        frequency=Frequency.DAILY,
        today=TODAY,
        started_on=TODAY,
    )
    assert p.status == "done" and p.remaining_centavos == 0 and p.per_period_centavos == 0


def test_plan_past_deadline_asks_for_everything_now() -> None:
    p = plan(
        target_centavos=100_000,
        contributed_centavos=40_000,
        deadline=date(2026, 11, 1),
        frequency=Frequency.WEEKLY,
        today=TODAY,
        started_on=date(2026, 10, 1),
    )
    assert p.status == "behind"
    assert p.periods_left == 0
    assert p.per_period_centavos == 60_000


def test_helpers() -> None:
    assert ceil_div(10, 3) == 4 and ceil_div(9, 3) == 3
    # 16:30 UTC is 00:30 next day in Manila
    assert manila_date(datetime(2026, 11, 22, 16, 30, tzinfo=UTC)) == date(2026, 11, 23)
