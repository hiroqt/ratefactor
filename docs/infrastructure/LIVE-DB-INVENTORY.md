# Live database inventory

Supabase remains the untouched historical source. Neon is the accepted local migration baseline.

Neon retains RateFactor core tables, Better Auth (`user`, `session`, `account`, `verification`), `auth_challenges`, and `rate_limits`. It does not retain the five transient GitHub mirror tables. Portfolio GitHub verification fields and `thumbnail_public_id` remain present.
