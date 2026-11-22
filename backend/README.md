# PondoPal backend

This is the FastAPI service. Python 3.12+, managed with uv.

```bash
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload    # http://127.0.0.1:8000/docs
```

Checks run through `misc/ci/backend.sh`, which runs `ruff check`, `ruff format --check`, `mypy` (strict) and `pytest`.

Layout, filled in from Phase 3 onward:
- `core/`
- `api/v1/`
- `domain/`, which holds the pure rules and must not do any I/O
- `services/`
- `repositories/`
- `schemas/`
- `jobs/`
- `integrations/`

User requests query Postgres **under RLS** as `authenticated` (see `misc/docs/adr/0004-rls-first.md`).
