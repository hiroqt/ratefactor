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

`npm run dev` runs `next dev`. `npm run build` / `npm run start` build and serve the production bundle. `npm run lint` runs `next lint`. These four scripts (`dev`, `build`, `start`, `lint`) are the only ones guaranteed to work as documented — see [Known Development Issues](#known-development-issues) for `test`.

## Environment setup

Copy `.env.example` to `.env.local` and fill in values conceptually per [deployment-operations.md](./deployment-operations.md#runtime-environment-variables) — do not commit real secrets. At minimum for local development you need `DATABASE_URL` pointed at your local/disposable Postgres and a `BETTER_AUTH_SECRET`; OAuth, Cloudinary, Sentry, PostHog, and Resend are all optional locally (their absence degrades gracefully — see the per-integration fallback behavior noted in [architecture.md](./architecture.md#observability) and [portfolio-system.md](./portfolio-system.md#media)). Note that `.env.example` currently lists Supabase variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) inherited from before the Neon migration and does **not** list the four `CLOUDINARY_*` variables that `src/lib/cloudinary.ts` actually requires (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_UPLOAD_FOLDER`) — set the Cloudinary variables yourself if you're working on portfolio-cover upload code, and don't treat the Supabase variables as meaningful to current runtime behavior.

## Database work

`database/neon/schema.sql` is the fresh-database baseline — apply it to a local/empty Postgres database to get a working schema (`psql $DATABASE_URL -f database/neon/schema.sql`, or the equivalent for your client). `database/neon/migrations/` is ordered transition history for a database created before a given change; a schema created fresh from `schema.sql` never needs to run them. `database/neon/validation.sql` is a read-only post-apply sanity check (`psql $DATABASE_URL -f database/neon/validation.sql`) — every query in it is a catalog/`information_schema` read with an expected count in a comment.

Do not apply schema or migration SQL to a shared or production database from a local session without the separate operational approval described in [deployment-operations.md](./deployment-operations.md). Full schema reference: [database.md](./database.md).

## Validation

The package scripts actually available are `dev`, `build`, `start`, `lint`, and `test` (see `package.json`). For documentation-only changes, `git diff --check` plus verifying relative links is sufficient. For code changes, run `npm run build` (and `npm run lint`) at minimum; there is no configured unit/integration test runner beyond the chain described below.

## Known Development Issues

`npm run test` is defined as a chain of nine `tsx` script invocations:

```
verify-backend.ts, verify-better-auth.ts, verify-monitoring.ts, verify-contributions-e2e.ts,
verify-discover-apps.ts, verify-edgecases.ts, verify-email-otp-registration.ts,
verify-accurate-counts-and-notifications.ts, verify-oauth-only.ts
```

**None of these files exist in `scripts/` on this branch.** `scripts/` currently contains only `verify-github-project-verification.ts` and `verify-rating-integrity.ts`, neither of which is referenced by `test`. Running `npm run test` will fail immediately on the first missing file. Treat `npm run test` as broken until either the missing scripts are restored or the script is corrected — this documentation does not fix `package.json`. The two scripts that do exist can be run individually with `npx tsx scripts/verify-github-project-verification.ts` / `npx tsx scripts/verify-rating-integrity.ts` against a database you're willing to write test data into.

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
