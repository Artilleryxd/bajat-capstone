-- Migration 006: Create user_assets table for material possession tracking
-- Follows TRD schema §3.6 with RLS and indexes

CREATE TABLE IF NOT EXISTS user_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type      TEXT NOT NULL,               -- real_estate, vehicle, gold, equity, fd, gadget, other
  name            TEXT NOT NULL,
  purchase_price  NUMERIC(15,2),
  purchase_date   DATE,
  current_value   NUMERIC(15,2),
  value_source    TEXT CHECK (value_source IN ('scraped','manual','estimated')),
  appreciation_rate NUMERIC(5,4),              -- cached growth rate e.g. 0.08
  last_valued_at  TIMESTAMPTZ,
  metadata        JSONB,                       -- e.g. { "location": "Mumbai", "weight_grams": 50 }
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- MANDATORY: RLS + user isolation policy
ALTER TABLE user_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON user_assets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for common query pattern
CREATE INDEX idx_user_assets_user ON user_assets(user_id);
CREATE INDEX idx_user_assets_type ON user_assets(user_id, asset_type);
