-- Add sort_order to site_builder_amenity_costs for display ordering (most common first)
ALTER TABLE site_builder_amenity_costs
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sb_amenity_costs_sort ON site_builder_amenity_costs(sort_order);
