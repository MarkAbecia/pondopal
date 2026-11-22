#!/usr/bin/env bash
# Drop the LOCAL database, re-apply all migrations and seed.sql, then regenerate types.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/database"
npx --yes supabase@3.2.0 db reset --local
./scripts/gen-types.sh
