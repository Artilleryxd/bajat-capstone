-- backend/db/migrations/002_loans_tables.sql

CREATE TABLE loans (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_type             TEXT NOT NULL,
  lender                TEXT,
  principal_outstanding NUMERIC(15,2) NOT NULL,
  interest_rate         NUMERIC(5,2) NOT NULL,
  emi_amount            NUMERIC(12,2) NOT NULL,
  emis_remaining        SMALLINT NOT NULL,
  tenure_months         SMALLINT,
  down_payment          NUMERIC(12,2) DEFAULT 0,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON loans
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_loans_user_active ON loans(user_id, is_active);

CREATE TABLE loan_strategies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_type  TEXT CHECK (strategy_type IN ('avalanche','snowball','hybrid','refinance')),
  strategy_data  JSONB NOT NULL,
  ai_rationale   TEXT,
  total_saved    NUMERIC(15,2),
  months_saved   SMALLINT,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE loan_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON loan_strategies
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_loan_strategies_user ON loan_strategies(user_id, is_active, created_at DESC);
