# PondoPal

PondoPal is a budget planner and ipon (savings) app for the Philippines, built around shared money spaces: Personal, Partner, Family and Group.

| Folder | What |
|---|---|
| `frontend/` | Expo React Native app (TypeScript, Expo Router) |
| `backend/` | FastAPI service: business logic, jobs, push |
| `database/` | Supabase project: migrations, RLS, seed, pgTAP |
| `misc/` | Docker, CI scripts, docs and ADRs, API collections, design |

## Prerequisites
- Node 24+ and npm
- [uv](https://docs.astral.sh/uv/) (it installs Python 3.12+ for you)
- Docker Desktop, which Supabase local dev and Redis need
- On Windows, run the `.sh` scripts from Git Bash

The Supabase CLI runs through `npx supabase@3.2.0`, so you don't need to install it globally.

## Run locally
```bash
./misc/scripts/dev.sh
```
The script does the following:
1. Creates `backend/.env` and `frontend/.env` from the examples if they're missing. Paste the keys that `supabase status` prints into both files.
2. Starts Supabase and Redis.
3. Starts the API at http://127.0.0.1:8000, with docs at `/docs`.
4. Starts Expo.

Reset the local database and regenerate types with `./misc/scripts/reset-db.sh`.

## Checks
CI runs the scripts in `misc/ci/`. Run them locally the same way:
```bash
misc/ci/backend.sh
misc/ci/frontend.sh
misc/ci/database.sh   # needs Docker
misc/ci/security.sh   # Trivy, needs Docker
```

## Builds
The app builds with EAS (`frontend/eas.json`): `development`, `preview` and `production` profiles. See `frontend/README.md`.

## Conventions
- Money is integer centavos (ADR 0003). Timestamps are `timestamptz` (UTC), and display uses `Asia/Manila`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).
- Only `.env.example` files are committed, never `.env`.
- Personal data follows RA 10173: see `misc/docs/privacy.md`.
