-- Safari Tent unit-mix corrections (Jul 2026 audit).
-- Prefer applying via: npx tsx scripts/apply-safari-tent-unit-mix-corrections-2026-07-08.ts
-- This SQL documents id-targeted changes for Supabase SQL editor re-runs.

-- Ofland: cabin project, not safari tent
UPDATE public.all_sage_data
SET unit_type = 'Cabin', date_updated = '2026-07-08'
WHERE id = 11469;

DELETE FROM public.all_sage_data WHERE id = 12942; -- Yonder Twentynine Palms duplicate

-- Dream Away Lodge: 50 safari + 50 cabin (sibling insert via TS script)
UPDATE public.all_sage_data
SET quantity_of_units = '50', property_total_sites = '100', date_updated = '2026-07-08'
WHERE id = 12991;

-- The Grange: 40 safari + 60 airstream (sibling insert via TS script)
UPDATE public.all_sage_data
SET quantity_of_units = '40', property_total_sites = '100', date_updated = '2026-07-08'
WHERE id = 12131;

-- Del Rio Ranch mix
UPDATE public.all_sage_data SET quantity_of_units = '30', date_updated = '2026-07-08' WHERE id = 9549;
UPDATE public.all_sage_data SET quantity_of_units = '25', date_updated = '2026-07-08' WHERE id = 9550;
UPDATE public.all_sage_data SET quantity_of_units = '15', date_updated = '2026-07-08' WHERE id = 12988;

-- Riverbend mix (siblings via TS script)
UPDATE public.all_sage_data
SET quantity_of_units = '20', property_total_sites = '58', date_updated = '2026-07-08'
WHERE id = 12944;

-- Terramor Wilmington: hard-sided → cabin
UPDATE public.all_sage_data
SET unit_type = 'Cabin', property_total_sites = '80', date_updated = '2026-07-08'
WHERE id = 12939;

-- Wildhaven Lake Berryessa (cabin sibling via TS script)
UPDATE public.all_sage_data
SET property_total_sites = '100', date_updated = '2026-07-08'
WHERE id = 11799;

-- Under Canvas Mancos cancelled
UPDATE public.all_sage_data
SET
  is_open = 'Cancelled',
  cancelled_year = 2025,
  cancelled_reason = 'developer_withdrawal',
  date_updated = '2026-07-08'
WHERE id = 12001;

-- Huttopia Adirondacks
DELETE FROM public.all_sage_data WHERE id IN (10213, 10214);
UPDATE public.all_sage_data SET quantity_of_units = '76', property_total_sites = '109', date_updated = '2026-07-08' WHERE id = 10216;
UPDATE public.all_sage_data SET property_total_sites = '109', date_updated = '2026-07-08' WHERE property_name = 'Huttopia Adirondacks';

-- Huttopia Southern Maine
DELETE FROM public.all_sage_data WHERE id IN (9968, 10145, 10146, 10147);
UPDATE public.all_sage_data SET site_name = 'Vista Tiny House', quantity_of_units = '24', property_total_sites = '108', date_updated = '2026-07-08' WHERE id = 9969;
UPDATE public.all_sage_data SET property_total_sites = '108', date_updated = '2026-07-08' WHERE property_name = 'Huttopia Southern Maine';

-- Huttopia White Mountains Vista reclass
UPDATE public.all_sage_data
SET unit_type = 'Tiny Home', site_name = 'Vista Tiny House', date_updated = '2026-07-08'
WHERE id = 10494;

-- Operating-inventory rankings should use is_open = 'Yes' (see lib/glamping-is-open.ts).
