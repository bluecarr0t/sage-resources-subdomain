-- P2: Safari Tent → Canvas Tent for generic site_name labels (2026-07-13).
-- Prefer: npx tsx scripts/apply-safari-tent-generic-to-canvas-tent-2026-07-13.ts
-- Excludes Under Canvas / Huttopia / Terramor / Mendocino / Collective / AutoCamp /
-- Open Sky / ULUM, property names containing "safari", Longitude 131°, Suján The Serai.

UPDATE public.all_sage_data
SET
  unit_type = 'Canvas Tent',
  date_updated = '2026-07-13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_type Safari Tent → Canvas Tent (P2 generic site_name → Canvas Tent; safari_tent_generic_to_canvas_tent_2026_07_13).'
WHERE research_status = 'published'
  AND is_glamping_property = 'Yes'
  AND lower(btrim(unit_type)) = 'safari tent'
  AND lower(btrim(coalesce(site_name, ''))) ~ '^(glamping tent|glamping tents|luxury tent|luxury tents|deluxe tent|deluxe tents|tents|tent|canvas tent|canvas tents)$'
  AND property_name NOT ILIKE 'Under Canvas%'
  AND property_name NOT ILIKE 'Huttopia%'
  AND property_name NOT ILIKE 'Terramor%'
  AND property_name NOT ILIKE 'Mendocino Grove%'
  AND property_name NOT ILIKE 'Collective%'
  AND property_name NOT ILIKE 'AutoCamp%'
  AND property_name NOT ILIKE 'Open Sky%'
  AND property_name NOT ILIKE 'ULUM%'
  AND property_name NOT ILIKE '%safari%'
  AND property_name !~* 'longitude\s*131'
  AND property_name !~* 'suj[aá]n';
