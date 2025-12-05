-- Delete Mirror Hotel property from sage-glamping-data table
-- Run this SQL in your Supabase SQL Editor

-- First, check how many records will be deleted
SELECT COUNT(*) as records_to_delete
FROM "sage-glamping-data"
WHERE property_name = 'Mirror Hotel';

-- Delete all records with property_name = 'Mirror Hotel'
DELETE FROM "sage-glamping-data"
WHERE property_name = 'Mirror Hotel';

-- Verify deletion
SELECT COUNT(*) as remaining_records
FROM "sage-glamping-data"
WHERE property_name = 'Mirror Hotel';
-- Should return 0
