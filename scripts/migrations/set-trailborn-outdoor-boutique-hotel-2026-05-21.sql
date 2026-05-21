-- Trailborn properties → canonical property_type Outdoor Boutique Hotel (May 2026).
-- Outdoor Collection by Marriott Bonvoy hotel product (not glamping inventory).

UPDATE public.all_glamping_properties
SET
  property_type = 'Outdoor Boutique Hotel',
  date_updated = '2026-05-21'
WHERE property_name ILIKE 'Trailborn%'
   OR slug ILIKE 'trailborn-%';
