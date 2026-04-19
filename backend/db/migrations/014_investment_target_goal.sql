-- Migration: 014_investment_target_goal
-- Adds target_goal (goal label/name) to user_profiles and investment_strategies.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS target_goal TEXT;

ALTER TABLE public.investment_strategies
  ADD COLUMN IF NOT EXISTS target_goal TEXT;
