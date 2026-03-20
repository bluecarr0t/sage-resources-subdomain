-- Optional QA / re-clean metadata for cce_component_costs
-- Run in Supabase SQL Editor after add-cce-component-costs-extraction-date.sql

ALTER TABLE cce_component_costs
  ADD COLUMN IF NOT EXISTS extraction_flags JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE cce_component_costs
  ADD COLUMN IF NOT EXISTS normalization_version SMALLINT NOT NULL DEFAULT 0;

UPDATE cce_component_costs SET extraction_flags = '{}'::jsonb WHERE extraction_flags IS NULL;

CREATE INDEX IF NOT EXISTS idx_cce_component_costs_extraction_flags
  ON cce_component_costs USING gin (extraction_flags);

COMMENT ON COLUMN cce_component_costs.extraction_flags IS 'QA flags: sparse_tiers, single_column, layout_parsed, had_dot_leaders, normalized_changed, etc.';
COMMENT ON COLUMN cce_component_costs.normalization_version IS 'Bumps when normalize_component_item_name changes; reclean script updates stale rows.';
