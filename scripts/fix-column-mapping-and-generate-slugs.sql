-- SQL script to fix column mapping issues and generate slugs
-- This fixes data that was incorrectly mapped during CSV upload
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Fix source column - move incorrect values
-- Many records have unit types, URLs, or "Yes" in source when they should have research source
UPDATE "sage-glamping-data"
SET source = NULL
WHERE source IN ('Yes', 'Airstream', 'Safari Tent', 'GeoDome', 'Treehouse', 'Dome', 'Cabin', 'Yurt', 'Tent', 'Canvas Tent', 'Wagon', 'Nature Pod', '2-4', '2', '2-8', '2-6')
  AND created_at >= '2025-12-11';

-- Set source to 'Web Research 2025' for new properties that don't have a source or have incorrect values
UPDATE "sage-glamping-data"
SET source = 'Web Research 2025'
WHERE (source IS NULL OR source NOT LIKE 'Web Research%')
  AND created_at >= '2025-12-11'
  AND property_name IN (
    'Akasha Farm Retreat Spa', 'Alexander''s Lodge Yurts', 'Alpine Airstream Glamping',
    'Angel of the Winds RV Resort', 'Cameron Ranch Glamping - Bastrop', 'Camp Elena',
    'Cedar Bloom Farm', 'Clear Sky Resorts', 'Collective Hill Country - a Retreat at Montesino Ranch',
    'Collective Yellowstone', 'Crater Lake Resort', 'Cypress Valley', 'Darla the Glamping Trailer',
    'Flamingo Everglades Glamping Tents', 'Free Spirit Spheres', 'Green Rock Retreat',
    'Hart''s Camp', 'Iron & Vine Luxury Treehouse', 'Keystone Heights RV Resort',
    'Mt. Hood Tiny House Village', 'North Shore Camping Company', 'Onera Fredericksburg',
    'Onera Wimberley', 'Outdoors Elevated', 'Outpost X', 'Owl''s Perch Treehouse',
    'Pisgah Glamping at Lake Powhatan', 'Riverside - A Parkbridge Camping & RV Resort',
    'Ruby Lake Resort', 'Safari for the Soul Glamping', 'Safari Wilderness Glamping',
    'Shell Camp Florida', 'SKYE Texas Hill Country Resort', 'Space Cowboys',
    'Spoon Mountain Glamping', 'Stargazer Dome', 'Summit Big Bend', 'Talula Mesa Glamping Resort',
    'The Hill - Olympic Peninsula Glamping', 'Timberline Glamping at Collier-Seminole State Park',
    'Timberline Glamping at Kissimmee Prairie Preserve', 'Triple G''s Resort',
    'Tuxedo Falls', 'Walden Retreats', 'Wild Havens Pop Up Glamping', 'Winderdome Resort',
    'WOODS on Pender', 'Yak Eco Camp', 'Zen Zion Glamping Domes'
  );

-- Step 2: Fix toilet column - remove state abbreviations, unit types, and source info
UPDATE "sage-glamping-data"
SET toilet = NULL
WHERE toilet IN ('MT', 'WA', 'OR', 'TX', 'FL', 'NC', 'BC', 'UT', 'MN', 'GeoDome', 'Yurt', 'Airstream', 
                 'Treehouse', 'Cabin', 'Dome', 'Safari Tent', 'Tent', 'Canvas Tent', 'Wagon',
                 'Nature Pod', 'Web Research 2025 - British Columbia Focus',
                 'Web Research 2025 - Washington Focus', 'Web Research 2025 - Texas Focus',
                 'Web Research 2025 - Florida Focus', 'Web Research 2025 - North Carolina Focus',
                 'Web Research 2025 - Oregon Focus', 'Web Research 2025')
  AND created_at >= '2025-12-11';

-- Set toilet to 'Yes' where description mentions bathrooms/toilets
UPDATE "sage-glamping-data"
SET toilet = 'Yes'
WHERE toilet IS NULL
  AND (description ILIKE '%bathroom%' OR description ILIKE '%toilet%' OR description ILIKE '%restroom%')
  AND created_at >= '2025-12-11';

-- Step 3: Fix trash column - remove state abbreviations and source info
UPDATE "sage-glamping-data"
SET trash = NULL
WHERE trash IN ('MT', 'WA', 'OR', 'TX', 'FL', 'NC', 'BC', 'UT', 'MN', 'GeoDome', 'Yurt', 'Airstream',
                'Treehouse', 'Cabin', 'Dome', 'Safari Tent', 'Tent', 'Canvas Tent', 'Wagon',
                'Web Research 2025 - British Columbia Focus', 'Web Research 2025 - Washington Focus',
                'Web Research 2025 - Texas Focus', 'Web Research 2025 - Florida Focus',
                'Web Research 2025 - North Carolina Focus', 'Web Research 2025 - Oregon Focus',
                'Web Research 2025', '2-4', '2', '2-8', '2-6', 'Safari Tent', 'Treehouse',
                'Cabin', 'Dome', 'Canvas Tent', 'Nature Pod')
  AND created_at >= '2025-12-11';

