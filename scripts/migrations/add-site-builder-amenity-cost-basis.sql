-- Researched default cost basis for Site Builder amenities (author-visible notes + optional URL).
-- Feasibility sync does not clear these columns (see sync-feasibility-amenities INSERT).

ALTER TABLE site_builder_amenity_costs
  ADD COLUMN IF NOT EXISTS default_cost_basis TEXT;

ALTER TABLE site_builder_amenity_costs
  ADD COLUMN IF NOT EXISTS default_cost_source_url TEXT;

COMMENT ON COLUMN site_builder_amenity_costs.default_cost_basis IS
  'Short note on how default cost_per_unit was estimated (e.g. typical installed range).';

COMMENT ON COLUMN site_builder_amenity_costs.default_cost_source_url IS
  'Optional public reference URL for the default cost estimate.';
