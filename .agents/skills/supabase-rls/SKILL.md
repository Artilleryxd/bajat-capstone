---
name: supabase-rls
description: >
  Use this skill whenever creating or modifying Supabase database tables,
  writing SQL migrations, adding indexes, setting up Row-Level Security policies,
  or working with the database schema for FinSight AI.
triggers:
  - "create table"
  - "migration"
  - "database schema"
  - "RLS"
  - "row level security"
  - "supabase table"
  - "SQL"
  - "add column"
  - "index"
---

# FinSight AI — Supabase & RLS Skill

## The Golden Rule
Every table MUST have RLS enabled and an isolation policy BEFORE it is used in code.
No exceptions. The service role key bypasses RLS — be extra careful with backend writes.

---

## Standard Table Template
```sql
CREATE TABLE {table_name} (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- your columns here
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MANDATORY: Always add these two lines immediately after CREATE TABLE
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON {table_name}
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## Full Schema Reference

### user_profiles
```sql
CREATE TABLE user_profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  date_of_birth       DATE,
  gender              TEXT CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  country             TEXT NOT NULL,
  city                TEXT NOT NULL,
  neighbourhood       TEXT,
  monthly_income      NUMERIC(15,2),
  income_type         TEXT CHECK (income_type IN ('salaried','self_employed','freelance','other')),
  currency            TEXT DEFAULT 'INR',
  marital_status      TEXT CHECK (marital_status IN ('single','married','divorced','widowed')),
  num_dependents      SMALLINT DEFAULT 0,
  housing_status      TEXT CHECK (housing_status IN ('owned','rented','family')),
  investment_exp      TEXT CHECK (investment_exp IN ('beginner','intermediate','advanced')),
  has_existing_loans  BOOLEAN DEFAULT FALSE,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON user_profiles FOR ALL USING (auth.uid() = id);
```

### expenses
```sql
CREATE TABLE expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year    DATE NOT NULL,  -- always date_trunc('month', date): e.g. 2026-03-01
  description   TEXT NOT NULL,
  merchant      TEXT,
  amount        NUMERIC(12,2) NOT NULL,
  currency      TEXT DEFAULT 'INR',
  category      TEXT CHECK (category IN ('needs','wants','desires','investments')),
  subcategory   TEXT,
  source        TEXT CHECK (source IN ('manual','csv','pdf','receipt','ai')),
  ai_confidence NUMERIC(3,2),  -- 0.00–1.00
  user_override BOOLEAN DEFAULT FALSE,
  expense_date  DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_expenses_user_month ON expenses(user_id, month_year DESC);
CREATE INDEX idx_expenses_category   ON expenses(user_id, category);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON expenses FOR ALL USING (auth.uid() = user_id);
```

### budget_plans
```sql
CREATE TABLE budget_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year   DATE NOT NULL,
  version      SMALLINT DEFAULT 1,
  is_active    BOOLEAN DEFAULT TRUE,
  allocations  JSONB NOT NULL,   -- { "rent": 25000, "groceries": 8000, ... }
  ai_rationale TEXT,
  scraped_data JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month_year, version)
);
ALTER TABLE budget_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON budget_plans FOR ALL USING (auth.uid() = user_id);
```

### loans
```sql
CREATE TABLE loans (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_type               TEXT NOT NULL,
  lender                  TEXT,
  principal_outstanding   NUMERIC(15,2) NOT NULL,
  interest_rate           NUMERIC(5,2) NOT NULL,
  emi_amount              NUMERIC(12,2) NOT NULL,
  emis_remaining          SMALLINT NOT NULL,
  tenure_months           SMALLINT,
  down_payment            NUMERIC(12,2) DEFAULT 0,
  is_active               BOOLEAN DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON loans FOR ALL USING (auth.uid() = user_id);
```

### loan_strategies
```sql
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
CREATE POLICY "user_isolation" ON loan_strategies FOR ALL USING (auth.uid() = user_id);
```

### user_assets
```sql
CREATE TABLE user_assets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type     TEXT NOT NULL,
  name           TEXT NOT NULL,
  purchase_price NUMERIC(15,2),
  purchase_date  DATE,
  current_value  NUMERIC(15,2),
  value_source   TEXT CHECK (value_source IN ('scraped','manual','estimated')),
  last_valued_at TIMESTAMPTZ,
  metadata       JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON user_assets FOR ALL USING (auth.uid() = user_id);
```

### investment_strategies
```sql
CREATE TABLE investment_strategies (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_score         SMALLINT NOT NULL,
  risk_profile       TEXT CHECK (risk_profile IN ('conservative','moderate','aggressive')),
  allocations        JSONB NOT NULL,
  investable_surplus NUMERIC(12,2),
  ai_rationale       TEXT,
  projection_data    JSONB,
  is_active          BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE investment_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON investment_strategies FOR ALL USING (auth.uid() = user_id);
```

### chat_sessions
```sql
CREATE TABLE chat_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module           TEXT CHECK (module IN ('budget','loan','investment','asset','general')),
  reference_id     UUID,
  messages         JSONB NOT NULL DEFAULT '[]'::jsonb,
  context_snapshot JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id, created_at DESC);
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON chat_sessions FOR ALL USING (auth.uid() = user_id);
```

---

## Migration File Naming
```
supabase/migrations/
  001_initial_schema.sql
  002_add_rls_policies.sql
  003_add_indexes.sql
  004_pgcrypto_encryption.sql
```

## Pre-Commit Checklist for DB Changes
- [ ] RLS enabled on new table
- [ ] `user_isolation` policy created
- [ ] Indexes added for common query patterns
- [ ] Migration file created and numbered sequentially
- [ ] `supabase gen types typescript` run and types committed
