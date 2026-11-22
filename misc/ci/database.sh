#!/usr/bin/env bash
# CI job: start local Supabase (needs Docker), lint the schema, run pgTAP tests, then the
# backend integration tests against the same database.
set -euo pipefail
cd "$(dirname "$0")/../../database"
SUPABASE="npx --yes supabase@3.2.0"
$SUPABASE start
trap '$SUPABASE stop --no-backup' EXIT
$SUPABASE db lint --level warning --fail-on error
$SUPABASE test db policies

eval "$($SUPABASE status -o env)"  # exports DB_URL, JWT_SECRET, ...
cd ../backend
uv sync --frozen
DATABASE_URL="${DB_URL/postgresql:/postgresql+asyncpg:}" SUPABASE_JWT_SECRET="$JWT_SECRET" \
  uv run pytest -m integration
