-- Ensure Camp Ferncrest qualifies for /glamping-market-overview/brands.
-- Brands ranking requires: research_status=published, property_type='Glamping',
-- brand_id set, country US, is_open operating (Yes), private land.
-- Idempotent: only updates rows that still need correction.

BEGIN;

-- Brand registry: keep link target + public site URL.
UPDATE public.glamping_brands
SET
  website_url = COALESCE(NULLIF(TRIM(website_url), ''), 'https://campferncrest.com/'),
  display_name = 'Camp Ferncrest',
  updated_at = now()
WHERE id = '24547560-fceb-4649-b665-8204e1080ea6'
   OR slug = 'camp-ferncrest';

-- Property rows: glamping flags + brand linkage for brands cohort.
UPDATE public.all_sage_data
SET
  is_glamping_property = 'Yes',
  property_type = 'Glamping',
  brand_id = '24547560-fceb-4649-b665-8204e1080ea6',
  country = CASE
    WHEN country IS NULL
      OR TRIM(country) = ''
      OR LOWER(TRIM(country)) IN ('us', 'usa', 'u.s.', 'u.s.a.', 'united states of america')
    THEN 'United States'
    ELSE country
  END,
  date_updated = COALESCE(date_updated, '2026-09-30'),
  notes = CASE
    WHEN notes IS NOT NULL AND notes LIKE '%[2026-09-30] brands-cohort ensure%' THEN notes
    ELSE COALESCE(notes, '') || E'\n\n[2026-09-30] brands-cohort ensure: property_type=Glamping, is_glamping_property=Yes, brand_id=camp-ferncrest.'
  END
WHERE (
    property_name ILIKE '%ferncrest%'
    OR site_name ILIKE '%ferncrest%'
    OR slug ILIKE '%ferncrest%'
    OR brand_id = '24547560-fceb-4649-b665-8204e1080ea6'
  )
  AND (
    is_glamping_property IS DISTINCT FROM 'Yes'
    OR property_type IS DISTINCT FROM 'Glamping'
    OR brand_id IS DISTINCT FROM '24547560-fceb-4649-b665-8204e1080ea6'
    OR country IS NULL
    OR TRIM(country) = ''
    OR LOWER(TRIM(country)) IN ('us', 'usa', 'u.s.', 'u.s.a.', 'united states of america')
  );

COMMIT;
