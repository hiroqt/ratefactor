-- ==========================================================
-- RateFactor Database Schema Migration
-- Migration: 20260915000002_github_project_verification.sql
-- Feature: PROJECT-level GitHub repository verification (owner/contributor)
--
-- This is distinct from profiles.is_verified (profile-level, unrelated) and
-- from the github_* dashboard sync/cache tables (display caching, not a
-- trust decision). It records the server-authoritative result of checking
-- whether a portfolio's linked author actually owns or has contributed to
-- the GitHub repository referenced by that portfolio's github_url.
-- ==========================================================

ALTER TABLE public.portfolios
ADD COLUMN IF NOT EXISTS github_verification_status TEXT
CHECK (github_verification_status IS NULL OR github_verification_status IN ('owner', 'contributor', 'none'));

-- NULL = not checked, could not be authoritatively verified (GitHub unavailable,
-- no linked account, private/nonexistent repo, malformed URL), or not eligible.
-- 'none' = successfully checked a valid public repository; no relationship found.
COMMENT ON COLUMN public.portfolios.github_verification_status IS
  'Server-derived project-level GitHub relationship: owner, contributor, none, or NULL (not checked / could not authoritatively verify). Independent of profiles.is_verified.';

ALTER TABLE public.portfolios
ADD COLUMN IF NOT EXISTS github_verified_login TEXT;

ALTER TABLE public.portfolios
ADD COLUMN IF NOT EXISTS github_repository_full_name TEXT;

ALTER TABLE public.portfolios
ADD COLUMN IF NOT EXISTS github_verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_portfolios_github_verification_status
ON public.portfolios(github_verification_status)
WHERE github_verification_status IS NOT NULL;
