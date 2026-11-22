#!/usr/bin/env bash
# CI job: start local Supabase (needs Docker), lint the schema, run pgTAP tests.
set -euo pipefail
cd "$(dirname "$0")/../../database"
SUPABASE="npx --yes supabase@3.2.0"
$SUPABASE start
trap '$SUPABASE stop --no-backup' EXIT
$SUPABASE db lint --level warning --fail-on error
$SUPABASE test db policies
