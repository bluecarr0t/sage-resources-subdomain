-- Link past reports to Sage inventory anchor rows (all_sage_data).
-- Safe to re-run.

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS sage_data_anchor_id INTEGER
  REFERENCES all_sage_data(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reports_sage_data_anchor_id
  ON reports(sage_data_anchor_id);

COMMENT ON COLUMN reports.sage_data_anchor_id IS
  'FK to all_sage_data anchor row for the subject property (pipeline is_open / research_status).';
