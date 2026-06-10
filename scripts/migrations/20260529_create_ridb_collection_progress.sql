-- RIDB collection progress (resume + incremental sync metadata)
-- Safe to run on sage-outdoor-advisory where ridb_campsites already exists.

CREATE TABLE IF NOT EXISTS ridb_collection_progress (
  id BIGSERIAL PRIMARY KEY,
  collection_type TEXT NOT NULL DEFAULT 'campsites' UNIQUE,
  last_processed_facility_id TEXT,
  last_processed_campsite_id TEXT,
  last_facility_page INTEGER NOT NULL DEFAULT 1,
  last_facility_offset INTEGER NOT NULL DEFAULT 0,
  sync_mode TEXT NOT NULL DEFAULT 'full',
  last_incremental_sync_at TIMESTAMPTZ,
  total_facilities_processed INTEGER DEFAULT 0,
  total_campsites_processed INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'paused',
  error_message TEXT
);

ALTER TABLE ridb_collection_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON ridb_collection_progress;
CREATE POLICY "Allow public read access" ON ridb_collection_progress
  FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_ridb_collection_progress_type
  ON ridb_collection_progress (collection_type);
CREATE INDEX IF NOT EXISTS idx_ridb_collection_progress_status
  ON ridb_collection_progress (status);

COMMENT ON TABLE ridb_collection_progress IS 'Tracks RIDB campsite collection progress for resume and incremental sync';
COMMENT ON COLUMN ridb_collection_progress.last_facility_page IS '1-based facility list page to resume from';
COMMENT ON COLUMN ridb_collection_progress.last_facility_offset IS 'RIDB API offset for the current page';
COMMENT ON COLUMN ridb_collection_progress.sync_mode IS 'full or incremental — last run mode';
COMMENT ON COLUMN ridb_collection_progress.last_incremental_sync_at IS 'Watermark for incremental sync runs';

-- Seed from current production counts (Dec 2025 partial collection)
INSERT INTO ridb_collection_progress (
  collection_type,
  status,
  total_campsites_processed,
  total_facilities_processed,
  last_facility_page,
  last_facility_offset,
  sync_mode,
  last_updated
)
SELECT
  'campsites',
  'paused',
  (SELECT COUNT(*)::INTEGER FROM ridb_campsites),
  (SELECT COUNT(DISTINCT facility_id)::INTEGER FROM ridb_campsites WHERE facility_id IS NOT NULL),
  1,
  0,
  'full',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM ridb_collection_progress WHERE collection_type = 'campsites'
);
