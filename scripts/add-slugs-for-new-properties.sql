-- Add slug values for specific properties in sage-glamping-data table
-- This script updates slugs for the properties provided by the user
-- Run this SQL in your Supabase SQL Editor

-- Ensure the transliteration function exists
CREATE OR REPLACE FUNCTION transliterate_to_ascii(input_text TEXT) 
RETURNS TEXT AS $$
DECLARE
  result TEXT := input_text;
BEGIN
  -- Apply all transliterations sequentially
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

-- Helper function to generate slug from property name
CREATE OR REPLACE FUNCTION generate_slug_from_name(property_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          transliterate_to_ascii(LOWER(TRIM(property_name))),
          '[^\w\s-]', '', 'g'  -- Remove remaining special characters
        ),
        '\s+', '-', 'g'  -- Replace spaces with hyphens
      ),
      '-+', '-', 'g'  -- Replace multiple hyphens with single hyphen
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update slugs for the specific properties
-- First, check if any of these property_names already have slugs assigned
-- If so, use those slugs to maintain consistency
WITH target_properties AS (
  SELECT id, property_name
  FROM "sage-glamping-data"
  WHERE id IN (
    10863, 10864, 10876, 10871, 10861, 10862, 10866, 10868, 10874, 10867,
    10869, 10875, 10865, 10873, 10872, 10870, 10856, 10847, 10855, 10853,
    10845, 10842, 10848, 10846, 10859, 10860, 10843, 10850, 10854, 10858,
    10844, 10852, 10840, 10841, 10851, 10849, 10857
  )
  AND property_name IS NOT NULL
  AND property_name != ''
),
existing_slugs AS (
  -- Find existing slugs for these property names (from other records)
  SELECT DISTINCT ON (property_name)
    property_name,
    slug
  FROM "sage-glamping-data"
  WHERE property_name IN (SELECT property_name FROM target_properties)
    AND slug IS NOT NULL
    AND slug != ''
    AND id NOT IN (SELECT id FROM target_properties)
  ORDER BY property_name, id
),
slug_mapping AS (
  SELECT 
    tp.id,
    tp.property_name,
    COALESCE(
      es.slug,  -- Use existing slug if found
      generate_slug_from_name(tp.property_name)  -- Otherwise generate new slug
    ) AS new_slug
  FROM target_properties tp
  LEFT JOIN existing_slugs es ON tp.property_name = es.property_name
)
UPDATE "sage-glamping-data" s
SET slug = sm.new_slug
FROM slug_mapping sm
WHERE s.id = sm.id
  AND (s.slug IS NULL OR s.slug = '' OR s.slug != sm.new_slug);

-- Verify the updates
DO $$
DECLARE
  updated_count INTEGER;
  missing_count INTEGER;
BEGIN
  -- Count how many were updated
  SELECT COUNT(*) INTO updated_count
  FROM "sage-glamping-data"
  WHERE id IN (
    10863, 10864, 10876, 10871, 10861, 10862, 10866, 10868, 10874, 10867,
    10869, 10875, 10865, 10873, 10872, 10870, 10856, 10847, 10855, 10853,
    10845, 10842, 10848, 10846, 10859, 10860, 10843, 10850, 10854, 10858,
    10844, 10852, 10840, 10841, 10851, 10849, 10857
  )
  AND slug IS NOT NULL
  AND slug != '';
  
  -- Count how many are still missing
  SELECT COUNT(*) INTO missing_count
  FROM "sage-glamping-data"
  WHERE id IN (
    10863, 10864, 10876, 10871, 10861, 10862, 10866, 10868, 10874, 10867,
    10869, 10875, 10865, 10873, 10872, 10870, 10856, 10847, 10855, 10853,
    10845, 10842, 10848, 10846, 10859, 10860, 10843, 10850, 10854, 10858,
    10844, 10852, 10840, 10841, 10851, 10849, 10857
  )
  AND (slug IS NULL OR slug = '');
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Slug Update Summary:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Properties updated with slugs: %', updated_count;
  IF missing_count > 0 THEN
    RAISE WARNING 'Properties still missing slugs: %', missing_count;
  ELSE
    RAISE NOTICE 'All target properties now have slugs';
  END IF;
  RAISE NOTICE '========================================';
END $$;

-- Show the results
SELECT 
  id,
  property_name,
  slug,
  CASE 
    WHEN slug IS NULL OR slug = '' THEN 'Missing'
    ELSE 'OK'
  END AS status
FROM "sage-glamping-data"
WHERE id IN (
  10863, 10864, 10876, 10871, 10861, 10862, 10866, 10868, 10874, 10867,
  10869, 10875, 10865, 10873, 10872, 10870, 10856, 10847, 10855, 10853,
  10845, 10842, 10848, 10846, 10859, 10860, 10843, 10850, 10854, 10858,
  10844, 10852, 10840, 10841, 10851, 10849, 10857
)
ORDER BY id;
