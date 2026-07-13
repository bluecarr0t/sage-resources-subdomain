-- Canvas Cabin canonical type + Safari Tent hybrid reclass (2026-07-13).
-- Companion: scripts/apply-canvas-cabin-hybrid-reclass-2026-07-13.ts
-- Adds unit_type = 'Canvas Cabin' for documented tent-cabin hybrids; Canvas Cottage for Lakedale cottage SKU.

-- Canvas Cabin
UPDATE public.all_sage_data SET
  unit_type = 'Canvas Cabin',
  date_updated = '2026-07-13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_type Safari Tent → Canvas Cabin (canonical hybrid canvas-cabin taxonomy; site_name Deluxe Tent Cabin).'
WHERE id = 9725;

UPDATE public.all_sage_data SET
  unit_type = 'Canvas Cabin',
  date_updated = '2026-07-13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_type Safari Tent → Canvas Cabin (canonical hybrid canvas-cabin taxonomy; site_name Tent-Cabins).'
WHERE id = 10138;

UPDATE public.all_sage_data SET
  unit_type = 'Canvas Cabin',
  date_updated = '2026-07-13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_type Safari Tent → Canvas Cabin (canonical hybrid canvas-cabin taxonomy; site_name Large Cabin Tent).'
WHERE id = 10225;

UPDATE public.all_sage_data SET
  unit_type = 'Canvas Cabin',
  date_updated = '2026-07-13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_type Safari Tent → Canvas Cabin (canonical hybrid canvas-cabin taxonomy; site_name Small Cabin Tent).'
WHERE id = 10226;

UPDATE public.all_sage_data SET
  unit_type = 'Canvas Cabin',
  date_updated = '2026-07-13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_type Safari Tent → Canvas Cabin (canonical hybrid canvas-cabin taxonomy; site_name Family Tentalow).'
WHERE id = 10134;

UPDATE public.all_sage_data SET
  unit_type = 'Canvas Cabin',
  date_updated = '2026-07-13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_type Safari Tent → Canvas Cabin (canonical hybrid canvas-cabin taxonomy; site_name Standard Tentalow).'
WHERE id = 10135;

UPDATE public.all_sage_data SET
  unit_type = 'Canvas Cabin',
  date_updated = '2026-07-13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_type Safari Tent → Canvas Cabin (canonical hybrid canvas-cabin taxonomy; site_name Canvas Cabin).'
WHERE id = 10303;

UPDATE public.all_sage_data SET
  unit_type = 'Canvas Cabin',
  date_updated = '2026-07-13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_type Safari Tent → Canvas Cabin (canonical hybrid canvas-cabin taxonomy; documented hybrid Glamping Cabins).'
WHERE id = 10139;

UPDATE public.all_sage_data SET
  unit_type = 'Canvas Cabin',
  date_updated = '2026-07-13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_type Safari Tent → Canvas Cabin (canonical hybrid canvas-cabin taxonomy; site_name Family Canvas Cabin).'
WHERE id = 10171;

UPDATE public.all_sage_data SET
  unit_type = 'Canvas Cabin',
  date_updated = '2026-07-13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_type Safari Tent → Canvas Cabin (canonical hybrid canvas-cabin taxonomy; site_name Classic Canvas Cabin).'
WHERE id = 10172;

UPDATE public.all_sage_data SET
  unit_type = 'Canvas Cabin',
  date_updated = '2026-07-13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_type Safari Tent → Canvas Cabin (canonical hybrid canvas-cabin taxonomy; site_name Canvas Cabin).'
WHERE id = 10224;

-- Canvas Cottage (same hybrid audit batch; site_name already matches existing canonical)
UPDATE public.all_sage_data SET
  unit_type = 'Canvas Cottage',
  date_updated = '2026-07-13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_type Safari Tent → Canvas Cottage (site_name Canvas Cottage).'
WHERE id = 10302;
