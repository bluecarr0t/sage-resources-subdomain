-- Add source references to site_builder_amenity_costs for traceability to feasibility studies
-- Run: npx tsx scripts/apply-site-builder-migration.ts (or run in Supabase SQL Editor)
--
-- sources: JSONB array of { report_id, study_id, report_title, line_item }
-- Enables authors to quickly verify amenity costs against past feasibility reports.

ALTER TABLE site_builder_amenity_costs
  ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN site_builder_amenity_costs.sources IS
  'Array of { report_id, study_id, report_title, line_item } from feasibility_development_costs for traceability';
