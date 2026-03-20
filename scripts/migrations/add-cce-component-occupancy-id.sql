-- Add optional occupancy_id to cce_component_costs for occupancy-specific components
-- Components on pages with an occupancy (e.g. APARTMENTS) can be linked to that occupancy
-- Run: In Supabase SQL Editor

ALTER TABLE cce_component_costs
  ADD COLUMN IF NOT EXISTS occupancy_id UUID REFERENCES cce_occupancies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cce_component_costs_occupancy
  ON cce_component_costs(occupancy_id)
  WHERE occupancy_id IS NOT NULL;

COMMENT ON COLUMN cce_component_costs.occupancy_id IS 'Optional: links component to occupancy when extracted from same page (e.g. APARTMENTS section)';
