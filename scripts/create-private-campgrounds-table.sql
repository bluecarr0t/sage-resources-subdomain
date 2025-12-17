-- Create the private_campgrounds table
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS "private_campgrounds" (
  id BIGSERIAL PRIMARY KEY,
  -- Basic Info
  name TEXT NOT NULL,
  state TEXT,
  slug TEXT,
  description TEXT,
  operator TEXT,
  -- Location
  latitude NUMERIC,
  longitude NUMERIC,
  county TEXT,
  city TEXT,
  region TEXT,
  address TEXT,
  postal_code TEXT,
  -- OSM Data
  osm_id BIGINT,
  osm_type TEXT,
  osm_tags JSONB,
  -- Size & Capacity
  total_sites INTEGER,
  rv_sites INTEGER,
  tent_sites INTEGER,
  acres NUMERIC,
  -- Business Info
  website TEXT,
  phone TEXT,
  email TEXT,
  year_established INTEGER,
  -- Pricing
  nightly_rate_min NUMERIC(10,2),
  nightly_rate_max NUMERIC(10,2),
  weekly_rate NUMERIC(10,2),
  monthly_rate NUMERIC(10,2),
  seasonal_rates BOOLEAN,
  -- Visitor Access
  operating_months TEXT,
  best_time_to_visit TEXT,
  reservation_required BOOLEAN,
  reservation_website TEXT,
  walk_ins_accepted BOOLEAN,
  -- Pet Policies
  dogs_allowed BOOLEAN,
  dogs_allowed_restrictions TEXT,
  pet_fee NUMERIC(10,2),
  pet_friendly_areas TEXT,
  -- Camping Features
  rv_camping_available BOOLEAN,
  rv_hookups TEXT,
  max_rv_length INTEGER,
  tent_camping_available BOOLEAN,
  cabin_rentals BOOLEAN,
  glamping_available BOOLEAN,
  lodging_available BOOLEAN,
  -- Amenities
  restrooms BOOLEAN,
  showers BOOLEAN,
  laundry BOOLEAN,
  dump_station BOOLEAN,
  wifi_available BOOLEAN,
  wifi_free BOOLEAN,
  cell_phone_coverage TEXT,
  store BOOLEAN,
  playground BOOLEAN,
  pool BOOLEAN,
  hot_tub BOOLEAN,
  -- Activities
  hiking_trails_available BOOLEAN,
  water_activities TEXT,
  fishing_available BOOLEAN,
  swimming_available BOOLEAN,
  beach_access BOOLEAN,
  boat_ramp BOOLEAN,
  wildlife_viewing BOOLEAN,
  -- Climate
  average_summer_temp NUMERIC(5,1),
  average_winter_temp NUMERIC(5,1),
  climate_type TEXT,
  -- Features
  notable_features TEXT,
  nearby_attractions TEXT,
  scenic_views BOOLEAN,
  -- Practical
  fire_restrictions TEXT,
  quiet_hours TEXT,
  check_in_time TEXT,
  check_out_time TEXT,
  nearest_major_city TEXT,
  distance_from_city NUMERIC(6,1),
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_verified TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE "private_campgrounds" ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON "private_campgrounds"
  FOR SELECT
  USING (true);

-- Create indexes on frequently queried fields
CREATE INDEX IF NOT EXISTS idx_private_campgrounds_coordinates ON "private_campgrounds" (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_private_campgrounds_state ON "private_campgrounds" (state) 
WHERE state IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_private_campgrounds_county ON "private_campgrounds" (county) 
WHERE county IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_private_campgrounds_city ON "private_campgrounds" (city) 
WHERE city IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_private_campgrounds_region ON "private_campgrounds" (region) 
WHERE region IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_private_campgrounds_osm_id ON "private_campgrounds" (osm_id) 
WHERE osm_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_private_campgrounds_dogs_allowed ON "private_campgrounds" (dogs_allowed) 
WHERE dogs_allowed IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_private_campgrounds_rv_camping_available ON "private_campgrounds" (rv_camping_available) 
WHERE rv_camping_available IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_private_campgrounds_glamping_available ON "private_campgrounds" (glamping_available) 
WHERE glamping_available IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_private_campgrounds_reservation_required ON "private_campgrounds" (reservation_required) 
WHERE reservation_required IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_private_campgrounds_slug ON "private_campgrounds" (slug) 
WHERE slug IS NOT NULL;

-- Add comments to document the columns
COMMENT ON TABLE "private_campgrounds" IS 'Privately owned campgrounds in California with comprehensive business and amenity information';
COMMENT ON COLUMN "private_campgrounds".osm_id IS 'OpenStreetMap node/way/relation ID';
COMMENT ON COLUMN "private_campgrounds".osm_type IS 'OpenStreetMap element type: node, way, or relation';
COMMENT ON COLUMN "private_campgrounds".osm_tags IS 'All OpenStreetMap tags stored as JSONB for reference';
COMMENT ON COLUMN "private_campgrounds".latitude IS 'Latitude coordinate for map marker placement';
COMMENT ON COLUMN "private_campgrounds".longitude IS 'Longitude coordinate for map marker placement';
