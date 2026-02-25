-- Migration: Add seasonal_rates, monthly_occupancy JSONB columns
-- These store parsed data from the Rates Proj and Occ. Proj sheets

ALTER TABLE feasibility_rate_projections
  ADD COLUMN IF NOT EXISTS seasonal_rates JSONB;

ALTER TABLE feasibility_occupancy_projections
  ADD COLUMN IF NOT EXISTS monthly_occupancy JSONB;
