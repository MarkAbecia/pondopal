from datetime import date

import pytest

from app.domain.bills import advance, format_php, roll_forward


@pytest.mark.parametrize(
    ("due", "frequency", "due_day", "expected"),
    [
        (date(2026, 11, 22), "weekly", 22, date(2026, 11, 29)),
        (date(2026, 1, 31), "monthly", 31, date(2026, 2, 28)),  # clamped to month end
        (date(2026, 2, 28), "monthly", 31, date(2026, 3, 31)),  # and back to the 31st
        (date(2028, 1, 31), "monthly", 31, date(2028, 2, 29)),  # leap year
        (date(2026, 12, 15), "monthly", 15, date(2027, 1, 15)),  # year wrap
        (date(2026, 11, 30), "quarterly", 30, date(2027, 2, 28)),
        (date(2026, 11, 22), "yearly", 22, date(2027, 11, 22)),
    ],
)
def test_advance(due: date, frequency: str, due_day: int, expected: date) -> None:
    assert advance(due, frequency, due_day) == expected


def test_roll_forward_skips_missed_months() -> None:
    assert roll_forward(date(2026, 8, 31), "monthly", 31, date(2026, 11, 22)) == date(2026, 11, 30)
    assert roll_forward(date(2026, 11, 22), "monthly", 22, date(2026, 11, 22)) == date(2026, 11, 22)


def test_format_php() -> None:
    assert format_php(245_050) == "₱2,450.50"
    assert format_php(5) == "₱0.05"
    assert format_php(-100_000_000) == "-₱1,000,000.00"
