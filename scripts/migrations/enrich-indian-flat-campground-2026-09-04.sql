-- ============================================================================
-- Indian Flat Campground (El Portal, CA / Yosemite Resorts): publish and split.
-- Distinct from Yosemite Cedar Lodge (next door; pool/restaurant/YART stop)
-- and Yosemite View Lodge. Do not merge those hotels.
--
-- Sources (retrieved 2026-09-04):
--   https://yosemiteresorts.com/indian-flat/
--   Hipcamp (Jupe J-3–J-8 exclusive):
--     https://www.hipcamp.com/en-US/land/california-indian-flat-campground-mxvhx2yd
--   CampsitePhotos (June 2024 named counts):
--     https://www.campsitephotos.com/rv-campground/ca/indian-flat-rv-park/
--   Google Maps business pin:
--     https://www.google.com/maps/place/Indian+Flat+RV+Park/@37.6609557,-119.8493364,17z
--     lat 37.6609557 / lon -119.8493364; plus code M562+97
--     9988 CA-140, El Portal, CA 95318
--     (skip google_place_id — CID /g/11c4m69ysh only, not ChIJ)
--   The Dyrt 37.6611398, -119.84990082 (same pin family)
--
-- Operating inventory:
--   RV Site qty 25 — all water/electric; some full hookup (operator).
--   Tent Site qty 25
--   Tent Cabin qty 11 (Cabin Tent) — CampsitePhotos Jun 2024; older Yosemite
--     Hikes page said 5. Do not invent a 6th lodging SKU for the gap.
--   Cottage qty 3 — structured cabins with kitchenette / private bath.
--   Jupe Tent qty 6 — Hipcamp J-3, J-4, J-5, J-6, J-7, J-8.
--   property_total_sites = 70. CampsitePhotos header says 67 campsites;
--     25+25+11+3+6 = 70. Do not invent SKUs to close that 3-site gap.
--
-- Rates USD, room_only. Do not set rate_avg_retail_daily_rate (trigger).
--   Operator published rack (yosemiteresorts.com/indian-flat/):
--     High season Apr 1–Oct 31 / low Nov 1–Mar 31.
--     RV FHU $69 / $50; RV W/E $64 / $44; tent $42 / $30;
--     tent cabin $169 / $99; cottages $229 / $129.
--     Extra person $7; pet $5 (Hipcamp Jupe $25); 2nd vehicle $5;
--     shower (no site) $3; dump $15.
--   Hipcamp Jupe from-rate (undated, 2 guests): J-6 $184; J-3/4/5/7/8 $210.
--   Maps Hotels.com lodging from $146 Nov 1–2 2026 (low-season blend).
--   Replaces 2026-09-01 Tavily/TripAdvisor park ADR 172/220/204.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Indian Flat Campground',
  slug = 'indian-flat-campground',
  property_type = 'Campground',
  source = 'Sage',
  discovery_source = 'web_research_indian_flat_operator_gmaps_2026_09',
  address = '9988 State Highway 140',
  city = 'El Portal',
  state = 'CA',
  zip_code = '95318',
  country = 'United States',
  lat = 37.6609557,
  lon = -119.8493364,
  url = 'https://yosemiteresorts.com/indian-flat/',
  phone_number = '+1-209-379-2339',
  property_total_sites = 70,
  year_site_opened = NULL,
  property_clubhouse = 'No',
  property_food_on_site = 'No',
  property_restaurant = 'No',
  property_laundry = 'No',
  property_pool = 'Yes',
  property_hot_tub = 'Yes',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No',
  property_has_rentals = 'Yes',
  property_playground = 'No',
  property_general_store = 'Yes',
  property_extended_stay = 'Yes',
  property_pickball_courts = 'No',
  property_ota_platforms = ARRAY['hipcamp', 'campspot', 'expedia', 'hotels.com']::text[],
  ota_url_hipcamp = 'https://www.hipcamp.com/en-US/land/california-indian-flat-campground-mxvhx2yd',
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'rustic',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Yosemite Resorts private campground on Hwy 140 in El Portal, 8 miles from the Arch Rock entrance. Mixed RV/tent park with rustic tent cabins, three kitchenette cottages, and six solar Jupe tents (Hipcamp). Shared bathhouse; pool and hot tub are at neighboring Cedar Lodge (not on the campground). Tight sites; generators not allowed. Distinct from Cedar Lodge and Yosemite View Lodge rooms.',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD. Direct book yosemiteresorts.com/indian-flat/; Jupe tents exclusive on Hipcamp. Check-in 3:00 PM / check-out 11:00 AM. Max 6 people and 2 vehicles per site. Extra person $7; pet $5 on campground (Hipcamp Jupe $25); second vehicle $5; dump $15; shower without a site $3. Complimentary Wi-Fi is limited; paid Wi-Fi ~$10/day (The Dyrt). Dogs on leash <8 ft. No generators. High season Apr 1–Oct 31; low Nov 1–Mar 31. Reservations up to a year ahead. (209) 379-2339.',
  description = $$Closest private campground to Yosemite’s Arch Rock / Highway 140 entrance, at 9988 CA-140, El Portal, California (Google Maps 37.6609557, -119.8493364; plus code M562+97), across the road from the Merced River and next to Yosemite Cedar Lodge. 25 RV sites (water/electric; some sewer), 25 tent sites, 11 tent cabins, 3 kitchenette cottages, and 6 Jupe tents. Shared bathhouse, gift shop, and access to Cedar Lodge’s pool and hot tub. Year-round. Distinct from Cedar Lodge hotel rooms and Yosemite View Lodge.$$,
  activities_raw = 'On-site: bathhouse/hot showers, gift shop, communal fire pits, picnic tables. Neighboring Cedar Lodge: outdoor/indoor pool, hot tub, restaurants/bar, YART shuttle stop into Yosemite. Nearby: Merced River (across Hwy 140), whitewater rafting/kayak, fishing, hiking, Yosemite Valley ~20 miles / Arch Rock ~8 miles.',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_fishing = 'Yes',
  activities_swimming = 'Yes',
  activities_paddling = 'Yes',
  activities_whitewater_paddling = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  setting_forest = 'Yes',
  setting_mountainous = 'Yes',
  rv_parking = 'Yes',
  rv_sewer_hook_up = 'Yes',
  rv_electrical_hook_up = 'Yes',
  rv_water_hookup = 'Yes',
  rv_accommodates_slideout = 'Yes',
  rv_vehicle_length = '35',
  rv_surface_level = 'Yes',
  rv_generators_allowed = 'No',
  rv_vehicles_fifth_wheels = 'Yes',
  rv_vehicles_class_a_rvs = 'Yes',
  rv_vehicles_class_b_rvs = 'Yes',
  rv_vehicles_class_c_rvs = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 13116
  AND property_id = 'ddfbb2f3-7dc0-4345-85d5-2ac081fc8309';

