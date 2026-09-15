# RateFactor Live Supabase Inventory (Phase 0A)

Status: **Read-only inventory. No writes, no schema changes, no data touched.**
Collected via `psql` with `default_transaction_read_only=on` set at the Postgres session level (defense-in-depth against any accidental write), reading `DATABASE_URL` from this worktree's local `.env` without ever printing/logging it. Companion docs: [`NEON-CLOUDINARY-AUDIT.md`](./NEON-CLOUDINARY-AUDIT.md), [`MIGRATION-ROADMAP.md`](./MIGRATION-ROADMAP.md).

---

## 1. PostgreSQL Version

- `server_version`: **17.6**
- `SELECT version()`: PostgreSQL 17.6 on x86_64-pc-linux-gnu (Supabase-managed)

Neon supports Postgres 17, so this is directly compatible.

## 2. Installed Extensions

| Extension | Version |
|---|---|
| `pg_stat_statements` | 1.11 |
| `pgcrypto` | 1.3 |
| `plpgsql` | 1.0 |
| `supabase_vault` | 0.3.1 |
| `uuid-ossp` | 1.1 |

Only `pgcrypto` and `uuid-ossp` are used by RateFactor's own schema (matches the repo audit). `supabase_vault` is Supabase-managed secret storage — not referenced anywhere in `src/` or `supabase/schema.sql`'s RateFactor tables; Supabase-specific, not portable, not needed on Neon. `pg_stat_statements` is a monitoring extension, not app-dependent. No `pgvector`, `pg_net`, or `pg_cron` present — confirms the repo audit's assumption that no exotic extensions are in play.

## 3. Schemas and Tables

**Schemas present**: `auth`, `extensions`, `graphql`, `graphql_public`, `pgbouncer`, `public`, `realtime`, `storage`, `supabase_migrations`, `vault`, plus ~44 `pg_temp_*`/`pg_toast_temp_*` session-scratch schemas (normal Postgres/Supabase noise, not relevant).

All of `auth`, `graphql`, `graphql_public`, `pgbouncer`, `realtime`, `storage`, `supabase_migrations`, `vault` are **Supabase platform-managed infrastructure**, not RateFactor schema. None of it is portable to Neon and none of it should be replayed — this matches the repo audit's conclusion.

**RateFactor's own tables (`public` schema, 19 tables)** — all present live, matching `supabase/schema.sql`:
`account`, `auth_challenges`, `comment_reports`, `comments`, `github_contribution_summaries`, `github_contributions`, `github_profiles`, `github_readmes`, `github_repositories`, `likes`, `notifications`, `portfolios`, `profiles`, `rate_limits`, `ratings`, `session`, `showcases`, `user`, `verification`.

No extra/unexpected tables in `public` beyond what the repo schema documents, and nothing from `supabase/schema.sql` is missing live. **Schema drift risk is low** for the `public` schema specifically — this is the first live confirmation that `schema.sql` reflects the actual production DDL, at least for table presence (column-level diffing was not performed in this pass).

## 4. Row Counts (public schema)

| Table | Rows |
|---|---|
| `profiles` | 9 |
| `portfolios` | 4 |
| `ratings` | 4 |
| `likes` | 9 |
| `comments` | 2 |
| `comment_reports` | 0 |
| `notifications` | 9 |
| `showcases` | 0 |
| `user` | 7 |
| `session` | 25 |
| `account` | 7 |
| `verification` | 0 |
| `github_profiles` | 3 |
| `github_repositories` | 66 |
| `github_readmes` | 3 |
| `github_contributions` | 1,101 |
| `github_contribution_summaries` | 3 |
| `auth_challenges` | 0 |
| `rate_limits` | 0 |

This is a very small production dataset — consistent with the ~31MB DB size reported earlier. `auth_challenges` and `rate_limits` are confirmed **empty live**, matching the repo audit's prediction that both are dead (in-memory equivalents are used instead) — safe to drop without a data-loss concern. `verification` and `showcases` are also currently empty (expected/transient, not a red flag).

