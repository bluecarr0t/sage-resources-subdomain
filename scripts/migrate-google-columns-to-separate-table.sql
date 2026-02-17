-- Migrate Google Places columns from all_glamping_properties to a separate table
-- Run this SQL in your Supabase SQL Editor
-- This migration normalizes the database by moving Google Places data into its own table

-- Step 1: Create the new google_places_data table
CREATE TABLE IF NOT EXISTS "google_places_data" (
  id BIGSERIAL PRIMARY KEY,
  property_id BIGINT NOT NULL REFERENCES "all_glamping_properties"(id) ON DELETE CASCADE,
  property_name TEXT NOT NULL,
  
  -- Google Place ID (unique identifier from Google)
  google_place_id TEXT,
  
  -- Contact Information
  google_phone_number TEXT,
  google_website_uri TEXT,
  google_description TEXT,
  
  -- Amenities & Services
  google_dine_in BOOLEAN,
  google_takeout BOOLEAN,
  google_delivery BOOLEAN,
  google_serves_breakfast BOOLEAN,
  google_serves_lunch BOOLEAN,
  google_serves_dinner BOOLEAN,
  google_serves_brunch BOOLEAN,
  google_outdoor_seating BOOLEAN,
  google_live_music BOOLEAN,
  google_menu_uri TEXT,
  
  -- Categorization
  google_place_types JSONB,
  google_primary_type TEXT,
  google_primary_type_display_name TEXT,
  
  -- Media
  google_photos JSONB,
  google_icon_uri TEXT,
  google_icon_background_color TEXT,
  
  -- Reservation & Booking
  google_reservable BOOLEAN,
  
  -- Ratings
  google_rating NUMERIC,
  google_user_rating_total INTEGER,
  
  -- Business Status
  google_business_status TEXT,
  
  -- Opening Hours
  google_opening_hours JSONB,
  google_current_opening_hours JSONB,
  
  -- Parking Options
  google_parking_options JSONB,
  
  -- Price Level (0-4: FREE, INEXPENSIVE, MODERATE, EXPENSIVE, VERY_EXPENSIVE)
  google_price_level INTEGER,
  
  -- Payment Options
  google_payment_options JSONB,
  
  -- Accessibility Options
  google_wheelchair_accessible_parking BOOLEAN,
  google_wheelchair_accessible_entrance BOOLEAN,
  google_wheelchair_accessible_restroom BOOLEAN,
  google_wheelchair_accessible_seating BOOLEAN,
  
  -- Pet Policy
  google_allows_dogs BOOLEAN,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one-to-one relationship (one property can have one Google Places record)
  CONSTRAINT unique_property_google_data UNIQUE (property_id)
);

-- Step 2: Create indexes on the new table
CREATE INDEX IF NOT EXISTS idx_google_places_data_property_id 
ON "google_places_data" (property_id);

CREATE INDEX IF NOT EXISTS idx_google_places_data_property_name 
ON "google_places_data" (property_name);

CREATE INDEX IF NOT EXISTS idx_google_places_data_google_place_id 
ON "google_places_data" (google_place_id) 
WHERE google_place_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_google_places_data_google_phone 
ON "google_places_data" (google_phone_number) 
WHERE google_phone_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_google_places_data_google_website 
ON "google_places_data" (google_website_uri) 
WHERE google_website_uri IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_google_places_data_google_primary_type 
ON "google_places_data" (google_primary_type) 
WHERE google_primary_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_google_places_data_google_business_status 
ON "google_places_data" (google_business_status) 
WHERE google_business_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_google_places_data_google_price_level 
ON "google_places_data" (google_price_level) 
WHERE google_price_level IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_google_places_data_google_allows_dogs 
ON "google_places_data" (google_allows_dogs) 
WHERE google_allows_dogs IS NOT NULL;

-- Step 3: Migrate existing data from all_glamping_properties to google_places_data
-- This uses a dynamic approach to only select columns that actually exist
DO $$
DECLARE
  column_list TEXT;
  select_list TEXT;
  where_clause TEXT;
  sql_query TEXT;
  col_exists BOOLEAN;
  google_columns TEXT[] := ARRAY[
    'google_place_id', 'google_phone_number', 'google_website_uri', 'google_description',
    'google_dine_in', 'google_takeout', 'google_delivery', 'google_serves_breakfast',
    'google_serves_lunch', 'google_serves_dinner', 'google_serves_brunch',
    'google_outdoor_seating', 'google_live_music', 'google_menu_uri',
    'google_place_types', 'google_primary_type', 'google_primary_type_display_name',
    'google_photos', 'google_icon_uri', 'google_icon_background_color',
    'google_reservable', 'google_rating', 'google_user_rating_total',
    'google_business_status', 'google_opening_hours', 'google_current_opening_hours',
    'google_parking_options', 'google_price_level', 'google_payment_options',
    'google_wheelchair_accessible_parking', 'google_wheelchair_accessible_entrance',
    'google_wheelchair_accessible_restroom', 'google_wheelchair_accessible_seating',
    'google_allows_dogs'
  ];
  col TEXT;
