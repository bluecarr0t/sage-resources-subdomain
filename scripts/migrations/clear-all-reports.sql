-- Clear all Past Reports data
-- Run in Supabase SQL Editor. This permanently deletes all reports and related data.
-- Related feasibility data (comparables, comp units, summaries, valuations, etc.) will cascade delete via ON DELETE CASCADE.
--
-- NOTE: This does NOT delete files from the report-uploads storage bucket.
-- Orphaned XLSX/DOCX files will remain. To clear storage, use Supabase Dashboard > Storage > report-uploads.

-- Delete all reports (cascades to feasibility_comparables, feasibility_comp_units,
-- feasibility_study_summaries, feasibility_property_scores, feasibility_pro_forma_units,
-- feasibility_valuations, feasibility_financing, feasibility_development_costs,
-- feasibility_rate_projections, feasibility_occupancy_projections, feasibility_market_data,
-- feasibility_assumptions)
DELETE FROM reports;
