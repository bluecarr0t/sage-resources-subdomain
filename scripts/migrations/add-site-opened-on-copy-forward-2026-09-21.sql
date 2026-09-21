-- Add a full open date, and copy a consistent known year onto blank sibling rows.
-- A property qualifies when every non-null year_site_opened on its US published
-- private-commercial glamping rows is the same year, and at least one row is blank.
-- Properties whose unit rows disagree (for example 2024 and 2026) are left alone.

ALTER TABLE public.all_sage_data
  ADD COLUMN IF NOT EXISTS site_opened_on date;

WITH consistent AS (
  SELECT property_id, MIN(year_site_opened) AS year_opened
  FROM public.all_sage_data
  WHERE is_glamping_property = 'Yes'
    AND property_type = 'Glamping'
    AND research_status = 'published'
    AND (land_operator_category IS NULL OR land_operator_category = 'private_commercial')
    AND country IN ('United States', 'US', 'USA', 'United States of America')
    AND property_id IS NOT NULL
  GROUP BY property_id
  HAVING COUNT(year_site_opened) > 0
    AND COUNT(DISTINCT year_site_opened) = 1
    AND COUNT(*) FILTER (WHERE year_site_opened IS NULL) > 0
)
UPDATE public.all_sage_data AS row
SET year_site_opened = consistent.year_opened
FROM consistent
WHERE row.property_id = consistent.property_id
  AND row.year_site_opened IS NULL
  AND row.is_glamping_property = 'Yes'
  AND row.research_status = 'published';
