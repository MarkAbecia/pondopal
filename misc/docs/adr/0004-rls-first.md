# 0004 — RLS first, including for the backend

**Status:** accepted

**Context.** Both the app (through PostgREST) and the backend (through asyncpg) read the same tables. If the backend used the service role, it would bypass RLS, and every membership check would have to be written a second time in Python.

**Decision.**
- Every table has RLS enabled. The policies use `is_space_member(space_id)` and `space_role(space_id)`, which are `SECURITY DEFINER` and `STABLE`.
- For user-driven requests, the backend opens a transaction, runs `SET LOCAL ROLE authenticated`, and sets `request.jwt.claims` to the verified token's claims. Postgres then enforces the same policies the app sees.
- The service role or `postgres` is used only for scheduled jobs and for admin actions such as account deletion and data export under RA 10173. Those code paths must scope their queries explicitly.

**Consequences.** Access rules have a single source of truth, and pgTAP tests prove them. The cost is one extra `SET` round trip per transaction.
