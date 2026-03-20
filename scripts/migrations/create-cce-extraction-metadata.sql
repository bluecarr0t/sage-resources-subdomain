-- CCE Extraction metadata (audit trail)
-- Run in Supabase SQL Editor
--
-- Tracks extraction runs: pdf path, page range, row counts, timestamps

CREATE TABLE IF NOT EXISTS cce_extraction_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_path TEXT NOT NULL,
  pdf_filename TEXT,
  page_start INTEGER NOT NULL,
  page_end INTEGER NOT NULL,
  total_pages INTEGER,
  occupancies_count INTEGER DEFAULT 0,
  cost_rows_count INTEGER DEFAULT 0,
  cost_pct_rows_count INTEGER DEFAULT 0,
  component_rows_count INTEGER DEFAULT 0,
  modifier_rows_count INTEGER DEFAULT 0,
  incremental BOOLEAN DEFAULT FALSE,
  last_page_extracted INTEGER,
  status TEXT DEFAULT 'completed',  -- completed | failed | running
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cce_extraction_metadata_created ON cce_extraction_metadata(created_at DESC);
