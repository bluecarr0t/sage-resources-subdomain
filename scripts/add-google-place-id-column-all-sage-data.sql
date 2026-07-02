-- Add google_place_id to all_sage_data (public property listings)
-- Place IDs may be stored permanently per Google Places API Terms of Service.
-- Run in Supabase SQL Editor before npm run populate:google-place-ids

ALTER TABLE all_sage_data
ADD COLUMN IF NOT EXISTS google_place_id TEXT;

CREATE INDEX IF NOT EXISTS idx_all_sage_data_google_place_id
ON all_sage_data (google_place_id)
WHERE google_place_id IS NOT NULL;

COMMENT ON COLUMN all_sage_data.google_place_id IS
'Google Places API place_id — permanent storage allowed per Google ToS';
