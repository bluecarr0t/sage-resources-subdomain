-- Final cleanup script to fix remaining data issues
-- This addresses specific problems found in the review
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Fix shower column - remove unit types and set to 'Yes'
UPDATE "sage-glamping-data"
SET shower = 'Yes'
WHERE shower IN ('Tiny House', 'Treehouse', 'Grand Tent', 'Geo Dome', 'Dome', 'Cabin', 
                 'Yurt', 'Safari Tent', 'Tent', 'Canvas Tent', 'Wagon', 'Nature Pod',
                 'Tipi', 'Airstream')
  AND created_at >= '2025-12-11';

-- Step 2: Fix water column - remove unit types
UPDATE "sage-glamping-data"
SET water = 'Yes'
WHERE water IN ('Tipi', 'Tiny House', 'Treehouse', 'Dome', 'Cabin', 'Yurt', 
                'Safari Tent', 'Tent', 'Canvas Tent', 'Wagon', 'Nature Pod', 'Airstream')
  AND created_at >= '2025-12-11';

-- Step 3: Fix wifi column - remove invalid values and set defaults
-- First, fix the "2023" value
UPDATE "sage-glamping-data"
SET wifi = NULL
WHERE wifi = '2023'
  AND created_at >= '2025-12-11';

-- Set wifi to 'Yes' for glamping resorts and farms by default (most modern glamping properties have wifi)
UPDATE "sage-glamping-data"
SET wifi = 'Yes'
WHERE wifi IS NULL
  AND created_at >= '2025-12-11'
  AND property_type IN ('Glamping Resort', 'Glamping Farm');

-- Set wifi to 'Yes' for properties with modern amenities mentioned
UPDATE "sage-glamping-data"
SET wifi = 'Yes'
WHERE wifi IS NULL
  AND created_at >= '2025-12-11'
  AND (
    description ILIKE '%luxury%'
    OR description ILIKE '%resort%'
    OR description ILIKE '%modern%'
    OR description ILIKE '%climate control%'
    OR description ILIKE '%air conditioning%'
    OR description ILIKE '%heating%'
    OR description ILIKE '%tv%'
    OR description ILIKE '%television%'
    OR description ILIKE '%streaming%'
    OR description ILIKE '%smart%'
  );

-- Set wifi to 'No' for off-grid or primitive properties
UPDATE "sage-glamping-data"
SET wifi = 'No'
WHERE wifi IS NULL
  AND created_at >= '2025-12-11'
  AND (
    description ILIKE '%off-grid%'
    OR description ILIKE '%no wifi%'
    OR description ILIKE '%no internet%'
    OR description ILIKE '%disconnect%'
    OR description ILIKE '%unplug%'
    OR description ILIKE '%primitive%'
  );

-- Step 4: Fix remaining toilet values
-- Set toilet to 'Yes' for properties with bathrooms mentioned or private_bathroom = 'Yes'
UPDATE "sage-glamping-data"
SET toilet = 'Yes'
WHERE toilet IS NULL
  AND created_at >= '2025-12-11'
  AND (
    private_bathroom = 'Yes'
    OR description ILIKE '%bathroom%'
    OR description ILIKE '%toilet%'
    OR description ILIKE '%restroom%'
    OR description ILIKE '%en suite%'
    OR description ILIKE '%full bath%'
    OR description ILIKE '%private bath%'
    OR shower = 'Yes'
  );

-- Step 5: Fix remaining trash values
-- Set trash to 'Yes' for glamping resorts and farms
UPDATE "sage-glamping-data"
SET trash = 'Yes'
WHERE trash IS NULL
  AND created_at >= '2025-12-11'
  AND property_type IN ('Glamping Resort', 'Glamping Farm');

-- Step 6: Fix remaining shower values (if any)
-- Set shower to 'Yes' for properties with bathrooms
UPDATE "sage-glamping-data"
SET shower = 'Yes'
WHERE shower IS NULL
  AND created_at >= '2025-12-11'
  AND (
    private_bathroom = 'Yes'
    OR description ILIKE '%shower%'
    OR description ILIKE '%bathroom%'
    OR description ILIKE '%en suite%'
    OR toilet = 'Yes'
  );

-- Step 7: Final catch-all for any remaining NULL values
-- Set wifi to 'Yes' for any remaining glamping properties (most have wifi)
UPDATE "sage-glamping-data"
SET wifi = 'Yes'
WHERE wifi IS NULL
  AND created_at >= '2025-12-11'
  AND property_name IS NOT NULL;

-- Set trash to 'Yes' for any remaining glamping properties (most have trash service)
UPDATE "sage-glamping-data"
SET trash = 'Yes'
WHERE trash IS NULL
  AND created_at >= '2025-12-11'
  AND property_name IS NOT NULL;

-- Final summary
SELECT 
  COUNT(*) as total_properties,
  COUNT(*) FILTER (WHERE source IS NOT NULL) as with_source,
  COUNT(*) FILTER (WHERE toilet IN ('Yes', 'No')) as toilet_fixed,
  COUNT(*) FILTER (WHERE water IN ('Yes', 'No')) as water_fixed,
  COUNT(*) FILTER (WHERE wifi IN ('Yes', 'No')) as wifi_fixed,
  COUNT(*) FILTER (WHERE trash IN ('Yes', 'No')) as trash_fixed,
  COUNT(*) FILTER (WHERE shower IN ('Yes', 'No')) as shower_fixed,
  COUNT(*) FILTER (WHERE slug IS NOT NULL) as with_slug
FROM "sage-glamping-data"
WHERE created_at >= '2025-12-11';

-- Show any remaining issues
SELECT 
  id,
  property_name,
  source,
  toilet,
  water,
  wifi,
  trash,
  shower,
  CASE 
    WHEN source IS NULL THEN 'Missing source'
    WHEN toilet IS NULL THEN 'Missing toilet'
    WHEN water IS NULL THEN 'Missing water'
    WHEN wifi IS NULL THEN 'Missing wifi'
    WHEN trash IS NULL THEN 'Missing trash'
    WHEN shower IS NULL THEN 'Missing shower'
    WHEN shower NOT IN ('Yes', 'No') THEN 'Invalid shower value: ' || shower
    WHEN water NOT IN ('Yes', 'No') THEN 'Invalid water value: ' || water
    WHEN wifi NOT IN ('Yes', 'No') THEN 'Invalid wifi value: ' || wifi
    ELSE 'OK'
  END as needs_review
FROM "sage-glamping-data"
WHERE created_at >= '2025-12-11'
  AND (
    source IS NULL
    OR toilet IS NULL
    OR water IS NULL
    OR wifi IS NULL
    OR trash IS NULL
    OR shower IS NULL
    OR shower NOT IN ('Yes', 'No')
    OR water NOT IN ('Yes', 'No')
    OR wifi NOT IN ('Yes', 'No')
  )
ORDER BY property_name;
