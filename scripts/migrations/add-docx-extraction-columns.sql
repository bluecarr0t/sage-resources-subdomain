-- Migration: Add development_phase, zoning, unit_mix,
--            financial_assumptions, recommendations columns to reports
-- These store new DOCX narrative extractions.

ALTER TABLE reports ADD COLUMN IF NOT EXISTS development_phase TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS zoning TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS unit_mix JSONB;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS financial_assumptions JSONB;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS recommendations JSONB;

CREATE INDEX IF NOT EXISTS idx_reports_dev_phase ON reports(development_phase);
CREATE INDEX IF NOT EXISTS idx_reports_zoning ON reports(zoning);
