-- Collective Retreats duplicate cleanup (May 2026).
-- Removes legacy duplicate property anchors for Hill Country (Montesino Ranch), Vail, and Governors Island.
-- Sets Collective Retreats Vail and Collective Yellowstone to Closed.
-- Safe to re-run (guarded deletes/updates).

-- Legacy short-name duplicates (already renamed in prior brand audit; delete if any remain).
DELETE FROM public.all_glamping_properties
WHERE property_name IN (
  'Collective Hill Country - Montesino Ranch',
  'Collective Hill Country - a Retreat at Montesino Ranch',
  'Collective Vail',
  'Collective Governors Island'
);

-- Hill Country Montesino duplicate anchor (second property_id vs canonical 946432a4…).
DELETE FROM public.all_glamping_properties
WHERE property_id = 'abc84ce3-bf95-4fe2-be0e-a6480f0ad551'::uuid;

-- Extra Vail property-level anchor row (duplicate of id 87 on same property_id).
DELETE FROM public.all_glamping_properties
WHERE id = '10866';

-- Collective Retreats Vail: mark all inventory rows closed.
UPDATE public.all_glamping_properties
SET
  is_open = 'Closed',
  date_updated = '2026-05-26',
  notes = COALESCE(notes, '') || E'\n\nOperating status updated (May 2026): Collective Retreats Vail marked closed.'
WHERE property_name = 'Collective Retreats Vail'
  AND is_open IS DISTINCT FROM 'Closed';

-- Collective Yellowstone: already in database; mark closed.
UPDATE public.all_glamping_properties
SET
  is_open = 'Closed',
  date_updated = '2026-05-26',
  notes = COALESCE(notes, '') || E'\n\nOperating status updated (May 2026): Collective Yellowstone marked closed.'
WHERE property_name = 'Collective Yellowstone'
  AND is_open IS DISTINCT FROM 'Closed';
