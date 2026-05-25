-- Restore andBeyond published rows to screened property_type values (May 2026 portfolio).
-- Rows were incorrectly stored as canonical "Glamping", inflating /brands rankings.
-- See scripts/migrations/add-andbeyond-lodges-outdoor-hospitality-2026-05-21.sql

UPDATE public.all_glamping_properties AS p
SET
  property_type = v.correct_type,
  date_updated = CURRENT_DATE
FROM public.glamping_brands AS b,
LATERAL (
  VALUES
    ('andbeyond-chobe-under-canvas-chobe-bw', 'Glamping Resort'),
    ('andbeyond-kichwa-tembo-tented-camp-mara-ke', 'Glamping Resort'),
    ('andbeyond-mnemba-island-zanzibar-tz', 'Outdoor Boutique Hotel'),
    ('andbeyond-ngala-tented-camp-kruger-za', 'Glamping Resort'),
    ('andbeyond-ngorongoro-crater-lodge-tz', 'Landscape Hotel'),
    ('andbeyond-nxabega-okavango-tented-camp-bw', 'Glamping Resort'),
    ('andbeyond-punakha-river-lodge-punakha-bt', 'Glamping Resort'),
    ('andbeyond-serengeti-under-canvas-serengeti-tz', 'Glamping Resort'),
    ('andbeyond-suyian-lodge-laikipia-ke', 'Landscape Hotel'),
    ('andbeyond-vira-vira-lake-district-cl', 'Outdoor Boutique Hotel'),
    ('andbeyond-xaranna-okavango-delta-camp-bw', 'Glamping Resort')
) AS v(slug, correct_type)
WHERE b.slug = 'andbeyond'
  AND p.brand_id = b.id
  AND p.research_status = 'published'
  AND p.slug = v.slug
  AND p.property_type IS DISTINCT FROM v.correct_type;