## 5. `auth.users` (Supabase Auth) Status

- Table exists: **yes** (`auth.users` resolves via `to_regclass`)
- Row count: **0**

This substantially de-risks the migration: the repo audit flagged a possibility that the app previously used Supabase Auth before Better Auth was introduced, which could leave orphaned identities in `auth.users` needing a mapping decision. **Live data shows zero rows in `auth.users`** — there is nothing to reconcile. The `handle_new_user()` function and its associated `auth.users` trigger reference can be dropped outright with no data implication.

## 6. Supabase Storage Status

- `storage.buckets` exists, **1 bucket**: `portfolio-images`
- `storage.objects` exists, **0 objects** (bucket is empty; no objects reference any bucket)

Confirms the repo audit's conclusion that Supabase Storage is **vestigial** — the bucket was provisioned but never actually used to store any file. Safe to ignore/drop with zero data-loss risk.

## 7. Image Storage Counts (counts only — no content retrieved)

| Metric | Count |
|---|---|
| `portfolios.thumbnail_url LIKE 'data:%'` (base64) | 2 |
| `portfolios.thumbnail_url LIKE 'http(s)://%'` | 2 |
| `profiles.avatar_url LIKE 'data:%'` (base64) | 0 |
| `profiles.avatar_url LIKE 'http(s)://%'` | 9 |

Base64 backfill burden is minimal: **2 portfolio thumbnails** total need migrating to Cloudinary (matches all 4 live portfolios: 2 base64 + 2 URL/preset). **Zero avatar images are base64** — all 9 profiles already use URL-based avatars (defaults or externally hosted), so the avatar backfill script (audit §6) will have nothing to do on current data, though the code path should still be built since new uploads will use it going forward.

## 8. RLS, Foreign Keys, Triggers, Functions

**RLS**: enabled (`rowsecurity = true`) on **every** `public` schema table (all 19), matching `schema.sql`'s `ENABLE ROW LEVEL SECURITY` statements. None are `FORCE ROW LEVEL SECURITY` (`relforcerowsecurity = false` on all), meaning the table owner role — which is what the app's `pg.Pool` connects as — bypasses RLS entirely regardless of policy content. This is live confirmation of the repo audit's conclusion: **RLS is enabled but not actually enforced against the app's own connection**, so dropping/not-replaying these policies on Neon changes nothing about the app's real behavior; the actual enforcement lives in triggers (see below).

**Foreign keys** (`public` schema, 22 total): all match the repo schema's declared relationships (`portfolios→profiles`, `ratings/likes/comments→portfolios`+`profiles`, `comment_reports→comments`+`profiles`, `notifications→profiles`+`portfolios`, `showcases→portfolios`, Better Auth `session`/`account`→`"user"`, all 5 `github_*`→`profiles`/`github_repositories`). One FK, `auth_challenges_user_id_fkey`, points at **`auth.users`** — this is the one FK that cannot be replayed on Neon as-is (matches the repo audit's flag); since `auth_challenges` is confirmed empty (§4) and the table itself is unused by app code (per the repo audit), this FK can simply be dropped along with the table.

