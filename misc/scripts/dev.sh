#!/usr/bin/env bash
# One command for local dev: Supabase + Redis + FastAPI (reload) + Expo.
# Needs Docker running. On Windows, run from Git Bash.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SUPABASE="npx --yes supabase@3.2.0"

for f in backend/.env frontend/.env; do
  [ -f "$ROOT/$f" ] || { cp "$ROOT/$f.example" "$ROOT/$f"; echo "Created $f from example; fill in keys from 'supabase status'."; }
done

(cd "$ROOT/database" && $SUPABASE start)
docker compose -f "$ROOT/misc/docker/docker-compose.yml" up -d redis

(cd "$ROOT/backend" && uv run uvicorn app.main:app --reload --port 8000) &
BACKEND_PID=$!
trap 'kill $BACKEND_PID 2>/dev/null || true' EXIT

cd "$ROOT/frontend" && npx expo start
