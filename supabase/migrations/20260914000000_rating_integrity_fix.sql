-- ==========================================================
-- RateFactor Database Schema Migration
-- Migration: 20260914000000_rating_integrity_fix.sql
-- Fix: Portfolios must start with zero genuine ratings/likes,
-- not a fabricated 5.0 / 1-review / 1-like baseline.
-- ==========================================================

-- 1. Portfolios Table: new rows must default to an unrated/unliked state.
-- rating_count === 0 is the authoritative "no genuine ratings yet" signal;
-- rating and the four breakdown aggregates default to 0.00 alongside it.
ALTER TABLE public.portfolios ALTER COLUMN rating SET DEFAULT 0.00;
ALTER TABLE public.portfolios ALTER COLUMN rating_count SET DEFAULT 0;
ALTER TABLE public.portfolios ALTER COLUMN rating_design SET DEFAULT 0.00;
ALTER TABLE public.portfolios ALTER COLUMN rating_code_quality SET DEFAULT 0.00;
ALTER TABLE public.portfolios ALTER COLUMN rating_performance SET DEFAULT 0.00;
ALTER TABLE public.portfolios ALTER COLUMN rating_documentation SET DEFAULT 0.00;

-- Relax the aggregate rating CHECK so an unrated portfolio (0) is valid.
-- Individual public.ratings rows are untouched and remain constrained to 1.0-5.0.
ALTER TABLE public.portfolios DROP CONSTRAINT IF EXISTS portfolios_rating_check;
ALTER TABLE public.portfolios ADD CONSTRAINT portfolios_rating_check CHECK (rating >= 0 AND rating <= 5.0);

-- 2. Aggregate trigger: no genuine ratings must resolve to 0, not a fabricated 5.0.
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
    rating = COALESCE(avg_score, 0.00),
    rating_design = COALESCE(avg_design, 0.00),
    rating_code_quality = COALESCE(avg_code, 0.00),
    rating_performance = COALESCE(avg_perf, 0.00),
    rating_documentation = COALESCE(avg_doc, 0.00),
    rating_count = COALESCE(cnt, 0)
  WHERE id = target_portfolio_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reconcile existing rows: public.ratings and public.likes are the source of truth.
-- Any portfolio previously seeded with the fabricated 5.0/1-review/1-like baseline
-- and no real rating/like rows is reset to a genuine unrated/unliked state.
UPDATE public.portfolios p
SET
  rating = COALESCE(r.avg_score, 0.00),
  rating_design = COALESCE(r.avg_design, 0.00),
  rating_code_quality = COALESCE(r.avg_code, 0.00),
  rating_performance = COALESCE(r.avg_perf, 0.00),
  rating_documentation = COALESCE(r.avg_doc, 0.00),
  rating_count = COALESCE(r.cnt, 0)
FROM (
  SELECT
    p2.id AS portfolio_id,
    ROUND(AVG(rt.score), 2) AS avg_score,
    ROUND(AVG(rt.design), 2) AS avg_design,
    ROUND(AVG(rt.code_quality), 2) AS avg_code,
    ROUND(AVG(rt.performance), 2) AS avg_perf,
    ROUND(AVG(rt.documentation), 2) AS avg_doc,
    COUNT(rt.id)::INTEGER AS cnt
  FROM public.portfolios p2
  LEFT JOIN public.ratings rt ON rt.portfolio_id = p2.id
  GROUP BY p2.id
) r
WHERE p.id = r.portfolio_id;

UPDATE public.portfolios p
SET likes_count = COALESCE(l.cnt, 0)
FROM (
  SELECT
    p2.id AS portfolio_id,
    COUNT(lk.id)::INTEGER AS cnt
  FROM public.portfolios p2
  LEFT JOIN public.likes lk ON lk.portfolio_id = p2.id
  GROUP BY p2.id
) l
WHERE p.id = l.portfolio_id;

-- 4. Database-level self-rating protection.
--
-- This app's server connects to Postgres via a single privileged `pg` pool
-- (see src/lib/auth/better-auth.ts) with no Supabase Auth JWT/session context,
-- so `auth.uid()` is never populated for these queries and the connecting
-- role is the one that owns/bypasses RLS on this schema. Tightening the
-- existing "auth.uid() = user_id" ratings policies would not add any real
-- protection against this app's actual write path (it already only works
-- today because RLS is effectively bypassed for this role), so a BEFORE
-- INSERT/UPDATE trigger is used instead: it fires unconditionally at the
-- table level regardless of the connecting role, giving a genuine database
-- invariant as a backstop to the API-level ownership check in
-- src/app/api/portfolios/[id]/rate/route.ts.
--
-- Individual public.ratings rows remain constrained to 1.0-5.0 (unchanged).
CREATE OR REPLACE FUNCTION public.prevent_self_rating()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_self_rating ON public.ratings;
CREATE TRIGGER tr_prevent_self_rating
  BEFORE INSERT OR UPDATE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_rating();
