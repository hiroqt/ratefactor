-- RateFactor Enterprise PostgreSQL Database Schema & Row Level Security (RLS)
-- Conforms to ARD_PRD_Ratefactor.md Sections 10, 11, 12 and Free-Tier Optimization Directives

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================================
-- 0. ENUMS & CORE TYPES
-- ==========================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('developer', 'moderator', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.portfolio_category AS ENUM (
    'Systems', 
    'Frontend', 
    'Fullstack', 
    'Design Engineer', 
    'Mobile', 
    'AI / ML'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.content_status AS ENUM ('published', 'draft', 'flagged', 'hidden');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.report_reason AS ENUM (
    'spam', 
    'offensive', 
    'off_topic', 
    'harassment', 
    'low_quality'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==========================================================
-- 1. PROFILES TABLE (Normalized User Storage & RBAC)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
  full_name TEXT NOT NULL CHECK (char_length(full_name) >= 1 AND char_length(full_name) <= 80),
  avatar_url TEXT NOT NULL DEFAULT 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
  role public.app_role NOT NULL DEFAULT 'developer',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  bio TEXT CHECK (char_length(bio) <= 500),
  status JSONB NOT NULL DEFAULT '{"emoji":"⚡","message":"Building and shipping","statusType":"available"}'::jsonb,
  skills TEXT[] NOT NULL DEFAULT '{}',
  pinned_portfolio_ids TEXT[] NOT NULL DEFAULT '{}',
  spotlight_portfolio_id TEXT,
  company TEXT CHECK (char_length(company) <= 80),
  location TEXT CHECK (char_length(location) <= 80),
  website TEXT,
  github TEXT,
  twitter TEXT,
  linkedin TEXT,
  readme_markdown TEXT CHECK (char_length(readme_markdown) <= 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ==========================================================
-- 2. PORTFOLIOS TABLE (Free-tier Quota Enforced: 1 Image <= 2MB, Description >= 200 Words)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.portfolios (
  id TEXT PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 120),
  tagline TEXT NOT NULL CHECK (char_length(tagline) >= 10 AND char_length(tagline) <= 240),
  -- Description word count enforcement: at least 200 words, capped at 2,500 words to preserve 500MB DB
  description TEXT NOT NULL CHECK (
    array_length(regexp_split_to_array(trim(description), '\s+'), 1) >= 200 
    AND array_length(regexp_split_to_array(trim(description), '\s+'), 1) <= 2500
  ),
  portfolio_url TEXT NOT NULL,
  github_url TEXT NOT NULL,
  demo_url TEXT,
  -- Single image upload: strictly limited to 2 MB (2,097,152 bytes)
  thumbnail_url TEXT NOT NULL,
  image_size_bytes INTEGER NOT NULL CHECK (image_size_bytes > 0 AND image_size_bytes <= 2097152),
  category public.portfolio_category NOT NULL,
  tech_stack TEXT[] NOT NULL DEFAULT '{}',
  rating NUMERIC(3, 2) NOT NULL DEFAULT 5.00 CHECK (rating >= 1.0 AND rating <= 5.0),
  rating_count INTEGER NOT NULL DEFAULT 1 CHECK (rating_count >= 0),
  rating_design NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
  rating_code_quality NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
  rating_performance NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
  rating_documentation NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
  likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
  comments_count INTEGER NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
  is_showcase BOOLEAN NOT NULL DEFAULT FALSE,
  showcase_type TEXT CHECK (showcase_type IN ('daily', 'weekly')),
  showcase_reason TEXT,
  status public.content_status NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- High-performance Discovery & Feed Composite Indexes
CREATE INDEX IF NOT EXISTS idx_portfolios_category_rating ON public.portfolios(category, rating DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolios_category_likes ON public.portfolios(category, likes_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolios_category_created ON public.portfolios(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolios_author_id ON public.portfolios(author_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_status ON public.portfolios(status);

-- Partial Indexes for Showcase efficiency
CREATE INDEX IF NOT EXISTS idx_portfolios_showcases_active 
  ON public.portfolios(showcase_type, created_at DESC) 
  WHERE is_showcase = TRUE AND status = 'published';

-- Compact GIN Index for fast Title/Tagline Search without bloated description storage
CREATE INDEX IF NOT EXISTS idx_portfolios_search 
  ON public.portfolios USING GIN (to_tsvector('english', title || ' ' || tagline));

-- ==========================================================
-- 3. RATINGS TABLE (1 per user per portfolio, Multi-criteria)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id TEXT NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score NUMERIC(3, 2) NOT NULL CHECK (score >= 1.0 AND score <= 5.0),
  design NUMERIC(3, 2) NOT NULL CHECK (design >= 1.0 AND design <= 5.0),
  code_quality NUMERIC(3, 2) NOT NULL CHECK (code_quality >= 1.0 AND code_quality <= 5.0),
  performance NUMERIC(3, 2) NOT NULL CHECK (performance >= 1.0 AND performance <= 5.0),
  documentation NUMERIC(3, 2) NOT NULL CHECK (documentation >= 1.0 AND documentation <= 5.0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_ratings_user_portfolio UNIQUE (portfolio_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_portfolio_user ON public.ratings(portfolio_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON public.ratings(user_id);

-- ==========================================================
-- 4. LIKES TABLE (Anti-abuse Unique Constraint)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id TEXT NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_likes_user_portfolio UNIQUE (portfolio_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_portfolio_user ON public.likes(portfolio_id, user_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON public.likes(user_id);

-- ==========================================================
-- 5. COMMENTS TABLE (Content Guardrails: Min 10 chars, Moderation Status)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id TEXT NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(trim(content)) >= 10 AND char_length(trim(content)) <= 1500),
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'flagged', 'hidden')),
  is_reported BOOLEAN NOT NULL DEFAULT FALSE,
  report_count INTEGER NOT NULL DEFAULT 0 CHECK (report_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_portfolio_created ON public.comments(portfolio_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_reported ON public.comments(created_at DESC) WHERE is_reported = TRUE;

-- ==========================================================
-- 6. COMMENT REPORTS TABLE (Community Moderation Flow)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.comment_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason public.report_reason NOT NULL,
  details TEXT CHECK (char_length(details) <= 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_comment_report_user UNIQUE (comment_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON public.comment_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_reports_comment ON public.comment_reports(comment_id);

-- ==========================================================
-- 7. NOTIFICATIONS TABLE (Realtime Dashboard Stream)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  portfolio_id TEXT NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  portfolio_title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'rating', 'comment', 'showcase')),
  message TEXT NOT NULL,
  rating_score NUMERIC(3, 2),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread 
  ON public.notifications(recipient_id, is_read, created_at DESC);

-- ==========================================================
-- 8. SHOWCASE HISTORY TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.showcases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id TEXT NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  showcase_type TEXT NOT NULL CHECK (showcase_type IN ('daily', 'weekly')),
  scores JSONB NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_showcases_portfolio ON public.showcases(portfolio_id, created_at DESC);

-- ==========================================================
-- 9. SLIDING-WINDOW RATE LIMITS TABLE (Zero-Redis Abuse Prevention)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  points INTEGER NOT NULL DEFAULT 1,
  expire_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_active ON public.rate_limits(expire_at);

-- ==========================================================
-- 10. AUTH CHALLENGES TABLE (Google OAuth + Password 2FA OTP)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.auth_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  auth_provider TEXT NOT NULL CHECK (auth_provider IN ('google', 'email_password')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_challenges_email ON public.auth_challenges(email, expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_user ON public.auth_challenges(user_id);

-- ==========================================================
-- 11. AUTOMATED FUNCTIONS & TRIGGERS
-- ==========================================================

-- Function: update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_portfolios_updated_at ON public.portfolios;
CREATE TRIGGER tr_portfolios_updated_at BEFORE UPDATE ON public.portfolios
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Function: Auto-provision profile upon new auth user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_username TEXT;
  extracted_full_name TEXT;
  extracted_avatar TEXT;
BEGIN
  extracted_username := COALESCE(
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  extracted_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    extracted_username
  );
  extracted_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'
  );

  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    avatar_url,
    role
  ) VALUES (
    NEW.id,
    LOWER(REGEXP_REPLACE(extracted_username, '[^a-zA-Z0-9_]', '', 'g')),
    extracted_full_name,
    extracted_avatar,
    'developer'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Atomic synchronization of likes count
CREATE OR REPLACE FUNCTION public.sync_likes_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_likes_count ON public.likes;
CREATE TRIGGER tr_sync_likes_count
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_likes_count();

-- Trigger: Atomic synchronization of comments count
CREATE OR REPLACE FUNCTION public.sync_comments_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_comments_count ON public.comments;
CREATE TRIGGER tr_sync_comments_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_comments_count();

-- Trigger: Atomic recalculation of ratings and sub-criteria averages
CREATE OR REPLACE FUNCTION public.sync_ratings()
RETURNS TRIGGER AS $$
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
    avg_score,
    avg_design,
    avg_code,
    avg_perf,
    avg_doc,
    cnt
  FROM public.ratings
  WHERE portfolio_id = target_portfolio_id;

  UPDATE public.portfolios
  SET
    rating = COALESCE(avg_score, 5.00),
    rating_design = COALESCE(avg_design, 5.00),
    rating_code_quality = COALESCE(avg_code, 5.00),
    rating_performance = COALESCE(avg_perf, 5.00),
    rating_documentation = COALESCE(avg_doc, 5.00),
    rating_count = COALESCE(cnt, 0)
  WHERE id = target_portfolio_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_ratings ON public.ratings;
CREATE TRIGGER tr_sync_ratings
  AFTER INSERT OR UPDATE OR DELETE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.sync_ratings();

-- Trigger: Auto-flag comments when report count reaches threshold (3)
CREATE OR REPLACE FUNCTION public.sync_comment_reports()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.comments
  SET 
    report_count = report_count + 1,
    is_reported = TRUE,
    status = CASE WHEN report_count + 1 >= 3 THEN 'flagged' ELSE status END
  WHERE id = NEW.comment_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_comment_reports ON public.comment_reports;
CREATE TRIGGER tr_sync_comment_reports
  AFTER INSERT ON public.comment_reports
  FOR EACH ROW EXECUTE FUNCTION public.sync_comment_reports();

-- Trigger: Prevent unauthorized role escalation on profiles
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
  requester_role public.app_role;
BEGIN
  IF NEW.role <> OLD.role THEN
    SELECT role INTO requester_role FROM public.profiles WHERE id = auth.uid();
    IF requester_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Access denied: Only platform administrators can change user roles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_role_escalation ON public.profiles;
CREATE TRIGGER tr_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- ==========================================================
-- 12. RBAC HELPER FUNCTIONS
-- ==========================================================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.app_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()), FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT role IN ('moderator', 'admin') FROM public.profiles WHERE id = auth.uid()), FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ==========================================================
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_challenges ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public read profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Portfolios Policies
CREATE POLICY "Public read published portfolios" ON public.portfolios
  FOR SELECT USING (status = 'published' OR auth.uid() = author_id OR public.is_moderator());

CREATE POLICY "Authenticated create portfolios" ON public.portfolios
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Owners or Admins update portfolios" ON public.portfolios
  FOR UPDATE USING (auth.uid() = author_id OR public.is_moderator());

CREATE POLICY "Owners or Admins delete portfolios" ON public.portfolios
  FOR DELETE USING (auth.uid() = author_id OR public.is_admin());

-- Ratings Policies
CREATE POLICY "Public read ratings" ON public.ratings
  FOR SELECT USING (true);

CREATE POLICY "Authenticated create ratings" ON public.ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own ratings" ON public.ratings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own ratings" ON public.ratings
  FOR DELETE USING (auth.uid() = user_id);

-- Likes Policies (Zero abuse: authenticated toggle only)
CREATE POLICY "Public read likes" ON public.likes
  FOR SELECT USING (true);

CREATE POLICY "Users manage own likes" ON public.likes
  FOR ALL USING (auth.uid() = user_id);

-- Comments Policies
CREATE POLICY "Public read approved comments" ON public.comments
  FOR SELECT USING (status = 'approved' OR auth.uid() = user_id OR public.is_moderator());

CREATE POLICY "Authenticated insert comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users or Moderators delete comments" ON public.comments
  FOR DELETE USING (auth.uid() = user_id OR public.is_moderator());

CREATE POLICY "Moderators update comments status" ON public.comments
  FOR UPDATE USING (public.is_moderator());

-- Comment Reports Policies
CREATE POLICY "Moderators read comment reports" ON public.comment_reports
  FOR SELECT USING (public.is_moderator());

CREATE POLICY "Authenticated insert reports" ON public.comment_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Moderators update report status" ON public.comment_reports
  FOR UPDATE USING (public.is_moderator());

-- Notifications Policies
CREATE POLICY "Recipient read notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Recipient update notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

-- Showcases Policies
CREATE POLICY "Public read showcases" ON public.showcases
  FOR SELECT USING (true);

CREATE POLICY "Admins manage showcases" ON public.showcases
  FOR ALL USING (public.is_admin());

-- Rate Limits Policies (Managed by service role or system)
CREATE POLICY "System manage rate limits" ON public.rate_limits
  FOR ALL USING (true);

-- Auth Challenges Policies (Users verify own challenges)
CREATE POLICY "Challenge access by email or user" ON public.auth_challenges
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- ==========================================================
-- 14. SUPABASE STORAGE BUCKET CONFIGURATION & POLICIES
-- Target: 'portfolio-images' (Max 2MB per file, 1 image upload standard)
-- ==========================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio-images',
  'portfolio-images',
  true,
  2097152, -- 2 MB strict limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage RLS
CREATE POLICY "Public view portfolio images" ON storage.objects
  FOR SELECT USING (bucket_id = 'portfolio-images');

CREATE POLICY "Authenticated upload portfolio images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'portfolio-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users delete own portfolio images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'portfolio-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ==========================================================
-- 15. BETTER AUTH & @BETTER-AUTH/INFRA TABLES & RLS
-- Target: user, session, account, verification
-- Supports: GitHub OAuth, Email/Password, RBAC roles ('developer', 'moderator', 'admin')
-- ==========================================================
CREATE TABLE IF NOT EXISTS public."user" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  "image" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "role" TEXT NOT NULL DEFAULT 'developer' CHECK ("role" IN ('developer', 'moderator', 'admin')),
  "banned" BOOLEAN DEFAULT FALSE,
  "banReason" TEXT,
  "banExpires" TIMESTAMPTZ,
  "lastActiveAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_email ON public."user"("email");
CREATE INDEX IF NOT EXISTS idx_user_role ON public."user"("role");

CREATE TABLE IF NOT EXISTS public."session" (
  "id" TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES public."user"("id") ON DELETE CASCADE,
  "impersonatedBy" TEXT
);

CREATE INDEX IF NOT EXISTS idx_session_userId ON public."session"("userId");
CREATE INDEX IF NOT EXISTS idx_session_token ON public."session"("token");

CREATE TABLE IF NOT EXISTS public."account" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES public."user"("id") ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  "scope" TEXT,
  "password" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_account_userId ON public."account"("userId");
CREATE INDEX IF NOT EXISTS idx_account_provider ON public."account"("providerId", "accountId");

CREATE TABLE IF NOT EXISTS public."verification" (
  "id" TEXT PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verification_identifier ON public."verification"("identifier");

-- Automated timestamp updaters
CREATE OR REPLACE FUNCTION public.set_better_auth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_user_updated_at ON public."user";
CREATE TRIGGER tr_user_updated_at BEFORE UPDATE ON public."user"
FOR EACH ROW EXECUTE FUNCTION public.set_better_auth_updated_at();

DROP TRIGGER IF EXISTS tr_session_updated_at ON public."session";
CREATE TRIGGER tr_session_updated_at BEFORE UPDATE ON public."session"
FOR EACH ROW EXECUTE FUNCTION public.set_better_auth_updated_at();

DROP TRIGGER IF EXISTS tr_account_updated_at ON public."account";
CREATE TRIGGER tr_account_updated_at BEFORE UPDATE ON public."account"
FOR EACH ROW EXECUTE FUNCTION public.set_better_auth_updated_at();

DROP TRIGGER IF EXISTS tr_verification_updated_at ON public."verification";
CREATE TRIGGER tr_verification_updated_at BEFORE UPDATE ON public."verification"
FOR EACH ROW EXECUTE FUNCTION public.set_better_auth_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."verification" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read users" ON public."user";
CREATE POLICY "Public read users" ON public."user"
  FOR SELECT USING (true);

-- Allow registration / new user creation
DROP POLICY IF EXISTS "Users insert own record" ON public."user";
CREATE POLICY "Users insert own record" ON public."user"
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users update own record" ON public."user";
CREATE POLICY "Users update own record" ON public."user"
  FOR UPDATE USING (
    (auth.uid())::text = id 
    OR current_setting('request.jwt.claim.sub', true) = id
  )
  WITH CHECK (
    (auth.uid())::text = id 
    OR current_setting('request.jwt.claim.sub', true) = id
  );

-- Users can delete their own user row
DROP POLICY IF EXISTS "Users delete own record" ON public."user";
CREATE POLICY "Users delete own record" ON public."user"
  FOR DELETE USING (
    (auth.uid())::text = id 
    OR current_setting('request.jwt.claim.sub', true) = id
  );

-- Session Policies:
DROP POLICY IF EXISTS "Insert session" ON public."session";
CREATE POLICY "Insert session" ON public."session"
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users read own sessions" ON public."session";
CREATE POLICY "Users read own sessions" ON public."session"
  FOR SELECT USING (
    (auth.uid())::text = "userId" 
    OR current_setting('request.jwt.claim.sub', true) = "userId"
  );

DROP POLICY IF EXISTS "Users update own sessions" ON public."session";
CREATE POLICY "Users update own sessions" ON public."session"
  FOR UPDATE USING (
    (auth.uid())::text = "userId" 
    OR current_setting('request.jwt.claim.sub', true) = "userId"
  );

DROP POLICY IF EXISTS "Users delete own sessions" ON public."session";
CREATE POLICY "Users delete own sessions" ON public."session"
  FOR DELETE USING (
    (auth.uid())::text = "userId" 
    OR current_setting('request.jwt.claim.sub', true) = "userId"
  );

-- Account Policies:
DROP POLICY IF EXISTS "Insert account" ON public."account";
CREATE POLICY "Insert account" ON public."account"
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users read own accounts" ON public."account";
CREATE POLICY "Users read own accounts" ON public."account"
  FOR SELECT USING (
    (auth.uid())::text = "userId" 
    OR current_setting('request.jwt.claim.sub', true) = "userId"
  );

DROP POLICY IF EXISTS "Users update own accounts" ON public."account";
CREATE POLICY "Users update own accounts" ON public."account"
  FOR UPDATE USING (
    (auth.uid())::text = "userId" 
    OR current_setting('request.jwt.claim.sub', true) = "userId"
  );

DROP POLICY IF EXISTS "Users delete own accounts" ON public."account";
CREATE POLICY "Users delete own accounts" ON public."account"
  FOR DELETE USING (
    (auth.uid())::text = "userId" 
    OR current_setting('request.jwt.claim.sub', true) = "userId"
  );

DROP POLICY IF EXISTS "System manage verifications" ON public."verification";
CREATE POLICY "System manage verifications" ON public."verification"
  FOR ALL USING (true) WITH CHECK (true);

-- Auto-sync Better Auth users to public.profiles
-- Safely decouple profiles.id FK from auth.users(id) if migrating from Supabase Auth
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_better_auth_user_sync()
RETURNS TRIGGER AS $$
DECLARE
  extracted_username TEXT;
  target_profile_id UUID;
  safe_full_name TEXT;
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

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    INSERT INTO public.profiles (
      id,
      username,
      full_name,
      avatar_url,
      role
    ) VALUES (
      target_profile_id,
      extracted_username,
      safe_full_name,
      COALESCE(NEW.image, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'),
      COALESCE(NEW.role::public.app_role, 'developer'::public.app_role)
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url,
      role = EXCLUDED.role;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_better_auth_user_created ON public."user";
DROP TRIGGER IF EXISTS tr_on_better_auth_user_sync ON public."user";
CREATE TRIGGER tr_on_better_auth_user_sync
  AFTER INSERT OR UPDATE OF name, image, role ON public."user"
  FOR EACH ROW EXECUTE FUNCTION public.handle_better_auth_user_sync();

-- ==========================================================
-- 16. GITHUB INTEGRATION TABLES & CACHE (Section 16)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.github_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  github_id BIGINT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  profile_url TEXT,
  public_repository_count INTEGER NOT NULL DEFAULT 0,
  followers INTEGER NOT NULL DEFAULT 0,
  following INTEGER NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_github_profiles_user UNIQUE (user_id),
  CONSTRAINT uq_github_profiles_github_id UNIQUE (github_id)
);

CREATE INDEX IF NOT EXISTS idx_github_profiles_user_id ON public.github_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_github_profiles_username ON public.github_profiles(username);

CREATE TABLE IF NOT EXISTS public.github_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  github_repo_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  description TEXT,
  html_url TEXT NOT NULL,
  homepage TEXT,
  language TEXT,
  topics TEXT[] NOT NULL DEFAULT '{}',
  stars INTEGER NOT NULL DEFAULT 0,
  forks INTEGER NOT NULL DEFAULT 0,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  pushed_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_github_repos_user_repo UNIQUE (user_id, github_repo_id)
);

CREATE INDEX IF NOT EXISTS idx_github_repos_user_id ON public.github_repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_github_repos_full_name ON public.github_repositories(full_name);

CREATE TABLE IF NOT EXISTS public.github_readmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  repository_id UUID REFERENCES public.github_repositories(id) ON DELETE CASCADE,
  repository_full_name TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  content_sha TEXT,
  source_url TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_github_readmes_user_repo UNIQUE (user_id, repository_full_name)
);

CREATE INDEX IF NOT EXISTS idx_github_readmes_user_id ON public.github_readmes(user_id);
CREATE INDEX IF NOT EXISTS idx_github_readmes_repo_full_name ON public.github_readmes(repository_full_name);

CREATE TABLE IF NOT EXISTS public.github_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  contribution_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_github_contributions_user_date UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_github_contributions_user_date ON public.github_contributions(user_id, date);

CREATE TABLE IF NOT EXISTS public.github_contribution_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_contributions INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_github_summaries_user_year UNIQUE (user_id, year)
);

CREATE INDEX IF NOT EXISTS idx_github_summaries_user_year ON public.github_contribution_summaries(user_id, year);

ALTER TABLE public.github_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_readmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_contribution_summaries ENABLE ROW LEVEL SECURITY;
