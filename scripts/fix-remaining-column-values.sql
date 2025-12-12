-- SQL script to fix remaining column values after initial fix
-- This addresses properties that still have NULL values where they should have data
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Fix remaining source values
-- Set source to 'Web Research 2025' for any new properties that still don't have a source
UPDATE "sage-glamping-data"
SET source = 'Web Research 2025'
WHERE source IS NULL
  AND created_at >= '2025-12-11'
  AND property_name IS NOT NULL;

-- Step 2: Fix remaining toilet values
-- Set toilet to 'Yes' for properties with private bathrooms or full bathrooms mentioned
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
  );

-- Set toilet to 'No' for properties that explicitly mention shared or no bathrooms
UPDATE "sage-glamping-data"
SET toilet = 'No'
WHERE toilet IS NULL
  AND created_at >= '2025-12-11'
  AND (
    description ILIKE '%shared bathroom%'
    OR description ILIKE '%communal bathroom%'
    OR description ILIKE '%outhouse%'
    OR description ILIKE '%no bathroom%'
  );

-- Step 3: Fix remaining water values
-- Set water to 'Yes' for properties with kitchens, bathrooms, or plumbing mentioned
UPDATE "sage-glamping-data"
SET water = 'Yes'
WHERE water IS NULL
  AND created_at >= '2025-12-11'
  AND (
    description ILIKE '%kitchen%'
    OR description ILIKE '%bathroom%'
    OR description ILIKE '%plumbing%'
    OR description ILIKE '%running water%'
    OR description ILIKE '%water%'
    OR description ILIKE '%sink%'
    OR description ILIKE '%shower%'
    OR private_bathroom = 'Yes'
  );

-- Set water to 'No' for off-grid properties that explicitly mention no water
UPDATE "sage-glamping-data"
SET water = 'No'
WHERE water IS NULL
  AND created_at >= '2025-12-11'
  AND (
    description ILIKE '%off-grid%'
    OR description ILIKE '%no water%'
    OR description ILIKE '%bring your own water%'
  );

-- Step 4: Fix remaining wifi values
-- Set wifi to 'Yes' for properties that mention wifi, internet, or connectivity
UPDATE "sage-glamping-data"
SET wifi = 'Yes'
WHERE wifi IS NULL
  AND created_at >= '2025-12-11'
  AND (
    description ILIKE '%wifi%'
    OR description ILIKE '%wi-fi%'
    OR description ILIKE '%wireless%'
    OR description ILIKE '%internet%'
    OR description ILIKE '%connectivity%'
    OR description ILIKE '%free wifi%'
    OR description ILIKE '%high-speed%'
  );

-- Set wifi to 'No' for off-grid or remote properties that explicitly mention no wifi
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
  );

-- Step 5: Fix remaining trash values
-- Set trash to 'Yes' for most glamping properties (they typically have trash service)
UPDATE "sage-glamping-data"
SET trash = 'Yes'
WHERE trash IS NULL
  AND created_at >= '2025-12-11'
  AND property_type = 'Glamping Resort';

-- Set trash to 'No' for primitive camping or pack-in-pack-out scenarios
UPDATE "sage-glamping-data"
SET trash = 'No'
WHERE trash IS NULL
  AND created_at >= '2025-12-11'
  AND (
    description ILIKE '%pack in pack out%'
    OR description ILIKE '%pack it in pack it out%'
    OR description ILIKE '%leave no trace%'
    OR description ILIKE '%primitive%'
  );

-- Step 6: Fix remaining shower values
-- Set shower to 'Yes' for properties with bathrooms or showers mentioned
UPDATE "sage-glamping-data"
SET shower = 'Yes'
WHERE shower IS NULL
  AND created_at >= '2025-12-11'
  AND (
    description ILIKE '%shower%'
    OR description ILIKE '%bathroom%'
    OR description ILIKE '%en suite%'
    OR description ILIKE '%private bath%'
    OR description ILIKE '%full bath%'
    OR private_bathroom = 'Yes'
  );

-- Set shower to 'No' for properties that explicitly mention no showers or shared showers only
UPDATE "sage-glamping-data"
SET shower = 'No'
WHERE shower IS NULL
  AND created_at >= '2025-12-11'
  AND (
    description ILIKE '%no shower%'
    OR description ILIKE '%shared shower%'
    OR description ILIKE '%communal shower%'
  );

-- Show updated summary
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

-- Show properties that still need manual review
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
  )
ORDER BY property_name;