**Triggers** (`public` schema, 13 total, confirmed after correcting an initial query bug in this pass): `tr_account_updated_at`, `tr_sync_comment_reports`, `tr_sync_comments_count`, `tr_sync_likes_count`, `tr_portfolios_updated_at`, `tr_prevent_role_escalation`, `tr_profiles_updated_at`, `tr_prevent_self_rating`, `tr_sync_ratings`, `tr_session_updated_at`, `tr_on_better_auth_user_sync`, `tr_user_updated_at`, `tr_verification_updated_at`. All are plain plpgsql triggers with no Supabase-specific dependencies (aside from `tr_prevent_role_escalation`'s internal, exception-guarded call to `auth.uid()` noted in the repo audit) — these are exactly the triggers documented in `supabase/schema.sql`/migrations and confirm the real enforcement layer (counts sync, self-rating prevention, updated_at maintenance, profile-id sync) is live and Postgres-native, portable to Neon unchanged.

**Functions** (`public` schema, 14 total): `current_user_role`, `handle_better_auth_user_sync`, `handle_new_user`, `is_admin`, `is_moderator`, `prevent_role_escalation`, `prevent_self_rating`, `rls_auto_enable`, `set_better_auth_updated_at`, `set_updated_at`, `sync_comment_reports`, `sync_comments_count`, `sync_likes_count`, `sync_ratings`. All present as expected from the repo schema. `handle_new_user` exists as a function but (per the trigger list above) has **no trigger currently attached to it in this live database** — no `on_auth_user_created`-style trigger appears in the 13-trigger list, which is scoped to `public` and wouldn't show a trigger defined on `auth.users` anyway; this alone doesn't confirm whether that trigger exists on `auth.users`, only that no `public`-schema table has such a trigger. Not independently checked in this pass since it doesn't affect the migration decision (the function/trigger pair references `auth.*` either way and won't be replayed).

---

## Schema Surprises vs. Repo

1. **`supabase_vault` extension is installed** but not documented anywhere in the repo audit — confirmed unused by RateFactor's own schema/code, no action needed beyond noting it as Supabase-only.
2. **Zero rows in `auth.users`** — better than the repo audit's worst case (orphaned pre-Better-Auth identities); no user-mapping reconciliation needed.
3. **Zero objects in the `portfolio-images` storage bucket** — fully vestigial, confirmed rather than assumed.
4. **Base64 image debt is much smaller than the schema alone would suggest**: only 2 rows total need Cloudinary backfill (2 portfolio thumbnails; zero avatars). The 25s-poll/no-SQL-LIMIT egress problem identified in the repo audit is **not** primarily a "huge base64 payload" problem at current data volume — it's a query-shape problem (unbounded SQL, full comments join) that will matter much more as the dataset grows than it does today.
5. My first trigger-inventory query had a SQL bug (`tgrelid::regnamespace` is an invalid cast — `regnamespace` expects a namespace oid, not a table oid) that silently returned 0 rows instead of erroring. Caught and corrected within this same pass before reporting; flagging it here for transparency since a naive read would have wrongly concluded "no triggers exist in production," which would have been a false and alarming finding.

---

## Phase 0A Result

**PASS.** Live read-only access succeeded, all planned inventory items were collected, and no destructive or write operations were issued (session-level `default_transaction_read_only=on` was set as a safety net and never needed to block anything, since only `SELECT`/`SHOW`/catalog queries were run).

---

## Phase 0B: Live Schema Drift Comparison

Status: **Read-only. Same safety model as Phase 0A** — `default_transaction_read_only=on` set per-session, only `information_schema`/`pg_catalog` reads issued, `DATABASE_URL` never printed. Compared live catalog output against `supabase/schema.sql` + all 7 files in `supabase/migrations/`.

### 1. Column/type/default drift

**No unexplained drift.** `supabase/schema.sql` is a **baseline snapshot only** — its `CREATE TABLE` bodies do not include columns added by the three most recent migrations (`20260913000000_rating_critique_hire_accolades.sql`, `20260915000000_roles_onboarding_and_performance_indexes.sql`, `20260915000002_github_project_verification.sql`). Live production has all of those columns (`portfolios.request_critique`, `portfolios.github_verification_status/_verified_login/_repository_full_name/_verified_at`, `comments.critique_tag`, `profiles.available_for_hire`, `profiles.custom_hire_message`, `profiles.onboarded`, `user.onboarded`), and every one matches its migration file exactly (type, nullability, default). **`schema.sql` alone understates the live schema — treat `schema.sql` + all migrations applied, not `schema.sql` in isolation, as the migration source**, exactly as §5 of the roadmap already assumes (`pg_dump --schema-only`, not `schema.sql`, should be the actual Neon DDL source).

