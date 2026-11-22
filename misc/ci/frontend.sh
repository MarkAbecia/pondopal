#!/usr/bin/env bash
# CI job: frontend types, lint, tests.
set -euo pipefail
cd "$(dirname "$0")/../../frontend"
npm ci --no-audit --no-fund
npm run typecheck
npm run lint
npm test -- --ci
