-- Add is_glamping_property column to sage-glamping-data table
-- Run this SQL in your Supabase SQL Editor

-- Add the column with default value 'Yes' and NOT NULL constraint
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS is_glamping_property TEXT NOT NULL DEFAULT 'Yes';

-- Update all existing records to 'Yes' (in case any were created before default was set)
UPDATE "sage-glamping-data"
SET is_glamping_property = 'Yes'
WHERE is_glamping_property IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN "sage-glamping-data".is_glamping_property IS 
'Indicates whether the property is a glamping property. Valid values: "Yes" or "No". Default: "Yes".';

-- Create index for faster querying and filtering
CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_is_glamping_property 
ON "sage-glamping-data" (is_glamping_property);
