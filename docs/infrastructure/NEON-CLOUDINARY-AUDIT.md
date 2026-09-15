# RateFactor Infrastructure Audit: Neon + Cloudinary Migration

Status: **Audit only. No code, schema, or environment changes have been made.**
Scope: Evidence-based audit of the current Supabase/PostgreSQL + base64-image stack, produced by four parallel read-only subagent audits (Neon portability, Cloudinary/image lifecycle, GitHub cache/data model, egress/fetching hotspots) plus independent verification of the highest-risk claims by the coordinating session.

Companion document: [`MIGRATION-ROADMAP.md`](./MIGRATION-ROADMAP.md) (phases, env vars, validation checklist, rollback, PR boundaries, test plan, open questions, next action).

---

## 1. Current Architecture

- **Hosting**: Vercel (Next.js app; `force-dynamic` used on several routes, e.g. `src/app/u/[username]/page.tsx:3`, `src/app/api/developers/route.ts:6`, `src/app/api/auth/[...all]/route.ts:10`).
- **Database**: Supabase-hosted PostgreSQL. Application code talks to it via a plain `pg.Pool` (`src/lib/auth/better-auth.ts:3,26-33`), cached on `globalThis` to survive Next.js HMR. **No `@supabase/supabase-js` or `@supabase/ssr` usage exists anywhere in `src/`** (verified independently — zero matches) — the app never uses Supabase's client SDK, PostgREST, Storage API, or RLS-driven access patterns at runtime. All queries are raw SQL through `pg`.
- **Auth**: Better Auth, backed by the same `pg.Pool`, using its own `user`/`session`/`account`/`verification` tables (`supabase/schema.sql:673-735`). Canonical `profiles.id` is derived deterministically from the Better Auth user id (UUID passthrough, or `md5('ratefactor:' || id)::uuid`) — implemented identically in a SQL trigger (`supabase/schema.sql:862-926`) and in TypeScript (`src/lib/auth/profile-id.ts:13-17`).
- **GitHub integration**: 5 cache tables (`github_profiles`, `github_repositories`, `github_readmes`, `github_contributions`, `github_contribution_summaries`), populated via `src/lib/github/sync.ts` orchestrating REST + GraphQL calls, with a `force`-flag fast/slow path in `syncGithubUser`. A separate, unrelated feature (`src/lib/github/repository-verification.ts`) verifies project ownership live and never touches the cache tables.
- **Image storage**: No object storage at all. Portfolio cover images and avatars are converted client-side to base64 `data:` URLs (`FileReader.readAsDataURL`, `SubmitPortfolioModal.tsx:238-244`) and stored directly in `TEXT` columns (`portfolios.thumbnail_url`, `profiles.avatar_url`). A `supabase/schema.sql:637-666` Storage bucket (`portfolio-images`) exists in the schema but is **vestigial** — nothing in `src/` calls Supabase Storage.
- **Recurring fetches**: `usePortfolios` polls `GET /api/portfolios?limit=50` with `cache: "no-store"` every 25s (`src/features/portfolios/hooks/usePortfolios.ts:211`), plus on mount/focus/online. `useNotifications` polls every 5s while the tab is visible. A developer-spotlight widget polls every 15s.

---

## 2. Confirmed Problems

Each item below was read directly in code (file:line cited) and, where flagged, independently re-verified by the coordinating session.

