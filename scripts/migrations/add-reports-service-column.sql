-- Add service column to reports for report type (Feasibility Study, Appraisal, etc.)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS service TEXT;
