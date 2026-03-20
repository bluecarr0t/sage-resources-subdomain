-- Add cost_analysis_file_path for Cost Analysis XLSX (Development Costs)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS cost_analysis_file_path TEXT;
COMMENT ON COLUMN reports.cost_analysis_file_path IS 'Path to Cost Analysis XLSX in report-uploads bucket (Site Dev Cost, Add. Bldg Improv., Total Proj. Cost sheets).';