### Database / schema
- **RLS policies reference `auth.uid()`/`auth.role()`/`request.jwt.claim.sub`** (`supabase/schema.sql:498-849`), which are Supabase/PostgREST-injected and don't exist on stock Postgres/Neon. Because the app never connects as an `anon`/`authenticated` Supabase role (it uses a single privileged `pg.Pool` — `supabase/schema.sql:440-446` even documents this bypass), these policies provide **no real enforcement today**; the actual security invariants (self-rating prevention, role escalation) were already moved into unconditional `BEFORE` triggers specifically because `auth.uid()` is never populated (`supabase/migrations/20260914000000_rating_integrity_fix.sql:113-127`). This is good news for portability — the real enforcement layer is already Supabase-independent.
- **`auth.users` table + `on_auth_user_created` trigger** (`supabase/schema.sql:294-340`) reference Supabase Auth's own schema, which does not exist outside Supabase and will hard-fail if the migration SQL is replayed verbatim on Neon.
- **Dead/legacy tables**: `auth_challenges` (OTP flow is entirely in-memory, `src/lib/auth/otp.ts:19`) and `rate_limits` (rate limiting is entirely in-memory, `src/lib/rate-limit.ts:65`) are declared in schema but never queried by application code.
- **No portfolio DELETE endpoint exists** (verified independently: `src/app/api/portfolios/[id]/route.ts` does not exist). This is a functional gap relevant to the Cloudinary cleanup plan, not a regression to fix in this audit.

### Images
- **Portfolio cover images: zero compression.** `SubmitPortfolioModal.tsx:238-244` converts the raw uploaded file straight to base64 via `FileReader.readAsDataURL` with no resizing/recompression step, even though a working compression utility (`src/lib/image-compression.ts`, `compressProfileImage`) already exists and is used for avatars only.
- **`imageSizeBytes` sent to the API is the original file size, not the size of the base64 string actually persisted** (`SubmitPortfolioModal.tsx:381`), so the DB's `CHECK` constraint on `image_size_bytes` (`schema.sql:105`) is validating the wrong number relative to what's stored (base64 inflates payload size ~33%).
- **Server never re-validates `thumbnailUrl` content.** `portfolioSubmissionSchema.thumbnailUrl` is `z.string().min(1)` (`src/lib/validations/portfolio.ts:55`) — any non-empty string is accepted; MIME type is enforced client-side only.
- **No dimension limit on portfolio cover images** (avatars have a 512×512 bound; cover images have none).

### Egress / fetching (independently re-verified: the list query truly has no SQL-level `LIMIT`)
- **`GET /api/portfolios` main query has no SQL-level `LIMIT`/`OFFSET`.** `src/app/api/portfolios/route.ts:38-80` selects every `published` portfolio row — including the full base64 `thumbnail_url` — and only slices the array in JavaScript afterward (`route.ts:213-282`). The `?limit=50` query param never reduces what Postgres sends across the wire. **Confirmed via direct read**: `limit`/`offset` are parsed (lines 18-19) but not referenced anywhere in the SQL text (lines 38-80).
- **Same route's comments query is also unbounded and unscoped**: `route.ts:85-102` selects every `approved` comment site-wide (no `portfolio_id` filter, no `LIMIT`) on every list request, just to attach a `comments` array per portfolio.
- **This query is polled every 25s** (`usePortfolios.ts:211`) from every dashboard/discover session AND from **every public profile page view** — `src/app/u/[username]/page.tsx:146` mounts the same hook, meaning anonymous visitors to any `/u/[username]` page also subscribe to the full all-portfolios poll, not just users actively browsing a portfolio list.
- **`GET /api/profile?username=...`** also selects every portfolio's `thumbnail_url` for a given user with no `LIMIT` (`src/app/api/profile/route.ts:294-314`), on every profile page load.
- **GitHub repository sync writes are not batched**: `saveGithubRepositories` issues one `INSERT ... ON CONFLICT` per repository in a sequential `for` loop (`src/lib/github/repositories.ts:118-158`), unlike contributions, which are already batched via `unnest` (`contributions.ts:340-347`). A forced sync for a user with ~100 repos costs ~100 sequential round trips.
- **GitHub Sync always rewrites all rows, even when nothing changed.** `force=true` unconditionally re-runs every upsert; `github_readmes` even stores a `content_sha` (`readme.ts:146-163`) but never uses it to skip a no-op write.
- **No reconciliation/deletion of stale GitHub repos.** `saveGithubRepositories` only upserts; grep confirms zero `DELETE FROM public.github_*` statements anywhere in `src/`. A repo deleted, renamed, or made private on GitHub remains cached indefinitely. Disconnecting a GitHub account (`useGithubConnection.ts:189-212`) also never deletes the cached rows.
- **Private repositories are persisted, not just filtered at read time.** `saveGithubRepositories` is called with the full repo list including private repos (`sync.ts:149`); privacy is only enforced when *serving* data to non-owners (`repositories/route.ts:42`), not before writing.
- **`github_contribution_summaries` is largely redundant with `github_contributions`.** The read path already recomputes streaks from the 371 daily rows and only overlays summary values as an optional override (`contributions.ts:395-401`) — the fallback path itself proves the summary table's values are derivable.

