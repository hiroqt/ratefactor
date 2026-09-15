# RateFactor Migration Roadmap: Supabase → Neon + Cloudinary

Status: **Planning document only. No implementation has started.**
Companion document: [`NEON-CLOUDINARY-AUDIT.md`](./NEON-CLOUDINARY-AUDIT.md) (evidence, findings, current/target architecture).

---

## 9. Order of Operations

**Phase 0 — Audit / live inventory (current phase, mostly complete via static audit)**
Remaining: run the live-DB checks listed in audit §3 (schema drift check, row counts, orphaned `auth.users`, base64/preset URL counts) against the real Supabase project. Nothing in later phases should start until this phase's live-verification items are resolved.

**Phase 1 — Provision Neon + Cloudinary**
Create Neon project/branch, note pooled and direct connection strings. Create Cloudinary account/upload preset. No app changes yet.

**Phase 2 — Clone/validate PostgreSQL on Neon**
`pg_dump --schema-only` from live Supabase, diff against `supabase/schema.sql`, strip Supabase-only constructs (RLS policies referencing `auth.*`, `auth.users` FK/trigger, `storage.*`), apply cleaned DDL to a Neon branch. `pg_dump --data-only` the confirmed-live tables (excluding `auth_challenges`/`rate_limits` if confirmed empty) and restore into the branch.

**Phase 3 — Run RateFactor locally against Neon**
Point local `DATABASE_URL` at the Neon branch, run the app, exercise auth (login/session), portfolios, ratings/likes/comments, GitHub sync, notifications. Confirm Better Auth session behavior and the `profiles.id` derivation match production behavior.

**Phase 4 — Implement Cloudinary upload path**
Add signed-upload route, extend Zod validation and DB columns (`thumbnail_public_id`, `avatar_public_id`), wire `SubmitPortfolioModal` and avatar upload to the new flow, reuse existing `guardrails.ts` and extend `image-compression.ts` usage to portfolio covers. Still against the Neon branch, not production.

**Phase 5 — Backfill existing base64 images**
Run the batch backfill script (audit §6) against the Neon branch's data, uploading base64 rows to Cloudinary and updating `thumbnail_url`/`avatar_url` + new `*_public_id` columns. Verify failure rows are logged, not silently dropped.

**Phase 6 — GitHub cache/data-model fixes (only the confirmed items)**
Batch the repo-upsert loop, add repo reconciliation/deletion on forced sync, filter private repos before persisting, consolidate `github_contribution_summaries` into `github_contributions`. Each is independently shippable — see §13 PR boundaries.

**Phase 7 — Portfolio/egress fetching optimization**
Add SQL-level `LIMIT`/`OFFSET` and comment scoping to `/api/portfolios`, stop mounting the full portfolios poll on public profile pages, move to mutation-driven refresh + longer background interval, adjust the notifications poll interval.

**Phase 8 — Complete integration tests**
Full manual/automated pass against the Neon+Cloudinary branch environment (see §14 Test Plan). Do not proceed to Phase 9 until this passes.

**Phase 9 — Production cutover**
Swap production `DATABASE_URL`/Cloudinary env vars on Vercel. Treat as a maintenance-window operation; existing Better Auth sessions will need re-login (expected, not a bug — see audit §2 UUID/session risk).

**Phase 10 — Rollback / observation window**
Hold the old Supabase project and pre-backfill base64 export for a defined window (recommend ≥2 weeks) before deprovisioning anything, per §12 Rollback Plan.

---

## 10. Environment Variable Plan

Names only — no values.

