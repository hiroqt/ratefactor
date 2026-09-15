# RateFactor Neon Schema

Status: **Schema only. No production data has been copied.** This directory
holds the portable Postgres 17 schema for the Neon migration target, applied
so far only to the **empty** Neon `DIRECT_URL` database. `DATABASE_URL` (live
Supabase) was never written to — only read via `pg_dump --schema-only` and
read-only catalog queries.

Companion docs: [`../../docs/infrastructure/NEON-CLOUDINARY-AUDIT.md`](../../docs/infrastructure/NEON-CLOUDINARY-AUDIT.md), [`../../docs/infrastructure/MIGRATION-ROADMAP.md`](../../docs/infrastructure/MIGRATION-ROADMAP.md), [`../../docs/infrastructure/LIVE-DB-INVENTORY.md`](../../docs/infrastructure/LIVE-DB-INVENTORY.md) (Phase 0A/0B — the source of truth this schema was built from).

## Files

- **`schema.sql`** — the full portable DDL: extensions, enum types, business-logic functions, all 19 tables (with inline PK/unique/check constraints), FKs, indexes, and triggers. Idempotent (`IF NOT EXISTS` / `CREATE OR REPLACE` / guarded `DO` blocks for enum types) — safe to re-run.
- **`validation.sql`** — read-only post-apply checks: counts tables/columns/constraints/indexes/functions/triggers against the exact numbers Phase 0B found live (minus the intentionally excluded objects), and confirms no Supabase-only object leaked in.
- **`migrations/20260915000000_add_portfolio_thumbnail_public_id.sql`** — adds the nullable Cloudinary asset identifier used for portfolio-cover cleanup.
- **`README.md`** — this file.

## Why `schema.sql` here, not `supabase/schema.sql`

Per Phase 0B, `supabase/schema.sql` is a stale baseline that predates three
migrations (`rating_critique_hire_accolades`, `roles_onboarding_and_performance_indexes`,
`github_project_verification`). This file was generated from a **live**
`pg_dump --schema-only` of production (Phase 0B's own recommended approach —
"snapshot, don't replay migrations"), so it reflects the actual current
production DDL, not the repo's incremental history.

## What was excluded, and why

All decisions trace back to Phase 0B (`docs/infrastructure/LIVE-DB-INVENTORY.md`).

| Excluded | Reason |
|---|---|
| `auth`/`storage`/`realtime`/`graphql`/`graphql_public`/`pgbouncer`/`vault` schemas | Supabase platform-managed infrastructure. Never provisioned on Neon in the first place — nothing to strip at the schema level, confirmed absent by `validation.sql` §14. |
| `auth.users` table, `on_auth_user_created` trigger, `handle_new_user()` function | Reference `auth.*`, which doesn't exist outside Supabase. Zero rows in `auth.users` live (Phase 0A) — nothing to reconcile. |
| 7 Supabase event triggers (`issue_graphql_placeholder`, `pgrst_ddl_watch`, `pgrst_drop_watch`, `issue_pg_cron_access`, `issue_pg_net_access`, `issue_pg_graphql_access`, `ensure_rls`/`rls_auto_enable()`) | Discovered in Phase 0B — all PostgREST/pg_graphql/pg_cron/pg_net/RLS-auto-enable plumbing. None exist outside Supabase. |
| RLS policies (all ~40 live `CREATE POLICY` statements) | Reference `auth.uid()`/`auth.role()`/`current_setting('request.jwt.claim.sub', ...)`. The app connects as a single privileged `pg.Pool` role that bypasses RLS entirely (confirmed Phase 0A §8) — these policies provide no real enforcement today, so RLS is **not enabled** on Neon at all. Real enforcement lives in the triggers, which are preserved. |
| `current_user_role()`, `is_admin()`, `is_moderator()` | RLS-policy helpers only, unused by application code (app never connects with a Supabase JWT). Not created on Neon. |
| `prevent_role_escalation()` / `tr_prevent_role_escalation` | See "Unresolved decisions" below — not a simple exclude, has a real behavioral consequence. |
| `auth_challenges_user_id_fkey → auth.users(id)` | The one FK in the whole schema referencing Supabase Auth's own schema. Dropped; the `auth_challenges` table itself is kept (see below). |

## What was preserved

