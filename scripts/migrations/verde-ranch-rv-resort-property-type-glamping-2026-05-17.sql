-- Verde Ranch → RV Resort (not glamping inventory for snapshot/map cohort).
-- Normalize legacy "Glamping Resort" labels to admin canonical "Glamping" where is_glamping_property = 'Yes'.
-- Enforce: property_type = 'Glamping' only when is_glamping_property = 'Yes' (otherwise Unknown).
--
-- Run in Supabase SQL editor (or via scripts/apply-verde-ranch-property-type-update.ts).

-- 1) Verde Ranch properties
UPDATE public.all_glamping_properties
SET
  property_type = 'RV Resort',
  is_glamping_property = 'No',
  date_updated = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD')
WHERE btrim(property_name) IN ('Verde Ranch Resort', 'Verde Ranch RV Resort');

-- 2) Glamping-flagged rows: legacy "*Glamping Resort*" wording → canonical "Glamping"
UPDATE public.all_glamping_properties
SET
  property_type = 'Glamping',
  date_updated = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD')
WHERE is_glamping_property = 'Yes'
  AND lower(btrim(coalesce(property_type, ''))) LIKE '%glamping resort%'
  AND btrim(coalesce(property_type, '')) <> 'Glamping';

-- 3) Glamping-flagged rows with missing type → Glamping (matches admin Core options)
UPDATE public.all_glamping_properties
SET
  property_type = 'Glamping',
  date_updated = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD')
WHERE is_glamping_property = 'Yes'
  AND (property_type IS NULL OR btrim(property_type) = '');

-- 4) Non-glamping rows must not use property_type "Glamping"
UPDATE public.all_glamping_properties
SET
  property_type = 'Unknown',
  date_updated = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD')
WHERE is_glamping_property = 'No'
  AND btrim(coalesce(property_type, '')) = 'Glamping';

-- Optional checks:
-- SELECT property_name, property_type, is_glamping_property FROM public.all_glamping_properties WHERE property_name ILIKE '%verde ranch%';
-- SELECT property_type, is_glamping_property, count(*) FROM public.all_glamping_properties GROUP BY 1, 2 ORDER BY 3 DESC;
