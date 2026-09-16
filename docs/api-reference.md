# API reference

All routes are Next.js App Router route handlers under `src/app/api/**`. Auth is resolved via `getSessionUser` ([auth-and-identity.md](./auth-and-identity.md#session-resolution)) unless noted otherwise. "Persistence" lists what the route writes; "Side effects" lists cache invalidation and external calls.

## Auth

| Method | Route | Auth | Purpose | Persistence / side effects |
|---|---|---|---|---|
| GET/POST/PATCH/PUT/DELETE | `/api/auth/[...all]` | Better Auth's own (varies by sub-path) | Better Auth catch-all: sign-up, sign-in, sign-out, OAuth callbacks, session management, plus RateFactor's own OTP sub-routes. | Writes `user`/`session`/`account`/`verification`. Sign-up: rate-limited (`ACCOUNT_CREATION`), rejects a canonical-email-duplicate (`registerCanonicalEmail` on success). Sign-in: rate-limited (`SIGNIN_ATTEMPT`). `GET .../get-session` fast-paths to `null` when no session cookie/header is present, skipping the database entirely. |
| POST | `/api/auth/otp/request` (routed through the catch-all) | Public | Requests a 6-digit OTP for signup/signin/2FA. | In-memory challenge (`src/lib/auth/otp.ts`); sends email via Resend. Rate-limited (`OTP_REQUEST`); rejects duplicate signup emails by canonical hash. |
| POST | `/api/auth/otp/verify` (routed through the catch-all) | Public | Verifies an OTP code. | On signup success with a password, calls `auth.api.signUpEmail` (writes `user`). Rate-limited (10/5min/ip). |

Implementation: `src/app/api/auth/[...all]/route.ts`, `src/lib/auth/otp-handlers.ts`.

## Profile / developers

| Method | Route | Auth | Purpose | Persistence / side effects |
|---|---|---|---|---|
| GET | `/api/profile` | Optional (public `?username=` lookup, or session for "my profile") | Fetch a developer profile, its portfolios, derived accolades, and tech-stack distribution. | Read-only, except a lazy `onboarded = TRUE` backfill for an existing self-profile detected as pre-onboarding-flag data. |
| PATCH | `/api/profile` | Required | Update the authenticated user's profile (bio, skills, socials, hire status, pinned/spotlight portfolios, status, README). | Upserts `profiles`, syncs `name`/`image`/`role`/`onboarded` onto `"user"`. Rate-limited (30/min). Invalidates developers cache. |
| GET | `/api/developers` | Optional (personalizes nothing; public) | Search/list developer directory. | Read-only. Default query (`no q`, `limit<=12`) served from a 60s cache with ETag/304. |

Implementation: `src/app/api/profile/route.ts`, `src/app/api/developers/route.ts`.

## Portfolios

| Method | Route | Auth | Purpose | Persistence / side effects |
|---|---|---|---|---|
| GET | `/api/portfolios` | Optional | Public/personalized portfolio feed: filter by category/host/query, sort, paginate. | Read-only. Always resolves the caller's profile id/likes first if a session is present (small SQL lookups). Default query (`category=All`, no host/`q`, `sort=highest_rated`, `offset=0`, `limit=20`) still serves the feed itself from the 45s L1 cache when fresh, authenticated or not; all other queries hit Postgres directly. |
| POST | `/api/portfolios` | Required | Submit a new portfolio. | Inserts `portfolios` (+`profiles` if needed); runs GitHub verification; invalidates portfolio + developer caches. Rate-limited (`SUBMIT_PORTFOLIO`, 5/24h). See [portfolio-system.md](./portfolio-system.md#creation). |
| DELETE | `/api/portfolios/{id}` | Required, owner only | Delete a portfolio. | Deletes `portfolios` row (cascades ratings/likes/comments/notifications/showcases); attempts Cloudinary cleanup; invalidates both caches. Rate-limited (10/min). |
| POST | `/api/portfolios/{id}/like` | Required, non-owner only | Toggle like. | Inserts/deletes `likes`; recomputes and writes `likes_count`; inserts/deletes a `like` notification; invalidates portfolio cache. Rate-limited (`LIKE`, 15/min). |
| POST | `/api/portfolios/{id}/rate` | Required, non-owner only | Submit/update a 4-criteria rating. | Upserts `ratings` (trigger recomputes `portfolios.rating*`); invalidates portfolio cache. Rate-limited (10/min). |
| GET | `/api/portfolios/{id}/comments` | Optional | List approved comments for a portfolio. | Read-only, `no-store`. |
| POST | `/api/portfolios/{id}/comments` | Required | Post a comment. | Inserts `comments`; recomputes and writes `comments_count`; inserts a `comment` notification; invalidates portfolio cache. Rate-limited (`COMMENT`, 3/min). |
| DELETE | `/api/portfolios/{id}/comments/{commentId}` | Required, author or moderator/admin | Delete a comment. | Deletes `comments` row; recomputes and writes `comments_count`; invalidates portfolio cache. Rate-limited (15/min). |
| POST | `/api/portfolios/{id}/comments/{commentId}/report` | Required | Report a comment for moderation. | Resolves `reporter_id` via `resolveCanonicalProfileId` first; upserts `comment_reports` (trigger bumps `comments.report_count`/`is_reported`/auto-flags at 3; does not touch `comment_reports.status`); a DB persistence failure returns `502` instead of a false-success `200`. Invalidates the portfolio cache after a confirmed insert. Rate-limited (5/10min). See [portfolio-system.md](./portfolio-system.md#reports). |

Implementation: `src/app/api/portfolios/route.ts`, `.../[id]/route.ts`, `.../[id]/like/route.ts`, `.../[id]/rate/route.ts`, `.../[id]/comments/route.ts`, `.../[id]/comments/[commentId]/route.ts`, `.../[id]/comments/[commentId]/report/route.ts`. Details: [portfolio-system.md](./portfolio-system.md).

## Uploads

| Method | Route | Auth | Purpose | Persistence / side effects |
|---|---|---|---|---|
| POST | `/api/uploads/portfolio` | Required | Issue a signed Cloudinary upload payload for a portfolio cover. | No Postgres write. Calls Cloudinary's signing utility (no network call). Rate-limited (10/hour). |
| DELETE | `/api/uploads/portfolio` | Required | Clean up an abandoned (never-submitted) upload. | Reads Cloudinary config inside a `try/catch` (same as `POST`), returning a clean `503` if unconfigured; verifies the receipt, checks no portfolio references the public id, then calls Cloudinary `destroy` — see [portfolio-system.md](./portfolio-system.md#media). |

Implementation: `src/app/api/uploads/portfolio/route.ts`. Details: [portfolio-system.md](./portfolio-system.md#media).

## GitHub

| Method | Route | Auth | Purpose | Persistence / side effects |
|---|---|---|---|---|
| GET | `/api/github/profile` | Optional (`username` or session) | Fetch a GitHub profile. | Read-only; result cached in-process for public lookups (15 min). |
| GET | `/api/github/repositories` | Optional (`username` or session) | List GitHub repositories. | Read-only; public-lookup results cached (15 min); private repos filtered out for username lookups. |
| GET | `/api/github/contributions` | Optional (`username` or session) | Fetch contribution calendar + streaks, plus profile README as a bonus field. | Read-only; public-lookup results cached (15 min). |
| GET | `/api/github/repositories/{owner}/{repo}/readme` | Optional | Fetch and sanitize a repository README. | Read-only; public-lookup results cached (30 min). |
| GET | `/api/github/sync` | Required, linked GitHub account required (409 otherwise) | Fetch the authenticated caller's own GitHub dashboard data (profile + repos + contributions + profile README). | Read-only; no Postgres write; never persists GitHub data. Because the call carries the caller's own GitHub token, it never reads from or writes to the shared `githubCache` (`src/lib/github/cache.ts`) — every field is fetched live from GitHub on every call. |
| POST | `/api/github/sync` | Required, linked GitHub account required | Force-refresh (or fetch) the authenticated caller's own GitHub dashboard data. | Same as GET — always live, never the shared cache. `force` has no cache effect here (the shared cache was never consulted either way); `syncGithubUser` is called with no target username, so its `invalidateUser` branch is not exercised by this route. |
| POST | `/api/github/verify-project` | Required | Non-persistent preview of project-level GitHub verification for the submission modal. | Read-only; never writes; not trusted by the actual submission route. Rate-limited (`GITHUB_VERIFY_PREVIEW`, 20/hour). |

Implementation: `src/app/api/github/**`. Details: [github-integration.md](./github-integration.md).

## Notifications

| Method | Route | Auth | Purpose | Persistence / side effects |
|---|---|---|---|---|
| GET | `/api/notifications` | Optional (empty result if unauthenticated) | List the caller's notifications and unread count. | Read-only, `no-store`. |
| PATCH | `/api/notifications` | Required | Mark one or all notifications read. | Updates `notifications.is_read`. |

Implementation: `src/app/api/notifications/route.ts`.

## Monitoring / health

| Method | Route | Auth | Purpose | Persistence / side effects |
|---|---|---|---|---|
| GET | `/api/health` | Public | Health check for uptime monitors. | Emits a PostHog heartbeat event and, if unhealthy, a Sentry message. `?simulate=downtime` forces a 503 test response (also emits a real downtime event). |
| GET | `/api/monitoring/uptime` | Public (heartbeat); admin/moderator or dev-only for `?action=simulate-outage` | Detailed heartbeat / manual outage simulation. | Calls `checkSystemHealth()` (via `trackUptimeHeartbeat`), same as `/api/health`. `?action=simulate-outage` instead logs a simulated downtime incident and does not call `checkSystemHealth()`. |
| POST | `/api/monitoring/uptime` | Admin/moderator (dev bypass) | Report a downtime incident or a custom heartbeat ping. | Emits PostHog/Sentry events only from the request body; no Postgres write; does **not** call `checkSystemHealth()`. |

Implementation: `src/app/api/health/route.ts`, `src/app/api/monitoring/uptime/route.ts`, `src/lib/uptime.ts`. See [deployment-operations.md](./deployment-operations.md#monitoring) for how the database dependency check works (`SELECT 1` via the shared pool).

## Not present

There is no dedicated admin/moderation API surface beyond the `moderator`/`admin` role checks embedded in comment deletion and the uptime-simulation routes above. `comment_reports.status` is never written or read by any route or trigger — the `tr_sync_comment_reports` trigger only writes `comments.report_count`/`is_reported`/`status` (auto-flagging at 3 reports). `comment_reports.status` stays at its `'pending'` default indefinitely; no moderation UI ships yet to update it.

## Related documentation

- [architecture.md](./architecture.md) — API groups in the context of the whole system.
- [auth-and-identity.md](./auth-and-identity.md) — how "Auth" column values are resolved.
- [portfolio-system.md](./portfolio-system.md) / [github-integration.md](./github-integration.md) — deep dives on the two largest route groups.
