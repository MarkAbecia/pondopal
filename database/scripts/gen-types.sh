#!/usr/bin/env bash
# Regenerate frontend DB types from the local Supabase schema.
set -euo pipefail
cd "$(dirname "$0")/.."
npx --yes supabase@3.2.0 gen types typescript --local > ../frontend/src/types/database.ts
echo "Wrote frontend/src/types/database.ts"
