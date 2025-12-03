-- Delete specific properties from sage-glamping-data table
-- Run this SQL in your Supabase SQL Editor

-- Delete Silver Birch Resort
DELETE FROM "sage-glamping-data"
WHERE property_name = 'Silver Birch Resort';

-- Delete Lake Eufaula State Park
DELETE FROM "sage-glamping-data"
WHERE property_name = 'Lake Eufaula State Park';

-- Delete Grande Hot Springs
DELETE FROM "sage-glamping-data"
WHERE property_name = 'Grande Hot Springs';

-- Verify deletions (optional - uncomment to check)
-- SELECT property_name, COUNT(*) as count
-- FROM "sage-glamping-data"
-- WHERE property_name IN ('Silver Birch Resort', 'Lake Eufaula State Park', 'Grande Hot Springs')
-- GROUP BY property_name;

