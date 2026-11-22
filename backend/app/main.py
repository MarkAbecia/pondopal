from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import redis.asyncio as redis
from fastapi import FastAPI

from app.api.v1 import router as v1_router
from app.core.config import Settings, get_settings
from app.core.db import make_engine
from app.core.errors import install_error_handlers
from app.core.logging import configure_logging, request_context
from app.core.security import TokenVerifier


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)
    if settings.sentry_dsn:
        import sentry_sdk

        sentry_sdk.init(dsn=settings.sentry_dsn, send_default_pii=False, traces_sample_rate=0.1)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.engine = make_engine(settings.database_url)
        app.state.redis = redis.from_url(settings.redis_url)
        yield
        await app.state.engine.dispose()
        await app.state.redis.aclose()

    app = FastAPI(title="PondoPal API", version="0.1.0", lifespan=lifespan)
    app.state.verifier = TokenVerifier(settings.supabase_jwks_url, settings.supabase_jwt_secret)
    app.middleware("http")(request_context)
    install_error_handlers(app)
    app.include_router(v1_router)

    @app.get("/health", tags=["meta"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