**Current vars retained (unchanged behavior):**
- `DATABASE_URL` (value changes to Neon's pooled connection string; name/usage in code stays the same)
- Better Auth secret/config vars (whatever `better-auth.ts` already reads — not renamed by this migration)
- GitHub OAuth client vars used by `src/lib/github/client.ts`

**Current Supabase vars removable later (after §5/§9 cutover and confirmation nothing else depends on them):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**New Neon vars:**
- `DATABASE_URL` (pooled — reused name, new value)
- `DIRECT_URL` (unpooled — for migration/admin tooling, e.g. schema migrations)

**New Cloudinary vars:**
- `CLOUDINARY_CLOUD_NAME` (or `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` if the client needs to construct upload/transform URLs directly — cloud name is not secret)
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET` (server-only, never public)
- `CLOUDINARY_UPLOAD_FOLDER` (optional)

**Local-only migration vars (not deployed to Vercel):**
- Whatever `pg_dump`/`psql` tooling needs to point at the source Supabase project temporarily during Phase 2/5 (a scratch `SUPABASE_MIGRATION_SOURCE_URL`-style var, local `.env` only, never committed).

**Vercel production vars to update at cutover (Phase 9):**
- `DATABASE_URL` → Neon pooled string
- `DIRECT_URL` → Neon direct string (if migration tooling runs from a Vercel-triggered job; otherwise local-only)
- `CLOUDINARY_CLOUD_NAME` / `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_UPLOAD_FOLDER`

---

## 11. Data Validation Checklist

Run before and after each data-bearing phase (2, 5, 9):

- [ ] Table row counts match between Supabase source and Neon target for every migrated table (`profiles`, `portfolios`, `ratings`, `likes`, `comments`, `comment_reports`, `notifications`, `showcases`, Better Auth `user`/`session`/`account`/`verification`, all 5 `github_*` tables)
- [ ] Foreign key integrity holds post-migration (no orphaned `portfolios.author_id`, `comments.portfolio_id`, `likes.portfolio_id`, `ratings.portfolio_id`, `github_*.user_id`)
- [ ] Better Auth `user`/`account`/`session` rows are intact and a fresh login succeeds against the new DB
- [ ] Canonical profile UUID mapping still holds: for a sample of users, `profiles.id` matches the value both the SQL trigger and `src/lib/auth/profile-id.ts`'s `resolveCanonicalProfileId` would derive from the Better Auth user id
- [ ] Portfolio counts, rating aggregates (`rating`, `rating_count`, per-category ratings), like counts, and comment counts match pre/post migration
- [ ] Notification rows and their read/unread state are preserved
- [ ] GitHub profile/repository/contribution data row counts match per user; spot-check that `github_contributions` totals still equal what the UI heatmap showed pre-migration
- [ ] Count of `thumbnail_url`/`avatar_url` values matching `LIKE 'data:%'` before backfill vs. after (should trend to zero for successfully migrated rows; failures should be explicitly logged, not silently lost)
- [ ] Count of external/preset image URLs (Unsplash etc.) is unchanged before/after — these should never be touched by the backfill
- [ ] `auth_challenges` and `rate_limits` row counts confirmed (ideally zero) before deciding to drop them

---

## 12. Rollback Plan

- **Database**: keep the Supabase project live and untouched (read-only if possible) through the observation window (Phase 10). Cutover is a `DATABASE_URL` swap on Vercel — reverting is the same swap in the opposite direction, with the caveat that any writes made against Neon after cutover would need to be replayed or accepted as lost, so define the cutover as a short maintenance window, not a gradual dual-write period (no dual-write mechanism exists in the current code and none is proposed here).
- **Images**: rollback is low-risk by construction — the render path (`PortfolioCard`, `PortfolioDetailModal`) treats a stored value as an opaque URL/data-URI regardless of its source, so reverting the *upload* path (stop routing new uploads through Cloudinary) doesn't break already-migrated rows. Keep the pre-backfill base64 export (from Phase 5) until the observation window closes, since a Cloudinary `secure_url` cannot be reversed back into base64 without re-downloading the asset.
- **GitHub cache changes (Phase 6)**: each change (batching, reconciliation, private-repo filtering, summary consolidation) is independently revertible per-PR since none of them change the external API surface consumed by the UI — see §13.
- **Egress optimizations (Phase 7)**: each change is a behavior-preserving optimization (pagination, refetch triggers) with no data-shape change, so reverting is a straightforward code revert with no data implications.

---

## 13. Implementation Workstreams / PR Boundaries

Do not bundle these into one PR. Recommended separate, independently reviewable units:

- **A. Neon portability/runtime** — connection string handling (`better-auth.ts` SSL detection), removal of `@supabase/supabase-js`/`@supabase/ssr` from `package.json`, removal of now-unused `NEXT_PUBLIC_SUPABASE_*`/`SUPABASE_SERVICE_ROLE_KEY` references (`src/lib/uptime.ts`), cleaned schema DDL for Neon (drop `auth.*`/`storage.*` references, RLS policies).
- **B. Cloudinary image storage** — new signed-upload route, Zod/schema extension for `thumbnailUrl` host validation, new `thumbnail_public_id`/`avatar_public_id` columns, `SubmitPortfolioModal`/avatar-upload rewiring, extending `compressProfileImage` usage to portfolio covers.
- **C. Existing-image backfill tooling** — standalone batch script (not shipped as an API route), run manually against the target DB, not part of the app's request path.
- **D. GitHub cache cleanup** — can itself be split further since each item is independent: (D1) batch the repo-upsert loop, (D2) add repo reconciliation/deletion on forced sync, (D3) filter private repos before persisting, (D4) consolidate `github_contribution_summaries` into `github_contributions`.
- **E. Portfolio fetching/egress optimization** — SQL-level pagination and comment scoping on `/api/portfolios`, un-mounting the full portfolios poll from public profile pages, mutation-driven refresh, notification poll interval adjustment.

Suggested order: A → B → C, with D and E able to proceed in parallel once A is merged (they don't depend on the image migration).

---

## 14. Test Plan

- **Phase 3 (Neon locally)**: manual pass — signup/login, session persistence across reload, portfolio create/rate/like/comment, notifications, GitHub connect/sync/disconnect/reconnect, public profile page load (logged out).
- **Phase 4 (Cloudinary)**: manual pass — portfolio cover upload (new signed flow), avatar upload, verify `thumbnail_public_id`/`avatar_public_id` persisted, verify server-side re-validation rejects a non-Cloudinary URL, verify existing preset-image selection still works unchanged.
- **Phase 5 (backfill)**: run against a Neon branch seeded from a Supabase data snapshot (not production), verify row counts and spot-check rendered images match pre-backfill visually, verify failed rows are logged and don't crash the batch.
- **Phase 6 (GitHub cache)**: for each sub-item, a targeted check — D1: forced sync for a many-repo account completes with one batched query instead of N; D2: delete/rename a repo on a test GitHub account, force-sync, confirm the row disappears; D3: confirm a private test repo is never written to `github_repositories`; D4: confirm heatmap/streak values are unchanged after summary-table removal.
- **Phase 7 (egress)**: confirm `/api/portfolios?limit=50` issues a bounded SQL query (check via `EXPLAIN` or query logging) and that public profile pages no longer trigger the 25s poll.
- **Phase 8 (integration)**: locate/restore the `scripts/verify-*.ts` scripts referenced by `package.json`'s `test` command (currently missing from this worktree — flagged in audit §3) before relying on them; if unavailable, run the manual passes above end-to-end against the full Neon+Cloudinary branch.
- **Phase 9 (cutover)**: smoke test immediately post-cutover against production traffic — login, one portfolio create, one GitHub sync — before considering the cutover complete.

---

## 15. Open Questions / Blockers

1. All items in audit §3 (Unconfirmed / Needs Live-DB Verification) are blockers for Phase 2 — none can be resolved from the repository alone.
2. `scripts/verify-*.ts` referenced by `package.json` does not exist in this worktree — locate it (may exist in the main checkout / a different branch) or decide what replaces it for pre-cutover smoke testing.
3. Confirm whether any external system (admin tooling, a separate service, direct SQL access) depends on Supabase RLS or the `anon`/`service_role` keys before removing them.
4. Confirm Cloudinary account/plan and upload-preset naming conventions with whoever owns billing, since this audit did not create any Cloudinary resources.
5. Decide the acceptable maintenance-window length for Phase 9, since no dual-write mechanism is proposed — writes made against Supabase during the cutover window would need to be manually reconciled if the window isn't short enough.

---

## 16. Exact Next Action

Before any implementation begins, **you** (the human) need to:

1. Get access to the **live Supabase project** (dashboard or a read-only connection string) so the Phase 0 live-verification items in audit §3 can actually be checked — specifically: run a live `pg_dump --schema-only` for comparison against `supabase/schema.sql`, and get row counts for `auth_challenges`, `rate_limits`, and any Supabase Storage objects.
2. Confirm whether anything outside this Next.js repo talks to Supabase directly (open question #3 above) — this determines whether RLS/anon-key removal is safe.
3. Provision a Neon project and a Cloudinary account (or confirm existing ones to use), so Phase 1 has real credentials to work against — this audit deliberately did not create either.
4. Decide the Phase 9 maintenance-window approach (open question #5), since that shapes how Phase 2's data migration script needs to be written (one-shot vs. resumable).

Once those four are in hand, the next engineering step is Phase 1 (provisioning) followed by Phase 2 (schema clone + validation) — both still fully reversible and non-destructive to the current production Supabase database.
# Migration status update

Completed locally: Neon schema/data baseline, Cloudinary portfolio covers (zero base64 covers), transient GitHub mirror removal, and portfolio cache pagination metadata preservation. Production cutover remains pending: rebase, push, PR/merge, configure Neon/Cloudinary production variables, smoke test, observe rollback window, then decide Supabase retirement.
