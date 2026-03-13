-- Create table for discovery pipeline review queue (candidates needing manual approve/reject)
-- Run this SQL in Supabase SQL Editor or use: npx tsx scripts/apply-discovery-candidates-migration.ts

CREATE TABLE IF NOT EXISTS glamping_discovery_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  url TEXT,
  description TEXT,
  unit_type TEXT,
  property_type TEXT,
  number_of_units INT,
  article_url TEXT,
  discovery_source TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  possible_duplicate_of INT REFERENCES all_glamping_properties(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_glamping_discovery_candidates_status
  ON glamping_discovery_candidates (status);

COMMENT ON TABLE glamping_discovery_candidates IS
  'Staging table for discovery pipeline: properties that failed inclusion or are possible duplicates, awaiting manual review.';
