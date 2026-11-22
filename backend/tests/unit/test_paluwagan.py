from datetime import date

from app.domain.goals import Frequency
from app.domain.paluwagan import due_dates, pot


def test_daily_and_weekly_count_from_start() -> None:
    assert due_dates(date(2026, 12, 30), Frequency.DAILY, 3) == [
        date(2026, 12, 30),
        date(2026, 12, 31),
        date(2027, 1, 1),
    ]
    assert due_dates(date(2026, 11, 22), Frequency.WEEKLY, 2) == [
        date(2026, 11, 22),
        date(2026, 11, 29),
    ]


def test_semi_monthly_uses_kinsenas_and_katapusan() -> None:
    assert due_dates(date(2026, 11, 22), Frequency.SEMI_MONTHLY, 4) == [
        date(2026, 11, 30),
        date(2026, 12, 15),
        date(2026, 12, 31),
        date(2027, 1, 15),
    ]
    assert due_dates(date(2028, 2, 15), Frequency.SEMI_MONTHLY, 2) == [
        date(2028, 2, 15),
        date(2028, 2, 29),
    ]


def test_monthly_uses_katapusan() -> None:
    assert due_dates(date(2026, 1, 31), Frequency.MONTHLY, 3) == [
        date(2026, 1, 31),
        date(2026, 2, 28),
        date(2026, 3, 31),
    ]
    assert due_dates(date(2026, 1, 1), Frequency.MONTHLY, 0) == []


def test_pot() -> None:
    assert pot(10, 100_000) == 1_000_000  # 10 members x ₱1,000
