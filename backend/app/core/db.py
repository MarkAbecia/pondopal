"""DB access as the calling user, so Postgres RLS applies (ADR 0004)."""

import json
from collections.abc import AsyncIterator
from typing import Annotated
from uuid import uuid4

from fastapi import Depends, Request
from sqlalchemy import make_url, text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, create_async_engine

from app.core.security import CurrentUser


def make_engine(url: str) -> AsyncEngine:
    # Behind Supabase's transaction-mode pooler (Supavisor) a server connection is shared, so
    # prepared statements need no caching and unique names, or Postgres raises "prepared
    # statement already exists" (42P05 -> 500). SQLAlchemy's documented pgbouncer setup.
    return create_async_engine(
        make_url(url).update_query_dict({"prepared_statement_cache_size": "0"}),
        pool_pre_ping=True,
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4()}__",
        },
    )


async def user_db(request: Request, user: CurrentUser) -> AsyncIterator[AsyncConnection]:
    """One transaction per request, running as `authenticated` with the caller's JWT claims."""
    engine: AsyncEngine = request.app.state.engine
    async with engine.begin() as conn:
        await conn.execute(
            text("select set_config('request.jwt.claims', :claims, true)"),
            {"claims": json.dumps(user.claims)},
        )
        await conn.execute(text("set local role authenticated"))
        yield conn


UserDb = Annotated[AsyncConnection, Depends(user_db)]


async def admin_db(request: Request, user: CurrentUser) -> AsyncIterator[AsyncConnection]:
    """Privileged connection (no RLS) for the caller's own RA 10173 export and deletion only.
    Every query on it must be scoped to the caller's id (ADR 0004)."""
    engine: AsyncEngine = request.app.state.engine
    async with engine.begin() as conn:
        yield conn


AdminDb = Annotated[AsyncConnection, Depends(admin_db)]