-- Existing Jupe shell (qty 6) stays the Jupe row.
UPDATE public.all_sage_data
SET
  site_name = 'Jupe Tent',
  unit_type = 'Jupe',
  quantity_of_units = 6,
  unit_capacity = '2',
  unit_bed = '1 Queen',
  unit_private_bathroom = 'No',
  unit_shower = 'No',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_electricity = 'Yes',
  unit_water = 'No',
  unit_campfires = 'No',
  unit_patio = 'Yes',
  unit_picnic_table = 'Yes',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. Hipcamp sites J-3 through J-8. Shared bathhouse; communal fire pits (no in-unit campfire).',
  minimum_nights = '1',
  unit_description = $$Solar Jupe tent (qty 6): Hipcamp J-3, J-4, J-5, J-6, J-7, J-8. 12-ft ceilings, queen memory-foam bed, windows/ventilation, electrical outlets, dimmable LED, solar USB, advertised A/C (reviews say solar/battery limits; some units cannot run A/C long). Shared campground bathhouse and showers. Pets OK (Hipcamp $25). Deck/picnic table. No private bath or kitchen. Booked exclusively on Hipcamp; introduced ~2024.$$,
  amenities_raw = 'Jupe canvas tent; queen; sleeps 2; solar/LED; outlets; advertised A/C; picnic table/deck. Shared bathhouse, showers, communal fire pits. Pet-friendly. No in-unit campfire.',
  rate_winter_weekday = '129',
  rate_winter_weekend = '149',
  rate_spring_weekday = '184',
  rate_spring_weekend = '210',
  rate_summer_weekday = '210',
  rate_summer_weekend = '229',
  rate_fall_weekday = '184',
  rate_fall_weekend = '210',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 129, 'weekend', 149),
      'spring', jsonb_build_object('weekday', 184, 'weekend', 210),
      'summer', jsonb_build_object('weekday', 210, 'weekend', 229),
      'fall', jsonb_build_object('weekday', 184, 'weekend', 210),
      'note', 'USD room_only. Hipcamp from-rate (undated, 2 guests): J-6 $184 / other Jupes $210. Winter scaled toward operator low-season lodging (tent cabin $99 / Maps Hotels.com from $146 Nov 1–2 2026). Replaces 2026-09-01 Tavily/TripAdvisor park ADR. Pet $25 on Hipcamp. hipcamp.com/en-US/land/california-indian-flat-campground-mxvhx2yd.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published + split from Jupe shell using yosemiteresorts.com/indian-flat + Hipcamp J-3–J-8 + CampsitePhotos + Google Maps @37.6609557,-119.8493364 (M562+97). This row is Jupe Tent qty 6. Distinct from Cedar Lodge.'
