-- P1: Normalize property_total_sites to MAX per property_id where siblings disagree.
-- Run after reviewing scripts/output/property-total-sites-conflicts.csv
-- Date: 2026-07-09

BEGIN;

WITH totals AS (
  SELECT
    property_id,
    MAX(
      CASE
        WHEN property_total_sites IS NULL OR btrim(property_total_sites::text) = '' THEN NULL
        WHEN property_total_sites::text ~ '^[0-9]+\.?[0-9]*$'
          THEN property_total_sites::numeric
        ELSE NULL
      END
    ) AS canonical_total
  FROM all_sage_data
  WHERE property_id IS NOT NULL AND btrim(property_id::text) <> ''
  GROUP BY property_id
  HAVING COUNT(DISTINCT property_total_sites) FILTER (
    WHERE property_total_sites IS NOT NULL AND btrim(property_total_sites::text) <> ''
  ) > 1
)
UPDATE all_sage_data t
SET
  property_total_sites = totals.canonical_total,
  date_updated = to_char(current_date, 'YYYY-MM-DD'),
  notes = COALESCE(t.notes, '') || E'\n\n[' || to_char(current_date, 'YYYY-MM-DD')
    || '] P1 SQL: property_total_sites normalized to ' || totals.canonical_total::text
FROM totals
WHERE t.property_id = totals.property_id
  AND totals.canonical_total IS NOT NULL
  AND t.property_total_sites IS DISTINCT FROM totals.canonical_total;

COMMIT;
