-- RIDB pipeline health checks (run in Supabase SQL editor)

-- Campsite inventory
SELECT
  COUNT(*) AS total_campsites,
  COUNT(DISTINCT facility_id) AS distinct_facilities,
  ROUND(AVG(data_completeness_score)::numeric, 1) AS avg_completeness,
  MIN(created_at) AS oldest_row,
  MAX(last_synced_at) AS latest_sync
FROM ridb_campsites;

-- Collection progress
SELECT
  collection_type,
  status,
  sync_mode,
  last_facility_page,
  last_facility_offset,
  last_processed_facility_id,
  last_processed_campsite_id,
  total_facilities_processed,
  total_campsites_processed,
  last_incremental_sync_at,
  last_updated,
  error_message
FROM ridb_collection_progress
WHERE collection_type = 'campsites';

-- Top states by campsite count
SELECT facility_state, COUNT(*) AS campsites
FROM ridb_campsites
WHERE facility_state IS NOT NULL
GROUP BY facility_state
ORDER BY campsites DESC
LIMIT 15;

-- Stale sync (not updated in 30 days)
SELECT COUNT(*) AS stale_campsites
FROM ridb_campsites
WHERE last_synced_at IS NULL
   OR last_synced_at < NOW() - INTERVAL '30 days';
