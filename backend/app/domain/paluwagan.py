"""Paluwagan (rotating savings) schedule. Pure; centavos.

N members each put in C every round; round k's pot (N x C) goes to the member with
payout_order k, so there are N rounds and everyone receives exactly once."""

import calendar
from datetime import date, timedelta

from app.domain.goals import Frequency


def _month_end(year: int, month: int) -> date:
    return date(year, month, calendar.monthrange(year, month)[1])


def due_dates(start: date, frequency: Frequency, rounds: int) -> list[date]:
    """Due date of each round. Daily and weekly count from `start`. Semi-monthly falls on
    kinsenas and katapusan (15th, last day) and monthly on katapusan, starting with the first
    such payday on or after `start`."""
    if rounds < 1:
        return []
    if frequency == Frequency.DAILY:
        return [start + timedelta(days=i) for i in range(rounds)]
    if frequency == Frequency.WEEKLY:
        return [start + timedelta(weeks=i) for i in range(rounds)]
    out: list[date] = []
    year, month = start.year, start.month
    while len(out) < rounds:
        candidates = [_month_end(year, month)]
        if frequency == Frequency.SEMI_MONTHLY:
            candidates.insert(0, date(year, month, 15))
        out += [d for d in candidates if d >= start]
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)
    return out[:rounds]


def pot(members: int, contribution_centavos: int) -> int:
    return members * contribution_centavos
