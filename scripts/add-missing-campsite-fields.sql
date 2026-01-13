-- Add missing campsite fields to ridb_campsites table
-- Run this SQL in your Supabase SQL Editor if you've already created the table

ALTER TABLE "ridb_campsites"
  ADD COLUMN IF NOT EXISTS loop TEXT,
  ADD COLUMN IF NOT EXISTS site TEXT,
  ADD COLUMN IF NOT EXISTS site_access TEXT,
  ADD COLUMN IF NOT EXISTS campsite_accessible BOOLEAN,
  ADD COLUMN IF NOT EXISTS created_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_updated_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS permitted_equipment JSONB,
  ADD COLUMN IF NOT EXISTS entity_media JSONB,
  ADD COLUMN IF NOT EXISTS campsite_reservable BOOLEAN,
  ADD COLUMN IF NOT EXISTS campsite_booking_url TEXT,
  ADD COLUMN IF NOT EXISTS facility_use_fee_description TEXT,
  ADD COLUMN IF NOT EXISTS facility_website_url TEXT;

-- Add comments for new columns
COMMENT ON COLUMN "ridb_campsites".loop IS 'Loop identifier for the campsite';
COMMENT ON COLUMN "ridb_campsites".site IS 'Site identifier for the campsite';
COMMENT ON COLUMN "ridb_campsites".site_access IS 'Site access information';
COMMENT ON COLUMN "ridb_campsites".campsite_accessible IS 'Whether the campsite is accessible';
COMMENT ON COLUMN "ridb_campsites".created_date IS 'Date campsite was created in RIDB';
COMMENT ON COLUMN "ridb_campsites".last_updated_date IS 'Date campsite was last updated in RIDB';
COMMENT ON COLUMN "ridb_campsites".permitted_equipment IS 'Array of permitted equipment objects (RV types, max length, etc.)';
COMMENT ON COLUMN "ridb_campsites".entity_media IS 'Array of entity media objects (images/videos)';
COMMENT ON COLUMN "ridb_campsites".campsite_reservable IS 'Whether the campsite is reservable';
COMMENT ON COLUMN "ridb_campsites".campsite_booking_url IS 'Direct booking URL for the campsite on recreation.gov';
COMMENT ON COLUMN "ridb_campsites".facility_use_fee_description IS 'Rate/pricing information for the facility (HTML formatted)';
COMMENT ON COLUMN "ridb_campsites".facility_website_url IS 'Official website URL for the facility';

