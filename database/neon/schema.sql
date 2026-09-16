-- ==========================================================
-- RateFactor — Portable Neon PostgreSQL 17 Schema
-- ==========================================================
-- Generated from a live read-only pg_dump --schema-only of the production
-- Supabase database (see docs/database.md for the current schema reference),
-- with Supabase-platform-only objects stripped. This file is the source of
-- truth for the Neon target schema — NOT supabase/schema.sql, which is a
-- stale baseline predating three migrations.
--
-- Excluded vs. live Supabase (see docs/database.md for full rationale):
--   - auth.*/storage.*/realtime.*/graphql*/pgbouncer/vault schemas
--   - auth.users dependency, on_auth_user_created trigger, handle_new_user()
--   - Supabase event triggers (ensure_rls/rls_auto_enable(), pgrst_*, pg_graphql/pg_cron/pg_net grants)
--   - RLS policies referencing auth.uid()/auth.role() — RLS is not enabled here
--   - Unused RLS-helper functions current_user_role(), is_admin(), is_moderator()
--   - prevent_role_escalation() / tr_prevent_role_escalation — calls auth.uid()
--     unconditionally; would hard-error on Neon (schema "auth" doesn't exist)
--     instead of Supabase's silent NULL. See docs/database.md.
--   - auth_challenges_user_id_fkey → auth.users(id) — FK dropped; table kept.
--
-- Idempotent: safe to re-run against an empty or partially-created database.

-- ==========================================================
-- 0. Extensions
-- ==========================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================================
-- 1. Enum / custom types
-- ==========================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('developer', 'moderator', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Orphaned on live production (profiles.role/user.role were converted to
-- TEXT by 20260915000000_roles_onboarding_and_performance_indexes.sql) but
-- kept here for compatibility — see docs/database.md.

DO $$ BEGIN
  CREATE TYPE public.content_status AS ENUM ('published', 'draft', 'flagged', 'hidden');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.portfolio_category AS ENUM (
    'Systems', 'Frontend', 'Fullstack', 'Design Engineer', 'Mobile',
    'AI / ML', 'Developer', 'Arts', 'Client'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.report_reason AS ENUM (
    'spam', 'offensive', 'off_topic', 'harassment', 'low_quality'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==========================================================
-- 2. Business-integrity functions (portable — no auth.*/Supabase refs)
-- ==========================================================

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_better_auth_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_likes_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.portfolios
    SET likes_count = likes_count + 1
    WHERE id = NEW.portfolio_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.portfolios
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.portfolio_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_comments_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.portfolios
    SET comments_count = comments_count + 1
    WHERE id = NEW.portfolio_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.portfolios
    SET comments_count = GREATEST(0, comments_count - 1)
    WHERE id = OLD.portfolio_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_ratings() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  target_portfolio_id TEXT;
  avg_score NUMERIC(3, 2);
  avg_design NUMERIC(3, 2);
  avg_code NUMERIC(3, 2);
  avg_perf NUMERIC(3, 2);
  avg_doc NUMERIC(3, 2);
  cnt INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_portfolio_id := OLD.portfolio_id;
  ELSE
    target_portfolio_id := NEW.portfolio_id;
  END IF;

  SELECT
    ROUND(AVG(score), 2),
    ROUND(AVG(design), 2),
    ROUND(AVG(code_quality), 2),
    ROUND(AVG(performance), 2),
    ROUND(AVG(documentation), 2),
    COUNT(*)::INTEGER
  INTO
    avg_score, avg_design, avg_code, avg_perf, avg_doc, cnt
  FROM public.ratings
  WHERE portfolio_id = target_portfolio_id;

  UPDATE public.portfolios
  SET
    rating = COALESCE(avg_score, 0.00),
    rating_design = COALESCE(avg_design, 0.00),
    rating_code_quality = COALESCE(avg_code, 0.00),
    rating_performance = COALESCE(avg_perf, 0.00),
    rating_documentation = COALESCE(avg_doc, 0.00),
    rating_count = COALESCE(cnt, 0)
  WHERE id = target_portfolio_id;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_comment_reports() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.comments
  SET
    report_count = report_count + 1,
    is_reported = TRUE,
    status = CASE WHEN report_count + 1 >= 3 THEN 'flagged' ELSE status END
  WHERE id = NEW.comment_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_self_rating() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  portfolio_author_id UUID;
BEGIN
  SELECT author_id INTO portfolio_author_id
  FROM public.portfolios
  WHERE id = NEW.portfolio_id;

  IF portfolio_author_id IS NOT NULL AND portfolio_author_id = NEW.user_id THEN
    RAISE EXCEPTION 'Portfolio owners cannot rate their own portfolio.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

-- Canonical Better Auth -> profiles synchronization. Fires on user INSERT/UPDATE
-- of name/image/role; derives the deterministic profile UUID identically to
-- src/lib/auth/profile-id.ts's resolveCanonicalProfileId. No auth.*/Supabase
-- dependency — fully portable, and must be preserved unchanged.
CREATE OR REPLACE FUNCTION public.handle_better_auth_user_sync() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
DECLARE
  extracted_username TEXT;
  target_profile_id UUID;
  safe_full_name TEXT;
  default_role TEXT;
BEGIN
  extracted_username := LOWER(REGEXP_REPLACE(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
  IF char_length(extracted_username) < 3 THEN
    extracted_username := extracted_username || 'dev';
  END IF;
  IF char_length(extracted_username) > 30 THEN
    extracted_username := substr(extracted_username, 1, 30);
  END IF;

  target_profile_id := CASE
    WHEN NEW.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN NEW.id::uuid
    ELSE md5('ratefactor:' || NEW.id)::uuid
  END;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE username = extracted_username
      AND id != target_profile_id
  ) THEN
    extracted_username := substr(extracted_username, 1, 25) || substr(md5(NEW.id), 1, 5);
  END IF;

  safe_full_name := substr(COALESCE(NULLIF(TRIM(NEW.name), ''), extracted_username), 1, 80);

  default_role := COALESCE(NULLIF(TRIM(NEW.role), ''), 'user');

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    INSERT INTO public.profiles (
      id, username, full_name, avatar_url, role, onboarded
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
$_$;

-- ==========================================================
-- 3. Tables
-- ==========================================================

-- ---- Better Auth ----

CREATE TABLE IF NOT EXISTS public."user" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "emailVerified" boolean DEFAULT false NOT NULL,
    image text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    banned boolean DEFAULT false,
    "banReason" text,
    "banExpires" timestamp with time zone,
    "lastActiveAt" timestamp with time zone,
    onboarded boolean DEFAULT false NOT NULL,
    CONSTRAINT user_pkey PRIMARY KEY (id),
    CONSTRAINT user_email_key UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS public.session (
    id text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL,
    "impersonatedBy" text,
    CONSTRAINT session_pkey PRIMARY KEY (id),
    CONSTRAINT session_token_key UNIQUE (token),
    CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.account (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp with time zone,
    "refreshTokenExpiresAt" timestamp with time zone,
    scope text,
    password text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT account_pkey PRIMARY KEY (id),
    CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.verification (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT verification_pkey PRIMARY KEY (id)
);

-- ---- RateFactor application tables ----

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    full_name text NOT NULL,
    avatar_url text DEFAULT 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'::text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    bio text,
    status jsonb DEFAULT '{"emoji": "⚡", "message": "Building and shipping", "statusType": "available"}'::jsonb NOT NULL,
    skills text[] DEFAULT '{}'::text[] NOT NULL,
    pinned_portfolio_ids text[] DEFAULT '{}'::text[] NOT NULL,
    spotlight_portfolio_id text,
    company text,
    location text,
    website text,
    github text,
    twitter text,
    linkedin text,
    readme_markdown text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    available_for_hire boolean DEFAULT true NOT NULL,
    custom_hire_message text,
    onboarded boolean DEFAULT false NOT NULL,
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_username_key UNIQUE (username),
    CONSTRAINT profiles_bio_check CHECK ((char_length(bio) <= 500)),
    CONSTRAINT profiles_company_check CHECK ((char_length(company) <= 80)),
    CONSTRAINT profiles_custom_hire_message_check CHECK (((custom_hire_message IS NULL) OR (char_length(custom_hire_message) <= 500))),
    CONSTRAINT profiles_full_name_check CHECK (((char_length(full_name) >= 1) AND (char_length(full_name) <= 80))),
    CONSTRAINT profiles_location_check CHECK ((char_length(location) <= 80)),
    CONSTRAINT profiles_readme_markdown_check CHECK ((char_length(readme_markdown) <= 10000)),
    CONSTRAINT profiles_username_check CHECK (((char_length(username) >= 3) AND (char_length(username) <= 30)))
);

CREATE TABLE IF NOT EXISTS public.portfolios (
    id text NOT NULL,
    author_id uuid NOT NULL,
    title text NOT NULL,
    tagline text NOT NULL,
    description text,
    portfolio_url text NOT NULL,
    github_url text NOT NULL,
    demo_url text,
    thumbnail_url text NOT NULL,
    thumbnail_public_id text,
    image_size_bytes integer NOT NULL,
    category public.portfolio_category NOT NULL,
    tech_stack text[] DEFAULT '{}'::text[] NOT NULL,
    rating numeric(3,2) DEFAULT 0.00 NOT NULL,
    rating_count integer DEFAULT 0 NOT NULL,
    rating_design numeric(3,2) DEFAULT 0.00 NOT NULL,
    rating_code_quality numeric(3,2) DEFAULT 0.00 NOT NULL,
    rating_performance numeric(3,2) DEFAULT 0.00 NOT NULL,
    rating_documentation numeric(3,2) DEFAULT 0.00 NOT NULL,
    likes_count integer DEFAULT 0 NOT NULL,
    comments_count integer DEFAULT 0 NOT NULL,
    is_showcase boolean DEFAULT false NOT NULL,
    showcase_type text,
    showcase_reason text,
    status public.content_status DEFAULT 'published'::public.content_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    request_critique boolean DEFAULT false NOT NULL,
    github_verification_status text,
    github_verified_login text,
    github_repository_full_name text,
    github_verified_at timestamp with time zone,
    CONSTRAINT portfolios_pkey PRIMARY KEY (id),
    CONSTRAINT portfolios_thumbnail_public_id_key UNIQUE (thumbnail_public_id),
    CONSTRAINT portfolios_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT portfolios_comments_count_check CHECK ((comments_count >= 0)),
    CONSTRAINT portfolios_description_check CHECK (((description IS NULL) OR ((array_length(regexp_split_to_array(TRIM(BOTH FROM description), '\s+'::text), 1) >= 1) AND (array_length(regexp_split_to_array(TRIM(BOTH FROM description), '\s+'::text), 1) <= 2500)))),
    CONSTRAINT portfolios_github_verification_status_check CHECK (((github_verification_status IS NULL) OR (github_verification_status = ANY (ARRAY['owner'::text, 'contributor'::text, 'none'::text])))),
    CONSTRAINT portfolios_image_size_bytes_check CHECK (((image_size_bytes > 0) AND (image_size_bytes <= 2097152))),
    CONSTRAINT portfolios_likes_count_check CHECK ((likes_count >= 0)),
    CONSTRAINT portfolios_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= 5.0))),
    CONSTRAINT portfolios_rating_count_check CHECK ((rating_count >= 0)),
    CONSTRAINT portfolios_showcase_type_check CHECK ((showcase_type = ANY (ARRAY['daily'::text, 'weekly'::text]))),
    CONSTRAINT portfolios_tagline_check CHECK (((char_length(tagline) >= 10) AND (char_length(tagline) <= 240))),
    CONSTRAINT portfolios_title_check CHECK (((char_length(title) >= 3) AND (char_length(title) <= 120)))
);

COMMENT ON COLUMN public.portfolios.github_verification_status IS 'Server-derived project-level GitHub relationship: owner, contributor, none, or NULL (not checked / could not authoritatively verify). Independent of profiles.is_verified.';

CREATE TABLE IF NOT EXISTS public.ratings (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    portfolio_id text NOT NULL,
    user_id uuid NOT NULL,
    score numeric(3,2) NOT NULL,
    design numeric(3,2) NOT NULL,
    code_quality numeric(3,2) NOT NULL,
    performance numeric(3,2) NOT NULL,
    documentation numeric(3,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ratings_pkey PRIMARY KEY (id),
    CONSTRAINT uq_ratings_user_portfolio UNIQUE (portfolio_id, user_id),
    CONSTRAINT ratings_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE,
    CONSTRAINT ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT ratings_code_quality_check CHECK (((code_quality >= 1.0) AND (code_quality <= 5.0))),
    CONSTRAINT ratings_design_check CHECK (((design >= 1.0) AND (design <= 5.0))),
    CONSTRAINT ratings_documentation_check CHECK (((documentation >= 1.0) AND (documentation <= 5.0))),
    CONSTRAINT ratings_performance_check CHECK (((performance >= 1.0) AND (performance <= 5.0))),
    CONSTRAINT ratings_score_check CHECK (((score >= 1.0) AND (score <= 5.0)))
);

CREATE TABLE IF NOT EXISTS public.likes (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    portfolio_id text NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT likes_pkey PRIMARY KEY (id),
    CONSTRAINT uq_likes_user_portfolio UNIQUE (portfolio_id, user_id),
    CONSTRAINT likes_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE,
    CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.comments (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    portfolio_id text NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    status text DEFAULT 'approved'::text NOT NULL,
    is_reported boolean DEFAULT false NOT NULL,
    report_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    critique_tag text,
    CONSTRAINT comments_pkey PRIMARY KEY (id),
    CONSTRAINT comments_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE,
    CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT comments_content_check CHECK (((char_length(TRIM(BOTH FROM content)) >= 10) AND (char_length(TRIM(BOTH FROM content)) <= 1500))),
    CONSTRAINT comments_critique_tag_check CHECK (((critique_tag IS NULL) OR (critique_tag = ANY (ARRAY['ui_suggestion'::text, 'bug_spotted'::text, 'performance_tip'::text, 'love_detail'::text])))),
    CONSTRAINT comments_report_count_check CHECK ((report_count >= 0)),
    CONSTRAINT comments_status_check CHECK ((status = ANY (ARRAY['approved'::text, 'flagged'::text, 'hidden'::text])))
);

CREATE TABLE IF NOT EXISTS public.comment_reports (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    comment_id uuid NOT NULL,
    reporter_id uuid NOT NULL,
    reason public.report_reason NOT NULL,
    details text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT comment_reports_pkey PRIMARY KEY (id),
    CONSTRAINT uq_comment_report_user UNIQUE (comment_id, reporter_id),
    CONSTRAINT comment_reports_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE,
    CONSTRAINT comment_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT comment_reports_details_check CHECK ((char_length(details) <= 500)),
    CONSTRAINT comment_reports_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'dismissed'::text])))
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    recipient_id uuid NOT NULL,
    actor_id uuid NOT NULL,
    portfolio_id text NOT NULL,
    portfolio_title text NOT NULL,
    type text NOT NULL,
    message text NOT NULL,
    rating_score numeric(3,2),
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_pkey PRIMARY KEY (id),
    CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT notifications_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE,
    CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['like'::text, 'rating'::text, 'comment'::text, 'showcase'::text])))
);

