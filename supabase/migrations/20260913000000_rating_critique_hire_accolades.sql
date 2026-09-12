-- ==========================================================
-- RateFactor Database Schema Migration
-- Migration: 20260913000000_rating_critique_hire_accolades.sql
-- Feature B: Multi-Dimensional Rating & Constructive Critique
-- Feature D: Developer Available for Hire Beacon & Showcase Accolades
-- ==========================================================

-- 1. Portfolios Table: Add Request Critique / Roast opt-in flag
ALTER TABLE public.portfolios 
ADD COLUMN IF NOT EXISTS request_critique BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_portfolios_request_critique 
ON public.portfolios(request_critique) 
WHERE request_critique = TRUE;

-- 2. Comments Table: Add Structured Critique Feedback Tag
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS critique_tag TEXT 
CHECK (critique_tag IS NULL OR critique_tag IN ('ui_suggestion', 'bug_spotted', 'performance_tip', 'love_detail'));

CREATE INDEX IF NOT EXISTS idx_comments_critique_tag 
ON public.comments(critique_tag);

-- 3. Profiles Table: Add Available for Hire Status Beacon & Custom Hire Message
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS available_for_hire BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS custom_hire_message TEXT 
CHECK (custom_hire_message IS NULL OR char_length(custom_hire_message) <= 500);

CREATE INDEX IF NOT EXISTS idx_profiles_available_for_hire 
ON public.profiles(available_for_hire);
