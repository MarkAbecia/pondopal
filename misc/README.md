# misc

| Path | What |
|---|---|
| `docker/docker-compose.yml` | Redis, plus the backend under `--profile full`. Supabase runs separately. |
| `ci/*.sh` | CI jobs as plain shell scripts. `.github/workflows/ci.yml` only calls them, so moving to Jenkins means calling the same scripts. |
| `docs/` | `architecture.md`, `challenge-rules.md`, `adr/` |
| `api/` | `openapi.json` (exported from the backend) and the Bruno collection, both from Phase 3 |
| `scripts/` | `dev.sh` (one-command local dev) and `reset-db.sh` |
| `design/` | Logo, icon, splash and tokens, from Phase 6 |

The GitHub workflow lives in `/.github/workflows/`, because GitHub only reads it from there.
