-- Populate slug column for national-parks table
-- Generates slugs from park name + "national-park"
-- Example: "Acadia" -> "acadia-national-park"
-- Run this SQL in your Supabase SQL Editor

-- Create or replace helper function for transliteration (if not exists)
CREATE OR REPLACE FUNCTION transliterate_to_ascii(input_text TEXT) 
RETURNS TEXT AS $$
DECLARE
  result TEXT := input_text;
BEGIN
  -- Apply transliterations to convert accented characters to ASCII
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

-- Update all parks with generated slugs
UPDATE "national-parks"
SET slug = TRIM(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          -- Transliterate accented characters, convert to lowercase, remove special characters, replace spaces with hyphens
          transliterate_to_ascii(LOWER(TRIM(name))),
          '[^\w\s-]', '', 'g'  -- Remove special characters except spaces and hyphens
        ),
        '\s+', '-', 'g'  -- Replace spaces with hyphens
      ),
      '-+', '-', 'g'  -- Replace multiple hyphens with single hyphen
    ),
    '^-|-$', '', 'g'  -- Remove leading/trailing hyphens
  )
) || '-national-park'
WHERE name IS NOT NULL 
  AND name != ''
  AND (slug IS NULL OR slug = '');

-- Show summary of updated records
DO $$
DECLARE
  total_parks INTEGER;
  parks_with_slugs INTEGER;
  parks_without_slugs INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_parks FROM "national-parks" WHERE name IS NOT NULL AND name != '';
  SELECT COUNT(*) INTO parks_with_slugs FROM "national-parks" WHERE slug IS NOT NULL AND slug != '';
  SELECT COUNT(*) INTO parks_without_slugs FROM "national-parks" WHERE name IS NOT NULL AND name != '' AND (slug IS NULL OR slug = '');
  
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  Total parks: %', total_parks;
  RAISE NOTICE '  Parks with slugs: %', parks_with_slugs;
  RAISE NOTICE '  Parks without slugs: %', parks_without_slugs;
END $$;

-- Show sample of generated slugs
SELECT 
  name,
  slug,
  CASE 
    WHEN slug IS NULL OR slug = '' THEN '❌ Missing'
    ELSE '✅ Set'
  END as status
FROM "national-parks"
ORDER BY name
LIMIT 10;
