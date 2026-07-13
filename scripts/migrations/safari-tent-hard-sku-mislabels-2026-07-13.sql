-- Safari Tent hard-SKU mislabels → Cabin / Villa / Lodge / Yurt (2026-07-13 P0).
-- Companion: scripts/apply-safari-tent-hard-sku-mislabels-2026-07-13.ts

UPDATE public.all_sage_data SET
  unit_type = 'Cabin',
  date_updated = '2026-07-13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_type Safari Tent → Cabin (site_name Cabins; hard cabin SKU).'
WHERE id = 10136;

UPDATE public.all_sage_data SET
  unit_type = 'Villa',
  date_updated = '2026-07-13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_type Safari Tent → Villa (site_name Bedouin Villa King).'
WHERE id = 12185;

UPDATE public.all_sage_data SET
  unit_type = 'Villa',
  date_updated = '2026-07-13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_type Safari Tent → Villa (site_name Bedouin Villa Twin).'
WHERE id = 12218;

UPDATE public.all_sage_data SET
  unit_type = 'Lodge',
  date_updated = '2026-07-13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_type Safari Tent → Lodge (site_name Two Bedroom Lodge).'
WHERE id = 12235;

UPDATE public.all_sage_data SET
  unit_type = 'Lodge',
  date_updated = '2026-07-13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_type Safari Tent → Lodge (site_name Luxury Glamping Lodge).'
WHERE id = 10245;

UPDATE public.all_sage_data SET
  unit_type = 'Lodge',
  date_updated = '2026-07-13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_type Safari Tent → Lodge (site_name Luxury Glamping Lodge).'
WHERE id = 10263;

UPDATE public.all_sage_data SET
  unit_type = 'Yurt',
  date_updated = '2026-07-13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_type Safari Tent → Yurt (site_name lists yurt products).'
WHERE id = 10266;