BEGIN
  -- Build column list and select list dynamically
  column_list := 'property_id, property_name';
  select_list := 'id AS property_id, property_name';
  where_clause := '';
  
  -- Check each Google column and add to lists if it exists
  FOREACH col IN ARRAY google_columns
  LOOP
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'all_glamping_properties' 
      AND column_name = col
    ) INTO col_exists;
    
    IF col_exists THEN
      column_list := column_list || ', ' || col;
      select_list := select_list || ', ' || col;
      IF where_clause != '' THEN
        where_clause := where_clause || ' OR ';
      END IF;
      where_clause := where_clause || col || ' IS NOT NULL';
    END IF;
  END LOOP;
  
  -- Add timestamps (these should always exist)
  column_list := column_list || ', created_at, updated_at';
  select_list := select_list || ', created_at, updated_at';
  
  -- Build and execute the INSERT query
  IF where_clause != '' THEN
    sql_query := format(
      'INSERT INTO "google_places_data" (%s) SELECT %s FROM "all_glamping_properties" WHERE %s',
      column_list,
      select_list,
      where_clause
    );
    
    EXECUTE sql_query;
  END IF;
END $$;

-- Step 4: Drop indexes on Google columns from all_glamping_properties (before dropping columns)
DROP INDEX IF EXISTS idx_all_glamping_properties_google_place_id;
DROP INDEX IF EXISTS idx_sage_glamping_data_google_phone;
DROP INDEX IF EXISTS idx_sage_glamping_data_google_website;
DROP INDEX IF EXISTS idx_sage_glamping_data_google_primary_type;
DROP INDEX IF EXISTS idx_sage_glamping_data_google_business_status;
DROP INDEX IF EXISTS idx_sage_glamping_data_google_price_level;
DROP INDEX IF EXISTS idx_sage_glamping_data_google_allows_dogs;
DROP INDEX IF EXISTS idx_sage_glamping_data_google_rating;
DROP INDEX IF EXISTS idx_sage_glamping_data_google_description;

-- Step 5: Drop all Google columns from all_glamping_properties
ALTER TABLE "all_glamping_properties"
DROP COLUMN IF EXISTS google_place_id,
DROP COLUMN IF EXISTS google_phone_number,
DROP COLUMN IF EXISTS google_website_uri,
DROP COLUMN IF EXISTS google_description,
DROP COLUMN IF EXISTS google_dine_in,
DROP COLUMN IF EXISTS google_takeout,
DROP COLUMN IF EXISTS google_delivery,
DROP COLUMN IF EXISTS google_serves_breakfast,
DROP COLUMN IF EXISTS google_serves_lunch,
DROP COLUMN IF EXISTS google_serves_dinner,
DROP COLUMN IF EXISTS google_serves_brunch,
DROP COLUMN IF EXISTS google_outdoor_seating,
DROP COLUMN IF EXISTS google_live_music,
DROP COLUMN IF EXISTS google_menu_uri,
DROP COLUMN IF EXISTS google_place_types,
DROP COLUMN IF EXISTS google_primary_type,
DROP COLUMN IF EXISTS google_primary_type_display_name,
DROP COLUMN IF EXISTS google_photos,
DROP COLUMN IF EXISTS google_icon_uri,
DROP COLUMN IF EXISTS google_icon_background_color,
DROP COLUMN IF EXISTS google_reservable,
DROP COLUMN IF EXISTS google_rating,
DROP COLUMN IF EXISTS google_user_rating_total,
DROP COLUMN IF EXISTS google_business_status,
DROP COLUMN IF EXISTS google_opening_hours,
DROP COLUMN IF EXISTS google_current_opening_hours,
DROP COLUMN IF EXISTS google_parking_options,
DROP COLUMN IF EXISTS google_price_level,
DROP COLUMN IF EXISTS google_payment_options,
DROP COLUMN IF EXISTS google_wheelchair_accessible_parking,
DROP COLUMN IF EXISTS google_wheelchair_accessible_entrance,
DROP COLUMN IF EXISTS google_wheelchair_accessible_restroom,
DROP COLUMN IF EXISTS google_wheelchair_accessible_seating,
DROP COLUMN IF EXISTS google_allows_dogs;

-- Step 6: Add comments to document the new table
COMMENT ON TABLE "google_places_data" IS 
'Google Places API data for glamping properties. One-to-one relationship with all_glamping_properties.';

COMMENT ON COLUMN "google_places_data".property_id IS 
'Foreign key reference to all_glamping_properties.id';

COMMENT ON COLUMN "google_places_data".property_name IS 
'Property name for reference (denormalized for easier querying)';

COMMENT ON COLUMN "google_places_data".google_place_id IS 
'Google Places API place_id - Can be stored permanently per Google Terms of Service';

-- Step 7: Create a trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_google_places_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_google_places_data_updated_at
BEFORE UPDATE ON "google_places_data"
FOR EACH ROW
EXECUTE FUNCTION update_google_places_data_updated_at();