WHERE id = 13116
  AND property_id = 'ddfbb2f3-7dc0-4345-85d5-2ac081fc8309';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, unit_picnic_table, unit_charcoal_grill, unit_ada_accessibility,
  year_site_opened, season_open_month, season_close_month,
  operating_season_months, minimum_nights, ota_url_hipcamp,
  unit_description, amenities_raw, activities_raw,
  url, property_id, phone_number,
  property_clubhouse, property_food_on_site, property_restaurant, property_laundry,
  property_pool, property_hot_tub, property_sauna, property_family_friendly,
  property_remote_work_friendly, property_has_rentals, property_playground,
  property_general_store, property_extended_stay, property_pickball_courts,
  property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_biking, activities_fishing, activities_swimming,
  activities_paddling, activities_whitewater_paddling, activities_wildlife_watching,
  activities_stargazing, activities_scenic_drives,
  setting_forest, setting_mountainous,
  rv_parking, rv_sewer_hook_up, rv_electrical_hook_up, rv_water_hookup,
  rv_accommodates_slideout, rv_vehicle_length, rv_surface_level, rv_generators_allowed,
  rv_vehicles_fifth_wheels, rv_vehicles_class_a_rvs, rv_vehicles_class_b_rvs,
  rv_vehicles_class_c_rvs,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', 'Indian Flat Campground', v.site_name,
  'web_research_indian_flat_operator_gmaps_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  70, v.qty, v.unit_type, v.capacity, v.bed,
  v.ensuite, v.shower, v.kitchenette, 'No',
  v.ac, v.wifi, 'Yes', v.electric, v.water,
  v.campfire, 'No', v.cable, 'No', 'No',
  NULL, 'Yes', NULL, 'No',
  NULL::numeric, NULL::smallint, NULL::smallint,
  v.season, '1', g.ota_url_hipcamp,
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_biking, g.activities_fishing, g.activities_swimming,
  g.activities_paddling, g.activities_whitewater_paddling, g.activities_wildlife_watching,
  g.activities_stargazing, g.activities_scenic_drives,
  g.setting_forest, g.setting_mountainous,
  g.rv_parking, g.rv_sewer_hook_up, g.rv_electrical_hook_up, g.rv_water_hookup,
  g.rv_accommodates_slideout, g.rv_vehicle_length, g.rv_surface_level, g.rv_generators_allowed,
  g.rv_vehicles_fifth_wheels, g.rv_vehicles_class_a_rvs, g.rv_vehicles_class_b_rvs,
  g.rv_vehicles_class_c_rvs,
  v.win_wd, v.win_we,
  v.spr_wd, v.spr_we,
  v.sum_wd, v.sum_we,
  v.fal_wd, v.fal_we,
  v.rates_json, g.rate_basis, g.rate_basis_notes,
  g.description, v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    (
      'RV Site', 25::numeric, 'RV Site', '6', NULL,
      'No', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes',
      'Yes', 'No',
      'Year-round. 25 RV pads; all water/electric; some full hookup. Max ~35 ft. No generators.',
      '50', '50', '69', '69', '69', '69', '69', '69',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 50, 'weekend', 50), 'spring', jsonb_build_object('weekday', 69, 'weekend', 69), 'summer', jsonb_build_object('weekday', 69, 'weekend', 69), 'fall', jsonb_build_object('weekday', 69, 'weekend', 69), 'note', 'USD room_only. Operator rack FHU high $69 / low $50 (Apr 1–Oct 31 / Nov 1–Mar 31). Water/electric $64 / $44. Dump $15. yosemiteresorts.com/indian-flat/.')),
      $$RV site (qty 25): water and 20/30/50-amp electric; some pads also have sewer. Picnic table and fire pit. Max about 35 ft; tight spacing. Shared bathhouse and showers. No generators. Pets $5. Overflow parking for tow vehicles often required.$$,
      'Water/electric; some sewer; picnic table; fire pit; shared bathhouse. 35-ft max. No generators. Pet-friendly.',
      E'[2026-09-04] Added RV Site qty 25 from yosemiteresorts.com/indian-flat (25 RV; some FHU).'
    ),
    (
      'Tent Site', 25::numeric, 'Tent Site', '6', NULL,
      'No', 'No', 'No', 'No', 'Yes', 'No', 'No',
      'Yes', 'No',
      'Year-round. 25 tent sites. Some near Hwy 140; ask for an interior pad. Max 6 guests.',
      '30', '30', '42', '42', '42', '42', '42', '42',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 30, 'weekend', 30), 'spring', jsonb_build_object('weekday', 42, 'weekend', 42), 'summer', jsonb_build_object('weekday', 42, 'weekend', 42), 'fall', jsonb_build_object('weekday', 42, 'weekend', 42), 'note', 'USD room_only. Operator tent-site rack high $42 / low $30. Extra person $7. yosemiteresorts.com/indian-flat/.')),
      $$Tent site (qty 25): drive-in / walk-in pads with picnic table and fire pit. Shared bathhouse and hot showers. Some sites sit next to Highway 140. Max 6 people / 2 vehicles. Pets $5. No generators.$$,
      'Tent pad; picnic table; fire pit; shared bathhouse/showers. Pet-friendly. Highway-adjacent sites exist.',
      E'[2026-09-04] Added Tent Site qty 25 from yosemiteresorts.com/indian-flat.'
    ),
    (
      'Tent Cabin', 11::numeric, 'Cabin Tent', '4', '2 twin cots',
      'No', 'No', 'No', 'No', 'Yes', 'No', 'No',
      'Yes', 'No',
      'Year-round. Canvas-wall tent cabins (CampsitePhotos Jun 2024 qty 11; older Yosemite Hikes said 5).',
      '99', '99', '169', '169', '169', '169', '169', '169',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 99, 'weekend', 99), 'spring', jsonb_build_object('weekday', 169, 'weekend', 169), 'summer', jsonb_build_object('weekday', 169, 'weekend', 169), 'fall', jsonb_build_object('weekday', 169, 'weekend', 169), 'note', 'USD room_only. Operator tent-cabin rack high $169 / low $99. Older Yosemite Hikes peak $59–$139 is stale. yosemiteresorts.com/indian-flat/.')),
      $$Tent cabin (qty 11): canvas-wall / wood-floor cabins. Shared bathhouse (no private plumbing). Typically two cots plus room for extra guests with their own bedding. Distinct from the three kitchenette cottages. Pets $5.$$,
      'Canvas tent cabin; shared bathhouse; rustic (no private bath/kitchen). Pet-friendly.',
      E'[2026-09-04] Added Tent Cabin qty 11 (Cabin Tent) from CampsitePhotos Jun 2024 + operator tent-cabin rack.'
    ),
    (
      'Cottage', 3::numeric, 'Cottage', '6', '2 Queen / sofa sleeper',
      'Yes', 'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes',
      'Yes', 'Yes',
      'Year-round. Three structured cottages (CampsitePhotos Jun 2024; older Yosemite Hikes said 2).',
      '129', '129', '229', '229', '229', '229', '229', '229',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 129, 'weekend', 129), 'spring', jsonb_build_object('weekday', 229, 'weekend', 229), 'summer', jsonb_build_object('weekday', 229, 'weekend', 229), 'fall', jsonb_build_object('weekday', 229, 'weekend', 229), 'note', 'USD room_only. Operator cottage rack high $229 / low $129. Maps Hotels.com lodging from $146 Nov 1–2 2026 is a blend, not this SKU. yosemiteresorts.com/indian-flat/.')),
      $$Structured cottage (qty 3): kitchenette, private bath, ceiling fan, cable TV. One layout is two queens; another adds a sofa sleeper. Pets $5. Distinct from tent cabins and from Cedar Lodge hotel rooms.$$,
      'Cottage; kitchenette; private bath; cable TV; ceiling fan. Pet-friendly.',
      E'[2026-09-04] Added Cottage qty 3 from CampsitePhotos Jun 2024 + operator cottage rack.'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed,
  ensuite, shower, kitchenette, ac, wifi, electric, water,
  campfire, cable,
  season,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE g.id = 13116
  AND g.property_id = 'ddfbb2f3-7dc0-4345-85d5-2ac081fc8309'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = 'ddfbb2f3-7dc0-4345-85d5-2ac081fc8309'
      AND x.site_name = v.site_name
  );

COMMIT;
