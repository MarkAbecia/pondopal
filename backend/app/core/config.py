from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = "http://127.0.0.1:54321"
    supabase_jwks_url: str = "http://127.0.0.1:54321/auth/v1/.well-known/jwks.json"
    supabase_jwt_secret: str = ""  # legacy HS256 fallback; empty disables it
    supabase_service_role_key: str = ""
    database_url: str = "postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres"
    redis_url: str = "redis://127.0.0.1:6379/0"
    sentry_dsn: str = ""
    expo_access_token: str = ""  # optional; required once "enhanced push security" is on
    log_level: str = "INFO"
    # Browser origins allowed to call the API (Expo web). Phones send no Origin and need none.
    cors_origins: list[str] = ["http://localhost:8081"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
