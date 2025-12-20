-- Add new hot tub and sauna columns to all_glamping_properties table
-- Run this SQL in your Supabase SQL Editor
-- These columns should be positioned after 'hot_tub___sauna' in the schema

-- Add unit_hot_tub column (boolean)
ALTER TABLE "all_glamping_properties" 
ADD COLUMN IF NOT EXISTS unit_hot_tub BOOLEAN DEFAULT NULL;

-- Add unit_suana column (boolean) - Note: keeping original spelling as specified
ALTER TABLE "all_glamping_properties" 
ADD COLUMN IF NOT EXISTS unit_suana BOOLEAN DEFAULT NULL;

-- Add property_hot_tub column (boolean)
ALTER TABLE "all_glamping_properties" 
ADD COLUMN IF NOT EXISTS property_hot_tub BOOLEAN DEFAULT NULL;

-- Add property_suana column (boolean) - Note: keeping original spelling as specified
ALTER TABLE "all_glamping_properties" 
ADD COLUMN IF NOT EXISTS property_suana BOOLEAN DEFAULT NULL;

-- Add comments to document the columns
COMMENT ON COLUMN "all_glamping_properties".unit_hot_tub IS 
'Indicates whether individual units/accommodations have hot tubs. NULL if unknown.';

COMMENT ON COLUMN "all_glamping_properties".unit_suana IS 
'Indicates whether individual units/accommodations have saunas. NULL if unknown.';

COMMENT ON COLUMN "all_glamping_properties".property_hot_tub IS 
'Indicates whether the property has shared/communal hot tubs. NULL if unknown.';

COMMENT ON COLUMN "all_glamping_properties".property_suana IS 
'Indicates whether the property has shared/communal saunas. NULL if unknown.';

-- Create indexes for faster querying
CREATE INDEX IF NOT EXISTS idx_all_glamping_properties_unit_hot_tub 
ON "all_glamping_properties" (unit_hot_tub) 
WHERE unit_hot_tub IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_glamping_properties_unit_suana 
ON "all_glamping_properties" (unit_suana) 
WHERE unit_suana IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_glamping_properties_property_hot_tub 
ON "all_glamping_properties" (property_hot_tub) 
WHERE property_hot_tub IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_glamping_properties_property_suana 
ON "all_glamping_properties" (property_suana) 
WHERE property_suana IS NOT NULL;
