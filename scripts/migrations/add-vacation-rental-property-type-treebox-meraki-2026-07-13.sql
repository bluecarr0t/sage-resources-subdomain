-- Add Vacation Rental as a canonical property_type usage and reclassify
-- Treebox Meraki House (Dover, OH) from Glamping → Vacation Rental.
-- Remaining Treebox sites stay Glamping.

UPDATE public.all_sage_data
SET
  property_type = 'Vacation Rental',
  updated_at = NOW()
WHERE id = 12080
  AND site_name = 'Meraki House'
  AND city = 'Dover'
  AND state = 'OH'
  AND property_name = 'Treebox';
