-- Add is_closed column to all_glamping_properties table
-- Run this SQL in your Supabase SQL Editor

-- Add the column with default value 'No' and NOT NULL constraint
ALTER TABLE "all_glamping_properties" 
ADD COLUMN IF NOT EXISTS is_closed TEXT NOT NULL DEFAULT 'No';

-- Update all existing records to 'No' (in case any were created before default was set)
UPDATE "all_glamping_properties"
SET is_closed = 'No'
WHERE is_closed IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN "all_glamping_properties".is_closed IS 
'Indicates whether the property is closed. Valid values: "Yes" or "No". Default: "No".';

-- Create index for faster querying and filtering
CREATE INDEX IF NOT EXISTS idx_all_glamping_properties_is_closed 
ON "all_glamping_properties" (is_closed) 
WHERE is_closed IS NOT NULL;
