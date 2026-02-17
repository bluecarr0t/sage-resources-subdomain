-- Update date_added to match created_at
-- Run this SQL in your Supabase SQL Editor
-- This script sets date_added to the value of created_at for all rows

UPDATE "all_glamping_properties"
SET date_added = TO_CHAR(created_at, 'YYYY-MM-DD')
WHERE created_at IS NOT NULL;
