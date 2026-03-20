-- Add extraction_date to cce_cost_rows for deduplication and versioning
-- Enables: (1) filter to latest extraction only, (2) no duplicates across months
-- Run in Supabase SQL Editor

-- 1. Add extraction_date column (from PDF filename, e.g. March_2026 → 2026-03-01)
ALTER TABLE cce_cost_rows
  ADD COLUMN IF NOT EXISTS extraction_date DATE;

-- 2. Backfill existing rows: use created_at date
UPDATE cce_cost_rows
SET extraction_date = created_at::date
WHERE extraction_date IS NULL;

-- 3. Remove duplicates (keep row with latest extraction_date per logical key; tie-break by id)
DELETE FROM cce_cost_rows a
USING cce_cost_rows b
WHERE a.occupancy_id = b.occupancy_id
  AND COALESCE(a.building_class, '') = COALESCE(b.building_class, '')
  AND COALESCE(a.quality_type, '') = COALESCE(b.quality_type, '')
  AND COALESCE(a.exterior_walls, '') = COALESCE(b.exterior_walls, '')
  AND COALESCE(a.interior_finish, '') = COALESCE(b.interior_finish, '')
  AND COALESCE(a.lighting_plumbing, '') = COALESCE(b.lighting_plumbing, '')
  AND COALESCE(a.heat, '') = COALESCE(b.heat, '')
  AND a.id <> b.id
  AND (
    COALESCE(b.extraction_date, b.created_at::date) > COALESCE(a.extraction_date, a.created_at::date)
    OR (
      COALESCE(b.extraction_date, b.created_at::date) = COALESCE(a.extraction_date, a.created_at::date)
      AND b.id > a.id
    )
  );

-- 4. Index for filtering by latest extraction
CREATE INDEX IF NOT EXISTS idx_cce_cost_rows_extraction_date
  ON cce_cost_rows(extraction_date DESC NULLS LAST);

COMMENT ON COLUMN cce_cost_rows.extraction_date IS 'Date from PDF filename (e.g. March_2026 → 2026-03-01). Used to show only latest extraction.';
