# Portfolio system

## Creation

`POST /api/portfolios` (`src/app/api/portfolios/route.ts`):

1. Requires a session (`getSessionUser`); 401 otherwise.
2. Rate-limited: `SUBMIT_PORTFOLIO` preset — 5 submissions per 24 hours per `${userId}:${ip}`, 30s debounce.
3. Body validated against `portfolioSubmissionSchema` (`src/lib/validations/portfolio.ts`): title 3–120 chars, tagline 10–240 chars, description optional but if present 200–15000 chars (also capped at 2500 words by the database check constraint), portfolio/GitHub URLs must be `http(s)://`, `imageSizeBytes` capped at `MAX_IMAGE_SIZE_BYTES` (2 MiB), category is one of the fixed enum values, 1–15 tech-stack tags, 1–5 portfolio domains (see below).
4. **Cover validation**: `isAllowedPortfolioThumbnail` requires either a non-Cloudinary HTTPS/HTTP URL with no `thumbnailPublicId`, or a Cloudinary URL whose path embeds the exact `thumbnailPublicId` under the configured upload folder. If a `thumbnailPublicId` is present, the request must also carry `thumbnailUploadReceipt`/`thumbnailUploadVersion`/`thumbnailUploadSignature`, verified against the current actor and against Cloudinary's own upload-response signature (`verifyUploadReceipt`, `verifyPortfolioUploadResponse`) — this stops someone from claiming another user's uploaded asset or a forged public id.
5. **GitHub verification** (`verifyGithubProjectRelationship`, from `src/lib/github/repository-verification.ts`) runs using the *authenticated caller's own* linked GitHub token against the submitted `githubUrl` — never a client-supplied verification result. Any failure (unavailable, not linked, private repo, invalid URL) resolves to `status: null` and **never blocks submission**; the badge is additive only.
6. Resolves or creates the author's `profiles` row (by id or username match; inserts a new row if none exists), then inserts the `portfolios` row with `comments_count = 0`, `is_showcase = false`, `status = 'published'` and the verification fields from step 5.
7. On success: pushes the new portfolio into the in-memory `dynamicPortfolios` store (`src/lib/dynamic-portfolios.ts`), invalidates both the portfolio and developer caches, returns `201`.
8. On any failure *after* a Cloudinary asset was accepted (`cleanupPublicId` still set), the handler checks whether any portfolio row now references that public id and, if not, calls `deletePortfolioAsset` to avoid an orphaned Cloudinary asset.

Ownership of the created row is `author_id`, resolved from the session — never trusted from the request body (`body.authorUsername`/`authorName`/`authorAvatar` are used only as *display* fallbacks when no profile row exists yet).

## Category vs. Portfolio Domains vs. Tech Stack

Three independent, non-overlapping classifications on a portfolio:

- **`category`** — the single, existing high-level classification (`Frontend`, `Fullstack`, `AI / ML`, `Design Engineer`, `Systems`, `Mobile`, `Developer`, `Arts`, `Client`). Unchanged by this feature.
- **`techStack`** — free-form technology tags (`Next.js`, `PostgreSQL`, ...), 1–15 entries, no fixed allowlist.
- **`domains`** — Portfolio Domains: a controlled allowlist describing the portfolio's *visual/interaction/technical experience* (`Three.js`, `GSAP`, `Framer Motion`, `Parallax`, `Scroll-heavy`, `WebGL`, `3D / Immersive`, `Animation-heavy`, `Interactive`, `Experimental`), 1–5 entries, no duplicates, server-validated against the allowlist — never trusted from an arbitrary client string. The allowlist is centralized in `src/lib/portfolio-domains.ts` (`PORTFOLIO_DOMAINS`, `PortfolioDomain`), a client-safe module with no Node-only imports, so the submission UI, `GET`/`POST /api/portfolios`, and Zod validation all reference the exact same list.

