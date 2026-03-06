-- Add state column to feasibility_comparables for comparable property location
-- Run in Supabase SQL Editor

ALTER TABLE feasibility_comparables ADD COLUMN IF NOT EXISTS state TEXT;

-- Optional: index for state filter (used by comparables list)
CREATE INDEX IF NOT EXISTS idx_feas_comps_state ON feasibility_comparables(state) WHERE state IS NOT NULL;
