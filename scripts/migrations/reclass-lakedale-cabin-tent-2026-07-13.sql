-- Lakedale Canvas Cabin → Cabin Tent (2026-07-13)
UPDATE public.all_sage_data SET
  unit_type = 'Cabin Tent',
  date_updated = '2026-07-13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] Canvas Cabin → Cabin Tent: Lakedale Canvas Cabins are soft-wall glampground tent-cabins (no electricity/running water, shared baths), not hardwall+canvas hybrid.'
WHERE id = 10303;