-- Step 4: Fix water column - remove unit types and URLs
UPDATE "sage-glamping-data"
SET water = NULL
WHERE (water IN ('Dome', 'Yurt', 'Airstream', 'Treehouse', 'Cabin', 'Safari Tent', 'Tent',
                 'Canvas Tent', 'Wagon', 'Nature Pod', '2-4', '2', '2-8', '2-6')
   OR water LIKE 'https://%'
   OR water LIKE 'http://%')
  AND created_at >= '2025-12-11';

-- Set water to 'Yes' where it was incorrectly set to NULL but should be Yes
UPDATE "sage-glamping-data"
SET water = 'Yes'
WHERE water IS NULL 
  AND (description ILIKE '%water%' OR description ILIKE '%drinking%' OR description ILIKE '%plumbing%'
       OR description ILIKE '%kitchen%' OR description ILIKE '%bathroom%')
  AND created_at >= '2025-12-11';

-- Step 5: Fix wifi column - remove URLs and unit types
UPDATE "sage-glamping-data"
SET wifi = NULL
WHERE (wifi IN ('Dome', 'Yurt', 'Airstream', 'Treehouse', 'Cabin', 'Safari Tent', 'Tent',
                'Canvas Tent', 'Wagon', 'Nature Pod', '2-4', '2', '2-8', '2-6', '2024')
   OR wifi LIKE 'https://%'
   OR wifi LIKE 'http://%')
  AND created_at >= '2025-12-11';

-- Set wifi to 'Yes' where description mentions wifi
UPDATE "sage-glamping-data"
SET wifi = 'Yes'
WHERE wifi IS NULL
  AND (description ILIKE '%wifi%' OR description ILIKE '%wi-fi%' OR description ILIKE '%wireless%'
       OR description ILIKE '%internet%')
  AND created_at >= '2025-12-11';

-- Step 6: Fix unit_capacity column - remove states, source info, and unit types
UPDATE "sage-glamping-data"
SET unit_capacity = NULL
WHERE unit_capacity IN ('Yes', 'MT', 'WA', 'OR', 'TX', 'FL', 'NC', 'BC', 'UT', 'MN',
                         'Web Research 2025 - British Columbia Focus',
                         'Web Research 2025 - Washington Focus',
                         'Web Research 2025 - Texas Focus',
                         'Web Research 2025 - Florida Focus',
                         'Web Research 2025 - North Carolina Focus',
                         'Web Research 2025 - Oregon Focus',
                         'Web Research 2025', 'Cabin', 'Treehouse', 'Safari Tent',
                         'Dome', 'Canvas Tent', 'Tent', 'Yurt', 'Airstream', 'Wagon',
                         'Nature Pod', 'GeoDome')
  AND created_at >= '2025-12-11';

-- Step 7: Fix year_site_opened column - remove zip codes and invalid values
-- First, move zip codes from year_site_opened to zip_code
UPDATE "sage-glamping-data" s1
SET zip_code = s2.year_site_opened::text
FROM "sage-glamping-data" s2
WHERE s1.id = s2.id
  AND s1.zip_code IS NULL
  AND s2.year_site_opened IS NOT NULL
  AND s2.year_site_opened::text ~ '^[0-9]{5}$'
  AND s2.year_site_opened::integer > 10000
  AND s2.year_site_opened::integer < 99999
  AND s1.created_at >= '2025-12-11';

-- Now clear year_site_opened where it was actually a zip code
UPDATE "sage-glamping-data"
SET year_site_opened = NULL
WHERE (year_site_opened::text ~ '^[0-9]{5}$' 
  AND year_site_opened::integer > 10000
  AND year_site_opened::integer < 99999)
  AND created_at >= '2025-12-11';

-- Also clear invalid year values like 'Yes'
UPDATE "sage-glamping-data"
SET year_site_opened = NULL
WHERE year_site_opened::text = 'Yes'
  AND created_at >= '2025-12-11';

-- Step 8: Fix url column - remove unit types
UPDATE "sage-glamping-data"
SET url = NULL
WHERE url IN ('Safari Tent', 'Airstream', 'GeoDome', 'Treehouse', 'Dome', 'Cabin', 'Yurt',
              'Tent', 'Canvas Tent', 'Wagon', 'Nature Pod', '2-4', '2', '2-8', '2-6')
   AND url NOT LIKE 'https://%'
   AND url NOT LIKE 'http://%'
   AND created_at >= '2025-12-11';

