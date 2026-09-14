-- ==========================================================
-- RateFactor Database Schema Migration
-- Migration: 20260915000001_fix_existing_users_onboarding.sql
-- Ensure all existing users prior to this migration are flagged as onboarded=TRUE
-- ==========================================================

UPDATE public.profiles 
SET onboarded = TRUE 
WHERE onboarded = FALSE;

UPDATE public."user" 
SET "onboarded" = TRUE 
WHERE "onboarded" = FALSE;
