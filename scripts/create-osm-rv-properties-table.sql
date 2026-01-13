-- Create the osm_rv_properties table
-- Run this SQL in your Supabase SQL Editor
-- This table stores RV Parks and RV Resorts discovered from OpenStreetMap
-- Filtered by name containing "RV Park" or "RV Resort"

CREATE TABLE IF NOT EXISTS "osm_rv_properties" (
  id BIGSERIAL PRIMARY KEY,
  
  -- OpenStreetMap IDs (for deduplication and tracking)
  osm_id BIGINT NOT NULL,
  osm_type TEXT NOT NULL, -- 'node', 'way', or 'relation'
  
  -- Core Information
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  slug TEXT,
  operator TEXT,
  
  -- Location Details
  latitude NUMERIC,
  longitude NUMERIC,
  address TEXT,
  city TEXT,
  county TEXT,
  postal_code TEXT,
  
  -- Contact Information
  website TEXT,
  phone TEXT,
  email TEXT,
  
  -- RV-Specific Features
  max_rv_length INTEGER, -- Maximum RV length in feet
  
  -- Hookup Information
  full_hook_up BOOLEAN,
  water_hookup BOOLEAN,
  electrical_hook_up BOOLEAN,
  sewer_hook_up BOOLEAN,
  
  -- Additional RV Features
  generators_allowed BOOLEAN,
  pull_through_sites BOOLEAN,
  back_in_sites BOOLEAN,
  
  -- OpenStreetMap Raw Data
  osm_tags JSONB, -- All OSM tags stored for reference
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint on OSM ID + Type to prevent duplicates
  CONSTRAINT unique_osm_rv_property UNIQUE (osm_id, osm_type)
);

-- Enable Row Level Security
ALTER TABLE "osm_rv_properties" ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON "osm_rv_properties"
  FOR SELECT
  USING (true);

-- Create indexes on frequently queried fields
CREATE INDEX IF NOT EXISTS idx_osm_rv_properties_osm_id ON "osm_rv_properties" (osm_id);
CREATE INDEX IF NOT EXISTS idx_osm_rv_properties_osm_type ON "osm_rv_properties" (osm_type);
CREATE INDEX IF NOT EXISTS idx_osm_rv_properties_state ON "osm_rv_properties" (state) 
  WHERE state IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_osm_rv_properties_coordinates ON "osm_rv_properties" (latitude, longitude) 
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_osm_rv_properties_slug ON "osm_rv_properties" (slug) 
  WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_osm_rv_properties_name ON "osm_rv_properties" (name);

-- Add comments to document the table
COMMENT ON TABLE "osm_rv_properties" IS 'RV Parks and RV Resorts from OpenStreetMap, filtered by name containing "RV Park" or "RV Resort"';
COMMENT ON COLUMN "osm_rv_properties".osm_id IS 'OpenStreetMap node/way/relation ID (unique per type)';
COMMENT ON COLUMN "osm_rv_properties".osm_type IS 'OpenStreetMap element type: node, way, or relation';
COMMENT ON COLUMN "osm_rv_properties".osm_tags IS 'All OpenStreetMap tags stored as JSONB for reference and future enrichment';
COMMENT ON COLUMN "osm_rv_properties".max_rv_length IS 'Maximum RV length accommodated in feet';
COMMENT ON COLUMN "osm_rv_properties".full_hook_up IS 'Full hookup available: water, sewer, and electrical';
COMMENT ON COLUMN "osm_rv_properties".generators_allowed IS 'Whether generators are allowed at the property';

