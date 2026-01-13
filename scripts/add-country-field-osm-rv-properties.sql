-- Add country field to osm_rv_properties table
-- This allows us to store both USA and Canada data in the same table

ALTER TABLE "osm_rv_properties" 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'USA';

-- Update existing records to be USA
UPDATE "osm_rv_properties" 
SET country = 'USA' 
WHERE country IS NULL;

-- Create index on country field
CREATE INDEX IF NOT EXISTS idx_osm_rv_properties_country ON "osm_rv_properties" (country) 
  WHERE country IS NOT NULL;

-- Add comment
COMMENT ON COLUMN "osm_rv_properties".country IS 'Country code: USA or CAN';

