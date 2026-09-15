# RateFactor Neon schema

This is the final local Neon schema: 14 application tables, Better Auth, RateFactor core tables, `auth_challenges`, and `rate_limits`. The five transient GitHub mirror tables are intentionally absent.

`schema.sql` creates a fresh final schema. `migrations/` contains transition history for an existing Neon database. `validation.sql` is read-only.

The local Neon baseline has migrated data, Cloudinary portfolio covers, zero remaining base64 portfolio covers, and durable portfolio GitHub-verification fields. Production cutover is not complete.
