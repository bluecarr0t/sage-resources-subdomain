-- Add XLSX file tracking columns to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS xlsx_file_path text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS has_xlsx boolean DEFAULT false;
