-- Create reports table for admin pages (past-reports, upload-reports, client-map)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT,
  property_name TEXT NOT NULL,
  location TEXT,
  address_1 TEXT,
  address_2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  market_type TEXT DEFAULT 'outdoor_hospitality',
  total_sites INTEGER DEFAULT 0,
  unit_mix JSONB,
  status TEXT DEFAULT 'draft',
  narrative_file_path TEXT,
  financial_file_path TEXT,
  has_narrative BOOLEAN DEFAULT FALSE,
  has_financial BOOLEAN DEFAULT FALSE,
  dropbox_url TEXT,
  raw_content JSONB,
  extracted_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policy: users can only access their own reports
CREATE POLICY "Users can manage own reports"
  ON reports
  FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_deleted_at ON reports(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Storage bucket: Create via Supabase Dashboard > Storage > New bucket
-- Name: report-uploads
-- Public: No
-- Add RLS policy: auth.uid()::text = (storage.foldername(name))[1] for user-scoped access
