-- Add Google Rating and Review Count columns to sage-glamping-data table
-- Run this SQL in your Supabase SQL Editor

-- Rating and Review Fields
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS google_rating NUMERIC,
ADD COLUMN IF NOT EXISTS google_user_rating_total INTEGER;

-- Create index for rating field
CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_google_rating 
ON "sage-glamping-data" (google_rating) 
WHERE google_rating IS NOT NULL;

-- Add comments to document the columns
COMMENT ON COLUMN "sage-glamping-data".google_rating IS 
'Average user rating from Google Places API (1.0-5.0)';

COMMENT ON COLUMN "sage-glamping-data".google_user_rating_total IS 
'Total number of user reviews from Google Places API';

