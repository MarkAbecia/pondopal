#!/usr/bin/env bash
# CI job: Trivy scan of the repo (dependency vulns in package-lock.json / uv.lock, leaked secrets,
# Dockerfile misconfig) and, if built, the backend image. Fails on HIGH/CRITICAL.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TRIVY_IMAGE="aquasec/trivy:0.58.1"
COMMON="--exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed"

docker run --rm -v "$ROOT:/src:ro" "$TRIVY_IMAGE" fs $COMMON \
  --scanners vuln,secret,misconfig --skip-dirs /src/frontend/node_modules --skip-dirs /src/backend/.venv /src

if docker image inspect pondopal-backend:ci > /dev/null 2>&1; then
  docker run --rm -v /var/run/docker.sock:/var/run/docker.sock "$TRIVY_IMAGE" image $COMMON pondopal-backend:ci
fi
