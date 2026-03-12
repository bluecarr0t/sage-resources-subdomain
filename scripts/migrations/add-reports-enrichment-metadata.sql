-- Add enrichment_metadata JSONB column to reports for data versioning and traceability
-- Stores: benchmark_sample_count, benchmark_categories[], enrichment_date, data_sources[]
-- Run in Supabase SQL Editor

ALTER TABLE reports ADD COLUMN IF NOT EXISTS enrichment_metadata JSONB;

COMMENT ON COLUMN reports.enrichment_metadata IS 'Metadata from report draft enrichment: benchmark_sample_count, benchmark_categories, enrichment_date, data_sources. Used for reproducibility and source appendix.';
