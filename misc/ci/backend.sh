#!/usr/bin/env bash
# CI job: backend lint, types, tests. Plain shell so it runs the same in GitHub Actions or Jenkins.
set -euo pipefail
cd "$(dirname "$0")/../../backend"
uv sync --frozen
uv run ruff check .
uv run ruff format --check .
uv run mypy app tests
uv run pytest
