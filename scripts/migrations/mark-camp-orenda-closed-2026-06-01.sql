-- Camp Orenda (Johnsburg, NY): permanently closed per Google Business listing (Jun 2026).
-- Safe to re-run.

UPDATE public.all_glamping_properties
SET
  is_open = 'Closed',
  date_updated = '2026-06-01',
  notes = COALESCE(notes, '') || E'\n\nOperating status updated (Jun 2026): Permanently closed per Google Business listing (Johnsburg, NY).'
WHERE property_name = 'Camp Orenda'
  AND is_open IS DISTINCT FROM 'Closed';
