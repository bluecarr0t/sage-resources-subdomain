-- Create the all_rv_properties table
-- Run this SQL in your Supabase SQL Editor
-- Based on all_campgrounds table structure with RV-specific columns from campspot table

CREATE TABLE IF NOT EXISTS "all_rv_properties" (
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
  -- Campground Type (from all_campgrounds)
  campground_type TEXT,
  -- RV-Specific Features (from campspot table)
  -- Hookups
  full_hook_up BOOLEAN,
  water_hookup BOOLEAN,
  electrical_hook_up BOOLEAN,
  sewer_hook_up BOOLEAN,
  -- RV Vehicle Compatibility
  rv_vehicle_length TEXT,
  rv_parking TEXT,
  rv_accommodates_slideout BOOLEAN,
  rv_surface_type TEXT,
  rv_surface_level BOOLEAN,
  -- RV Class Support
  rv_vehicles_fifth_wheels BOOLEAN,
  rv_vehicles_class_a_rvs BOOLEAN,
  rv_vehicles_class_b_rvs BOOLEAN,
  rv_vehicles_class_c_rvs BOOLEAN,
  rv_vehicles_toy_hauler BOOLEAN,
  -- Additional RV Features
  generators_allowed BOOLEAN,
  cable_tv BOOLEAN,
  pull_through_sites BOOLEAN,
  back_in_sites BOOLEAN,
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_verified TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE "all_rv_properties" ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON "all_rv_properties"
  FOR SELECT
  USING (true);

-- Create indexes on frequently queried fields
CREATE INDEX IF NOT EXISTS idx_all_rv_properties_coordinates ON "all_rv_properties" (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_rv_properties_state ON "all_rv_properties" (state) 
WHERE state IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_rv_properties_county ON "all_rv_properties" (county) 
WHERE county IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_rv_properties_city ON "all_rv_properties" (city) 
WHERE city IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_rv_properties_region ON "all_rv_properties" (region) 
WHERE region IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_rv_properties_osm_id ON "all_rv_properties" (osm_id) 
WHERE osm_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_rv_properties_slug ON "all_rv_properties" (slug) 
WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_rv_properties_rv_camping_available ON "all_rv_properties" (rv_camping_available) 
WHERE rv_camping_available IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_rv_properties_full_hook_up ON "all_rv_properties" (full_hook_up) 
WHERE full_hook_up IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_rv_properties_max_rv_length ON "all_rv_properties" (max_rv_length) 
WHERE max_rv_length IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_all_rv_properties_campground_type ON "all_rv_properties" (campground_type) 
WHERE campground_type IS NOT NULL;

-- Add comments to document the columns
COMMENT ON TABLE "all_rv_properties" IS 'RV properties and campgrounds with comprehensive RV-specific features and amenities';
COMMENT ON COLUMN "all_rv_properties".osm_id IS 'OpenStreetMap node/way/relation ID';
COMMENT ON COLUMN "all_rv_properties".osm_type IS 'OpenStreetMap element type: node, way, or relation';
COMMENT ON COLUMN "all_rv_properties".osm_tags IS 'All OpenStreetMap tags stored as JSONB for reference';
COMMENT ON COLUMN "all_rv_properties".campground_type IS 'Ownership type: private (privately owned), state (state owned), federal (federally owned), or unknown';
COMMENT ON COLUMN "all_rv_properties".full_hook_up IS 'Full hookup: water, sewer, and electrical hookups all available at the site';
COMMENT ON COLUMN "all_rv_properties".rv_vehicle_length IS 'Maximum RV vehicle length accommodated (from campspot data)';
COMMENT ON COLUMN "all_rv_properties".rv_parking IS 'RV parking details and restrictions';
COMMENT ON COLUMN "all_rv_properties".rv_accommodates_slideout IS 'Whether the site accommodates RVs with slideouts';
COMMENT ON COLUMN "all_rv_properties".rv_surface_type IS 'Surface type of RV sites (e.g., gravel, concrete, asphalt, grass)';
COMMENT ON COLUMN "all_rv_properties".rv_surface_level IS 'Whether the RV surface is level';
COMMENT ON COLUMN "all_rv_properties".rv_vehicles_fifth_wheels IS 'Whether the property accommodates fifth wheel RVs';
COMMENT ON COLUMN "all_rv_properties".rv_vehicles_class_a_rvs IS 'Whether the property accommodates Class A motorhomes';
COMMENT ON COLUMN "all_rv_properties".rv_vehicles_class_b_rvs IS 'Whether the property accommodates Class B motorhomes (camper vans)';
COMMENT ON COLUMN "all_rv_properties".rv_vehicles_class_c_rvs IS 'Whether the property accommodates Class C motorhomes';
COMMENT ON COLUMN "all_rv_properties".rv_vehicles_toy_hauler IS 'Whether the property accommodates toy hauler RVs';
COMMENT ON COLUMN "all_rv_properties".generators_allowed IS 'Whether generators are allowed at the property';
COMMENT ON COLUMN "all_rv_properties".cable_tv IS 'Whether cable TV hookup is available';
COMMENT ON COLUMN "all_rv_properties".pull_through_sites IS 'Whether pull-through sites are available';
COMMENT ON COLUMN "all_rv_properties".back_in_sites IS 'Whether back-in sites are available';
