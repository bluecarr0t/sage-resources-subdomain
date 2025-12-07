-- Remove descriptions that begin with "and" from sage-glamping-data table
-- Run this SQL in your Supabase SQL Editor

-- First, preview what will be updated (optional - uncomment to check)
-- SELECT 
--   id,
--   property_name,
--   description
-- FROM "sage-glamping-data"
-- WHERE description IS NOT NULL
--   AND LOWER(TRIM(description)) LIKE 'and%'
-- ORDER BY property_name;

-- Remove descriptions that begin with "and" (case-insensitive)
-- Sets the description to NULL if it starts with "and"
UPDATE "sage-glamping-data"
SET description = NULL
WHERE description IS NOT NULL
  AND LOWER(TRIM(description)) LIKE 'and%';

-- Verify the update (optional - uncomment to check)
-- Should return 0 rows after the update
-- SELECT 
--   id,
--   property_name,
--   description
-- FROM "sage-glamping-data"
-- WHERE description IS NOT NULL
--   AND LOWER(TRIM(description)) LIKE 'and%';