CREATE TABLE IF NOT EXISTS public.showcases (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    portfolio_id text NOT NULL,
    showcase_type text NOT NULL,
    scores jsonb NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT showcases_pkey PRIMARY KEY (id),
    CONSTRAINT showcases_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE,
    CONSTRAINT showcases_showcase_type_check CHECK ((showcase_type = ANY (ARRAY['daily'::text, 'weekly'::text])))
);

-- ---- Legacy / unresolved tables (kept per Phase 0A/0B — do not drop merely
--      because currently empty; see docs/database.md) ----

-- auth_challenges: FK to auth.users(id) dropped (Supabase-only, not portable).
-- Table + all other columns/constraints kept unchanged; app code does not
-- query this table today (in-memory OTP flow is used instead — audit §2).
CREATE TABLE IF NOT EXISTS public.auth_challenges (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id uuid,
    email text NOT NULL,
    otp_hash text NOT NULL,
    auth_provider text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 5 NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT auth_challenges_pkey PRIMARY KEY (id),
    CONSTRAINT auth_challenges_auth_provider_check CHECK ((auth_provider = ANY (ARRAY['google'::text, 'email_password'::text])))
);

CREATE TABLE IF NOT EXISTS public.rate_limits (
    key text NOT NULL,
    points integer DEFAULT 1 NOT NULL,
    expire_at timestamp with time zone NOT NULL,
    CONSTRAINT rate_limits_pkey PRIMARY KEY (key)
);

