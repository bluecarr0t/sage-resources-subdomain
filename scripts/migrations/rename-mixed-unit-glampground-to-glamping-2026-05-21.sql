-- Normalize legacy property_type label → canonical 'Glamping'.

UPDATE public.all_glamping_properties
SET
  property_type = 'Glamping',
  date_updated = '2026-05-21'
WHERE TRIM(property_type) = 'Mixed Unit Glampground';