A portfolio can have several domains at once — e.g. `category: "Fullstack"`, `techStack: ["Next.js", "TypeScript"]`, `domains: ["Three.js", "GSAP", "Scroll-heavy"]`. Existing portfolios created before this feature have `domains: []` — this is a column default, never inferred/backfilled from category, tech stack, title, description, or repository content. Such rows appear under "All Domains" in Discover but not under any specific domain filter until an author edits them (no author-edit flow currently exists; the value stays `[]` until then).

## Media

Portfolio covers live in **Cloudinary**, never as base64 in Postgres, and never proxied through the Next.js server for the upload itself.

**Signed upload handshake** (`src/lib/cloudinary.ts`, `src/app/api/uploads/portfolio/route.ts`):

1. `POST /api/uploads/portfolio` (auth required, rate-limited to 10/hour/user) calls `createPortfolioUploadSignature(userId)`, which generates a random asset name, computes the Cloudinary upload folder + `public_id`, signs the upload params (`cloudinary.utils.api_sign_request`) with the server-side API secret, and additionally issues a **receipt**: an HMAC-SHA256 of `userId\npublicId\nexpiresAt` (15-minute expiry), keyed by the Cloudinary API secret. The browser uses the signature to upload directly to Cloudinary.
2. Cloudinary returns a `version` and its own signature for the uploaded asset. The browser submits `thumbnailUrl`, `thumbnailPublicId`, that `version`/`signature`, and the earlier `receipt` to `POST /api/portfolios`.
3. The portfolio route independently re-verifies: the receipt (proves *this* server issued this public id to *this* user, and it hasn't expired), Cloudinary's upload-response signature (`verifyPortfolioUploadResponse`, proves the asset actually exists at that version under that public id), and the URL shape (`isAllowedPortfolioThumbnail`, proves the URL points at the configured cloud/folder). All three must agree before the public id is trusted.
4. `thumbnail_public_id` has a database `UNIQUE` constraint — two portfolios can never claim the same Cloudinary asset.

**Cleanup**:
- `DELETE /api/uploads/portfolio` — for an upload the user abandoned (started but never submitted a portfolio with it). Requires the same receipt-verification as above, checks no portfolio row currently references the public id, then calls `deletePortfolioAsset`; a `deletePortfolioAsset` failure is caught and returns `502`.
- `getCloudinaryConfig()` is wrapped in a `try/catch` in **both** the `POST` (signature issuance) and `DELETE` (cleanup) handlers: if Cloudinary env vars are missing, both return the same clean `503 { detail: "Portfolio image uploads are unavailable." }` instead of an unhandled `500`.
- `deletePortfolioAsset(publicId)` (`src/lib/cloudinary.ts`) validates the public id is under the configured folder, then calls `cloudinary.uploader.destroy(..., { invalidate: true })`; a Cloudinary `"not found"` result is treated as success (idempotent delete).
- On portfolio deletion (`DELETE /api/portfolios/{id}`), the database row is deleted **first**; Cloudinary cleanup is attempted afterward and its failure is only logged (`console.warn`), never surfaced to the caller or rolled back — a delete always succeeds from the user's perspective even if the Cloudinary asset is later found orphaned. See [deployment-operations.md](./deployment-operations.md#database-verification) for how to spot this in production.
- `uploadPortfolioDataUrl` exists in `cloudinary.ts` as a base64-data-URL upload helper but is not called from the current submission flow (which uses the signed-upload handshake); it is legacy/unused-by-routes code, not an active base64 storage path.

## Reading (public feed)

`GET /api/portfolios` (`src/app/api/portfolios/route.ts`):

- Query params: `category` (enum or `"All"`), `domain` (a single `PortfolioDomain`, e.g. `GSAP` — unrecognized values are silently ignored, same as an absent param), `host` (domain/TLD filter, `.tld` prefix or substring match), `sort` (`highest_rated` default, `most_liked`, `most_discussed`, `latest`, `showcase`), `q` (free-text), `limit` (1–50, default 20), `offset` (default 0). `category` and `domain` compose (e.g. `?category=Fullstack&domain=GSAP` returns only Fullstack portfolios tagged GSAP).
- **Default-query fast path**: the handler always resolves the caller's profile id (if a session is present) and, if resolved, the caller's `likes` rows, *before* checking the cache — this is two small SQL lookups regardless of whether the feed itself ends up cached. When the query is exactly `{category: All, domain: (none), host: (none), sort: highest_rated, offset: 0, limit: 20}` and the in-memory cache (`src/lib/dynamic-portfolios.ts`) is fresh (<45s old), the feed payload itself is served entirely from memory — zero portfolio/comment queries — with the caller's `isLiked` flags merged into the cached rows per-request. For a fully anonymous default request, this means zero SQL of any kind is run once the cache is warm. A matching `If-None-Match` returns `304` with an empty body (anonymous only — the 304 short-circuit requires no resolved `currentProfileId`). Any `domain` param — like any non-default `category`/`host`/`q`/`sort`/pagination value — always takes the "all other queries" path below, so a domain-filtered request can never be served the unfiltered cached default list.
- **All other queries** go to Postgres. Filtering is built as a parameterized `WHERE` clause (`buildPortfolioWhereClause` in `src/lib/portfolio-query.ts`; `p.status = 'published'` always, plus optional category/domain/host/text filters). The domain filter uses array containment — `p.domains @> ARRAY[$n]::text[]` — served by the `idx_portfolios_domains` GIN index, so a portfolio with `domains: ["Three.js", "GSAP", "Scroll-heavy"]` matches `?domain=GSAP`, `?domain=Three.js`, and `?domain=Scroll-heavy` individually. The free-text search matches title, tagline, description, author name/username, category, hostname, portfolio/demo URL, and tech stack, all via case-insensitive `LIKE` with a manually escaped wildcard (`isAllowedPortfolioThumbnail`-style `%`/`_`/`\` escaping) — **not** the `idx_portfolios_search` GIN/tsvector index (that index exists but full-text query syntax isn't used here); it does not currently search `domains`. Sorting maps to one of four `ORDER BY` clauses matching the sort param. Pagination is `LIMIT`/`OFFSET` in SQL.
- Every returned portfolio includes `domains: PortfolioDomain[]`, defaulted to `[]` for rows predating this column (`mapDomainsColumn` in `src/lib/portfolio-domains.ts`).
- Related data (comments, likes) is loaded in **bounded batch queries** scoped to the exact set of portfolio ids on the current page (`portfolio_id::text = ANY($ids)`), not per-row queries and not unbounded joins.
- The response always includes `pagination: { total, offset, limit, hasMore }`, with `total` from a matching `COUNT(*)` query using the same `WHERE` clause.
- Cache-Control differs by caller: anonymous -> `public, s-maxage=30, stale-while-revalidate=120`; authenticated -> `private, no-cache` (because the payload is personalized with `isLiked`).
- `next.config.ts` also declares a blanket `no-store` header for the literal path `/api/portfolios`; the route handler's own explicit `Cache-Control` response header is what callers actually receive since it is set after Next's config-level header and Next.js does not overwrite headers a route handler sets explicitly.

## Egress optimization

- SQL-level filtering/sorting/pagination (no in-application filtering of a full table scan) for every non-cached query.
- The 45s/60s in-memory caches remove essentially all database load for the default anonymous feed and directory views under normal traffic.
- Related-data queries (comments, likes) are batched and bounded to the current page's portfolio ids, never fetched per-row in a loop.
- ETags + `304 Not Modified` avoid re-serializing/re-transmitting an unchanged payload.
- `likes_count`/`comments_count`/rating columns are denormalized onto `portfolios` specifically so the feed query doesn't need a `COUNT`/`AVG` subquery per row on every request — they're kept correct by triggers ([database.md](./database.md#triggers-and-functions)) and by explicit recount-and-write-back after each like/comment/rating mutation.

## Updates / deletion

There is no generic `PATCH /api/portfolios/{id}` — profile-level fields are the only user-editable surface via `PATCH /api/profile` (pinned/spotlight portfolio ids, etc.); a portfolio's own content fields are immutable after creation in the current API surface.

`DELETE /api/portfolios/{id}` (`src/app/api/portfolios/[id]/route.ts`):

1. Auth required; rate-limited (10/min, 1s debounce).
2. Ownership resolved via `resolveCanonicalProfileId(authUser.id)` compared directly against the row's `author_id` — a strict equality check, not the broader username-OR match used elsewhere. Mismatch -> `403`. Portfolio not found -> `404`.
3. Deletes the row. All dependent rows (ratings, likes, comments, notifications, showcases) are removed automatically via `ON DELETE CASCADE` — no manual child-table cleanup.
4. Cloudinary cleanup is attempted (see [Media](#media)) but failure doesn't fail the request.
5. Invalidates both the portfolio and developer caches.

## Ratings

`POST /api/portfolios/{id}/rate` (`src/app/api/portfolios/[id]/rate/route.ts`):

- Auth required; ownership resolved via `resolveCanonicalProfileId` and checked against the portfolio's `author_id` (database lookup first, in-memory-store username match only to *strengthen* an "owner" finding, never to disprove it). If ownership can't be determined at all, the request is rejected with `503` rather than risking a self-rating — a fail-closed design.
- Rate-limited: 10/min, 1s debounce, keyed by canonical-mailbox-hash (Gmail-alias-resistant) + portfolio + ip.
- Body validated against `ratingSubmissionSchema` — each of `design`/`codeQuality`/`performance`/`documentation` must be 1.0–5.0.
- Upserts into `ratings` (`ON CONFLICT (portfolio_id, user_id) DO UPDATE`) — a user can change their existing rating, not add a second one (also enforced by the `uq_ratings_user_portfolio` unique constraint).
- `tr_prevent_self_rating` is a **second, database-level** backstop against the same self-rating case, independent of the API check.
- After the write, the handler **re-reads** `portfolios.rating*`/`rating_count` (maintained by `sync_ratings()`) and returns those authoritative values — it never computes or returns a client-side-derived aggregate.
- Invalidates the portfolio cache.

## Likes

`POST /api/portfolios/{id}/like` (`src/app/api/portfolios/[id]/like/route.ts`) — toggles.

- Same self-like ownership check and fail-closed behavior as ratings.
- Rate-limited via the `LIKE` preset (15/min, 1.5s debounce).
- Identity for the process-local double-like guard (`userLikes: Map<mailboxHash, Set<portfolioId>>`) is the canonical-email-hash, not the raw user id — again to resist Gmail-alias multi-accounting. This in-memory map is a secondary signal only; the actual persisted state is the `likes` table.
- On like: inserts into `likes` (`ON CONFLICT DO NOTHING`), and if the portfolio has a different owner, inserts a `like`-type notification for them.
- On unlike: deletes the `likes` row, and deletes any still-unread `like` notification from the same actor for the same portfolio (so an unlike retracts a pending notification rather than leaving a stale one).
- Recomputes `likes_count` with a fresh `COUNT(*)` and writes it back to `portfolios` (belt-and-suspenders alongside `sync_likes_count()`).
- Invalidates the portfolio cache.

## Comments

`GET /api/portfolios/{id}/comments` returns approved (`status = 'approved' AND is_reported = false`) comments, database-first with an in-memory `portfolioComments` map (`src/lib/comments-store.ts`) as a fallback if the query fails; always `no-store`.

`POST /api/portfolios/{id}/comments`:

- Auth required; rate-limited via `COMMENT` preset (3/min, 10s debounce).
- Body validated against `commentSubmissionSchema`, which delegates content quality to `validateCommentContent` (`src/lib/guardrails.ts`): 10–1500 trimmed characters, rejects a list of low-effort one-liners ("nice", "cool", "test", ...), 4+ repeated-character spam, known spam link/phrase patterns, and a basic profanity list. `critiqueTag` is optional, one of 4 fixed tags.
- Inserts into `comments`, recounts approved+not-reported comments for that portfolio, writes that count back to `portfolios.comments_count`, and — if the commenter isn't the portfolio owner — inserts a `comment`-type notification with a truncated (60-char) content preview.
- Invalidates the portfolio cache.

`DELETE /api/portfolios/{id}/comments/{commentId}`:

- Authorized if the caller is the comment's author (by username, name, or id match against the database row, or the equivalent in-memory match if the DB lookup didn't find it) **or** has `moderator`/`admin` role.
- Recounts and writes back `comments_count` the same way as creation; invalidates the portfolio cache.

## Reports

`POST /api/portfolios/{id}/comments/{commentId}/report`:

- Auth required; rate-limited to 5 reports per 10 minutes per actor+ip.
- Body validated (`commentReportSchema`): `reason` is one of the fixed `report_reason` enum values, optional `details` up to 500 chars.
- The reporting actor's `comment_reports.reporter_id` (a `uuid` FK to `profiles.id`) is resolved via `resolveCanonicalProfileId(authUser.id)` (see [auth-and-identity.md](./auth-and-identity.md#profile-identity-mapping)) before the insert, the same mapping every other ownership-sensitive mutation uses — a non-UUID Better Auth id is hashed to its canonical profile UUID rather than inserted raw.
- Upserts into `comment_reports` (`ON CONFLICT (comment_id, reporter_id) DO UPDATE`) — one report per reporter per comment, re-reportable with updated details. If the insert fails at the database level, the route returns a `502` (`type: .../persistence-failed`) instead of a false-success `200`.
- The `tr_sync_comment_reports` trigger bumps `comments.report_count`/`is_reported` and auto-flags the comment (`status = 'flagged'`) once `report_count >= 3`. It writes only to `comments` columns; it never writes `comment_reports.status`. There is currently no moderation route that reads or updates `comment_reports.status`, or acts on flagged comments beyond that automatic flip.
- Calls `invalidatePortfoliosCache()` after a confirmed successful insert (never on a failed one), the same as every other comment/like/rating mutation in this file — so a comment auto-flagged to `'flagged'` by the 3rd report doesn't linger in the 45s L1-cached default feed.

## Showcase column

`portfolios.is_showcase`/`showcase_type`/`showcase_reason` and the `showcases` table exist in the schema and are read by the feed/profile queries, but **no current API route sets `is_showcase` to `true` or writes to `showcases`.** The showcase-selection algorithm (`src/lib/showcaseAlgorithm.ts`, a weighted rating/engagement/recency/randomness score with a repetition penalty) is invoked only client-side, over portfolios already fetched by the browser (`src/features/portfolios/hooks/usePortfolios.ts`), purely to pick which already-fetched portfolio to visually feature — it never persists a result back to the server. Treat this as a modeled-but-not-yet-wired feature, not an active status workflow.

## Notifications

`GET /api/notifications` resolves the caller's profile id, returns up to 50 notifications (joined with the actor's display name/avatar) plus an unread count; unauthenticated callers get an empty list rather than a 401 (notifications are inherently personal, so there's nothing to leak, but the UI treats "no session" as "no notifications" rather than an error state). `PATCH /api/notifications` marks either all (`body.all`) or one (`body.id`) notification read, scoped to the resolved recipient id, and returns the updated unread count.

## Related documentation

- [database.md](./database.md) — full schema for every table referenced above.
- [github-integration.md](./github-integration.md) — the verification flow used at submission time.
- [api-reference.md](./api-reference.md) — request/response shape and auth requirements per route.
- [architecture.md](./architecture.md#caching-and-egress) — cache architecture shared with the developer directory.
