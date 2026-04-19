-- Migration: 012_user_profiles_payout_date
-- Adds payout_date (target date to reach the investment goal) to user_profiles
-- and investment_strategies so the AI context and projections can use it.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS payout_date DATE;

ALTER TABLE public.investment_strategies
  ADD COLUMN IF NOT EXISTS payout_date DATE;
