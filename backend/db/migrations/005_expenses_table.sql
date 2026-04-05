-- ==========================================
-- 005: Expenses Table
-- ==========================================

CREATE TABLE IF NOT EXISTS expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year    DATE NOT NULL,
  description   TEXT NOT NULL,
  merchant      TEXT,
  amount        NUMERIC(12,2) NOT NULL,
  currency      TEXT DEFAULT 'INR',
  category      TEXT CHECK (category IN ('needs','wants','desires','investments')),
  subcategory   TEXT,
  source        TEXT CHECK (source IN ('manual','csv','pdf','receipt','ai')),
  ai_confidence NUMERIC(3,2),
  user_override BOOLEAN DEFAULT FALSE,
  expense_date  DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_expenses_user_month ON expenses(user_id, month_year DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category   ON expenses(user_id, category);

-- RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'user_isolation'
  ) THEN
    CREATE POLICY "user_isolation" ON expenses
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;
