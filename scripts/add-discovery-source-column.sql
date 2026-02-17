-- Add discovery_source column to all_glamping_properties table
-- Run this SQL in your Supabase SQL Editor
-- This column should be positioned after 'source' in the schema

-- Add the column (will be added at the end of the table)
-- Note: PostgreSQL doesn't support specifying column position in ALTER TABLE,
-- but logically this column belongs after 'source'
ALTER TABLE "all_glamping_properties" 
ADD COLUMN IF NOT EXISTS discovery_source TEXT DEFAULT NULL;

-- Add comment to document the column
COMMENT ON COLUMN "all_glamping_properties".discovery_source IS 
'Source that led to the discovery of this property. NULL if unknown.';
