-- Comparables Search Performance
-- Run in Supabase SQL Editor
-- Adds trigram indexes for faster ilike search on comp_name and overview

-- Enable pg_trgm extension for trigram indexes (speeds up ilike '%term%')
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index on comp_name for search
CREATE INDEX IF NOT EXISTS idx_feas_comps_comp_name_trgm
  ON feasibility_comparables USING gin (comp_name gin_trgm_ops);

-- Trigram index on overview for search
CREATE INDEX IF NOT EXISTS idx_feas_comps_overview_trgm
  ON feasibility_comparables USING gin (overview gin_trgm_ops);