**One real type drift, fully explained by migration history**: `profiles.role` is declared `public.app_role` (enum) in `schema.sql`'s baseline `CREATE TABLE`, but live is `text` with default `'user'`. `20260915000000_roles_onboarding_and_performance_indexes.sql:16-18` explicitly converts it (`ALTER COLUMN role TYPE TEXT`) to support arbitrary discipline strings beyond the 3-value enum. Live matches the migration, not the stale baseline. Same for `"user".role` (also converted to free-text `'user'` default in the same migration).

All 211 live columns across the 19 `public` tables were checked column-by-column (type, nullable, default) against schema.sql+migrations — no other discrepancies found.

### 2. Constraints, indexes, FKs — full match

- **31 CHECK constraints**, **22 foreign keys**, **86 indexes**, **11 unique constraints**, **19 primary keys** — every one present live matches a definition in `schema.sql` or a migration file. Nothing live is undocumented; nothing documented is missing live.
- FK behavior: all use `ON DELETE CASCADE` (no `ON UPDATE` overrides anywhere, i.e. default `NO ACTION` — matches repo intent, nothing app code relies on cascading updates).
- The single non-portable FK remains `auth_challenges_user_id_fkey → auth.users(id) ON DELETE CASCADE` (already flagged in Phase 0A/audit §5) — confirmed still the only one referencing Supabase-managed schema.

### 3. Enums / custom types

4 enums live: `app_role` (developer/moderator/admin), `content_status`, `portfolio_category`, `report_reason` — all match their `CREATE TYPE` statements in `schema.sql`.

**New finding**: `app_role` is now an **orphaned enum type** — no table column uses it anymore (superseded by `profiles.role TEXT`), but it's still the declared `RETURNS app_role` type of `current_user_role()` (see §5 below) and still exists as a type in the catalog. Not blocking — an unused/underused type costs nothing to carry over or drop. **Unresolved, low-priority**: decide whether to keep `app_role` on Neon (harmless, still referenced by one function signature) or drop it along with the RLS-only functions that use it.

### 4. Sequences / identity

