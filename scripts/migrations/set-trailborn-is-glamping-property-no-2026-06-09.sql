-- Trailborn (Outdoor Collection) are boutique outdoor hotels, not glamping inventory.
-- Safe to re-run.

UPDATE public.all_glamping_properties
SET
  is_glamping_property = 'No',
  date_updated = '2026-06-09',
  notes = COALESCE(notes, '') || E'\n\nJun 2026: is_glamping_property set to No — Trailborn is Outdoor Boutique Hotel inventory, not glamping.'
WHERE property_name ILIKE 'Trailborn%'
   OR slug ILIKE 'trailborn-%';
