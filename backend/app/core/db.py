"""DB access as the calling user, so Postgres RLS applies (ADR 0004)."""

import json
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, create_async_engine

from app.core.security import CurrentUser


def make_engine(url: str) -> AsyncEngine:
    # statement cache off: required behind Supabase's transaction-mode pooler (Supavisor)
    return create_async_engine(url, pool_pre_ping=True, connect_args={"statement_cache_size": 0})


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