-- ==========================================================
-- 4. Indexes
-- ==========================================================

CREATE INDEX IF NOT EXISTS idx_account_provider ON public.account USING btree ("providerId", "accountId");
CREATE INDEX IF NOT EXISTS idx_account_user_provider ON public.account USING btree ("userId", "providerId");
CREATE INDEX IF NOT EXISTS idx_account_userid ON public.account USING btree ("userId");

CREATE INDEX IF NOT EXISTS idx_auth_challenges_email ON public.auth_challenges USING btree (email, expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_user ON public.auth_challenges USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_comment_reports_comment ON public.comment_reports USING btree (comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON public.comment_reports USING btree (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_critique_tag ON public.comments USING btree (critique_tag);
CREATE INDEX IF NOT EXISTS idx_comments_portfolio_approved ON public.comments USING btree (portfolio_id, created_at) WHERE (status = 'approved'::text);
CREATE INDEX IF NOT EXISTS idx_comments_portfolio_created ON public.comments USING btree (portfolio_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_reported ON public.comments USING btree (created_at DESC) WHERE (is_reported = true);
CREATE INDEX IF NOT EXISTS idx_comments_reported_pending ON public.comments USING btree (report_count DESC, created_at DESC) WHERE (is_reported = true);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments USING btree (user_id);


CREATE INDEX IF NOT EXISTS idx_likes_portfolio_id ON public.likes USING btree (portfolio_id);
CREATE INDEX IF NOT EXISTS idx_likes_portfolio_user ON public.likes USING btree (portfolio_id, user_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON public.likes USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON public.notifications USING btree (recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread_recipient ON public.notifications USING btree (recipient_id, created_at DESC) WHERE (is_read = false);

CREATE INDEX IF NOT EXISTS idx_portfolios_all_published_likes ON public.portfolios USING btree (likes_count DESC, created_at DESC) WHERE (status = 'published'::public.content_status);
CREATE INDEX IF NOT EXISTS idx_portfolios_all_published_rating ON public.portfolios USING btree (rating DESC, created_at DESC) WHERE (status = 'published'::public.content_status);
CREATE INDEX IF NOT EXISTS idx_portfolios_all_published_recent ON public.portfolios USING btree (created_at DESC) WHERE (status = 'published'::public.content_status);
CREATE INDEX IF NOT EXISTS idx_portfolios_author_created ON public.portfolios USING btree (author_id, created_at DESC) INCLUDE (id, title, rating, likes_count, comments_count);
CREATE INDEX IF NOT EXISTS idx_portfolios_author_id ON public.portfolios USING btree (author_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_category_created ON public.portfolios USING btree (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolios_category_likes ON public.portfolios USING btree (category, likes_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolios_category_rating ON public.portfolios USING btree (category, rating DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolios_github_verification_status ON public.portfolios USING btree (github_verification_status) WHERE (github_verification_status IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_portfolios_published_feed ON public.portfolios USING btree (category, rating DESC, created_at DESC) WHERE (status = 'published'::public.content_status);
CREATE INDEX IF NOT EXISTS idx_portfolios_published_likes ON public.portfolios USING btree (category, likes_count DESC, created_at DESC) WHERE (status = 'published'::public.content_status);
CREATE INDEX IF NOT EXISTS idx_portfolios_published_recent ON public.portfolios USING btree (category, created_at DESC) WHERE (status = 'published'::public.content_status);
CREATE INDEX IF NOT EXISTS idx_portfolios_request_critique ON public.portfolios USING btree (request_critique) WHERE (request_critique = true);
CREATE INDEX IF NOT EXISTS idx_portfolios_search ON public.portfolios USING gin (to_tsvector('english'::regconfig, ((title || ' '::text) || tagline)));
CREATE INDEX IF NOT EXISTS idx_portfolios_showcases_active ON public.portfolios USING btree (showcase_type, created_at DESC) WHERE ((is_showcase = true) AND (status = 'published'::public.content_status));
CREATE INDEX IF NOT EXISTS idx_portfolios_status ON public.portfolios USING btree (status);

CREATE INDEX IF NOT EXISTS idx_profiles_available_for_hire ON public.profiles USING btree (available_for_hire);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at_id ON public.profiles USING btree (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_lower_full_name ON public.profiles USING btree (lower(full_name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_lower_username ON public.profiles USING btree (lower(username));
CREATE INDEX IF NOT EXISTS idx_profiles_onboarded ON public.profiles USING btree (onboarded);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles USING btree (role);
CREATE INDEX IF NOT EXISTS idx_profiles_role_hire ON public.profiles USING btree (role, available_for_hire) WHERE (available_for_hire = true);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles USING btree (username);

CREATE INDEX IF NOT EXISTS idx_rate_limits_active ON public.rate_limits USING btree (expire_at);

CREATE INDEX IF NOT EXISTS idx_ratings_portfolio_aggregate ON public.ratings USING btree (portfolio_id) INCLUDE (score, design, code_quality, performance, documentation);
CREATE INDEX IF NOT EXISTS idx_ratings_portfolio_user ON public.ratings USING btree (portfolio_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON public.ratings USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_session_token ON public.session USING btree (token);
CREATE INDEX IF NOT EXISTS idx_session_token_expires ON public.session USING btree (token, "expiresAt");
CREATE INDEX IF NOT EXISTS idx_session_userid ON public.session USING btree ("userId");

CREATE INDEX IF NOT EXISTS idx_showcases_portfolio ON public.showcases USING btree (portfolio_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_email ON public."user" USING btree (email);
CREATE INDEX IF NOT EXISTS idx_user_lower_email ON public."user" USING btree (lower(email));
CREATE INDEX IF NOT EXISTS idx_user_role ON public."user" USING btree (role);

CREATE INDEX IF NOT EXISTS idx_verification_identifier ON public.verification USING btree (identifier);

-- ==========================================================
-- 5. Triggers
-- ==========================================================
-- tr_prevent_role_escalation is intentionally NOT created here — see the
-- header comment and docs/database.md.

DROP TRIGGER IF EXISTS tr_account_updated_at ON public.account;
CREATE TRIGGER tr_account_updated_at BEFORE UPDATE ON public.account FOR EACH ROW EXECUTE FUNCTION public.set_better_auth_updated_at();

DROP TRIGGER IF EXISTS tr_on_better_auth_user_sync ON public."user";
CREATE TRIGGER tr_on_better_auth_user_sync AFTER INSERT OR UPDATE OF name, image, role ON public."user" FOR EACH ROW EXECUTE FUNCTION public.handle_better_auth_user_sync();

DROP TRIGGER IF EXISTS tr_portfolios_updated_at ON public.portfolios;
CREATE TRIGGER tr_portfolios_updated_at BEFORE UPDATE ON public.portfolios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_prevent_self_rating ON public.ratings;
CREATE TRIGGER tr_prevent_self_rating BEFORE INSERT OR UPDATE ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.prevent_self_rating();

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_session_updated_at ON public.session;
CREATE TRIGGER tr_session_updated_at BEFORE UPDATE ON public.session FOR EACH ROW EXECUTE FUNCTION public.set_better_auth_updated_at();

DROP TRIGGER IF EXISTS tr_sync_comment_reports ON public.comment_reports;
CREATE TRIGGER tr_sync_comment_reports AFTER INSERT ON public.comment_reports FOR EACH ROW EXECUTE FUNCTION public.sync_comment_reports();

DROP TRIGGER IF EXISTS tr_sync_comments_count ON public.comments;
CREATE TRIGGER tr_sync_comments_count AFTER INSERT OR DELETE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.sync_comments_count();

DROP TRIGGER IF EXISTS tr_sync_likes_count ON public.likes;
CREATE TRIGGER tr_sync_likes_count AFTER INSERT OR DELETE ON public.likes FOR EACH ROW EXECUTE FUNCTION public.sync_likes_count();

DROP TRIGGER IF EXISTS tr_sync_ratings ON public.ratings;
CREATE TRIGGER tr_sync_ratings AFTER INSERT OR DELETE OR UPDATE ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.sync_ratings();

DROP TRIGGER IF EXISTS tr_user_updated_at ON public."user";
CREATE TRIGGER tr_user_updated_at BEFORE UPDATE ON public."user" FOR EACH ROW EXECUTE FUNCTION public.set_better_auth_updated_at();

DROP TRIGGER IF EXISTS tr_verification_updated_at ON public.verification;
CREATE TRIGGER tr_verification_updated_at BEFORE UPDATE ON public.verification FOR EACH ROW EXECUTE FUNCTION public.set_better_auth_updated_at();


-- No RLS is enabled on Neon: enforcement lives entirely in the triggers
-- above and in the application's API-layer checks (see audit §2). RLS
-- policies referencing auth.uid()/auth.role() are Supabase-only and were
-- never real enforcement against this app's own connection anyway.
