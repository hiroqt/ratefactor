-- ==========================================================
-- RateFactor GitHub Integration Schema Migration
-- ==========================================================

-- 1. GitHub Profiles Cache Table
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

-- 2. GitHub Repositories Cache Table
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

-- 3. GitHub Readmes Cache Table
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

-- 4. GitHub Contributions Calendar Table
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

-- 5. GitHub Contribution Summaries Table
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

-- Enable RLS
ALTER TABLE public.github_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_readmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_contribution_summaries ENABLE ROW LEVEL SECURITY;

-- Public read policies (RateFactor developers' GitHub info is publicly visible on showcase)
DO $$ BEGIN
  CREATE POLICY "Public profiles can view github_profiles" ON public.github_profiles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Public profiles can view github_repositories" ON public.github_repositories 
    FOR SELECT USING (is_private = false OR user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Public profiles can view github_readmes" ON public.github_readmes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Public profiles can view github_contributions" ON public.github_contributions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Public profiles can view github_summaries" ON public.github_contribution_summaries FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Owner management policies
DO $$ BEGIN
  CREATE POLICY "Users can manage own github_profiles" ON public.github_profiles FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can manage own github_repositories" ON public.github_repositories FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can manage own github_readmes" ON public.github_readmes FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can manage own github_contributions" ON public.github_contributions FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can manage own github_summaries" ON public.github_contribution_summaries FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;
