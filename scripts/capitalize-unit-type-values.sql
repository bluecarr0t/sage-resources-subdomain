-- Capitalize unit_type values in sage-glamping-data table
-- This script capitalizes the first letter of each word using INITCAP
-- Example: "tents" → "Tents", "TENTS" → "Tents", "tents, cabins" → "Tents, Cabins"
-- Note: INITCAP handles special cases like "A-Frame" correctly
-- Run this SQL in your Supabase SQL Editor

-- Update unit_type to proper capitalization (title case for each word)
-- INITCAP capitalizes the first letter of each word and lowercases the rest
UPDATE "sage-glamping-data"
SET unit_type = INITCAP(unit_type)
WHERE unit_type IS NOT NULL
  AND unit_type != ''  -- Skip empty strings
  AND unit_type != INITCAP(unit_type);  -- Only update if different

-- Verify the changes
SELECT 
  unit_type,
  COUNT(*) as count
FROM "sage-glamping-data"
WHERE unit_type IS NOT NULL
GROUP BY unit_type
ORDER BY count DESC;

-- Show any remaining values that don't match INITCAP format (should be none after the update)
SELECT 
  id,
  property_name,
  unit_type,
  INITCAP(unit_type) as should_be
FROM "sage-glamping-data"
WHERE unit_type IS NOT NULL
  AND unit_type != INITCAP(unit_type)
ORDER BY unit_type;
