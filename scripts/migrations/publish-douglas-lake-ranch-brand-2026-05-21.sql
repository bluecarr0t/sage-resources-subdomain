-- Publish Douglas Lake Ranch cohort for public brand/property pages.
-- Rows sourced from scripts/add-douglas-lake-ranch-site-rows.ts (BC, douglaslake.com).
-- Safe to re-run.

UPDATE public.all_glamping_properties p
SET
  brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'douglas-lake-ranch'),
  research_status = 'published',
  updated_at = now()
FROM public.glamping_brands b
WHERE b.slug = 'douglas-lake-ranch'
  AND p.property_name ILIKE 'Douglas Lake Ranch%'
  AND p.country = 'Canada'
  AND COALESCE(p.is_glamping_property, 'Yes') = 'Yes'
  AND (
    p.research_status IS DISTINCT FROM 'published'
    OR p.brand_id IS NULL
    OR p.brand_id IS DISTINCT FROM b.id
  );
