# 0001 — Supabase for auth, data, realtime and storage

**Status:** accepted

**Context.** PondoPal needs email, Google, Apple and phone-OTP sign-in, a relational store for shared money, live updates when a partner adds an expense, and private receipt storage.

**Decision.** Use Supabase. That means Auth, Postgres with RLS, Realtime and Storage. The app calls PostgREST directly for plain CRUD. Local dev runs on `supabase start` (Docker), using the CLI version pinned in the scripts.

**Consequences.** Authorization lives in RLS, which ADR 0004 covers. Postgres is portable, so the main lock-in is Auth and Storage.
