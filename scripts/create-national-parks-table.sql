-- Create the national-parks table
-- Run this SQL in your Supabase SQL Editor before uploading the CSV

CREATE TABLE IF NOT EXISTS "national-parks" (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  date_established TEXT,
  area_2021 TEXT,
  recreation_visitors_2021 TEXT,
  description TEXT,
  park_code TEXT,
  state TEXT,
  acres NUMERIC,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (optional)
ALTER TABLE "national-parks" ENABLE ROW LEVEL SECURITY;

-- Allow public read access (optional)
CREATE POLICY "Allow public read access" ON "national-parks"
  FOR SELECT
  USING (true);

-- Create index on coordinates for faster map queries
CREATE INDEX IF NOT EXISTS idx_national_parks_coordinates ON "national-parks" (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create index on state for filtering
CREATE INDEX IF NOT EXISTS idx_national_parks_state ON "national-parks" (state) 
WHERE state IS NOT NULL;

-- Create index on park code for lookups
CREATE INDEX IF NOT EXISTS idx_national_parks_park_code ON "national-parks" (park_code) 
WHERE park_code IS NOT NULL;

-- Add comments to document the columns
COMMENT ON TABLE "national-parks" IS 'National parks in the United States with coordinates for map display';
COMMENT ON COLUMN "national-parks".latitude IS 'Latitude coordinate for map marker placement';
COMMENT ON COLUMN "national-parks".longitude IS 'Longitude coordinate for map marker placement';
