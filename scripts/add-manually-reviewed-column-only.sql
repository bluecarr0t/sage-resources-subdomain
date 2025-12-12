-- SQL script to add manually_reviewed column to sage-glamping-data table
-- Run this SQL in your Supabase SQL Editor BEFORE running the upload script
--
-- Usage:
--   1. Run this SQL script in Supabase SQL Editor
--   2. Then run: npx tsx scripts/upload-to-sage-glamping-data.ts csv/new-properties/new-glamping-properties.csv --append

-- Step 1: Add manually_reviewed column with default value 'No'
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS manually_reviewed TEXT DEFAULT 'No';

-- Add check constraint to ensure only 'Yes' or 'No' values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'manually_reviewed_check'
  ) THEN
    ALTER TABLE "sage-glamping-data"
    ADD CONSTRAINT manually_reviewed_check 
    CHECK (manually_reviewed IN ('Yes', 'No'));
  END IF;
END $$;

-- Update any existing NULL values to 'No'
UPDATE "sage-glamping-data"
SET manually_reviewed = 'No'
WHERE manually_reviewed IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN "sage-glamping-data".manually_reviewed IS 
'Indicates whether this property has been manually reviewed for accuracy. Values: Yes, No. Default: No';

-- Create index for faster querying by review status
CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_manually_reviewed 
ON "sage-glamping-data" (manually_reviewed);

-- Show summary
SELECT 
  COUNT(*) as total_properties,
  COUNT(*) FILTER (WHERE manually_reviewed = 'Yes') as manually_reviewed,
  COUNT(*) FILTER (WHERE manually_reviewed = 'No') as not_reviewed
FROM "sage-glamping-data";
