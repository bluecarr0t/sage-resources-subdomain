-- Check for slugs with special/non-ASCII characters
-- Run this SQL in your Supabase SQL Editor
-- This query finds all slugs that contain characters other than lowercase letters, numbers, and hyphens

-- Summary: Count of problematic slugs
SELECT 
  COUNT(DISTINCT property_name) as properties_with_special_chars,
  COUNT(DISTINCT slug) as unique_slugs_with_special_chars,
  COUNT(*) as total_records_with_problematic_slugs
FROM "sage-glamping-data"
WHERE property_name IS NOT NULL
  AND slug IS NOT NULL
  AND slug != ''
  AND slug ~ '[^a-z0-9-]';

-- Detailed list: Show all slugs with special characters
SELECT 
  property_name,
  slug,
  -- Extract and show the problematic characters (unique characters only)
  (SELECT STRING_AGG(DISTINCT chr, '' ORDER BY chr)
   FROM (
     SELECT UNNEST(STRING_TO_ARRAY(REGEXP_REPLACE(slug, '[a-z0-9-]', '', 'g'), NULL)) as chr
   ) chars) as special_chars,
  COUNT(*) as record_count
FROM "sage-glamping-data"
WHERE property_name IS NOT NULL
  AND slug IS NOT NULL
  AND slug != ''
  AND slug ~ '[^a-z0-9-]'
GROUP BY property_name, slug
ORDER BY record_count DESC, property_name
LIMIT 50;

-- Find unique special characters across all slugs
WITH problematic_slugs AS (
  SELECT DISTINCT slug
  FROM "sage-glamping-data"
  WHERE property_name IS NOT NULL
    AND slug IS NOT NULL
    AND slug != ''
    AND slug ~ '[^a-z0-9-]'
),
char_breakdown AS (
  SELECT 
    UNNEST(STRING_TO_ARRAY(REGEXP_REPLACE(slug, '[a-z0-9-]', '', 'g'), NULL)) as special_char
  FROM problematic_slugs
)
SELECT 
  special_char,
  CHR(ASCII(special_char)) as char_name,
  ASCII(special_char) as ascii_code,
  'U+' || UPPER(LPAD(TO_HEX(ASCII(special_char)), 4, '0')) as unicode,
  COUNT(*) as occurrence_count
FROM char_breakdown
GROUP BY special_char
ORDER BY occurrence_count DESC;
