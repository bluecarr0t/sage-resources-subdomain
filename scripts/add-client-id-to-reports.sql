-- Add client_id to reports to tie reports to clients
-- Run this in Supabase SQL Editor (or run via migration)

ALTER TABLE reports ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Index for filtering reports by client
CREATE INDEX IF NOT EXISTS idx_reports_client_id ON reports(client_id);
