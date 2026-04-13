CREATE TABLE budget_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month_year DATE NOT NULL,
    version SMALLINT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    allocations JSONB NOT NULL,
    ai_rationale TEXT,
    scraped_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month_year, version)
);

ALTER TABLE budget_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Budget plan isolation"
    ON budget_plans
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_budget_plans_user_month ON budget_plans(user_id, month_year DESC);
