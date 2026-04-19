-- Migration: 013_investment_strategies_sip_fields
-- Adds recommended_sip and required_sip_for_goal to investment_strategies.

ALTER TABLE public.investment_strategies
  ADD COLUMN IF NOT EXISTS recommended_sip      NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS required_sip_for_goal NUMERIC(12, 2);
