-- Village Camp unit counts from the operator CampSite 360 maps, 2026-10-01.
-- Each map hotspot is one site (unique labels, count = 1).
-- Flagstaff site 5: 91 adventure cabins, 96 RV sites.
-- Truckee site 9: 30 adventure cabins (22 + 8 pet-friendly), 84 RV sites.
-- Moab site 10: 9 lodging units, 87 RV sites.
-- Uncategorized hotspots are left out (no published type).
-- Quantities sit on the matching unit row only, so sibling rows are not double-counted.

BEGIN;

UPDATE public.all_sage_data AS d
SET
  quantity_of_units = v.qty,
  date_updated = '2026-10-01',
  notes = CASE
    WHEN COALESCE(d.notes, '') ILIKE '%campsite360_inventory_2026_10_01%' THEN d.notes
    ELSE trim(both E'\n' FROM COALESCE(d.notes, '') || E'\n\ncampsite360_inventory_2026_10_01: ' || v.note)
  END
FROM (
  VALUES
    ('Village Camp Flagstaff', 'Aspen Cabin', 10::numeric, '10 Aspen cabins on the Flagstaff CampSite 360 map.'),
    ('Village Camp Flagstaff', 'Birch Cabin | Roof Top Deck', 7, '7 Birch cabins on the Flagstaff CampSite 360 map.'),
    ('Village Camp Flagstaff', 'Cottonwood Cabin', 7, '7 Cottonwood cabins on the Flagstaff CampSite 360 map.'),
    ('Village Camp Flagstaff', 'Cypress Cabin', 8, '8 Cypress cabins on the Flagstaff CampSite 360 map.'),
    ('Village Camp Flagstaff', 'Elm Cabin | Roof Top Deck', 4, '4 Elm cabins on the Flagstaff CampSite 360 map.'),
    ('Village Camp Flagstaff', 'Juniper Cabin', 9, '9 Juniper cabins on the Flagstaff CampSite 360 map.'),
    ('Village Camp Flagstaff', 'Maple Cabin | Roof Top Deck', 6, '6 Maple cabins on the Flagstaff CampSite 360 map.'),
    ('Village Camp Flagstaff', 'Oak Cabin', 3, '3 Oak cabins on the Flagstaff CampSite 360 map.'),
    ('Village Camp Flagstaff', 'Ponderosa Cabin', 7, '7 Ponderosa cabins on the Flagstaff CampSite 360 map.'),
    ('Village Camp Flagstaff', 'Spruce Cabin | Roof Top Deck', 24, '24 Spruce cabins on the Flagstaff CampSite 360 map.'),
    ('Village Camp Flagstaff', 'Sycamore Cabin', 2, '2 Sycamore cabins on the Flagstaff CampSite 360 map.'),
    ('Village Camp Flagstaff', 'Willow Cabin | Roof Top Deck', 4, '4 Willow cabins on the Flagstaff CampSite 360 map.'),
    ('Village Camp Flagstaff', 'Back-In Lot', 45, '45 back-in lots on the Flagstaff CampSite 360 map.'),
    ('Village Camp Flagstaff', 'Premium Back-In Lot', 23, '23 premium back-in lots on the Flagstaff CampSite 360 map.'),
    ('Village Camp Flagstaff', 'Super Premium Lot', 18, '18 super premium lots on the Flagstaff CampSite 360 map.'),
    ('Village Camp Flagstaff', 'Super Premium Pull Through', 2, '2 super premium pull-throughs on the Flagstaff CampSite 360 map.'),
    ('Village Camp Truckee-Tahoe', 'Adventure Cabin', 22, '22 Adventure Cabins on the Truckee CampSite 360 map. Pet-friendly cabins are a separate row.'),
    ('Village Camp Truckee-Tahoe', 'Adventure Cabin (Pet-Friendly)', 8, '8 pet-friendly Adventure Cabins on the Truckee CampSite 360 map.'),
    ('Village Camp Truckee-Tahoe', 'Economy Pull-Through', 28, '28 economy pull-throughs on the Truckee CampSite 360 map.'),
    ('Village Camp Truckee-Tahoe', 'Premium Pull Through', 17, '17 premium pull-throughs on the Truckee CampSite 360 map.'),
    ('Village Camp Truckee-Tahoe', 'Deluxe Pull Through', 14, '14 deluxe pull-throughs on the Truckee CampSite 360 map.'),
    ('Village Camp Truckee-Tahoe', 'Standard Pull Through', 14, '14 standard pull-throughs on the Truckee CampSite 360 map.'),
    ('Village Camp Truckee-Tahoe', 'Back-In', 9, '9 back-in sites on the Truckee CampSite 360 map.'),
    ('Village Camp Truckee-Tahoe', 'Premium ADA Pull Through', 2, '2 premium ADA pull-throughs on the Truckee CampSite 360 map.'),
    ('Village Camp Moab', 'Adventure Cabin', 3, '3 adventure cabins on the Moab CampSite 360 map.'),
    ('Village Camp Moab', 'Luxury Vacation Home 4-BED M20', 2, '2 M20 homes on the Moab CampSite 360 map.'),
    ('Village Camp Moab', 'Luxury Vacation Home M21', 1, '1 M21 home on the Moab CampSite 360 map.'),
    ('Village Camp Moab', '3bd/3ba Luxury Vacation Home M24', 1, '1 M24 home on the Moab CampSite 360 map.'),
    ('Village Camp Moab', 'Luxury Casita R5', 1, '1 Casita R5 on the Moab CampSite 360 map.'),
    ('Village Camp Moab', 'Deluxe Back-In (PF)', 6, '6 deluxe back-ins on the Moab CampSite 360 map.'),
    ('Village Camp Moab', 'Elite Back-In (PF)', 6, '6 elite back-ins on the Moab CampSite 360 map.'),
    ('Village Camp Moab', 'Elite Pull-In (PF)', 12, '12 elite pull-ins on the Moab CampSite 360 map.'),
    ('Village Camp Moab', 'Premium Back-In', 3, '3 premium back-ins on the Moab CampSite 360 map.'),
    ('Village Camp Moab', 'Premium Back-In With Pergola (PF)', 3, '3 premium back-ins with pergola on the Moab CampSite 360 map.'),
    ('Village Camp Moab', 'Premium Pull-In With Pergola (PF)', 8, '8 premium pull-ins with pergola on the Moab CampSite 360 map.'),
    ('Village Camp Moab', 'Premium Pull Through (PF)', 7, '7 premium pull-throughs on the Moab CampSite 360 map.'),
    ('Village Camp Moab', 'Premium Pull Through With Pergola (PF)', 7, '7 premium pull-throughs with pergola on the Moab CampSite 360 map.'),
    ('Village Camp Moab', 'Standard Pull Through (PF)', 11, '11 standard pull-throughs on the Moab CampSite 360 map.')
) AS v(property_name, site_name, qty, note)
WHERE d.property_name = v.property_name
  AND d.site_name = v.site_name
  AND d.brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'village-camp');

