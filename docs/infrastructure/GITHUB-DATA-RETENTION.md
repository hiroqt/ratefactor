# GitHub Data Retention

RateFactor keeps GitHub OAuth linkage in Better Auth and the public GitHub URL in `profiles.github`.

GitHub profile, repository, README, and contribution data is fetched from GitHub on demand and held only in the bounded in-memory cache. GitHub remains the source of truth. Portfolio repository verification remains a durable RateFactor record and is always verified from the linked account's live GitHub API access.

The five former Neon `github_*` mirror tables are removed by the Neon-only migration `20260916000000_drop_github_cache_tables.sql`.
