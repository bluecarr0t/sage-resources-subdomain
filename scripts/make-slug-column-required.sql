-- Make slug column required and add indexes
-- Run this AFTER populate-property-slugs.ts has successfully populated all slugs
-- Run this SQL in your Supabase SQL Editor

-- PRE-CHECK: Run this query first to verify all slugs are populated:
-- SELECT 
--   COUNT(*) as total_records,
--   COUNT(property_name) as records_with_property_name,
--   COUNT(CASE WHEN property_name IS NOT NULL THEN slug END) as records_with_slug,
--   COUNT(*) - COUNT(CASE WHEN property_name IS NOT NULL THEN slug END) as missing_slug_count
-- FROM "sage-glamping-data"
-- WHERE property_name IS NOT NULL;
-- 
-- If missing_slug_count > 0, run: npx tsx scripts/populate-property-slugs.ts

-- Step 1: Check for null slugs before proceeding
DO $$
DECLARE
  records_with_property_name INTEGER;
  records_with_slug INTEGER;
  missing_slug_count INTEGER;
BEGIN
  -- Count records with property_name
  SELECT COUNT(*) INTO records_with_property_name
  FROM "sage-glamping-data"
  WHERE property_name IS NOT NULL;
  
  -- Count records with property_name that have slugs
  SELECT COUNT(*) INTO records_with_slug
  FROM "sage-glamping-data"
  WHERE property_name IS NOT NULL AND slug IS NOT NULL;
  
  missing_slug_count := records_with_property_name - records_with_slug;
  
  -- If there are missing slugs, raise an error with helpful message
  IF missing_slug_count > 0 THEN
    RAISE EXCEPTION 'Cannot make slug column required: % records with property_name are missing slugs. Please run: npx tsx scripts/populate-property-slugs.ts first to populate all slugs.', missing_slug_count;
  END IF;
  
  RAISE NOTICE 'All % records with property_name have slugs. Proceeding...', records_with_property_name;
END $$;

-- Step 2: Set default empty string for records without property_name (so we can make column NOT NULL)
-- Records without property_name don't need slugs, but we'll set them to empty string
UPDATE "sage-glamping-data"
SET slug = ''
WHERE property_name IS NULL AND slug IS NULL;

-- Step 3: Make slug column NOT NULL
-- This will only execute if the check above passes
ALTER TABLE "sage-glamping-data"
ALTER COLUMN slug SET NOT NULL;

-- Step 3: Create index for faster lookups
-- NOTE: This is NOT a unique index because multiple records with the same property_name
-- share the same slug. Uniqueness is enforced by ensuring each slug corresponds to 
-- only one property_name group (handled by populate-property-slugs.ts script).
CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_slug_lookup
ON "sage-glamping-data" (slug);

-- Add comment
COMMENT ON INDEX idx_sage_glamping_data_slug_lookup IS 
'Index on slug column for fast property lookups. Multiple records can share the same slug (same property_name).';
