-- ==========================================================
-- RateFactor — Neon Schema Validation (read-only)
-- ==========================================================
-- Run after applying database/neon/schema.sql to the Neon target. Every
-- query here is a read-only catalog/information_schema check — safe to
-- re-run at any time. Compare counts/rows against the expectations noted
-- in each section's comment.

-- 1. Tables — expect 14 rows after removing transient GitHub mirrors.
\echo '=== 1. Tables (expect 14) ==='
SELECT count(*) AS table_count FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Columns — 211 migrated columns plus portfolios.thumbnail_public_id.
\echo '=== 2. Column count (expect 156) ==='
SELECT count(*) AS column_count FROM information_schema.columns
WHERE table_schema = 'public';

-- 3. Primary keys — expect 19 (one per table).
\echo '=== 3. Primary keys (expect 14) ==='
SELECT count(*) AS pk_count FROM information_schema.table_constraints
WHERE table_schema = 'public' AND constraint_type = 'PRIMARY KEY';

-- 4. Unique constraints — 11 migrated constraints plus thumbnail_public_id.
\echo '=== 4. Unique constraints (expect 7) ==='
SELECT count(*) AS unique_count FROM information_schema.table_constraints
WHERE table_schema = 'public' AND constraint_type = 'UNIQUE';

-- 5. Check constraints — expect 31.
\echo '=== 5. Check constraints (expect 31) ==='
SELECT count(*) AS check_count FROM pg_constraint
WHERE contype = 'c' AND connamespace = 'public'::regnamespace;

-- 6. Foreign keys — expect 21 (22 live minus the dropped auth_challenges->auth.users FK).
\echo '=== 6. Foreign keys (expect 15) ==='
SELECT count(*) AS fk_count FROM pg_constraint
WHERE contype = 'f' AND connamespace = 'public'::regnamespace;

SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE contype = 'f' AND connamespace = 'public'::regnamespace
ORDER BY 1, conname;

-- Explicitly confirm the non-portable FK was NOT recreated.
\echo '=== 6b. auth_challenges FK to auth.* (expect 0 rows) ==='
SELECT conname FROM pg_constraint
WHERE contype = 'f' AND connamespace = 'public'::regnamespace
  AND conrelid = 'public.auth_challenges'::regclass
  AND pg_get_constraintdef(oid) ILIKE '%auth.users%';

-- 7. Indexes — 86 migrated indexes plus thumbnail_public_id uniqueness.
\echo '=== 7. Indexes (expect 75) ==='
SELECT count(*) AS index_count FROM pg_indexes WHERE schemaname = 'public';

-- 8. Enums / custom types — expect 4.
\echo '=== 8. Enum types (expect 4: app_role, content_status, portfolio_category, report_reason) ==='
SELECT t.typname, string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS values
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;

-- 9. Functions — expect the 8 business-logic functions below present
--    (handle_better_auth_user_sync, prevent_self_rating, set_updated_at,
--    set_better_auth_updated_at, sync_comment_reports, sync_comments_count,
--    sync_likes_count, sync_ratings), among ~54 total once uuid-ossp/pgcrypto's
--    own functions (installed unqualified into public) are counted too.
--    current_user_role/is_admin/is_moderator/handle_new_user/rls_auto_enable/
--    prevent_role_escalation must be ABSENT — checked explicitly in 9b.
\echo '=== 9. Functions (public schema, incl. extension-provided) ==='
SELECT p.proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname;

\echo '=== 9b. Excluded Supabase-only functions (expect 0 rows) ==='
SELECT p.proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('current_user_role', 'is_admin', 'is_moderator', 'handle_new_user', 'rls_auto_enable', 'prevent_role_escalation');

-- 10. Triggers — expect 18 rows / 12 distinct trigger definitions. One row
--    per (table, event) pair, so a multi-event trigger (e.g. tr_sync_ratings
--    on INSERT/UPDATE/DELETE) appears 3 times. 12 distinct triggers here vs.
--    13 live, since tr_prevent_role_escalation is excluded (was 1 row live).
\echo '=== 10. Triggers (expect 18 rows / 12 distinct trigger_name values) ==='
SELECT event_object_table, trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

\echo '=== 10b. Excluded trigger tr_prevent_role_escalation (expect 0 rows) ==='
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_schema = 'public' AND trigger_name = 'tr_prevent_role_escalation';

-- 11. Event triggers — expect 0 (all 7 live ones are Supabase platform
--     machinery and must never be replayed on Neon).
\echo '=== 11. Event triggers (expect 0) ==='
SELECT evtname FROM pg_event_trigger;

-- 12. RLS status — expect false on every table (RLS intentionally not enabled).
\echo '=== 12. RLS enabled per table (expect relrowsecurity = false everywhere) ==='
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
ORDER BY relname;

-- 13. RLS policies — expect 0 (none should exist; RLS is off and none were created).
\echo '=== 13. RLS policies (expect 0) ==='
SELECT count(*) AS policy_count FROM pg_policies WHERE schemaname = 'public';

-- 14. No auth/storage/realtime/graphql/pgbouncer/vault schemas exist
--     (expect this query to return nothing on a clean Neon database — Neon
--     never provisions Supabase platform schemas in the first place).
\echo '=== 14. Supabase platform schemas present (expect 0 rows) ==='
SELECT nspname FROM pg_namespace
WHERE nspname IN ('auth', 'storage', 'realtime', 'graphql', 'graphql_public', 'pgbouncer', 'vault');

-- 15. Better Auth tables — spot-check structure.
\echo '=== 15. Better Auth tables: user/session/account/verification column counts ==='
SELECT table_name, count(*) AS column_count
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('user', 'session', 'account', 'verification')
GROUP BY table_name
ORDER BY table_name;

-- 16. github_* tables — spot-check structure and FKs.
\echo '=== 16. github_* mirror tables (expect 0 rows) ==='
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('github_profiles', 'github_repositories', 'github_readmes', 'github_contributions', 'github_contribution_summaries');

-- 17. Extensions installed — expect uuid-ossp and pgcrypto.
\echo '=== 17. Extensions (expect uuid-ossp, pgcrypto present) ==='
SELECT extname, extversion FROM pg_extension ORDER BY extname;

\echo '=== DONE ==='
