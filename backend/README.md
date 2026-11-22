# PondoPal backend

This is the FastAPI service. Python 3.12+, managed with uv.

```bash
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload    # http://127.0.0.1:8000/docs
uv run python -m app.worker             # scheduled reminders; run exactly one
```

Checks run through `misc/ci/backend.sh`, which runs:
- `ruff check` and `ruff format --check`
- `mypy` (strict)
- `pytest`, which fails if `app/domain/` coverage drops below 90%
- an OpenAPI drift check against `misc/api/openapi.json`. After you change an endpoint, regenerate the file with `uv run python -m app.export_openapi`.

Integration tests (`-m integration`) run inside `misc/ci/database.sh`, because that's where local Supabase is running.

Layout, filled in from Phase 3 onward:
- `core/`
- `api/v1/`
- `domain/`, which holds the pure rules and must not do any I/O
- `services/`
- `repositories/`
- `schemas/`
- `jobs.py` (scheduled reminders) and `worker.py` (the APScheduler process that runs them)
- `integrations/` (Expo Push)

User requests query Postgres **under RLS** as `authenticated` (see `misc/docs/adr/0004-rls-first.md`).