-- New published types that exist on the maps but were missing as rows.
CREATE TEMP TABLE vc_new (LIKE public.all_sage_data INCLUDING DEFAULTS) ON COMMIT DROP;

INSERT INTO vc_new
SELECT * FROM public.all_sage_data WHERE id = 13473;

UPDATE vc_new SET
  id = nextval('public.all_glamping_properties_new_id_seq1'),
  site_name = 'Luxury Casita R3',
  quantity_of_units = 1,
  rate_unit_rates_by_year = NULL,
  rate_avg_retail_daily_rate = NULL,
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = NULL,
  rate_spring_weekend = NULL,
  rate_summer_weekday = NULL,
  rate_summer_weekend = NULL,
  rate_fall_weekday = NULL,
  rate_fall_weekend = NULL,
  rate_basis = NULL,
  rate_basis_notes = NULL,
  date_updated = '2026-10-01',
  created_at = now(),
  updated_at = now(),
  discovery_source = 'campsite360_inventory_2026_10_01',
  notes = 'Luxury Casita R3. One lodging site on the Village Camp Moab CampSite 360 map, 2026-10-01. Nightly rate was not on that inventory export.';

INSERT INTO public.all_sage_data
SELECT * FROM vc_new;

TRUNCATE vc_new;

INSERT INTO vc_new
SELECT * FROM public.all_sage_data
WHERE property_name = 'Village Camp Moab' AND site_name = 'Deluxe Back-In (PF)';

UPDATE vc_new SET
  id = nextval('public.all_glamping_properties_new_id_seq1'),
  site_name = 'Deluxe Pull Through (PF)',
  quantity_of_units = 24,
  rate_unit_rates_by_year = NULL,
  rate_avg_retail_daily_rate = NULL,
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = NULL,
  rate_spring_weekend = NULL,
  rate_summer_weekday = NULL,
  rate_summer_weekend = NULL,
  rate_fall_weekday = NULL,
  rate_fall_weekend = NULL,
  rate_basis = NULL,
  rate_basis_notes = NULL,
  date_updated = '2026-10-01',
  created_at = now(),
  updated_at = now(),
  discovery_source = 'campsite360_inventory_2026_10_01',
  notes = 'Deluxe Pull Through (PF). 24 sites on the Village Camp Moab CampSite 360 map, 2026-10-01. Nightly rate was not on that inventory export.';

INSERT INTO public.all_sage_data
SELECT * FROM vc_new;

TRUNCATE vc_new;

INSERT INTO vc_new
SELECT * FROM public.all_sage_data WHERE id = 13461;

UPDATE vc_new SET
  id = nextval('public.all_glamping_properties_new_id_seq1'),
  site_name = 'Monthly Back In Site',
  quantity_of_units = 8,
  rate_unit_rates_by_year = NULL,
  rate_avg_retail_daily_rate = NULL,
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = NULL,
  rate_spring_weekend = NULL,
  rate_summer_weekday = NULL,
  rate_summer_weekend = NULL,
  rate_fall_weekday = NULL,
  rate_fall_weekend = NULL,
  rate_basis = NULL,
  rate_basis_notes = NULL,
  date_updated = '2026-10-01',
  created_at = now(),
  updated_at = now(),
  discovery_source = 'campsite360_inventory_2026_10_01',
  notes = 'Monthly Back In Site. 8 distinct sites (227, 228, 229, 231, 259, 268, 270, 283) on the Flagstaff CampSite 360 map, 2026-10-01. Nightly rate was not on that inventory export.';

INSERT INTO public.all_sage_data
SELECT * FROM vc_new;

COMMIT;
