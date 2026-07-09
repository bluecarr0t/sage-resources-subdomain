-- Safari Tent unit-mix corrections round 2 (Jul 2026 audit).
-- Prefer: npx tsx scripts/apply-safari-tent-unit-mix-corrections-round2-2026-07-08.ts

-- Collective Governors Island legacy rows (replaced by Journey/Voyager/Basecamp via TS script)
DELETE FROM public.all_sage_data WHERE id IN (9508, 9509, 10017, 10201, 10202);

-- Zmar Eco Experience: not safari tent supply
UPDATE public.all_sage_data
SET
  site_name = 'Wooden bungalow (portfolio)',
  unit_type = 'Cabin',
  quantity_of_units = NULL,
  property_total_sites = '81',
  is_glamping_property = 'No',
  property_type = 'Campground',
  date_updated = '2026-07-08'
WHERE id = 11164;

-- UC Lake Powell duplicate stub
DELETE FROM public.all_sage_data WHERE id = 12972;

UPDATE public.all_sage_data
SET
  property_name = 'Under Canvas Lake Powell – Grand Staircase',
  slug = 'under-canvas-lake-powell-grand-staircase',
  property_total_sites = '51',
  date_updated = '2026-07-08'
WHERE property_name = 'Under Canvas Lake Powell';

-- UC Columbia River Gorge → 50 tents
UPDATE public.all_sage_data SET quantity_of_units = '7', property_total_sites = '50', date_updated = '2026-07-08' WHERE id IN (10628, 10629, 10630, 10631, 10632, 10633);
UPDATE public.all_sage_data SET quantity_of_units = '8', property_total_sites = '50', date_updated = '2026-07-08' WHERE id = 10634;

-- UC North Yellowstone → 60 tents
UPDATE public.all_sage_data SET quantity_of_units = '10', property_total_sites = '60', date_updated = '2026-07-08' WHERE id = 10587;
UPDATE public.all_sage_data SET quantity_of_units = '8', property_total_sites = '60', date_updated = '2026-07-08' WHERE id IN (10588, 10589, 10591, 10593);
UPDATE public.all_sage_data SET quantity_of_units = '9', property_total_sites = '60', date_updated = '2026-07-08' WHERE id IN (10590, 10592);

-- Null safari stubs
DELETE FROM public.all_sage_data WHERE id IN (9553, 9737, 9736);
