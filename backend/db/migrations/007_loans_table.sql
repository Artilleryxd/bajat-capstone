-- Migration 007: Create loans table for liability tracking
-- Follows TRD schema §3.4 with RLS and indexes

CREATE TABLE IF NOT EXISTS loans (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_type             TEXT NOT NULL,            -- home_loan, car_loan, personal_loan, education_loan, credit_card, bnpl
  lender                TEXT,
  principal_outstanding NUMERIC(15,2) NOT NULL,
  interest_rate         NUMERIC(5,2) NOT NULL,    -- annual %
  emi_amount            NUMERIC(12,2) NOT NULL,
  emis_remaining        SMALLINT NOT NULL,
  tenure_months         SMALLINT,
  down_payment          NUMERIC(12,2) DEFAULT 0,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- MANDATORY: RLS + user isolation policy
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON loans
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for common queries
CREATE INDEX idx_loans_user_active ON loans(user_id) WHERE is_active = TRUE;
