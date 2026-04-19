-- Migration: 011_user_profiles_investment_fields
-- Adds investment goal, current portfolio, and SIP date to user_profiles.
-- A daily pg_cron job adds the user's SIP amount to current_portfolio on their SIP date.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS investment_goal     NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS current_portfolio   NUMERIC(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sip_date            SMALLINT CHECK (sip_date BETWEEN 1 AND 28);

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily job: on each user's SIP date, add their investable_surplus to current_portfolio
SELECT cron.schedule(
  'sip-portfolio-update',
  '0 9 * * *',  -- runs at 09:00 UTC every day
  $$
  UPDATE public.user_profiles p
  SET current_portfolio = COALESCE(p.current_portfolio, 0)
                        + COALESCE(s.investable_surplus, 0)
  FROM (
    SELECT DISTINCT ON (user_id)
      user_id,
      investable_surplus
    FROM public.investment_strategies
    WHERE is_active = TRUE
    ORDER BY user_id, created_at DESC
  ) s
  WHERE p.id = s.user_id
    AND p.sip_date = EXTRACT(DAY FROM CURRENT_DATE)::SMALLINT
    AND s.investable_surplus > 0;
  $$
);
