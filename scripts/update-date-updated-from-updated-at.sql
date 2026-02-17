-- Update date_updated to match updated_at
-- Run this SQL in your Supabase SQL Editor
-- This script sets date_updated to the value of updated_at for all rows

UPDATE "all_glamping_properties"
SET date_updated = TO_CHAR(updated_at, 'YYYY-MM-DD')
WHERE updated_at IS NOT NULL;
