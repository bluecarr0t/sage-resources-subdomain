-- Add rate and booking URL fields to ridb_campsites table
-- Run this SQL in your Supabase SQL Editor if you've already created the table

ALTER TABLE "ridb_campsites"
  ADD COLUMN IF NOT EXISTS campsite_reservable BOOLEAN,
  ADD COLUMN IF NOT EXISTS campsite_booking_url TEXT,
  ADD COLUMN IF NOT EXISTS facility_use_fee_description TEXT,
  ADD COLUMN IF NOT EXISTS facility_website_url TEXT;

-- Add comments for new columns
COMMENT ON COLUMN "ridb_campsites".campsite_reservable IS 'Whether the campsite is reservable';
COMMENT ON COLUMN "ridb_campsites".campsite_booking_url IS 'Direct booking URL for the campsite on recreation.gov (constructed as https://www.recreation.gov/camping/campsites/{CampsiteID})';
COMMENT ON COLUMN "ridb_campsites".facility_use_fee_description IS 'Rate/pricing information for the facility (HTML formatted, e.g., "$8.00 per night(year round)")';
COMMENT ON COLUMN "ridb_campsites".facility_website_url IS 'Official website URL for the facility (extracted from LINK array)';
