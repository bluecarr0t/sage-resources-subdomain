-- Soft-delete older duplicate study_id rows (keep latest created_at), then
-- add a partial unique index so live reports cannot share a study_id.

UPDATE reports AS older
SET deleted_at = NOW()
FROM reports AS newer
WHERE older.study_id IS NOT NULL
  AND older.study_id = newer.study_id
  AND older.deleted_at IS NULL
  AND newer.deleted_at IS NULL
  AND older.id <> newer.id
  AND (
    newer.created_at > older.created_at
    OR (newer.created_at = older.created_at AND newer.id > older.id)
  );

CREATE UNIQUE INDEX IF NOT EXISTS reports_study_id_unique_live
  ON reports (study_id)
  WHERE deleted_at IS NULL AND study_id IS NOT NULL;