-- Step 9: Fix state column - populate from other columns where it's missing
-- First, try to get state from toilet column
UPDATE "sage-glamping-data" s1
SET state = s2.toilet
FROM "sage-glamping-data" s2
WHERE s1.id = s2.id
  AND s1.state IS NULL
  AND s2.toilet IN ('MT', 'WA', 'OR', 'TX', 'FL', 'NC', 'BC', 'UT', 'MN')
  AND s1.created_at >= '2025-12-11';

-- Then clear toilet where it was actually a state
UPDATE "sage-glamping-data"
SET toilet = NULL
WHERE toilet IN ('MT', 'WA', 'OR', 'TX', 'FL', 'NC', 'BC', 'UT', 'MN')
  AND created_at >= '2025-12-11';

-- Step 10: Fix zip_code - try to populate from other columns
-- Some zip codes might be in year_site_opened (already handled above)
-- Also check if zip_code needs to be populated from other sources
-- For now, we'll rely on the year_site_opened fix above

-- Step 11: Generate slugs from property_name
-- First, create helper function if it doesn't exist
CREATE OR REPLACE FUNCTION transliterate_to_ascii(input_text TEXT) 
RETURNS TEXT AS $$
DECLARE
  result TEXT := input_text;
BEGIN
  result := REPLACE(result, 'à', 'a');
  result := REPLACE(result, 'á', 'a');
  result := REPLACE(result, 'â', 'a');
  result := REPLACE(result, 'ã', 'a');
  result := REPLACE(result, 'ä', 'a');
  result := REPLACE(result, 'å', 'a');
  result := REPLACE(result, 'ā', 'a');
  result := REPLACE(result, 'è', 'e');
  result := REPLACE(result, 'é', 'e');
  result := REPLACE(result, 'ê', 'e');
  result := REPLACE(result, 'ë', 'e');
  result := REPLACE(result, 'ē', 'e');
  result := REPLACE(result, 'ì', 'i');
  result := REPLACE(result, 'í', 'i');
  result := REPLACE(result, 'î', 'i');
  result := REPLACE(result, 'ï', 'i');
  result := REPLACE(result, 'ī', 'i');
  result := REPLACE(result, 'ò', 'o');
  result := REPLACE(result, 'ó', 'o');
  result := REPLACE(result, 'ô', 'o');
  result := REPLACE(result, 'õ', 'o');
  result := REPLACE(result, 'ö', 'o');
  result := REPLACE(result, 'ø', 'o');
  result := REPLACE(result, 'ō', 'o');
  result := REPLACE(result, 'ù', 'u');
  result := REPLACE(result, 'ú', 'u');
  result := REPLACE(result, 'û', 'u');
  result := REPLACE(result, 'ü', 'u');
  result := REPLACE(result, 'ū', 'u');
  result := REPLACE(result, 'ç', 'c');
  result := REPLACE(result, 'ñ', 'n');
  result := REPLACE(result, 'ý', 'y');
  result := REPLACE(result, 'ÿ', 'y');
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Generate slugs for all properties
WITH unique_properties AS (
  SELECT DISTINCT property_name
  FROM "sage-glamping-data"
  WHERE property_name IS NOT NULL AND property_name != ''
),
base_slugs AS (
  SELECT 
    property_name,
    TRIM(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            transliterate_to_ascii(LOWER(TRIM(property_name))),
            '[^\w\s-]', '', 'g'
          ),
          '\s+', '-', 'g'
        ),
        '-+', '-', 'g'
      )
    ) AS base_slug
  FROM unique_properties
),
slug_rankings AS (
  SELECT 
    property_name,
    base_slug,
    ROW_NUMBER() OVER (
      PARTITION BY base_slug 
      ORDER BY property_name
    ) AS slug_rank
  FROM base_slugs
),
final_slug_map AS (
  SELECT 
    property_name,
    CASE 
      WHEN slug_rank = 1 THEN base_slug
      ELSE base_slug || '-' || (slug_rank - 1)::TEXT
    END AS final_slug
  FROM slug_rankings
)
UPDATE "sage-glamping-data" s
SET slug = fsm.final_slug
FROM final_slug_map fsm
WHERE s.property_name = fsm.property_name
  AND (s.slug IS NULL OR s.slug = '' OR s.slug != fsm.final_slug);

-- Show summary
SELECT 
  COUNT(*) as total_properties,
  COUNT(DISTINCT property_name) as unique_properties,
  COUNT(*) FILTER (WHERE slug IS NOT NULL) as with_slug,
  COUNT(*) FILTER (WHERE source IS NOT NULL) as with_source,
  COUNT(*) FILTER (WHERE toilet IN ('Yes', 'No')) as toilet_fixed,
  COUNT(*) FILTER (WHERE water IN ('Yes', 'No')) as water_fixed,
  COUNT(*) FILTER (WHERE wifi IN ('Yes', 'No')) as wifi_fixed
FROM "sage-glamping-data"
WHERE created_at >= '2025-12-11';
