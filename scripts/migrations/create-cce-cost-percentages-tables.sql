-- Create CCE cost percentage tables (e.g. Section 54 ELECTRICAL - % of contract cost by category)
-- Run: npx tsx scripts/apply-cce-cost-percentages-migration.ts
--
-- These tables store percentage-of-total-contract-cost data for utilities/categories by building type.

CREATE TABLE IF NOT EXISTS cce_cost_percentages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_name TEXT NOT NULL,
  section_number INTEGER,
  occupancy TEXT NOT NULL,
  category TEXT NOT NULL,
  low_pct NUMERIC,
  median_pct NUMERIC,
  high_pct NUMERIC,
  source_page INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cce_cost_pct_section ON cce_cost_percentages(section_name);
CREATE INDEX IF NOT EXISTS idx_cce_cost_pct_occupancy ON cce_cost_percentages(occupancy);
CREATE INDEX IF NOT EXISTS idx_cce_cost_pct_category ON cce_cost_percentages(category);