---

## 3. Unconfirmed / Needs Live-DB Verification

These cannot be determined from the repository alone and must be checked against the **live** Supabase project before any migration step that depends on them:

1. **Whether `supabase/schema.sql` actually matches production schema.** Supabase's dashboard/SQL editor allows ad hoc changes outside the migrations folder; nothing in the repo proves no drift occurred. A live `pg_dump --schema-only` is required before trusting this file as a migration source.
2. **Whether `auth_challenges`, `rate_limits`, or the `storage.objects` bucket have any production rows**, despite being unused by current app code — could reflect an earlier version of the app.
3. **Whether any `thumbnail_url`/`avatar_url` values reference Supabase Storage URLs** rather than base64 — i.e., whether the app ever used Supabase Storage before switching to the base64 approach seen in code today.
4. **Whether `auth.users` has rows not mirrored in `profiles`/`user`** — the presence of `handle_new_user()` and the "Safely decouple profiles.id FK from auth.users(id)" migration comment suggests the app may have used Supabase Auth before Better Auth was introduced; orphaned identities would need a migration decision.
5. **Whether anything outside this Next.js codebase** (an admin panel, dashboard SQL, another service) connects to Supabase using `anon`/`authenticated` roles and actually depends on the RLS policies being real.
6. **Actual current DB size, table row counts, and per-table growth** — the reported ~31MB DB size and ~5GB egress figure are from the user's account dashboard, not verified against `pg_dump`/`pg_total_relation_size` in this audit.
7. **Whether `scripts/verify-*.ts`, referenced by `package.json`'s `test` script, exists anywhere** — this worktree does not contain a `scripts/` directory. Needed for any pre-cutover smoke testing.
8. **Whether the Supabase connection pooler (PgBouncer) the app currently connects through imposes prepared-statement/session behavior** the app implicitly depends on, which would need equivalent handling on Neon's pooler.

---

## 4. Target Architecture

