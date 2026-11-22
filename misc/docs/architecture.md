# Architecture

```
Expo app ──supabase-js──▶ Supabase (Auth, Postgres + RLS, Realtime, Storage)
    │                                  ▲
    └──HTTPS + Supabase JWT──▶ FastAPI ┘  (asyncpg, runs as `authenticated` under RLS)
                                │
                                ├─ Redis (rate limits, report cache)
                                └─ Worker (APScheduler) ──▶ Expo Push
```

## Data flow
- **Plain CRUD.** Transactions, budgets and bills go from the app to PostgREST, and RLS decides what is allowed.
- **Realtime.** The app subscribes to `transactions`, `challenge_entries` and `goal_contributions` for the active shared space.
- **Business logic.** Invites, challenge progress, goal plans, settle-up and paluwagan go from the app to FastAPI. FastAPI verifies the JWT (JWKS first, then the legacy secret), then queries Postgres under RLS (ADR 0004).
- **Jobs.** A single worker runs the daily 08:00 `Asia/Manila` bill reminders, streak nudges and paluwagan due alerts, and sends them through Expo Push.
- **Files.** Receipts go to the private `receipts` bucket under `space_id/…`. Avatars go to the public-read `avatars` bucket.

## Decisions
See `adr/`.
