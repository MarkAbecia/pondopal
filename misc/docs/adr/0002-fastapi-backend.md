# 0002 — FastAPI service for business logic

**Status:** accepted

**Context.** Some logic should not live in the client: challenge and goal math, invites, settle-up, paluwagan scheduling, push notifications and scheduled jobs.

**Decision.** Use a Python 3.12+ FastAPI service. It verifies the Supabase JWT on every request. The pure rules live in `app/domain/` and are fully unit-tested. Scheduled jobs use APScheduler in **one dedicated worker process**, not inside each API worker, so reminders never fire twice. Redis is used only for rate limiting and caching.

**Consequences.** There are two runtimes to deploy. The mobile app never holds the service-role key.
