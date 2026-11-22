# PondoPal database

This is the Supabase project. Use the pinned CLI through `npx supabase@3.2.0`. It needs Docker.

```bash
npx supabase@3.2.0 start          # local stack; prints URL and keys
npx supabase@3.2.0 migration new <name>
../misc/scripts/reset-db.sh       # re-apply migrations + seed, regenerate frontend types
```

| Path | What it holds |
|---|---|
| `supabase/migrations/` | Timestamped SQL migrations |
| `supabase/seed.sql` | Default categories, challenge templates and demo data |
| `policies/` | pgTAP tests proving the RLS rules. Run with `npx supabase@3.2.0 test db policies`. |
| `scripts/gen-types.sh` | Writes `frontend/src/types/database.ts` |

Every table has RLS enabled (see `misc/docs/adr/0004-rls-first.md`).
