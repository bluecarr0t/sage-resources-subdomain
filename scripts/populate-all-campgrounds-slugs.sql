-- Populate slug column for all_campgrounds table based on name column
-- This script generates URL-safe slugs from the name field
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

-- Helper function to generate slug from name
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

-- Update slugs for all records where slug is NULL or empty
-- Records with the same name will share the same slug
WITH records_to_update AS (
  SELECT 
    id,
    name,
    slug
  FROM public.all_campgrounds
  WHERE name IS NOT NULL
    AND name != ''
    AND (slug IS NULL OR slug = '')
),
existing_slugs AS (
  -- Find existing slugs for these names (from records that already have slugs)
  SELECT DISTINCT ON (name)
    name,
    slug
  FROM public.all_campgrounds
  WHERE name IN (SELECT name FROM records_to_update)
    AND slug IS NOT NULL
    AND slug != ''
    AND id NOT IN (SELECT id FROM records_to_update)
  ORDER BY name, id
),
slug_mapping AS (
  SELECT 
    rtu.id,
    rtu.name,
    COALESCE(
      es.slug,  -- Use existing slug if found
      generate_slug_from_name(rtu.name)  -- Otherwise generate new slug
    ) AS new_slug
  FROM records_to_update rtu
  LEFT JOIN existing_slugs es ON rtu.name = es.name
)
UPDATE public.all_campgrounds ac
SET slug = sm.new_slug
FROM slug_mapping sm
WHERE ac.id = sm.id
  AND (ac.slug IS NULL OR ac.slug = '' OR ac.slug != sm.new_slug);

-- Verify the updates
DO $$
DECLARE
  updated_count INTEGER;
  missing_count INTEGER;
  total_count INTEGER;
BEGIN
  -- Count total records with names
  SELECT COUNT(*) INTO total_count
  FROM public.all_campgrounds
  WHERE name IS NOT NULL AND name != '';
  
  -- Count how many now have slugs
  SELECT COUNT(*) INTO updated_count
  FROM public.all_campgrounds
  WHERE name IS NOT NULL 
    AND name != ''
    AND slug IS NOT NULL
    AND slug != '';
  
  -- Count how many are still missing
  SELECT COUNT(*) INTO missing_count
  FROM public.all_campgrounds
  WHERE name IS NOT NULL 
    AND name != ''
    AND (slug IS NULL OR slug = '');
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Slug Population Summary for all_campgrounds:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total records with names: %', total_count;
  RAISE NOTICE 'Records with slugs: %', updated_count;
  IF missing_count > 0 THEN
    RAISE WARNING 'Records still missing slugs: %', missing_count;
  ELSE
    RAISE NOTICE 'All records with names now have slugs';
  END IF;
  RAISE NOTICE '========================================';
END $$;

-- Show a sample of the results
SELECT 
  id,
  name,
  slug,
  CASE 
    WHEN slug IS NULL OR slug = '' THEN 'Missing'
    ELSE 'OK'
  END AS status
FROM public.all_campgrounds
WHERE name IS NOT NULL AND name != ''
ORDER BY id
LIMIT 20;
