-- Create the ridb_campsites table
-- Run this SQL in your Supabase SQL Editor
-- This table stores campsite data from recreation.gov's RIDB API

CREATE TABLE IF NOT EXISTS "ridb_campsites" (
  id BIGSERIAL PRIMARY KEY,
  -- Core Campsite Fields
  ridb_campsite_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  campsite_type TEXT,
  campsite_use_type TEXT,
  loop TEXT,
  site TEXT,
  site_access TEXT,
  campsite_accessible BOOLEAN,
  campsite_reservable BOOLEAN,
  campsite_booking_url TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  description TEXT,
  created_date TIMESTAMP WITH TIME ZONE,
  last_updated_date TIMESTAMP WITH TIME ZONE,
  -- Parent Facility (Campground) Info
  facility_id TEXT,
  facility_name TEXT,
  facility_type TEXT,
  facility_latitude NUMERIC,
  facility_longitude NUMERIC,
  facility_address TEXT,
  facility_city TEXT,
  facility_state TEXT,
  facility_postal_code TEXT,
  facility_reservable BOOLEAN,
  facility_reservation_url TEXT,
  facility_use_fee_description TEXT,
  facility_phone TEXT,
  facility_email TEXT,
  facility_website_url TEXT,
  -- Parent Recreation Area Info
  recarea_id TEXT,
  recarea_name TEXT,
  recarea_latitude NUMERIC,
  recarea_longitude NUMERIC,
  -- Organization
  organization_id TEXT,
  organization_name TEXT,
  -- Campsite Attributes (JSONB)
  attributes JSONB,
  -- Permitted Equipment (JSONB)
  permitted_equipment JSONB,
  -- Media (JSONB)
  media JSONB,
  entity_media JSONB,
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  data_completeness_score NUMERIC(5,2)
);

-- Create the ridb_collection_progress table
-- Track collection progress to enable resume capability
CREATE TABLE IF NOT EXISTS "ridb_collection_progress" (
  id BIGSERIAL PRIMARY KEY,
  collection_type TEXT NOT NULL DEFAULT 'campsites' UNIQUE,
  last_processed_facility_id TEXT,
  last_processed_campsite_id TEXT,
  total_facilities_processed INTEGER DEFAULT 0,
  total_campsites_processed INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'in_progress',
  error_message TEXT
);

-- Enable Row Level Security
ALTER TABLE "ridb_campsites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ridb_collection_progress" ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON "ridb_campsites"
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access" ON "ridb_collection_progress"
  FOR SELECT
  USING (true);

-- Create indexes on frequently queried fields
CREATE INDEX IF NOT EXISTS idx_ridb_campsites_ridb_campsite_id ON "ridb_campsites" (ridb_campsite_id);
CREATE INDEX IF NOT EXISTS idx_ridb_campsites_facility_id ON "ridb_campsites" (facility_id) 
WHERE facility_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ridb_campsites_recarea_id ON "ridb_campsites" (recarea_id) 
WHERE recarea_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ridb_campsites_coordinates ON "ridb_campsites" (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ridb_campsites_facility_state ON "ridb_campsites" (facility_state) 
WHERE facility_state IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ridb_campsites_campsite_type ON "ridb_campsites" (campsite_type) 
WHERE campsite_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ridb_campsites_campsite_use_type ON "ridb_campsites" (campsite_use_type) 
WHERE campsite_use_type IS NOT NULL;

-- Index for progress tracking
CREATE INDEX IF NOT EXISTS idx_ridb_collection_progress_type ON "ridb_collection_progress" (collection_type);
CREATE INDEX IF NOT EXISTS idx_ridb_collection_progress_status ON "ridb_collection_progress" (status);

-- Add comments to document the tables
COMMENT ON TABLE "ridb_campsites" IS 'Campsite data from recreation.gov RIDB API with parent facility and recreation area information';
COMMENT ON TABLE "ridb_collection_progress" IS 'Tracks progress of RIDB data collection to enable resume capability';
COMMENT ON COLUMN "ridb_campsites".ridb_campsite_id IS 'Original RIDB Campsite ID (unique identifier from RIDB API)';
COMMENT ON COLUMN "ridb_campsites".data_completeness_score IS 'Data completeness score from 0-100 based on available fields';

