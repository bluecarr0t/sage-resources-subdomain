-- Drop the "Camp " prefix from Ferncrest property names.
-- Location suffixes stay so each outpost remains a distinct property.

UPDATE public.all_sage_data
SET
  property_name = regexp_replace(property_name, '^Camp Ferncrest', 'Ferncrest'),
  date_updated = '2026-10-01'
WHERE property_name LIKE 'Camp Ferncrest%';

UPDATE public.glamping_brands
SET display_name = 'Ferncrest'
WHERE slug = 'camp-ferncrest'
  AND display_name = 'Camp Ferncrest';
