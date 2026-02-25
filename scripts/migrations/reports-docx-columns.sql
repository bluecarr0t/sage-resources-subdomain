-- Reports table: Add columns for DOCX-extracted data
-- Run in Supabase SQL Editor. Idempotent (safe to run multiple times).

ALTER TABLE reports ADD COLUMN IF NOT EXISTS executive_summary TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS swot JSONB;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS authors TEXT[];
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_date DATE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS client_entity TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS docx_file_path TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS has_docx BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_reports_has_docx ON reports(has_docx) WHERE has_docx = TRUE;
CREATE INDEX IF NOT EXISTS idx_reports_report_date ON reports(report_date);
