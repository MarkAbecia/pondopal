from datetime import date, timedelta

import pytest

from app.domain.challenges import (
    ChallengeError,
    Entry,
    entry_amount,
    grid_total,
    no_spend_days,
    progress,
    streak,
    target,
)

TODAY = date(2026, 11, 22)  # a Sunday


def amount(key: str, cell: int, base: int = 5_000, **kw: object) -> int:
    settings = kw.pop("settings", {})
    return entry_amount(key, cell_index=cell, base_centavos=base, settings=settings, **kw)  # type: ignore[arg-type]


def test_52_week_spec_numbers() -> None:
    assert amount("week_52", 52) == 260_000  # ₱2,600
    assert target("week_52", 5_000, {}) == 6_890_000  # ₱68,900
    assert sum(amount("week_52", w) for w in range(1, 53)) == 6_890_000


def test_52_week_reverse_starts_with_largest() -> None:
    assert amount("week_52", 1, settings={"reverse": True}) == 260_000
    assert amount("week_52", 52, settings={"reverse": True}) == 5_000
    assert sum(amount("week_52", w, settings={"reverse": True}) for w in range(1, 53)) == 6_890_000


def test_365_grid_spec_numbers() -> None:
    assert amount("day_365", 365, base=100) == 36_500
    assert grid_total(100, 365) == 6_679_500  # ₱66,795
    assert target("day_365", 100, {}) == 6_679_500


def test_bill_50() -> None:
    assert amount("bill_50", 1, bills=3) == 15_000
    assert target("bill_50", 0, {"target_bills": 100}) == 500_000
    assert target("bill_50", 0, {}) is None


def test_no_spend_and_custom() -> None:
    assert amount("no_spend", 7) == 0
    assert target("no_spend", 0, {}) is None
    assert amount("custom", 1, amount_centavos=12_345) == 12_345
    assert target("custom", 0, {"target_centavos": 1_000_000}) == 1_000_000
    assert target("custom", 0, {}) is None


@pytest.mark.parametrize(
    ("key", "cell", "kw"),
    [
        ("week_52", 0, {}),
        ("week_52", 53, {}),
        ("day_365", 366, {}),
        ("bill_50", 1, {"bills": 0}),
        ("bill_50", 1, {}),
        ("custom", 1, {}),
        ("custom", 1, {"amount_centavos": -5}),
        ("mystery", 1, {}),
    ],
)
def test_invalid_entries(key: str, cell: int, kw: dict[str, int]) -> None:
    with pytest.raises(ChallengeError):
        amount(key, cell, **kw)


def test_daily_streak() -> None:
    days = [TODAY - timedelta(days=i) for i in range(3)]
    assert streak(days, TODAY) == 3
    # today not ticked yet: streak from yesterday still alive
    assert streak(days[1:], TODAY) == 2
    # gap of two days: broken
    assert streak([TODAY - timedelta(days=2)], TODAY) == 0
    assert streak([], TODAY) == 0


def test_weekly_streak_uses_monday_weeks() -> None:
    monday = date(2026, 11, 16)
    # this week (any day), last week, the week before
    days = [monday + timedelta(days=6), monday - timedelta(days=1), monday - timedelta(days=13)]
    assert streak(days, TODAY, "week") == 3
    assert streak(days[1:], TODAY, "week") == 2  # this week not done yet
    assert streak([monday - timedelta(days=8)], TODAY, "week") == 0


def test_progress() -> None:
    entries = [
        Entry(1, 5_000, TODAY - timedelta(days=7)),
        Entry(2, 10_000, TODAY),
    ]
    p = progress("week_52", 5_000, {}, entries, TODAY)
    assert p.saved_centavos == 15_000
    assert p.target_centavos == 6_890_000
    assert (p.cells_done, p.total_cells) == (2, 52)
    assert p.percent == 0
    assert p.streak == 2


def test_progress_without_target() -> None:
    p = progress("no_spend", 0, {}, [Entry(1, 0, TODAY)], TODAY)
    assert p.percent is None and p.total_cells is None and p.streak == 1


def test_progress_caps_percent() -> None:
    p = progress("custom", 0, {"target_centavos": 100}, [Entry(1, 500, TODAY)], TODAY)
    assert p.percent == 100


def test_no_spend_days_counts_completed_days_only() -> None:
    start = TODAY - timedelta(days=4)
    spent = [TODAY - timedelta(days=3), TODAY]
    assert no_spend_days(spent, start, TODAY) == [
        TODAY - timedelta(days=4),
        TODAY - timedelta(days=2),
        TODAY - timedelta(days=1),
    ]
    assert no_spend_days([], TODAY, TODAY) == []
