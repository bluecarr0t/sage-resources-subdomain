-- P1: Unify sibling slugs per property_id (anchor = lowest id with non-null slug).
-- Prefer published anchor slug when present — see scripts/apply-slug-repair-2026-07-09.ts for full policy.
-- Date: 2026-07-09

BEGIN;

WITH anchor AS (
  SELECT DISTINCT ON (property_id)
    property_id,
    slug
  FROM all_sage_data
  WHERE property_id IS NOT NULL
    AND btrim(property_id::text) <> ''
    AND slug IS NOT NULL
    AND btrim(slug) <> ''
  ORDER BY
    property_id,
    CASE WHEN research_status = 'published' THEN 0 ELSE 1 END,
    id
)
UPDATE all_sage_data t
SET
  slug = a.slug,
  date_updated = to_char(current_date, 'YYYY-MM-DD')
FROM anchor a
WHERE t.property_id = a.property_id
  AND t.slug IS DISTINCT FROM a.slug;

COMMIT;
