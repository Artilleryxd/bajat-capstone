-- Migration: 004_investment_strategies
-- Creates the investment_strategies table for FinSight AI

CREATE TABLE IF NOT EXISTS investment_strategies (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_score              SMALLINT NOT NULL DEFAULT 50,
  risk_profile            TEXT CHECK (risk_profile IN ('conservative', 'moderate', 'aggressive')) DEFAULT 'moderate',
  allocations             JSONB NOT NULL DEFAULT '[]',
  investable_surplus      NUMERIC(12, 2) DEFAULT 0,
  ai_rationale            TEXT,
  risk_explanation        TEXT,
  ai_insights             TEXT,
  debt_warning            TEXT,
  is_debt_heavy           BOOLEAN DEFAULT FALSE,
  goal_amount             NUMERIC(15, 2),
  current_portfolio_value NUMERIC(15, 2),
  sip_date                SMALLINT CHECK (sip_date BETWEEN 1 AND 28),
  portfolio_text          TEXT,
  goal_projection         JSONB,
  estimated_annual_return NUMERIC(5, 2),
  time_horizon            TEXT CHECK (time_horizon IN ('short', 'medium', 'long', 'retirement')),
  is_active               BOOLEAN DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE investment_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investment strategy isolation"
  ON investment_strategies
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_inv_strategies_user
  ON investment_strategies (user_id, created_at DESC);
