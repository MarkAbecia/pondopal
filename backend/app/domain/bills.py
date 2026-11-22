"""Recurring bill due dates and peso formatting. Pure; centavos."""

import calendar
from datetime import date, timedelta

MONTHS = {"monthly": 1, "quarterly": 3, "yearly": 12}


def advance(due: date, frequency: str, due_day: int) -> date:
    """The occurrence after `due`. Monthly-style bills land on due_day, clamped to month end
    (due_day 31 is Feb 28/29, Apr 30, ...)."""
    if frequency == "weekly":
        return due + timedelta(days=7)
    total = due.year * 12 + due.month - 1 + MONTHS[frequency]
    year, month = divmod(total, 12)
    month += 1
    return date(year, month, min(due_day, calendar.monthrange(year, month)[1]))


def roll_forward(due: date, frequency: str, due_day: int, today: date) -> date:
    """The first occurrence on or after today."""
    while due < today:
        due = advance(due, frequency, due_day)
    return due


def format_php(centavos: int) -> str:
    sign = "-" if centavos < 0 else ""
    pesos, cents = divmod(abs(centavos), 100)
    return f"{sign}₱{pesos:,}.{cents:02d}"
