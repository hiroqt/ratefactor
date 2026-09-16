# Development

## Prerequisites

- Node.js compatible with Next.js 15 / React 19 / TypeScript 5.7 (see `package.json` for exact dependency versions).
- A PostgreSQL 17-compatible database (a local instance or a disposable/least-privileged Neon branch) — the app is not tied to Neon specifically, only to standard `pg`-compatible PostgreSQL, but `database/neon/schema.sql` is written for Postgres 17.
- Do **not** use production database, Cloudinary, OAuth, Sentry, PostHog, Resend, or Better Auth credentials for routine local development.

## Install and run

```sh
npm install
npm run dev
```

`npm run dev` runs `next dev`. `npm run build` / `npm run start` build and serve the production bundle. `npm run lint` runs `next lint`. `npm test` runs `tsc --noEmit` followed by Node's built-in test runner over `src/**/*.test.ts` — see [Known Development Issues](#known-development-issues) for what that currently covers.

## Environment setup

Copy `.env.example` to `.env.local` and fill in values conceptually per [deployment-operations.md](./deployment-operations.md#runtime-environment-variables) — do not commit real secrets. At minimum for local development you need `DATABASE_URL` pointed at your local/disposable Postgres and a `BETTER_AUTH_SECRET`; OAuth, Cloudinary, Sentry, PostHog, and Resend are all optional locally (their absence degrades gracefully — see the per-integration fallback behavior noted in [architecture.md](./architecture.md#observability) and [portfolio-system.md](./portfolio-system.md#media)). Note that `.env.example` currently lists Supabase variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) inherited from before the Neon migration and does **not** list the four `CLOUDINARY_*` variables that `src/lib/cloudinary.ts` actually requires (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_UPLOAD_FOLDER`) — set the Cloudinary variables yourself if you're working on portfolio-cover upload code, and don't treat the Supabase variables as meaningful to current runtime behavior.

## Database work

`database/neon/schema.sql` is the fresh-database baseline — apply it to a local/empty Postgres database to get a working schema (`psql $DATABASE_URL -f database/neon/schema.sql`, or the equivalent for your client). `database/neon/migrations/` is ordered transition history for a database created before a given change; a schema created fresh from `schema.sql` never needs to run them. `database/neon/validation.sql` is a read-only post-apply sanity check (`psql $DATABASE_URL -f database/neon/validation.sql`) — every query in it is a catalog/`information_schema` read with an expected count in a comment.

Do not apply schema or migration SQL to a shared or production database from a local session without the separate operational approval described in [deployment-operations.md](./deployment-operations.md). Full schema reference: [database.md](./database.md).

## Validation

The package scripts actually available are `dev`, `build`, `start`, `lint`, and `test` (see `package.json`). For documentation-only changes, `git diff --check` plus verifying relative links is sufficient. For code changes, run `npm test` and `npm run build` (and `npm run lint`) at minimum.

## Known Development Issues

`npm test` runs `tsc --noEmit && node --test "src/**/*.test.ts"` — a project-wide typecheck followed by Node's built-in test runner over every `*.test.ts` file in `src/`. This does not require a database connection or any external credentials.

Coverage is currently narrow: two test files exist, `src/lib/auth/profile-id.test.ts` (covering `resolveCanonicalProfileId`'s UUID-passthrough and non-UUID hashing behavior) and `src/lib/cloudinary.test.ts` (covering upload-URL/folder validation and upload-receipt/signature verification). `scripts/verify-github-project-verification.ts` and `scripts/verify-rating-integrity.ts` also exist but are standalone scripts, not part of `npm test` or the `*.test.ts` pattern — they can be run individually with `npx tsx scripts/<name>.ts` against a database you're willing to write test data into.

## Code organization

- New pages/routes: `src/app/**` (App Router conventions — a `route.ts` for an API endpoint, a `page.tsx` for a UI route).
- New server-only logic shared by routes: `src/lib/**`, grouped by concern (`auth/`, `github/`, `validations/`, `cookies/`, `email/`).
- New domain UI: `src/features/<domain>/{components,hooks}`, re-exported through that feature's `index.ts`.
- New shared, cross-feature UI primitives: `src/components/ui/**`.
- New shared TypeScript types: `src/types/**`.
- Any new route that writes to Postgres should follow the existing pattern of resolving the actor's profile id via `resolveCanonicalProfileId` (ownership checks) or the broader id-or-username lookup (general "current user" resolution) — see [auth-and-identity.md](./auth-and-identity.md#profile-identity-mapping) — rather than trusting a client-supplied id.
- Any new derived/aggregate column (a count or average maintained across rows) should follow the existing trigger-plus-read-back pattern documented in [database.md](./database.md#triggers-and-functions), not an application-side increment.

## Secrets handling

Never commit `.env.local` or any file containing real credentials. `.env.example` is a template only and must not contain real values — this branch's audit did not modify it (see [deployment-operations.md](./deployment-operations.md) for the full environment-variable inventory). GitHub OAuth tokens and the Cloudinary API secret must never be sent to client code, logged in full, or included in an API response — see the invariants in [architecture.md](./architecture.md#system-invariants).
