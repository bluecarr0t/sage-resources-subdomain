-- A-Frame USA baseline audit (2026-07-13)
-- Sources: all_sage_data (Sage), hipcamp (OTA gap)
-- Canonical Sage unit_type: 'A-Frame' | Hipcamp often: 'A Frame'

-- ============================================================================
-- 1. Current Sage USA A-Frame inventory
-- ============================================================================
SELECT
  id,
  property_id,
  property_name,
  site_name,
  unit_type,
  city,
  state,
  research_status,
  is_open,
  quantity_of_units,
  rate_avg_retail_daily_rate,
  url
FROM all_sage_data
WHERE unit_type = 'A-Frame'
  AND COALESCE(country, 'United States') IN ('USA', 'United States', 'US')
ORDER BY state, property_name;

SELECT
  COUNT(*) AS rows,
  COUNT(DISTINCT COALESCE(property_id::text, id::text)) AS properties,
  COUNT(*) FILTER (WHERE research_status = 'published') AS published,
  COUNT(*) FILTER (WHERE research_status = 'in_progress') AS in_progress,
  COUNT(*) FILTER (WHERE is_open = 'Yes') AS open_yes
FROM all_sage_data
WHERE unit_type = 'A-Frame'
  AND COALESCE(country, 'United States') IN ('USA', 'United States', 'US');

-- ============================================================================
-- 2. Mislabeled / sibling candidates (A-Frame signal, wrong unit_type)
-- ============================================================================
SELECT
  id,
  property_id,
  property_name,
  site_name,
  unit_type,
  city,
  state,
  research_status,
  is_open,
  quantity_of_units,
  rate_avg_retail_daily_rate,
  url,
  CASE
    WHEN site_name ILIKE '%a-frame%' OR site_name ILIKE '%a frame%' THEN 'site_name'
    WHEN property_name ILIKE '%a-frame%' OR property_name ILIKE '%a frame%' THEN 'property_name'
    WHEN description ILIKE '%a-frame%' OR description ILIKE '%a frame%' THEN 'description'
    ELSE 'other'
  END AS signal_field
FROM all_sage_data
WHERE COALESCE(country, 'United States') IN ('USA', 'United States', 'US')
  AND unit_type IS DISTINCT FROM 'A-Frame'
  AND (
    site_name ILIKE '%a-frame%'
    OR site_name ILIKE '%a frame%'
    OR property_name ILIKE '%a-frame%'
    OR property_name ILIKE '%a frame%'
    OR description ILIKE '%a-frame%'
    OR description ILIKE '%a frame%'
  )
ORDER BY
  CASE
    WHEN site_name ILIKE '%a-frame%' OR site_name ILIKE '%a frame%' THEN 0
    WHEN property_name ILIKE '%a-frame%' OR property_name ILIKE '%a frame%' THEN 1
    ELSE 2
  END,
  state,
  property_name;

-- ============================================================================
-- 3. Hipcamp USA A Frame inventory count
-- ============================================================================
SELECT COUNT(*) AS hipcamp_a_frame_sites
FROM hipcamp
WHERE (unit_type ILIKE '%a frame%' OR unit_type ILIKE '%a-frame%')
  AND COALESCE(country, 'United States') IN ('USA', 'United States', 'US');
