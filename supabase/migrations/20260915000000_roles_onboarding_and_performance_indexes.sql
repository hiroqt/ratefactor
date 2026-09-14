-- ==========================================================
-- RateFactor Database Schema Migration
-- Migration: 20260915000000_roles_onboarding_and_performance_indexes.sql
-- 1. Support multi-discipline roles (Front End, Backend, Fullstack, UI/UX, QA, ML, Cloud, Network, Data, Graphics, User) with default 'user'
-- 2. Add onboarded flag to track profile onboarding for newly created accounts
-- 3. Enhance database performance indexes (covering, partial, functional, and composite)
-- ==========================================================

-- 1. EVOLVE USER AND PROFILES ROLES & ONBOARDING FLAGS
-- Convert profiles.role to TEXT to support all engineering disciplines and custom roles
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
    ALTER TABLE public.profiles ALTER COLUMN role TYPE TEXT USING role::text;
    ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';
  END IF;
END $$;

-- Add onboarded column to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS onboarded BOOLEAN NOT NULL DEFAULT FALSE;

-- Update Better Auth "user" table to support 'user' default and new role values
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'role'
  ) THEN
    -- Drop old restrictive check constraint if present
    ALTER TABLE public."user" DROP CONSTRAINT IF EXISTS user_role_check;
    ALTER TABLE public."user" ALTER COLUMN "role" SET DEFAULT 'user';
  END IF;
END $$;

-- Add onboarded column to Better Auth user table
ALTER TABLE public."user"
  ADD COLUMN IF NOT EXISTS "onboarded" BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. UPDATE SYNC TRIGGER FUNCTION FOR 'user' DEFAULT AND ONBOARDED STATE
CREATE OR REPLACE FUNCTION public.handle_better_auth_user_sync()
RETURNS TRIGGER AS $$
DECLARE
  extracted_username TEXT;
  target_profile_id UUID;
  safe_full_name TEXT;
  default_role TEXT;
