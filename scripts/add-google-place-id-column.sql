-- Add google_place_id column to sage-glamping-data table
-- Place IDs can be stored permanently per Google Places API Terms of Service
-- Run this SQL in your Supabase SQL Editor

-- Add Place ID column
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS google_place_id TEXT;

-- Create index for place_id lookups
CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_google_place_id 
ON "sage-glamping-data" (google_place_id) 
WHERE google_place_id IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN "sage-glamping-data".google_place_id IS 
'Google Places API place_id - Can be stored permanently per Google Terms of Service';
