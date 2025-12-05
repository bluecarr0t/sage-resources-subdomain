-- Generate slug values from property_name column
-- This script ensures all records with the same property_name get the same slug
-- Run this SQL in your Supabase SQL Editor

-- First, create a helper function for transliteration
CREATE OR REPLACE FUNCTION transliterate_to_ascii(input_text TEXT) 
RETURNS TEXT AS $$
DECLARE
  result TEXT := input_text;
BEGIN
  -- Apply all transliterations sequentially to avoid nested parentheses issues
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

-- Step 1: Generate base slugs for each unique property_name
WITH unique_properties AS (
  -- Get unique property names
  SELECT DISTINCT property_name
  FROM "sage-glamping-data"
  WHERE property_name IS NOT NULL AND property_name != ''
),
base_slugs AS (
  -- Generate base slug for each unique property_name
  -- First transliterate accented characters to ASCII, then remove special characters
  SELECT 
    property_name,
    TRIM(
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
    ) AS base_slug
  FROM unique_properties
),
-- Step 2: Handle duplicate slugs - assign numbers to duplicates
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
-- Step 3: Generate final slugs (first property keeps base, others get numbered)
final_slug_map AS (
  SELECT 
    property_name,
    CASE 
      WHEN slug_rank = 1 THEN base_slug
      ELSE base_slug || '-' || (slug_rank - 1)::TEXT
    END AS final_slug
  FROM slug_rankings
)
-- Step 4: Update all records with their property's final slug
UPDATE "sage-glamping-data" s
SET slug = fsm.final_slug
FROM final_slug_map fsm
WHERE s.property_name = fsm.property_name
  AND (s.slug IS NULL OR s.slug = '' OR s.slug != fsm.final_slug);

-- Step 5: Verify and show summary
DO $$
DECLARE
  total_with_property_name INTEGER;
  total_with_slug INTEGER;
  unique_slugs INTEGER;
  duplicate_count INTEGER;
  inconsistent_count INTEGER;
BEGIN
  -- Count records with property_name
  SELECT COUNT(*) INTO total_with_property_name
  FROM "sage-glamping-data"
  WHERE property_name IS NOT NULL AND property_name != '';
  
  -- Count records with slugs
  SELECT COUNT(*) INTO total_with_slug
  FROM "sage-glamping-data"
  WHERE property_name IS NOT NULL 
    AND property_name != ''
    AND slug IS NOT NULL 
    AND slug != '';
  
  -- Count unique slugs
  SELECT COUNT(DISTINCT slug) INTO unique_slugs
  FROM "sage-glamping-data"
  WHERE property_name IS NOT NULL 
    AND slug IS NOT NULL 
    AND slug != '';
  
  -- Count properties with duplicate slugs (should be 0 after processing)
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT slug, COUNT(DISTINCT property_name) as prop_count
    FROM "sage-glamping-data"
    WHERE property_name IS NOT NULL AND slug IS NOT NULL AND slug != ''
    GROUP BY slug
    HAVING COUNT(DISTINCT property_name) > 1
  ) duplicates;
  
  -- Count properties with inconsistent slugs (should be 0)
  SELECT COUNT(*) INTO inconsistent_count
  FROM (
    SELECT property_name, COUNT(DISTINCT slug) as slug_count
    FROM "sage-glamping-data"
    WHERE property_name IS NOT NULL AND slug IS NOT NULL AND slug != ''
    GROUP BY property_name
    HAVING COUNT(DISTINCT slug) > 1
  ) inconsistent;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Slug Generation Summary:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Records with property_name: %', total_with_property_name;
  RAISE NOTICE 'Records with slugs: %', total_with_slug;
  RAISE NOTICE 'Unique slugs generated: %', unique_slugs;
  
  IF duplicate_count > 0 THEN
    RAISE WARNING 'WARNING: % slugs are used by multiple property names', duplicate_count;
  ELSE
    RAISE NOTICE 'All slugs are unique across property names';
  END IF;
  
  IF inconsistent_count > 0 THEN
    RAISE WARNING 'WARNING: % properties have multiple slugs', inconsistent_count;
  ELSE
    RAISE NOTICE 'All records with same property_name have same slug';
  END IF;
  
  IF total_with_slug < total_with_property_name THEN
    RAISE WARNING '% records with property_name are still missing slugs', total_with_property_name - total_with_slug;
  ELSE
    RAISE NOTICE 'All records with property_name have slugs';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- Note: The transliterate_to_ascii function is kept for future use
-- If you want to remove it, uncomment the line below:
-- DROP FUNCTION IF EXISTS transliterate_to_ascii(TEXT);

-- Optional: Show example of generated slugs (uncomment to see)
-- SELECT property_name, slug, COUNT(*) as record_count
-- FROM "sage-glamping-data"
-- WHERE property_name IS NOT NULL AND slug IS NOT NULL
-- GROUP BY property_name, slug
-- ORDER BY property_name
-- LIMIT 20;
