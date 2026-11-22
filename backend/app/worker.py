"""Scheduler process: `python -m app.worker`. Run exactly one (ADR 0003); the jobs aren't
idempotent across concurrent workers."""

import asyncio
import functools
from collections.abc import Awaitable, Callable
from datetime import date, datetime

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app import jobs
from app.core.config import get_settings
from app.core.db import make_engine
from app.core.logging import configure_logging, log
from app.domain.time import MANILA
from app.integrations import expo_push

Job = Callable[[AsyncConnection, jobs.Sender, date], Awaitable[int]]


async def run(engine: AsyncEngine, send: jobs.Sender, job: Job) -> None:
    try:
        async with engine.begin() as conn:
            await job(conn, send, datetime.now(MANILA).date())
    except Exception:
        log.exception("job failed", extra={"extra_fields": {"job": job.__name__}})


async def main() -> None:
    settings = get_settings()
    configure_logging(settings.log_level)
    engine = make_engine(settings.database_url)
    async with httpx.AsyncClient(timeout=30) as client:
        send = functools.partial(expo_push.send, client, access_token=settings.expo_access_token)
        scheduler = AsyncIOScheduler(timezone=MANILA)
        schedule: list[tuple[Job, int]] = [
            (jobs.bill_reminders, 8),
            (jobs.paluwagan_alerts, 8),
            (jobs.streak_nudges, 20),
        ]
        for job, hour in schedule:
            scheduler.add_job(
                run,
                CronTrigger(hour=hour, minute=0, timezone=MANILA),
                args=[engine, send, job],
                id=job.__name__,
                coalesce=True,
                misfire_grace_time=3600,  # a restart within the hour still sends today's batch
            )
        scheduler.start()
        log.info(
            "worker started", extra={"extra_fields": {"jobs": [j.__name__ for j, _ in schedule]}}
        )
        try:
            await asyncio.Event().wait()
        finally:
            scheduler.shutdown()
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
