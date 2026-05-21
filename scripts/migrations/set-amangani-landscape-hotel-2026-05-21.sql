-- Amangani: landscape-forward luxury lodge → canonical 'Landscape Hotel'.

UPDATE public.all_glamping_properties
SET
  property_type = 'Landscape Hotel',
  date_updated = '2026-05-21'
WHERE slug = 'amangani-jackson-wy';
