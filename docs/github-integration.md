# GitHub integration

## OAuth and token retrieval

GitHub is configured as a Better Auth `socialProviders` entry (`src/lib/auth/better-auth.ts`). A completed GitHub sign-in/link produces a row in Better Auth's `account` table with `providerId = 'github'`, holding the OAuth `accessToken`/`refreshToken`/`scope` server-side. `src/lib/github/client.ts` exposes:

- `getGithubAccount(userId)` — looks up that `account` row by `userId` (matching both `text` and cast-to-`text` forms defensively).
- `getGithubAccessToken(userId)` — convenience wrapper returning just the token.
- `githubFetch<T>(token, path, init)` — the shared REST fetcher. Authenticated calls (`token` present) send `Authorization: Bearer <token>` and `cache: "no-store"`; unauthenticated (public) calls omit the header and use Next's `fetch` revalidation (`next: { revalidate: 300 }`) instead.
- `githubGraphQL<T>(token, query, variables)` — POSTs to `https://api.github.com/graphql`; requires a token (used only for contribution calendars).

**Tokens never leave the server.** Every route that surfaces GitHub-derived data to the browser returns only derived fields (profile display data, repo lists, verification status/repository name) — never the token, never the raw `account` row.

## Authenticated vs. public requests

Each of `/api/github/profile`, `/repositories`, `/contributions`, and the README route accepts either:
- An authenticated session (in which case the caller's own linked token is used, and the request targets *that* account unless a `username` query param is also given), or
- A `username` query parameter with no session (public lookup, unauthenticated GitHub API call, subject to GitHub's much lower unauthenticated rate limit and its own HTTP caching).

At least one of the two is required (`400` otherwise) except for the README route, which allows either to be absent and just returns empty content.

## REST vs. GraphQL

- Profile and repositories use the REST API (`/user`, `/users/{username}`, `/user/repos`, `/users/{username}/repos`).
- Contributions use the **GraphQL** API's `contributionsCollection.contributionCalendar` (richer per-day quartile data than any REST equivalent) when a token is available; without a token there is no GraphQL fallback (GraphQL always requires auth), so public contribution lookups fall back to HTML/SVG scraping (see below).
- README fetches use the REST contents API (`/repos/{owner}/{repo}/readme`, base64-decoded).

## Fallback behavior

- **Profile**: if the authenticated/token REST call fails and a `username` was given, falls back to scraping `https://github.com/{username}`'s HTML for name/bio via regex, and finally to a bare placeholder profile (avatar guessed from `github.com/{username}.png`) if even that fails. A failed **authenticated self** lookup (no username) has no such fallback and throws.
- **Repositories**: an authenticated self lookup (`/user/repos`) that fails or returns something other than an array **throws** rather than returning an empty list — an empty list must mean "genuinely zero repos," not "the fetch failed." A username-target lookup that fails silently returns `[]`.
- **Contributions**: token + GraphQL first; if that yields zero days for an authenticated self lookup, it **throws** (same "don't fabricate a zero-contribution year" reasoning as repositories). For a username-target lookup, GraphQL failure falls back to scraping GitHub's contribution-calendar HTML endpoint, then to scraping the profile page HTML, and finally to a fully empty 371-day placeholder heatmap (`generateEmptyHeatmap`) if all of that fails.
- **README**: REST contents API first (works for the default branch); on failure, tries raw file fetch from `main` then `master` branches directly (`raw.githubusercontent.com`). `fetchGithubReadme` (`src/lib/github/readme.ts`) returns the raw, unsanitized Markdown as-is — sanitization happens later, on the HTML `marked.parse` produces, via the allowlist-based `sanitizeReadmeHtml` (`src/lib/github/sanitize-readme-html.ts`), right before it's rendered in `MarkdownRenderer` via `dangerouslySetInnerHTML`.

## Caching

`src/lib/github/cache.ts` is a single process-local `MemoryCache` (bounded to 500 entries, oldest-entry eviction when full, per-entry TTL, LRU-refreshed on read) shared by profile/repositories/contributions/README lookups, stored on `globalThis` so it survives Next.js HMR reloads in dev but is still **per server instance** in production (no distributed cache).

| Data | TTL | Cache key prefix |
|---|---|---|
| Profile | 15 min | `profile:{username}` |
| Repositories | 15 min | `repos:{username}` |
| Contributions | 15 min | `contributions:{username}` |
| README | 30 min | `readme:{owner}/{repo}` |

**Authenticated ("viewer") lookups never use this cache** — every cache-key computation is gated on `token ? null : ...`. This is deliberate: a shared cache slot keyed only by "the current viewer" (no username differentiator) would leak one user's private/authenticated GitHub data to the next authenticated request that happened to land on the same warm server instance. Public username-keyed lookups are safe to share because the same GitHub username always returns the same public data regardless of who's asking.

`invalidateUser(username)` clears all four prefixes for a username at once; it's called by `syncGithubUser` when `force: true` is requested (targets only the public-cache path, since authenticated lookups already bypass the cache).

## Profile, repositories, contributions, README retrieval

- `src/lib/github/profile.ts#fetchGithubProfile` — maps GitHub's user object (or the HTML-scrape fallback) to `GithubProfileData`; also fetches `/user/social_accounts` (authenticated self only) to backfill Twitter/LinkedIn links GitHub's core profile API doesn't expose.
- `src/lib/github/repositories.ts#fetchGithubRepositories` — REST-only; note that the public route (`GET /api/github/repositories`) filters out `isPrivate` repos when a `username` was requested, but returns the full list (including private) for an authenticated self lookup.
- `src/lib/github/contributions.ts#fetchGithubContributions` — see [Fallback behavior](#fallback-behavior); also computes `currentStreak`/`longestStreak` from the day-level data client-independently.
- `src/lib/github/readme.ts#fetchGithubReadme` — used both for a user's **profile README** (`owner === repo === username`, GitHub's special-repo convention) and for arbitrary repository READMEs (`GET /api/github/repositories/{owner}/{repo}/readme`).
- `src/lib/github/sync.ts#syncGithubUser` — the aggregate used by `GET|POST /api/github/sync`: fetches profile, then repositories + contributions + profile-README in parallel, for either the authenticated caller (token, no username) or an explicit `overrideUsername` (currently always `undefined` from the route, i.e. sync always targets the authenticated caller — see below).

## Sync behavior

`GET|POST /api/github/sync` both require an authenticated session **and** a linked GitHub account (`409` if not linked). The route deliberately ignores any `username` in the request body/query for identity purposes — sync always targets "whoever the session's linked GitHub token belongs to," never a client-claimed username, so one signed-in user cannot make the sync endpoint fetch/attribute someone else's GitHub identity as "theirs." Both handlers call `syncGithubUser(user.id, undefined, force)` — with no `overrideUsername`, so `targetUser` inside `syncGithubUser` is always the empty string for this route. Because every `fetchGithub*` cache key is already `null` whenever a token is present (see [Caching](#caching)), this authenticated sync path never reads from or writes to the shared `githubCache`, with or without `force`. `force=true` (query param or body) is therefore a no-op with respect to the shared cache here; `syncGithubUser`'s `if (force && targetUser) githubCache.invalidateUser(targetUser)` branch is only exercised when a caller-supplied username is used (a path this route never takes) and is not exercised by sync. Sync never writes anything to Postgres — the result is returned directly to the caller and is not persisted.

## Portfolio project verification

`src/lib/github/repository-verification.ts#verifyGithubProjectRelationship(betterAuthUserId, githubUrl)` is a separate, stricter flow from the dashboard sync above — it's a trust decision tied to a specific portfolio submission, always derived fresh (never cached, never read from the dashboard's sync cache):

1. **Strict URL parsing** (`parseGithubRepoUrl`): uses `URL()`, requires host `github.com`/`www.github.com`, requires exactly two path segments (rejects `/issues`, `/tree/...`, `/pull/...` subpaths, gists, and non-GitHub hosts), validates owner/repo against GitHub's own character rules.
2. Requires a linked GitHub token for the caller; resolves the **authenticated GitHub identity fresh from the token** (`GET /user`) — never from a cached dashboard username or any client-supplied value.
3. Fetches the target repository; a `404` or any non-`false` `private` flag resolves to `unavailable("private_repo")` (nonexistent and private repos are intentionally indistinguishable in the response, so the check never confirms or denies the existence of a private repo to someone who doesn't already have access to it). Only **public** repositories are verified in this version.
4. **Owner check**: authenticated login equals the repo's own `owner.login` (case-insensitive). Note this means an org member is never automatically "owner" of an org repo merely by membership — only the org's own login matches.
5. **Contributor check**, using the repository's *canonical* owner/repo (from the fetched `repoData.full_name`, which follows GitHub's rename/transfer redirects — important because the Search API's `repo:` qualifier does not follow redirects and would 422 on a stale name): first checks for at least one commit GitHub attributes to that login (`GET /repos/{o}/{r}/commits?author={login}`), falling back to at least one **merged** pull request authored by that login (`GET /search/issues?q=repo:{o}/{r} type:pr is:merged author:{login}`).
6. Any transient failure (403/429/5xx/network error) at any step resolves to `unavailable("unavailable")`, never to a false "none".

`POST /api/github/verify-project` is a **non-persistent preview** of this same function, used by the submission modal before the user actually submits; it returns only `{ status, repositoryFullName }` (or `{ status: null, reason }`). It is explicitly documented in-code as non-authoritative — `POST /api/portfolios` always re-runs `verifyGithubProjectRelationship` itself at submission time and ignores whatever the preview said.

## Why GitHub data is not persisted

GitHub profile, repository, README, and contribution data used to be mirrored into five Postgres tables (`github_profiles`, `github_repositories`, `github_readmes`, `github_contributions`, `github_contribution_summaries`). Those tables were dropped by `database/neon/migrations/20260916000000_drop_github_cache_tables.sql` and must not be reintroduced (`database/neon/validation.sql` §16 asserts they're absent). The current design treats GitHub itself as the source of truth for that data — it's fetched live on each relevant request and held only in the bounded process-local cache described above. The only durable GitHub-derived state left in Postgres is:

1. The OAuth linkage itself (Better Auth's `account` row, `providerId = 'github'`).
2. Per-portfolio verification metadata (`portfolios.github_verification_status`/`_login`/`_repository_full_name`/`_verified_at`), written once at submission time.

## Expected failure behavior

| Condition | Behavior |
|---|---|
| GitHub API unavailable / rate-limited | Profile: HTML-scrape or placeholder fallback for username lookups; throw for authenticated self lookups. Repositories/contributions: empty result for username lookups (repositories) or scrape fallback (contributions); throw for authenticated self lookups. Verification: resolves to `unavailable`, never blocks portfolio submission. |
| Stale/expired/revoked token | `githubFetch` throws a `401`-coded error; verification maps this to `not_linked` (treated the same as "no linked account"); sync/profile routes surface the error to the caller. |
| Private repository (verification) | Indistinguishable from nonexistent; resolves to `unavailable("private_repo")`. Never verified in this version. |
| Verification failure of any kind | Never blocks portfolio publishing — `POST /api/portfolios` catches the promise and treats a rejection the same as an explicit `unavailable` result. |
| Public fallback exhausted (contributions) | Returns a fully empty (`count: 0`) 371-day heatmap rather than erroring, for a username-target lookup only. |

## Related documentation

- [auth-and-identity.md](./auth-and-identity.md#github-oauth-linkage) — how the `account` row is created and why tokens stay server-side.
- [portfolio-system.md](./portfolio-system.md#creation) — where verification fits into portfolio submission.
- [database.md](./database.md#removed-tables--must-not-return) — the dropped mirror tables.
- [api-reference.md](./api-reference.md) — full route signatures.
