-- Update discovery_source and source columns
-- Run this SQL in your Supabase SQL Editor
-- This script:
-- 1. Sets discovery_source to the current value of source
-- 2. Sets source to 'Sage' for all rows

BEGIN;

-- Step 1: Copy current source value to discovery_source
UPDATE "all_glamping_properties"
SET discovery_source = source
WHERE source IS NOT NULL;

-- Step 2: Set source to 'Sage' for all rows
UPDATE "all_glamping_properties"
SET source = 'Sage';

COMMIT;
