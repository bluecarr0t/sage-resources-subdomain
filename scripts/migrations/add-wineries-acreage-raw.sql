-- Add acres_planted_raw for full raw acreage text (reprocessing), while acres_planted holds normalized display value
-- Run after create-wineries-table.sql

ALTER TABLE wineries ADD COLUMN IF NOT EXISTS acres_planted_raw TEXT;

COMMENT ON COLUMN wineries.acres_planted_raw IS 'Full raw acreage text from sources; acres_planted holds normalized display value';