BEGIN
  -- Safe normalized username matching 3 <= char_length <= 30
  extracted_username := LOWER(REGEXP_REPLACE(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
  IF char_length(extracted_username) < 3 THEN
    extracted_username := extracted_username || 'dev';
  END IF;
  IF char_length(extracted_username) > 30 THEN
    extracted_username := substr(extracted_username, 1, 30);
  END IF;

  -- Deterministic profile UUID mapping from Better Auth user id
  target_profile_id := CASE 
    WHEN NEW.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN NEW.id::uuid
    ELSE md5('ratefactor:' || NEW.id)::uuid
  END;

  -- Prevent username collisions with existing profiles of other users
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE username = extracted_username 
      AND id != target_profile_id
  ) THEN
    extracted_username := substr(extracted_username, 1, 25) || substr(md5(NEW.id), 1, 5);
  END IF;

  -- Safe full name bounded to 80 characters
  safe_full_name := substr(COALESCE(NULLIF(TRIM(NEW.name), ''), extracted_username), 1, 80);

  -- Determine default role: 'user'
  default_role := COALESCE(NULLIF(TRIM(NEW.role), ''), 'user');

  -- Sync into public.profiles if the table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    INSERT INTO public.profiles (
      id,
      username,
      full_name,
      avatar_url,
      role,
      onboarded
    ) VALUES (
      target_profile_id,
      extracted_username,
      safe_full_name,
      COALESCE(NEW.image, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'),
      default_role,
      COALESCE(NEW.onboarded, FALSE)
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url,
      role = CASE 
        WHEN public.profiles.role IS NOT NULL AND public.profiles.role != 'user' THEN public.profiles.role 
        ELSE EXCLUDED.role 
      END,
      onboarded = public.profiles.onboarded OR EXCLUDED.onboarded;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. HIGH-PERFORMANCE DATABASE INDEXES

-- A. PROFILES TABLE INDEXES
-- Functional index on LOWER(username) for case-insensitive exact match
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_lower_username 
  ON public.profiles(LOWER(username));

-- Functional index on LOWER(full_name) for developer directory search
CREATE INDEX IF NOT EXISTS idx_profiles_lower_full_name 
  ON public.profiles(LOWER(full_name));

-- Composite index on (created_at DESC, id DESC) for directory cursor pagination
CREATE INDEX IF NOT EXISTS idx_profiles_created_at_id 
  ON public.profiles(created_at DESC, id DESC);

-- Partial index for active hireable developers
CREATE INDEX IF NOT EXISTS idx_profiles_role_hire 
  ON public.profiles(role, available_for_hire) 
  WHERE available_for_hire = TRUE;

-- Index on onboarded status for onboarding queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarded 
  ON public.profiles(onboarded);

-- B. PORTFOLIOS TABLE INDEXES
-- Filtered/Partial Indexes for Published Discovery Feeds (saves index space & speeds up scan)
CREATE INDEX IF NOT EXISTS idx_portfolios_published_feed 
  ON public.portfolios(category, rating DESC, created_at DESC) 
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_portfolios_published_likes 
  ON public.portfolios(category, likes_count DESC, created_at DESC) 
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_portfolios_published_recent 
  ON public.portfolios(category, created_at DESC) 
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_portfolios_all_published_rating 
  ON public.portfolios(rating DESC, created_at DESC) 
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_portfolios_all_published_likes 
  ON public.portfolios(likes_count DESC, created_at DESC) 
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_portfolios_all_published_recent 
  ON public.portfolios(created_at DESC) 
  WHERE status = 'published';

-- Composite covering index for author profile portfolios lookup (index-only scan)
CREATE INDEX IF NOT EXISTS idx_portfolios_author_created 
  ON public.portfolios(author_id, created_at DESC) 
  INCLUDE (id, title, rating, likes_count, comments_count);

-- C. RATINGS TABLE INDEXES
-- Covering index for aggregate score queries per portfolio
CREATE INDEX IF NOT EXISTS idx_ratings_portfolio_aggregate 
  ON public.ratings(portfolio_id) 
  INCLUDE (score, design, code_quality, performance, documentation);

-- D. LIKES TABLE INDEXES
-- Fast lookup index for likes count and aggregation per portfolio
CREATE INDEX IF NOT EXISTS idx_likes_portfolio_id 
  ON public.likes(portfolio_id);

-- E. COMMENTS TABLE INDEXES
-- Partial index for approved comments per portfolio sorted chronologically
CREATE INDEX IF NOT EXISTS idx_comments_portfolio_approved 
  ON public.comments(portfolio_id, created_at ASC) 
  WHERE status = 'approved';

-- Partial index for reported comments moderation queue
CREATE INDEX IF NOT EXISTS idx_comments_reported_pending 
  ON public.comments(report_count DESC, created_at DESC) 
  WHERE is_reported = TRUE;

-- F. NOTIFICATIONS TABLE INDEXES
-- Partial index for rapid unread notifications count and list
CREATE INDEX IF NOT EXISTS idx_notifications_unread_recipient 
  ON public.notifications(recipient_id, created_at DESC) 
  WHERE is_read = FALSE;

-- G. BETTER AUTH & SESSION INDEXES
CREATE INDEX IF NOT EXISTS idx_user_lower_email 
  ON public."user"(LOWER(email));

CREATE INDEX IF NOT EXISTS idx_session_token_expires 
  ON public."session"(token, "expiresAt");

CREATE INDEX IF NOT EXISTS idx_account_user_provider 
  ON public."account"("userId", "providerId");

-- H. GITHUB INTEGRATIONS INDEXES
CREATE INDEX IF NOT EXISTS idx_github_repos_user_stars 
  ON public.github_repositories(user_id, stars DESC) 
  WHERE is_private = FALSE;

CREATE INDEX IF NOT EXISTS idx_github_contributions_user_date_asc 
  ON public.github_contributions(user_id, date ASC);
