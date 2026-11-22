#!/usr/bin/env bash
# CI job: backend lint, types, tests. Plain shell so it runs the same in GitHub Actions or Jenkins.
set -euo pipefail
cd "$(dirname "$0")/../../backend"
uv sync --frozen
uv run ruff check .
uv run ruff format --check .
uv run mypy app tests
# integration tests run in database.sh, where Supabase is up
uv run pytest --cov=app.domain --cov-fail-under=90
# the committed OpenAPI spec must match the code
uv run python -m app.export_openapi
git diff --exit-code -- ../misc/api/openapi.json
