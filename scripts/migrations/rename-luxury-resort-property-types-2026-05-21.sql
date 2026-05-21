-- Remap legacy 'Luxury Resort' → canonical types (May 2026 review).
-- Treehouse/dome resorts → Glamping; hotel/lodge/spa resorts → Outdoor Boutique Hotel.

UPDATE public.all_glamping_properties
SET
  property_type = 'Glamping',
  date_updated = '2026-05-21'
WHERE TRIM(property_type) = 'Luxury Resort'
  AND slug IN (
    'nayarit-treehouse-resort',
    'riviera-maya-treehouse-resort',
    'veracruz-treehouse-resort',
    'palmaia-the-house-of-aia'
  );

UPDATE public.all_glamping_properties
SET
  property_type = 'Outdoor Boutique Hotel',
  date_updated = '2026-05-21'
WHERE TRIM(property_type) = 'Luxury Resort'
  AND slug NOT IN (
    'nayarit-treehouse-resort',
    'riviera-maya-treehouse-resort',
    'veracruz-treehouse-resort',
    'palmaia-the-house-of-aia'
  );
