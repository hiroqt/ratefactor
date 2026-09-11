-- RateFactor Database Schema & Row Level Security (RLS)
-- Conforms to ARD_PRD_Ratefactor.md Section 10 & 12

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Portfolios table
CREATE TABLE IF NOT EXISTS public.portfolios (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  portfolio_url TEXT NOT NULL,
  github_url TEXT NOT NULL,
  demo_url TEXT,
  thumbnail TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_username TEXT NOT NULL,
  author_avatar TEXT NOT NULL,
  author_role TEXT DEFAULT 'Developer',
  author_verified BOOLEAN DEFAULT FALSE,
  category TEXT NOT NULL CHECK (category IN ('Systems', 'Frontend', 'Fullstack', 'Design Engineer', 'Mobile', 'AI / ML')),
  tech_stack TEXT[] NOT NULL DEFAULT '{}',
  rating NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
  rating_count INTEGER NOT NULL DEFAULT 1,
  rating_design NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
  rating_code_quality NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
  rating_performance NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
  rating_documentation NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  is_showcase BOOLEAN NOT NULL DEFAULT FALSE,
  showcase_type TEXT CHECK (showcase_type IN ('daily', 'weekly')),
  showcase_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for discovery queries
CREATE INDEX IF NOT EXISTS idx_portfolios_category ON public.portfolios(category);
CREATE INDEX IF NOT EXISTS idx_portfolios_rating ON public.portfolios(rating DESC);
CREATE INDEX IF NOT EXISTS idx_portfolios_likes ON public.portfolios(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_portfolios_created_at ON public.portfolios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolios_showcase ON public.portfolios(is_showcase, showcase_type);

-- 2. Ratings table
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id TEXT NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score NUMERIC(3, 2) NOT NULL CHECK (score >= 1.0 AND score <= 5.0),
  design NUMERIC(3, 2) NOT NULL CHECK (design >= 1.0 AND design <= 5.0),
  code_quality NUMERIC(3, 2) NOT NULL CHECK (code_quality >= 1.0 AND code_quality <= 5.0),
  performance NUMERIC(3, 2) NOT NULL CHECK (performance >= 1.0 AND performance <= 5.0),
  documentation NUMERIC(3, 2) NOT NULL CHECK (documentation >= 1.0 AND documentation <= 5.0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_ratings_user_portfolio UNIQUE (portfolio_id, user_id)
);

-- 3. Likes table
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id TEXT NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_likes_user_portfolio UNIQUE (portfolio_id, user_id)
);

-- 4. Comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id TEXT NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_username TEXT NOT NULL,
  author_avatar TEXT NOT NULL,
  content TEXT NOT NULL,
  is_reported BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_portfolio ON public.comments(portfolio_id, created_at DESC);

-- 5. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_name TEXT NOT NULL,
  actor_avatar TEXT NOT NULL,
  portfolio_id TEXT NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  portfolio_title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'rating', 'comment', 'showcase')),
  message TEXT NOT NULL,
  rating_score NUMERIC(3, 2),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read, created_at DESC);

-- 6. Showcase history table
CREATE TABLE IF NOT EXISTS public.showcases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id TEXT NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  showcase_type TEXT NOT NULL CHECK (showcase_type IN ('daily', 'weekly')),
  scores JSONB NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Conforms to ARD Section 12 (Zero Unauthorized Mutation)
-- ==========================================================

-- Enable RLS on all tables
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcases ENABLE ROW LEVEL SECURITY;

-- Portfolios: Anyone can view; only owners can update/delete; authenticated can create
CREATE POLICY "Public read portfolios" ON public.portfolios
  FOR SELECT USING (true);

CREATE POLICY "Authenticated create portfolios" ON public.portfolios
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Owners update portfolios" ON public.portfolios
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Owners delete portfolios" ON public.portfolios
  FOR DELETE USING (auth.uid() = author_id);

-- Ratings: Anyone can view; authenticated can insert/update own rating
CREATE POLICY "Public read ratings" ON public.ratings
  FOR SELECT USING (true);

CREATE POLICY "Authenticated create ratings" ON public.ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own ratings" ON public.ratings
  FOR UPDATE USING (auth.uid() = user_id);

-- Likes: Anyone can view; authenticated can toggle own like
CREATE POLICY "Public read likes" ON public.likes
  FOR SELECT USING (true);

CREATE POLICY "Users manage own likes" ON public.likes
  FOR ALL USING (auth.uid() = user_id);

-- Comments: Anyone can view; authenticated can post; users can delete own comment
CREATE POLICY "Public read comments" ON public.comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated insert comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own comments" ON public.comments
  FOR DELETE USING (auth.uid() = user_id);

-- Notifications: Only recipient can view or update their notifications
CREATE POLICY "Recipient view notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Recipient update notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

-- Showcases: Public read
CREATE POLICY "Public read showcases" ON public.showcases
  FOR SELECT USING (true);