No `SERIAL`/`IDENTITY` columns anywhere in `public` (all PKs are `uuid`/`text` with `gen_random_uuid()`/`uuid_generate_v4()` defaults, or Better Auth's app-generated `text` ids). Zero rows returned from the identity-column query — nothing to reconcile, no sequence ownership to migrate.

### 5. Triggers and functions — business logic is portable, RLS-helper functions are not

- **13 table-level triggers** across `public` — all present live, all match `schema.sql`/migrations, all plain `plpgsql`/business-logic (`set_updated_at`, `sync_likes_count`, `sync_comments_count`, `sync_ratings`, `sync_comment_reports`, `prevent_self_rating`, `prevent_role_escalation`, Better Auth `updated_at` triggers, `handle_better_auth_user_sync`). **These must be preserved unchanged on Neon** — this is the real enforcement layer (per audit §2), and Phase 0A's conclusion holds.
- **14 functions** in `public` — all present, all match. Three of them (`current_user_role`, `is_admin`, `is_moderator`) call `auth.uid()` internally and are **RLS-policy helpers only** — never called by application code (app connects as the table owner, bypassing RLS per Phase 0A §8). **New finding**: `current_user_role()` is additionally now type-inconsistent with live data — it's declared `RETURNS app_role` but selects `profiles.role`, which is `TEXT` post-migration (see §1). This mismatch is silently dormant today (RLS never actually invokes it against the app's connection), but it means this function would need a signature fix, not just a mechanical replay, if anyone ever tried to actually use it. **Recommendation unchanged from the audit: do not replay `current_user_role`/`is_admin`/`is_moderator` on Neon at all** — they're Supabase-RLS-specific, unused, and one is now broken besides.
- **New finding — 7 database-level event triggers**, none scoped to `public` and therefore invisible to a schema-scoped drift check alone: `issue_graphql_placeholder`, `pgrst_ddl_watch`, `pgrst_drop_watch`, `issue_pg_cron_access`, `issue_pg_net_access`, `issue_pg_graphql_access`, and **`ensure_rls`** (which calls `rls_auto_enable()` — the function already listed in Phase 0A §8 — and auto-enables RLS on every newly created table). All 7 are Supabase-platform machinery (PostgREST schema-cache invalidation, pg_graphql/pg_cron/pg_net grant plumbing, RLS auto-enable). **None exist outside Supabase and none should be replayed on Neon** — same disposition as the `graphql`/`realtime`/`storage`/`pgbouncer` schemas already excluded in Phase 0A §3.
- **Confirmed** (resolves Phase 0A/audit open question #4): `on_auth_user_created` trigger **does exist live** on `auth.users`, calling `handle_new_user()`. Combined with the already-confirmed **zero rows in `auth.users`** (Phase 0A §5), this trigger firing has never actually populated anything of consequence — but it does confirm the trigger + function + `auth.users` FK on `auth_challenges` form one coherent Supabase-only unit that should be dropped together, not replayed piecemeal.

### 6. RLS status

Reconfirmed at the same granularity as Phase 0A: all 19 tables have `relrowsecurity = true`, `relforcerowsecurity = false` on all 19 — no gaps, no table silently added since Phase 0A ran. Enforcement continues to live entirely in the triggers listed in §5, not in policies.

---

### Phase 0B Summary

**1. Live-vs-repo drift**: None unexplained. `schema.sql` (baseline) understates live schema by 3 migrations' worth of columns — expected, not drift, given the migrations replay cleanly on top of it. One real type change (`profiles.role`/`user.role`: enum → text) is fully accounted for by `20260915000000_roles_onboarding_and_performance_indexes.sql`. All 211 columns, 31 checks, 22 FKs, 86 indexes, 11 unique constraints, 19 PKs, 4 enums, 13 triggers, 14 functions matched between live and (schema.sql + migrations).

**2. Objects Neon must preserve**: all 19 `public` tables; all business-logic triggers (`set_updated_at`, `sync_likes_count`, `sync_comments_count`, `sync_ratings`, `sync_comment_reports`, `prevent_self_rating`, `prevent_role_escalation`, Better Auth `updated_at`/`handle_better_auth_user_sync`); all CHECK/FK/unique/PK constraints and indexes as enumerated above; `uuid-ossp`/`pgcrypto` extensions; all 4 enum types (including the now-orphaned `app_role`, pending the decision in §3 above).

**3. Supabase-only objects to exclude**: `auth.*`/`storage.*`/`realtime.*`/`graphql*`/`pgbouncer`/`vault` schemas (per Phase 0A); `auth.users` table, `on_auth_user_created` trigger, `handle_new_user()` function; **all 7 event triggers** (`issue_graphql_placeholder`, `pgrst_ddl_watch`, `pgrst_drop_watch`, `issue_pg_cron_access`, `issue_pg_net_access`, `issue_pg_graphql_access`, `ensure_rls`/`rls_auto_enable()`); RLS policies referencing `auth.uid()`/`auth.role()`; the three RLS-helper functions `current_user_role()`, `is_admin()`, `is_moderator()` (unused by app code, one now type-broken).

**4. Unresolved decisions (explicitly left undecided, not defaulted)**: whether to drop or keep the orphaned `app_role` enum type on Neon; final disposition of `auth_challenges`/`rate_limits` (confirmed empty and unused, per Phase 0A — still not deleted here, per this task's scope).

**5. Phase 0B Result: PASS.** No live object was found that the migration plan doesn't already account for; no repo-declared object was found missing live. The only genuinely new discoveries (event triggers, the `current_user_role()` type mismatch) both reinforce the existing plan (exclude Supabase RLS/platform machinery) rather than contradict it. Nothing here blocks a Postgres 17 → Postgres 17 Neon migration.

**6. Exact next task**: Phase 1 — provision the Neon project/branch and Cloudinary account (no live Supabase access needed for this step; still no data migration, no app changes, per the roadmap's ordering).
# Current Neon follow-up

The five transient `github_*` mirror tables were subsequently removed from Neon. GitHub display data is now live/on-demand with short-lived application caching; Better Auth and durable portfolio verification remain in Neon.
