-- Normalize legacy property_type label → canonical 'Campground'.

UPDATE public.all_glamping_properties
SET
  property_type = 'Campground',
  date_updated = '2026-05-21'
WHERE TRIM(property_type) = 'Luxury Campground';
