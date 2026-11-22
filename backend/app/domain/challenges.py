"""Ipon challenge rules (misc/docs/challenge-rules.md). Pure functions; all money in centavos."""

from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any, Literal

BILL_CENTAVOS = 5_000  # ₱50
GRID_CELLS = {"week_52": 52, "day_365": 365}

Period = Literal["day", "week"]


class ChallengeError(ValueError):
    pass


@dataclass(frozen=True)
class Entry:
    cell_index: int
    amount_centavos: int
    saved_on: date  # Asia/Manila date


@dataclass(frozen=True)
class Progress:
    saved_centavos: int
    target_centavos: int | None
    cells_done: int
    total_cells: int | None
    percent: int | None  # 0-100, floored
    streak: int


def grid_total(base_centavos: int, cells: int) -> int:
    return base_centavos * cells * (cells + 1) // 2


def entry_amount(
    template_key: str,
    *,
    cell_index: int,
    base_centavos: int,
    settings: Mapping[str, Any],
    bills: int | None = None,
    amount_centavos: int | None = None,
) -> int:
    """The amount a new entry is worth. Raises ChallengeError for invalid input."""
    if cell_index < 1:
        raise ChallengeError("cell_index must be >= 1")
    if template_key in GRID_CELLS:
        cells = GRID_CELLS[template_key]
        if cell_index > cells:
            raise ChallengeError(f"cell_index must be <= {cells}")
        if template_key == "week_52" and settings.get("reverse"):
            return (cells + 1 - cell_index) * base_centavos
        return cell_index * base_centavos
    if template_key == "bill_50":
        if not bills or bills < 1:
            raise ChallengeError("bills must be >= 1")
        return bills * BILL_CENTAVOS
    if template_key == "no_spend":
        return 0
    if template_key == "custom":
        if not amount_centavos or amount_centavos < 1:
            raise ChallengeError("amount_centavos must be >= 1")
        return amount_centavos
    raise ChallengeError(f"unknown template {template_key!r}")


def target(template_key: str, base_centavos: int, settings: Mapping[str, Any]) -> int | None:
    if template_key in GRID_CELLS:
        return grid_total(base_centavos, GRID_CELLS[template_key])
    if template_key == "bill_50" and settings.get("target_bills"):
        return int(settings["target_bills"]) * BILL_CENTAVOS
    if template_key == "custom" and settings.get("target_centavos"):
        return int(settings["target_centavos"])
    return None


def streak(days: Iterable[date], today: date, period: Period = "day") -> int:
    """Consecutive periods with at least one entry, ending this period (or the previous one if
    this period has no entry yet, so the streak isn't broken before the day/week is over)."""

    def key(d: date) -> int:
        # date(1, 1, 1) is a Monday, so (ordinal - 1) // 7 numbers Mon-Sun weeks consecutively
        return d.toordinal() if period == "day" else (d.toordinal() - 1) // 7

    done = {key(d) for d in days}
    current = key(today)
    if current not in done:
        current -= 1
    count = 0
    while current in done:
        count += 1
        current -= 1
    return count


def progress(
    template_key: str,
    base_centavos: int,
    settings: Mapping[str, Any],
    entries: Sequence[Entry],
    today: date,
) -> Progress:
    saved = sum(e.amount_centavos for e in entries)
    goal = target(template_key, base_centavos, settings)
    cells = GRID_CELLS.get(template_key)
    period: Period = "week" if template_key == "week_52" else "day"
    return Progress(
        saved_centavos=saved,
        target_centavos=goal,
        cells_done=len({e.cell_index for e in entries}),
        total_cells=cells,
        percent=min(100, saved * 100 // goal) if goal else None,
        streak=streak((e.saved_on for e in entries), today, period),
    )


def no_spend_days(expense_days: Iterable[date], start: date, today: date) -> list[date]:
    """Completed days (start..yesterday) with no expense. Today isn't over, so it never counts."""
    spent = set(expense_days)
    days = (start + timedelta(days=i) for i in range(max((today - start).days, 0)))
    return [d for d in days if d not in spent]