- All 19 tables, exactly as declared live (Phase 0B confirmed 211 columns, 31 checks, 22 FKs minus the one dropped above, 86 indexes, 11 unique constraints, 19 PKs — see `validation.sql` for the post-apply re-check).
- All 4 enum/custom types (`app_role`, `content_status`, `portfolio_category`, `report_reason`).
- `uuid-ossp` and `pgcrypto` extensions (installed unqualified into the default schema, matching `supabase/schema.sql`'s own convention — the live dump's `extensions.uuid_generate_v4()` qualification is Supabase packaging, not required elsewhere).
- All genuine business-integrity triggers/functions: `set_updated_at`, `set_better_auth_updated_at`, `sync_likes_count`, `sync_comments_count`, `sync_ratings`, `sync_comment_reports`, `prevent_self_rating` — none of these reference `auth.*`, all replayed verbatim.
- **`handle_better_auth_user_sync()`** — the canonical Better Auth → `profiles` synchronization trigger (deterministic UUID mapping identical to `src/lib/auth/profile-id.ts`'s `resolveCanonicalProfileId`). Fully portable (no Supabase dependency), replayed verbatim, and functionally the most important trigger to have gotten exactly right.

## Unresolved decisions (explicit, not defaulted away)

1. **`prevent_role_escalation()` / `tr_prevent_role_escalation` — excluded from `schema.sql`.**
   Inspecting the live function body (not just its signature, which Phase 0B's catalog-only pass already flagged as calling `auth.uid()`) shows it calls `auth.uid()` **unconditionally**, with no exception guard, whenever `profiles.role` changes:
   ```sql
   SELECT role INTO requester_role FROM public.profiles WHERE id = auth.uid();
   IF requester_role IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION ...
   ```
   On Supabase, the app's own `pg.Pool` connection has no JWT context, so `auth.uid()` returns `NULL` — meaning `requester_role` is always `NULL`, which is always `IS DISTINCT FROM 'admin'`, so this trigger **already unconditionally blocks every role change made through the app's real connection today**. On Neon, `auth.uid()` isn't `NULL` — it's an **undefined function** (the `auth` schema doesn't exist), so replaying this trigger verbatim would hard-error on every `profiles.role` UPDATE instead of Supabase's silent-but-total block. Replaying it as-is would not reproduce equivalent behavior; it would break differently. **Decision: do not create this trigger on Neon.** Role-escalation protection for `profiles.role` is left as a gap to be re-designed at the application layer (e.g., an explicit admin-session check in an API route) — this is a pre-existing latent issue on Supabase too, not something this migration step introduces. Flagging for a real decision before Phase 9 cutover.
2. **`app_role` enum type — kept.**
   Orphaned on live production (no column uses it since `profiles.role`/`user.role` became `TEXT` — Phase 0B §1), but still the declared return type of the excluded `current_user_role()`. Keeping the type costs nothing and avoids a needless divergence from live; dropping it is equally safe if ever desired. Not decided further here.
3. **`auth_challenges` — table kept, FK to `auth.users` dropped.**
   Confirmed zero rows live (Phase 0A §4) and unused by application code (in-memory OTP flow — audit §2), but per explicit instruction and Phase 0A's own note, emptiness alone is not a reason to drop it. Kept in full, minus the one non-portable FK.
4. **`rate_limits` — table kept unchanged.**
   Confirmed zero rows live, unused by application code (in-memory rate limiter), fully portable as-is (no Supabase dependency at all) — kept with no modification.

## How this was applied

1. Confirmed `DIRECT_URL` resolves to a `*.neon.tech` host (not Supabase) and connects as `neondb_owner` to database `neondb`.
2. Confirmed `SELECT version()` reports PostgreSQL **17.11** on the target.
3. Confirmed the target `public` schema was empty (`0` tables) before applying — safe for first-time schema creation, no risk of clobbering existing objects.
4. Applied `schema.sql` to `DIRECT_URL` only. `DATABASE_URL` (Supabase) was never used for any `CREATE`/`ALTER`/`INSERT` statement in this step — only `pg_dump --schema-only` (a read operation) was run against it.
5. Ran `validation.sql` against `DIRECT_URL` and confirmed every expected count/object.

## Next step

Phase 3 of the roadmap: point a local `DATABASE_URL` at this Neon branch and
run the app against it (auth, portfolios, ratings/likes/comments, GitHub
sync, notifications) — still no production data. Production data migration
(`pg_dump --data-only` from Supabase → Neon) is a separate, later step and
was explicitly out of scope for this one.
