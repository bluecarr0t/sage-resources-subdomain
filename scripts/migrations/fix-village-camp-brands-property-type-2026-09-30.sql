-- Village Camp cabin/vacation-home rows must use property_type = 'Glamping'
-- (not 'Glamping Resort') to appear in /glamping-market-overview/brands,
-- which filters on the exact type via applyGlampingOnlyPropertyTypeFilter.

BEGIN;

UPDATE public.all_sage_data
SET property_type = 'Glamping',
    date_updated = '2026-09-30',
    notes = COALESCE(notes, '') || E'\n\n[2026-09-30] property_type Glamping Resort → Glamping so cabin/vacation-home SKUs count on /glamping-market-overview/brands (exact type filter).'
WHERE brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'village-camp')
  AND is_glamping_property = 'Yes'
  AND property_type = 'Glamping Resort';

COMMIT;
