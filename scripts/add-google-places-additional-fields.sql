-- Add additional Google Places API fields to sage-glamping-data table
-- Run this SQL in your Supabase SQL Editor
-- This adds: business status, opening hours, parking options, price level, payment options, accessibility options, and allows dogs

-- Business Status Field
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS google_business_status TEXT;

-- Opening Hours Fields
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS google_opening_hours JSONB,
ADD COLUMN IF NOT EXISTS google_current_opening_hours JSONB;

-- Parking Options Field
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS google_parking_options JSONB;

-- Price Level Field
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS google_price_level INTEGER;

-- Payment Options Field
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS google_payment_options JSONB;

-- Accessibility Options Fields
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS google_wheelchair_accessible_parking BOOLEAN,
ADD COLUMN IF NOT EXISTS google_wheelchair_accessible_entrance BOOLEAN,
ADD COLUMN IF NOT EXISTS google_wheelchair_accessible_restroom BOOLEAN,
ADD COLUMN IF NOT EXISTS google_wheelchair_accessible_seating BOOLEAN;

-- Allows Dogs Field
ALTER TABLE "sage-glamping-data" 
ADD COLUMN IF NOT EXISTS google_allows_dogs BOOLEAN;

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_google_business_status 
ON "sage-glamping-data" (google_business_status) 
WHERE google_business_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_google_price_level 
ON "sage-glamping-data" (google_price_level) 
WHERE google_price_level IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sage_glamping_data_google_allows_dogs 
ON "sage-glamping-data" (google_allows_dogs) 
WHERE google_allows_dogs IS NOT NULL;

-- Add comments to document the columns
COMMENT ON COLUMN "sage-glamping-data".google_business_status IS 
'Business status from Google Places API: OPERATIONAL, CLOSED_TEMPORARILY, or CLOSED_PERMANENTLY';

COMMENT ON COLUMN "sage-glamping-data".google_opening_hours IS 
'Regular opening hours from Google Places API stored as JSONB (includes weekdayDescriptions, periods, etc.)';

COMMENT ON COLUMN "sage-glamping-data".google_current_opening_hours IS 
'Current opening hours for today from Google Places API stored as JSONB';

COMMENT ON COLUMN "sage-glamping-data".google_parking_options IS 
'Parking options from Google Places API stored as JSONB (parkingLot, parkingValet, parkingFree, etc.)';

COMMENT ON COLUMN "sage-glamping-data".google_price_level IS 
'Price level from Google Places API: 0=FREE, 1=INEXPENSIVE, 2=MODERATE, 3=EXPENSIVE, 4=VERY_EXPENSIVE';

COMMENT ON COLUMN "sage-glamping-data".google_payment_options IS 
'Payment options from Google Places API stored as JSONB (acceptsCreditCards, acceptsCashOnly, acceptsNfc, etc.)';

COMMENT ON COLUMN "sage-glamping-data".google_wheelchair_accessible_parking IS 
'Whether wheelchair accessible parking is available according to Google Places API';

COMMENT ON COLUMN "sage-glamping-data".google_wheelchair_accessible_entrance IS 
'Whether wheelchair accessible entrance is available according to Google Places API';

COMMENT ON COLUMN "sage-glamping-data".google_wheelchair_accessible_restroom IS 
'Whether wheelchair accessible restroom is available according to Google Places API';

COMMENT ON COLUMN "sage-glamping-data".google_wheelchair_accessible_seating IS 
'Whether wheelchair accessible seating is available according to Google Places API';

COMMENT ON COLUMN "sage-glamping-data".google_allows_dogs IS 
'Whether dogs are allowed according to Google Places API';
