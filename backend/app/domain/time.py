from datetime import date, datetime, timedelta, timezone

# The Philippines has no DST, so a fixed offset is exact and needs no tz database.
MANILA = timezone(timedelta(hours=8), "Asia/Manila")


def manila_date(moment: datetime) -> date:
    return moment.astimezone(MANILA).date()


def ceil_div(numerator: int, denominator: int) -> int:
    return -(-numerator // denominator)
