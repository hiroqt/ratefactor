-- RateFactor Better Auth PostgreSQL Database Migration & RLS Policies
-- Target: Supabase PostgreSQL
-- Models: user, session, account, verification
-- Supports: GitHub OAuth, Email/Password, RateFactor RBAC roles ('developer', 'moderator', 'admin'), and @better-auth/infra security telemetry

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================================
-- 0. ROLE & ENUM COMPATIBILITY
-- ==========================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('developer', 'moderator', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==========================================================
-- 1. BETTER AUTH: USER TABLE
-- Role constraint enforces RateFactor ARD/PRD specifications: developer, moderator, admin
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

-- ==========================================================
-- 2. BETTER AUTH: SESSION TABLE
-- ==========================================================
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

-- ==========================================================
-- 3. BETTER AUTH: ACCOUNT TABLE (GitHub OAuth & Email Credentials)
-- ==========================================================
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

-- ==========================================================
-- 4. BETTER AUTH: VERIFICATION TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public."verification" (
  "id" TEXT PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verification_identifier ON public."verification"("identifier");

-- ==========================================================
-- 5. AUTOMATED TIMESTAMP UPDATERS
-- ==========================================================
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

-- ==========================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."verification" ENABLE ROW LEVEL SECURITY;

-- User Policies:
-- Public can read basic user profile info (name, image, role)
DROP POLICY IF EXISTS "Public read users" ON public."user";
CREATE POLICY "Public read users" ON public."user"
  FOR SELECT USING (true);

-- Allow registration / new user creation
DROP POLICY IF EXISTS "Users insert own record" ON public."user";
CREATE POLICY "Users insert own record" ON public."user"
  FOR INSERT WITH CHECK (true);

-- Users can update their own user row
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
-- Allow session creation on authentication
DROP POLICY IF EXISTS "Insert session" ON public."session";
CREATE POLICY "Insert session" ON public."session"
  FOR INSERT WITH CHECK (true);

-- Users can view and manage their own sessions
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
-- Allow account creation (OAuth linking & email credentials)
DROP POLICY IF EXISTS "Insert account" ON public."account";
CREATE POLICY "Insert account" ON public."account"
  FOR INSERT WITH CHECK (true);

-- Users can read their own accounts
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

-- Verification Policies:
-- Controlled by Better Auth service role/backend
DROP POLICY IF EXISTS "System manage verifications" ON public."verification";
CREATE POLICY "System manage verifications" ON public."verification"
  FOR ALL USING (true) WITH CHECK (true);

-- ==========================================================
-- 7. PROFILES INTEROPERABILITY SYNC TRIGGER
-- Automatically provisions or synchronizes public.profiles on user creation
-- ==========================================================
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

  -- Sync into public.profiles if the table exists
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
