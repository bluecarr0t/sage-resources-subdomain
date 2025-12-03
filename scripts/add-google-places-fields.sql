-- Add Google Places API fields to sage-glamping-data table
-- Run this SQL in your Supabase SQL Editor

-- Contact Information Fields
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS google_phone_number TEXT,
ADD COLUMN IF NOT EXISTS google_website_uri TEXT;

-- Amenities & Services Fields
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS google_dine_in BOOLEAN,
ADD COLUMN IF NOT EXISTS google_takeout BOOLEAN,
ADD COLUMN IF NOT EXISTS google_delivery BOOLEAN,
ADD COLUMN IF NOT EXISTS google_serves_breakfast BOOLEAN,
ADD COLUMN IF NOT EXISTS google_serves_lunch BOOLEAN,
ADD COLUMN IF NOT EXISTS google_serves_dinner BOOLEAN,
ADD COLUMN IF NOT EXISTS google_serves_brunch BOOLEAN,
ADD COLUMN IF NOT EXISTS google_outdoor_seating BOOLEAN,
ADD COLUMN IF NOT EXISTS google_live_music BOOLEAN,
ADD COLUMN IF NOT EXISTS google_menu_uri TEXT;

-- Categorization Fields
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS google_place_types JSONB,
ADD COLUMN IF NOT EXISTS google_primary_type TEXT,
ADD COLUMN IF NOT EXISTS google_primary_type_display_name TEXT;

-- Media Fields (Top 5 photos stored as JSONB array)
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS google_photos JSONB,
ADD COLUMN IF NOT EXISTS google_icon_uri TEXT,
ADD COLUMN IF NOT EXISTS google_icon_background_color TEXT;

-- Reservation & Booking Fields
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS google_reservable BOOLEAN;

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_google_phone 
ON "sage-glamping-data" (google_phone_number) 
WHERE google_phone_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_google_website 
ON "sage-glamping-data" (google_website_uri) 
WHERE google_website_uri IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_google_primary_type 
ON "sage-glamping-data" (google_primary_type) 
WHERE google_primary_type IS NOT NULL;

-- Add comments to document the columns
COMMENT ON COLUMN "sage-glamping-data".google_phone_number IS 
'International phone number from Google Places API';

COMMENT ON COLUMN "sage-glamping-data".google_website_uri IS 
'Official website URI from Google Places API (can validate/update existing url field)';

COMMENT ON COLUMN "sage-glamping-data".google_place_types IS 
'Array of place types/categories from Google Places API (e.g., ["lodging", "campground"])';

COMMENT ON COLUMN "sage-glamping-data".google_photos IS 
'Top 5 photos from Google Places API stored as JSONB array with photo metadata';

COMMENT ON COLUMN "sage-glamping-data".google_reservable IS 
'Whether the place accepts reservations according to Google Places API';