- **Vercel** — unchanged.
- **Neon PostgreSQL** — replaces Supabase Postgres. Application code continues using `pg` + `DATABASE_URL` unchanged (`src/lib/auth/better-auth.ts` already uses a portable `pg.Pool`). Two connection strings recommended: a **pooled** Neon connection string for the app's serverless `pg.Pool` (avoids exhausting Neon's direct connection limit across cold starts), and a **direct/unpooled** string reserved for migration/admin tooling. No evidence found of `LISTEN/NOTIFY` or advisory-lock usage that would require a direct connection at runtime.
- **Better Auth** — unchanged; its tables (`user`, `session`, `account`, `verification`) are already portable, ordinary Postgres DDL.
- **Cloudinary** — replaces base64-in-Postgres for portfolio cover images and avatars. Architecture: browser → `POST /api/uploads/sign` (new route, signs upload params server-side with `CLOUDINARY_API_SECRET`) → browser uploads directly to Cloudinary (server never proxies image bytes) → Cloudinary returns `secure_url` + `public_id` → browser calls the existing `POST /api/portfolios` / `PATCH /api/profile` with the URL + public_id → DB stores only short strings. Preset/Unsplash URLs (`PRESET_THUMBNAILS`, `SubmitPortfolioModal.tsx:51-68`) stay external, untouched.
- **Optimized fetching** — portfolios list becomes mutation-driven (refetch on the current user's own create/like/rate/comment actions, several of which already exist as optimistic updates) supplemented by a much longer background interval or HTTP edge caching; the list query gets a real SQL `LIMIT`/`OFFSET` and stops returning full base64 thumbnails (moot once images move to Cloudinary, since thumbnails become short URLs).

---

## 5. Database Migration Map (Supabase → Neon)

| Item | Action |
|---|---|
| `profiles`, `portfolios`, `ratings`, `likes`, `comments`, `comment_reports`, `notifications`, `showcases`, Better Auth tables, all 5 `github_*` tables, all enums, all business-logic triggers (`set_updated_at`, `sync_likes_count`, `sync_comments_count`, `sync_ratings`, `prevent_self_rating`, `sync_comment_reports`) | Replay unchanged — no Supabase-specific dependencies found. |
| `uuid-ossp`, `pgcrypto` extensions | Enable on Neon — both are standard contrib extensions. |
| RLS policies referencing `auth.uid()`/`auth.role()` | **Do not replay.** Since real enforcement already lives in triggers/API-layer checks (see §2), the simplest safe choice is to not enable RLS on Neon at all, rather than porting inert or broken policies. |
| `auth.users` table, `on_auth_user_created` trigger, `handle_new_user()` function | **Drop, do not replay** — references a schema (`auth.*`) that doesn't exist outside Supabase. |
| `storage.buckets`/`storage.objects` (`portfolio-images` bucket + policies) | **Drop, do not replay** — confirmed unused by any code in `src/`. |
| `auth_challenges` (FK to `auth.users`) | Drop the FK at minimum; confirm zero production rows (§3) before deciding whether to drop the table entirely. |
| `rate_limits` table | Confirm zero production rows (§3); likely safe to drop — app uses an in-memory rate limiter. |
| Migration strategy | **Snapshot, don't replay.** Run `pg_dump --schema-only` against live Supabase, diff it against `supabase/schema.sql` to surface drift, strip the Supabase-only constructs listed above, apply the cleaned DDL to a fresh Neon branch, then `pg_dump --data-only` the confirmed-live tables and restore. Do not mechanically execute all 7 files under `supabase/migrations/` against Neon in sequence — several will hard-fail (`auth.users` references). |
| SSL/connection-string detection | `src/lib/auth/better-auth.ts:10-19` currently string-matches `supabase.co`/`pooler.supabase.com`/`sslmode=require` to decide SSL config. A Neon connection string won't match these; it will fall through to the generic production fallback (`NODE_ENV==='production' && !localhost`), which should still work but must be explicitly tested, and can be simplified once Supabase is fully retired. |
| `@supabase/supabase-js`, `@supabase/ssr` packages | Remove from `package.json` — zero imports found in `src/`, safe to drop independently of the DB cutover. |
| `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` env vars | Only referenced by `src/lib/uptime.ts:83-86` for a cosmetic health-check flag. Removable once that reference is updated/retired. |

---

## 6. Cloudinary Migration Map (base64 → Cloudinary)

**Current flow:**
```
<input type=file> -> FileReader.readAsDataURL() -> base64 string
  -> POST /api/portfolios (Zod: any non-empty string, size<=2MB on ORIGINAL file size)
  -> INSERT thumbnail_url TEXT (full base64 payload)
  -> GET /api/portfolios ships full base64 to every viewer, every poll
```
(Avatars follow the same shape, but with real client-side compression via `compressProfileImage` already in place — see `src/lib/image-compression.ts`.)

**Target flow:**
```
Browser -> POST /api/uploads/sign (new route; auth + rate-limit reused from
           existing route patterns) -> server signs params with
           CLOUDINARY_API_SECRET (never sent to client)
Browser -> direct upload to Cloudinary using signed params
Cloudinary -> returns { secure_url, public_id, bytes, width, height, format }
Browser -> POST /api/portfolios / PATCH /api/profile with
           { thumbnailUrl: secure_url, thumbnailPublicId: public_id,
             imageSizeBytes: bytes }  (server-reported size, not client-estimated)
API route -> Zod schema extended to require an https URL on the Cloudinary host;
             INSERT/UPDATE with one new *_public_id column
```

Key decisions, each backed by the image-lifecycle audit:
- **Reuse, don't rebuild**: `src/lib/guardrails.ts` (size/MIME constants, `validateImageUpload`) stays the client-side pre-upload gate unchanged. `src/lib/image-compression.ts`'s `compressProfileImage` — currently avatar-only — should also run for portfolio cover images before upload, since that code path currently has *no* compression at all.
- **Persist `public_id`**: yes, on both `portfolios.thumbnail_public_id` and `profiles.avatar_public_id`, so later deletion doesn't require deriving the id from the URL.
- **Preset/Unsplash images stay external** — untouched by this migration.
- **Backfill**: a standalone batch script (not a request-handling route) selecting `WHERE thumbnail_url LIKE 'data:%'` (and the `profiles.avatar_url` equivalent), decoding each base64 payload, uploading server-side via the Cloudinary Admin API, then updating the row. Run in small batches with a delay for Cloudinary rate limits; leave failures on base64 for manual retry (harmless, since the read path renders any URL/data-URI identically).
- **Rollback**: low-risk by construction — the read path (`PortfolioCard`, `PortfolioDetailModal`) does a plain `<img src={thumbnail}>` regardless of whether the value is a data URL or an https URL. Rollback means reverting the upload path only; already-migrated rows keep working as plain URLs. Keep a pre-backfill export of the base64 values in case a full DB rollback is ever needed (a Cloudinary URL cannot be reversed back into base64 without re-downloading).
- **Deletion cleanup**: since no portfolio DELETE route currently exists, this audit does not modify anything — but the future delete route should look up `thumbnail_public_id`, best-effort call `cloudinary.uploader.destroy()` (non-blocking; a Cloudinary failure must not block the DB delete), then proceed with the row delete. The same pattern applies to avatar replacement in `PATCH /api/profile` — destroy the *old* `avatar_public_id` only after the new avatar write succeeds.
- **Env vars**: server-only `CLOUDINARY_API_SECRET`, `CLOUDINARY_API_KEY`, `CLOUDINARY_CLOUD_NAME` (or `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` if the client needs it to build upload/transform URLs — cloud name is not secret), optional `CLOUDINARY_UPLOAD_FOLDER`.

---

## 7. GitHub Cache Recommendation

Classification per the audit (CONFIRMED BUG / INEFFICIENT BUT CORRECT / INTENTIONAL / DEAD-UNUSED / RECOMMENDATION):

| Table | Verdict | Reasoning |
|---|---|---|
| `github_profiles` | **Keep** | Actively written and read every page load (cache-hit fast path, confirmed zero GitHub API calls on normal login/reload/route-transition). |
| `github_repositories` | **Keep, but change** | Needed for the project list UI. Change: (a) batch the currently sequential per-repo insert loop (`repositories.ts:118-158`) into one `unnest`-based upsert, matching the pattern already used for contributions; (b) filter `isPrivate` repos out **before persisting**, not only when serving to non-owners — CONFIRMED that private repos are stored today even though the product only displays public projects; (c) add a reconciliation/deletion step on forced sync (`DELETE ... WHERE github_repo_id NOT IN (fetched ids)`) — CONFIRMED BUG: no such deletion exists anywhere, so repos removed/made-private on GitHub stay cached indefinitely, and disconnecting an account never clears cached rows either. |
| `github_readmes` | **Keep** | Used for public README rendering; actively read. |
| `github_contributions` | **Keep, consider restructuring** | RECOMMENDATION: the access pattern is exclusively "fetch the whole year for one user" (never cross-user/per-date SQL). A single JSONB blob per `(user_id, year)` would replace 371 upserted indexed rows with one row read/write per sync and remove the supporting btree index, with no loss of functionality given current usage. Not urgent — correct today (upserted, not duplicated) — but worth doing alongside the summaries consolidation below. |
| `github_contribution_summaries` | **Consolidate into `github_contributions`** | DEAD/UNUSED IN EFFECT: the read path already recomputes streaks from the 371 daily rows and only uses the summary as an optional override; the fallback path itself proves the summary's values are derivable. Computing `SUM()`/streaks on read removes a table and a per-sync write with no observable behavior change. |

Other confirmed findings not tied to a single table:
- **CONFIRMED**: normal login/reload/route-transition genuinely hit persisted cache only — zero GitHub API calls, verified from `syncGithubUser`'s `force=false` fast path (3-4 parallel DB reads only).
- **INEFFICIENT BUT CORRECT**: manual Sync (`force=true`) always rewrites every row even when GitHub data is unchanged — no ETag/hash short-circuit exists, despite `content_sha` already being captured for readmes and never compared.
- **Latent risk, not currently triggered**: `syncGithubUser`'s function signature defaults `force = true`, inverted from its documented cache-first intent; both current call sites pass the argument explicitly so this is dormant, but should be flipped to `false` to fail safe for any future caller.

---

## 8. Egress Optimization Map

| Hotspot | Tier | Root cause (file:line) | Smallest fix |
|---|---|---|---|
| `GET /api/portfolios` main query | **CRITICAL** | No SQL-level `LIMIT`/`OFFSET` (`route.ts:38-80`); `limit` param only slices in JS after full base64 payload is already fetched from Postgres (`route.ts:213-282`) — independently confirmed. | Add `LIMIT $limit OFFSET $offset` (plus existing category/search filters) directly in SQL; stop selecting `thumbnail_url` in the list query once images move to Cloudinary (URLs are cheap; base64 is not). |
| `GET /api/portfolios` comments subquery | **CRITICAL** | Unbounded, unscoped `SELECT * FROM comments WHERE status='approved'` site-wide on every list call (`route.ts:85-102`). | Scope to `WHERE portfolio_id = ANY($1)` using only the current page's ids, after SQL-side pagination. |
| Portfolio poll mounted on public profile pages | **CRITICAL** | `usePortfolios` is mounted by `src/app/u/[username]/page.tsx:146`, so every anonymous profile-page visit also subscribes to the full 25s all-portfolios poll. | Don't mount the full portfolios-list hook on profile pages that don't need it; scope any needed data to the profile's own portfolios. |
| `usePortfolios` focus/online listeners | **HIGH** | Each fires the same unbounded query immediately on top of the 25s timer (`usePortfolios.ts:209-211`). | Becomes low-cost automatically once the query above is paginated and thumbnail-free. |
| `GET /api/profile?username=...` | **HIGH** | Unbounded per-user thumbnail select (`profile/route.ts:294-314`), re-run on every profile page load. | Same fix as the main list query — paginate/limit, drop base64 from this query once Cloudinary URLs are in place. |
| GitHub repo sync loop | **HIGH** | Sequential per-repo upserts, not batched (`repositories.ts:118-158`) — up to ~100 round trips per forced sync. | Batch via `unnest`, matching the existing contributions pattern. |
| `useNotifications` 5s poll | **MEDIUM** | High call frequency (up to 12 req/min per visible tab), though bounded/small payload (`useNotifications.ts:89-93`, `LIMIT 50`, no large columns). | Lengthen the interval (e.g. 20-30s); egress risk here is round-trip volume, not payload size. |
| Developer-spotlight 15s poll | **MEDIUM** | Bounded, small payload; redundant with an already-present event-driven refetch on user-registered/changed events (`HeroSection.tsx:106,122-123`). | Consider removing the interval in favor of the existing event-driven refetch alone. |
| GitHub Sync unconditional rewrites | **MEDIUM** | No change-detection before writing (`content_sha` captured but unused, `readme.ts:146-163`). | Compare fetched vs. stored hash before issuing writes. |

**Direct answer on the portfolios 25s interval**: neither remove it outright nor merely slow it down. The evidence shows the interval is expensive *because of what it fetches* (full base64 images + entire site's comments, unbounded), not because of its frequency alone. The right combination is **(b) mutation-driven refresh** for the current user's own actions (several optimistic-update call sites already exist to build on) **supplemented by (d)** a much longer/looser background interval or HTTP edge caching as a safety net for other users' changes — but only *after* the query itself is paginated and stops shipping base64 thumbnails. A 25s poll of a properly paginated, image-URL-only list is a non-issue; a 5-minute poll of the current unbounded query would still be expensive.
