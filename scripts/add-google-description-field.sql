-- Add google_description field to sage-glamping-data table
-- Run this SQL in your Supabase SQL Editor
-- This adds the Google Business profile description field

-- Description Field
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS google_description TEXT;

-- Create index for frequently queried field
CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_google_description 
ON "sage-glamping-data" (google_description) 
WHERE google_description IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN "sage-glamping-data".google_description IS 
'Business description/editorial summary from Google Places API (Google Business profile description)';
