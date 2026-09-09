-- ============================================================================
-- Two Creeks Crossing Resort (Livingston, TX / Lake Livingston): publish
-- and split RV / cabin / yurt / treehouse / safari-tent inventory.
-- Distinct from nearby VRBO "Spacious Cozy Cabin" (Expedia h95348120) —
-- that listing is not a resort SKU. Do not merge Kickapoo Shores cottages.
--
-- Sources (retrieved 2026-09-04):
--   https://twocreekscrossingresort.com/
--     /lodging/ /lodging/rv-sites/ /lodging/cabins/ /lodging/yurts/
--     /lodging/treehouses/ /lodging/glamping-tents/
--     /rates-and-seasonal-hours/ /contact-us/
--   Google Maps business pin:
--     https://www.google.com/maps/place/Two+Creeks+Crossing+Resort+%7C+Lake+Livingston/@30.8411445,-95.076744,17z
--     lat 30.8411445 / lon -95.076744; plus code RWRF+F8
--     1581 Triple Creek Loop, Livingston, TX 77351
--     (skip google_place_id — CID /g/11sybqv5c8 only, not ChIJ)
--   Good Sam 183 spaces (143 transient + 40 seasonal); Harvest Hosts 183
--   KBTX 2024-07-31: open a little over a year (opened ~mid-2023)
--
-- Operating inventory (operator lodging page):
--   RV Site qty 183 — full hookup, concrete pads, 30/50-amp; mix of
--     waterfront / waterview / back-in / pull-through / deluxe / ADA.
--     33 covered 24×50 monthly/weekly sites are a subset of 183
--     (Good Sam 40 seasonal). Do not add 33 on top of 183.
--   Cabin qty 19 — 12 waterfront + 6 deluxe + historic Crawford Cabin
--     (90-year log cabin original to the land). Lodging bullet listed
--     12+6 only; cabins page adds Crawford. Named C1–C33 + Crawford.
--   Yurt qty 3 — Roundabout (Y1), The Love Shack (Y2), Morning Glory (Y3).
--   Treehouse qty 1 — Treescape (T1). More treehouses planned; do not invent.
--   Glamping Tent qty 6 — G1–G6 safari / expedition tents (Safari Tent).
--     Replaces stub qty 4.
--   property_total_sites = 212 (183+19+3+1+6).
--
-- Rates USD, room_only. Do not set rate_avg_retail_daily_rate (trigger).
--   Operator from-rates (twocreekscrossingresort.com/rates-and-seasonal-hours/):
--     Peak May 1–Oct 31 / non-peak Nov 1–Apr 30. Based on 4 guests;
--     extra person $20 peak / $15 non-peak.
--     RV $90 / $60; glamping tent $120 / $95; cabin $245 / $220;
--     yurt $250 / $225; treehouse $350 / $325.
--   Maps official lodging from $264 Nov 1–3 2026 is a cabin-blend, not RV.
--   Replaces 2026-09-01 Tavily/Expedia scrape of a nearby VRBO (~$143).
--   Do not store weekly/monthly covered-RV as ADR.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'No',
  property_name = 'Two Creeks Crossing Resort',
  slug = 'two-creeks-crossing-resort-livingston-tx',
  property_type = 'RV Resort',
  source = 'Sage',
  discovery_source = 'web_research_two_creeks_crossing_operator_gmaps_2026_09',
  address = '1581 Triple Creek Loop',
  city = 'Livingston',
  state = 'TX',
  zip_code = '77351',
  country = 'United States',
  lat = 30.8411445,
  lon = -95.076744,
  url = 'https://twocreekscrossingresort.com/',
  phone_number = '+1-936-646-4071',
  property_total_sites = 212,
  year_site_opened = 2023,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'No',
  property_laundry = 'Yes',
  property_pool = 'Yes',
  property_hot_tub = 'Yes',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  property_playground = 'Yes',
  property_general_store = 'Yes',
  property_extended_stay = 'Yes',
  property_pickball_courts = 'Yes',
  property_fitness_room = 'Yes',
  property_dog_park = 'Yes',
  property_waterpark = 'Yes',
  property_waterfront = 'Yes',
  property_alcohol_available = 'Yes',
  property_ota_platforms = ARRAY['resnexus']::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Aggie-owned Lake Livingston RV + glamping resort on 82 pine acres between Kickapoo and Rocky Creeks (opened ~mid-2023; KBTX). 183 FHU concrete RV pads, 19 cabins (incl. historic Crawford), 3 ensuite yurts, 1 treehouse, 6 safari tents. Blue Bayou Bend lazy-river water park (seasonal), pool/hot tub, Swampers Icehouse, pickleball, dog park, boat ramp. Midscale — tents share bathhouses; yurts/cabins ensuite. Distinct from nearby Kickapoo Shores cottages and VRBO cabins.',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD. Direct book ResNexus via twocreekscrossingresort.com. RV check-in 1:00 PM / check-out 11:00 AM; cabins/treehouse/yurts/tents 3:00 PM / 10:00 AM. Rates include 4 guests; extra $20 peak / $15 non-peak. Peak May 1–Oct 31; non-peak Nov 1–Apr 30. 2-night min on cabin-style (cabins, tents, yurts, treehouse); RV no min. Extra vehicle $5/day. Golf cart $75/night; Solo Stove $15/day; cabana $75/day. Cancel ≥14 days minus $30; <14 days none; holidays 30 days. Pets: 2/leash on RV; cabins/yurts/tents no (except C15/C16 dogs/cats <50 lb, $40 + $100 deposit). stay@twocreekscrossingresort.com; (936) 646-4071.',
  description = $$Lake Livingston RV and glamping resort at 1581 Triple Creek Loop, Livingston, Texas (Google Maps 30.8411445, -95.076744; plus code RWRF+F8), on 82 acres between boat-navigable Kickapoo and Rocky Creeks. 183 full-hookup RV sites (33 covered monthly are inside that 183), 19 cabins including the historic Crawford Cabin, 3 yurts, 1 treehouse, and 6 safari tents. Pool, hot tub, seasonal Blue Bayou Bend water park, Swampers Icehouse, pickleball, dog park, playground, boat ramp. Opened about mid-2023. Distinct from Kickapoo Shores Waterfront Cottages.$$,
  activities_raw = 'On-site: Blue Bayou Bend lazy river / swim-up bar (May–Oct), pool and hot tub, Swampers Icehouse, Soggy Dollar pool bar, outdoor movie theater, pickleball and table tennis, playground, fenced dog park, catch-and-release ponds, boat ramp / dock / slips, kayak rental, golf carts, community BBQ and fire pits, fitness center, clubhouse store, laundry. Nearby: Lake Livingston, Kickapoo Creek, Rocky Creek, Livingston (~15 min).',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_fishing = 'Yes',
  activities_swimming = 'Yes',
  activities_boating = 'Yes',
  activities_paddling = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  setting_forest = 'Yes',
  setting_lake = 'Yes',
  rv_parking = 'Yes',
  rv_sewer_hook_up = 'Yes',
  rv_electrical_hook_up = 'Yes',
  rv_water_hookup = 'Yes',
  rv_accommodates_slideout = 'Yes',
  rv_vehicle_length = '50',
  rv_surface_level = 'Yes',
  rv_surface_type = 'Concrete',
  rv_generators_allowed = 'No',
  rv_vehicles_fifth_wheels = 'Yes',
  rv_vehicles_class_a_rvs = 'Yes',
  rv_vehicles_class_b_rvs = 'Yes',
  rv_vehicles_class_c_rvs = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11571
  AND property_id = 'd6a39f3c-39c5-496e-8a5d-91c61ee6b76d';

-- Existing Safari Tent stub → Glamping Tent qty 6.
UPDATE public.all_sage_data
SET
  site_name = 'Glamping Tent',
  unit_type = 'Safari Tent',
  quantity_of_units = 6,
  unit_capacity = '4',
  unit_bed = '1 Queen',
  unit_private_bathroom = 'No',
  unit_shower = 'No',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'No',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'No',
  unit_patio = 'Yes',
  unit_picnic_table = 'Yes',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. Named G1–G6: Hidden Haven, Honeysuckle, The Hideout, Huckleberry Hut, Hikers Hideaway, Hilltop Hold Out. Shared bathhouse. 2-night minimum.',
  minimum_nights = '2',
  unit_description = $$Safari / expedition glamping tent (qty 6): Hidden Haven (G1), Honeysuckle (G2), The Hideout (G3), Huckleberry Hut (G4), Hikers Hideaway (G5), Hilltop Hold Out (G6). Single-room canvas wall tents on wooden decks with a bed, sitting area, porch, electricity, running water, and portable A/C. No indoor bathroom — short walk to bathhouses with hot showers. No pets. 2-night minimum. Replaces stub qty 4.$$,
  amenities_raw = 'Canvas safari tent; deck/porch; bed; sitting area; electricity; running water; portable A/C. Shared bathhouse. No pets. No in-unit kitchen.',
  rate_winter_weekday = '95',
  rate_winter_weekend = '95',
  rate_spring_weekday = '95',
  rate_spring_weekend = '95',
  rate_summer_weekday = '120',
  rate_summer_weekend = '120',
  rate_fall_weekday = '120',
  rate_fall_weekend = '120',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 95, 'weekend', 95),
      'spring', jsonb_build_object('weekday', 95, 'weekend', 95),
      'summer', jsonb_build_object('weekday', 120, 'weekend', 120),
      'fall', jsonb_build_object('weekday', 120, 'weekend', 120),
      'note', 'USD room_only. Operator from-rate peak $120 / non-peak $95 (May 1–Oct 31 / Nov 1–Apr 30). 4 guests included; extra $20/$15. 2-night min. Replaces 2026-09-01 Expedia VRBO scrape. twocreekscrossingresort.com/rates-and-seasonal-hours/.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published + split from Safari Tent stub using twocreekscrossingresort.com + Google Maps @30.8411445,-95.076744 (RWRF+F8). This row is Glamping Tent qty 6 (was stub 4). Corrected prior lat/lon 30.705,-94.885. Expedia h95348120 is a nearby VRBO, not this resort.'
WHERE id = 11571
  AND property_id = 'd6a39f3c-39c5-496e-8a5d-91c61ee6b76d';

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
  operating_season_months, minimum_nights,
  unit_description, amenities_raw, activities_raw,
  url, property_id, phone_number,
  property_clubhouse, property_food_on_site, property_restaurant, property_laundry,
  property_pool, property_hot_tub, property_sauna, property_family_friendly,
  property_remote_work_friendly, property_has_rentals, property_playground,
  property_general_store, property_extended_stay, property_pickball_courts,
  property_fitness_room, property_dog_park, property_waterpark, property_waterfront,
  property_alcohol_available, property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_biking, activities_fishing, activities_swimming,
  activities_boating, activities_paddling, activities_wildlife_watching,
  activities_stargazing, activities_scenic_drives,
  setting_forest, setting_lake,
  rv_parking, rv_sewer_hook_up, rv_electrical_hook_up, rv_water_hookup,
  rv_accommodates_slideout, rv_vehicle_length, rv_surface_level, rv_surface_type,
  rv_generators_allowed, rv_vehicles_fifth_wheels, rv_vehicles_class_a_rvs,
  rv_vehicles_class_b_rvs, rv_vehicles_class_c_rvs,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', 'No', 'Sage', 'Two Creeks Crossing Resort', v.site_name,
  'web_research_two_creeks_crossing_operator_gmaps_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  212, v.qty, v.unit_type, v.capacity, v.bed,
  v.ensuite, v.shower, v.kitchenette, v.full_kitchen,
  'Yes', 'Yes', v.pets, 'Yes', 'Yes',
  v.campfire, 'Yes', NULL, 'No', 'No',
  v.fridge, 'Yes', NULL, v.ada,
  2023::numeric, NULL::smallint, NULL::smallint,
  v.season, v.min_nights,
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_fitness_room, g.property_dog_park, g.property_waterpark, g.property_waterfront,
  g.property_alcohol_available, g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_biking, g.activities_fishing, g.activities_swimming,
  g.activities_boating, g.activities_paddling, g.activities_wildlife_watching,
  g.activities_stargazing, g.activities_scenic_drives,
  g.setting_forest, g.setting_lake,
  g.rv_parking, g.rv_sewer_hook_up, g.rv_electrical_hook_up, g.rv_water_hookup,
  g.rv_accommodates_slideout, g.rv_vehicle_length, g.rv_surface_level, g.rv_surface_type,
  g.rv_generators_allowed, g.rv_vehicles_fifth_wheels, g.rv_vehicles_class_a_rvs,
  g.rv_vehicles_class_b_rvs, g.rv_vehicles_class_c_rvs,
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
      'RV Site', 183::numeric, 'RV Site', '6', NULL,
      'No', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes', NULL,
      'Year-round. 183 FHU concrete pads (waterfront, waterview, back-in, pull-through, deluxe, ADA). 33 covered 24×50 monthly/weekly sites are inside this 183.',
      '1',
      '60', '60', '60', '60', '90', '90', '90', '90',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 60, 'weekend', 60), 'spring', jsonb_build_object('weekday', 60, 'weekend', 60), 'summer', jsonb_build_object('weekday', 90, 'weekend', 90), 'fall', jsonb_build_object('weekday', 90, 'weekend', 90), 'note', 'USD room_only. Operator RV from-rate peak $90 / non-peak $60. Weekly from $450 / $300. Do not store monthly covered-RV as ADR. 4 guests included.')),
      $$Full-hookup RV site (qty 183): concrete pads with water, sewer, and 30/50-amp electric across 82 acres. Mix of waterfront, waterview, back-in, pull-through, deluxe (extra 20-ft pad), and ADA. 33 covered 24×50 sites (20-ft driveway, metal roof) are weekly/monthly only and already counted in the 183. Pets OK (max 2, leash). Picnic table. No generators assumed — confirm office. Big-rig friendly.$$,
      'FHU concrete; 30/50-amp; picnic table; some covered/waterfront/ADA. Pet-friendly (2). Clubhouse Wi-Fi. Shared pool, water park, laundry.',
      E'[2026-09-04] Added RV Site qty 183 from twocreekscrossingresort.com/lodging (33 covered are a subset).'
    ),
    (
      'Cabin', 19::numeric, 'Cabin', '6', 'Varies (lofts on some)',
      'Yes', 'Yes', 'No', 'Yes', 'No', 'No', 'Yes', 'Yes',
      'Year-round. 12 waterfront + 6 deluxe + historic Crawford Cabin. C15/C16 pet-friendly; C31/C33 ADA. 2-night minimum.',
      '2',
      '220', '220', '220', '220', '245', '245', '245', '245',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 220, 'weekend', 220), 'spring', jsonb_build_object('weekday', 220, 'weekend', 220), 'summer', jsonb_build_object('weekday', 245, 'weekend', 245), 'fall', jsonb_build_object('weekday', 245, 'weekend', 245), 'note', 'USD room_only. Operator cabin from-rate peak $245 / non-peak $220. Maps official from $264 Nov 1–3 2026 is a blend. 2-night min.')),
      $$Cabin (qty 19): 12 waterfront cabins on Kickapoo/Rocky Creek, 6 deluxe cabins (C17 Rusty Nail, C18 Rustic Pine, C19 Lonesome Lodge, C21 Twisted Oak, C23 Wanderer’s, C25 Whispering Pine), and the restored ~90-year Crawford Cabin original to the property. Full kitchen, living area, bathroom, porch, A/C. Some lofts. Pets only C15 Paw’s Retreat and C16 The Cozy Critter (<50 lb). ADA C31 Water’s Edge and C33 Creekside. 2-night minimum.$$,
      'Cabin; full kitchen; private bath; porch; A/C; Wi-Fi. Most no pets (C15/C16 yes). Two ADA. Shared pool, water park, Icehouse.',
      E'[2026-09-04] Added Cabin qty 19 (12 waterfront + 6 deluxe + Crawford) from operator cabins page.'
    ),
    (
      'Yurt', 3::numeric, 'Yurt', '4', '1 Queen (larger yurt adds loft)',
      'Yes', 'Yes', 'Yes', 'No', 'No', 'No', 'No', 'Yes',
      'Year-round. Roundabout (Y1), The Love Shack (Y2), Morning Glory (Y3). 2-night minimum. Limited Wi-Fi/cell; no TV.',
      '2',
      '225', '225', '225', '225', '250', '250', '250', '250',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 225, 'weekend', 225), 'spring', jsonb_build_object('weekday', 225, 'weekend', 225), 'summer', jsonb_build_object('weekday', 250, 'weekend', 250), 'fall', jsonb_build_object('weekday', 250, 'weekend', 250), 'note', 'USD room_only. Operator yurt from-rate peak $250 / non-peak $225. 2-night min.')),
      $$Yurt (qty 3): Roundabout (Y1), The Love Shack (Y2), Morning Glory (Y3). Climate-controlled canvas yurts with private bath/shower, queen bed (larger yurt has a loft), kitchenette (stovetop, microwave, fridge, coffee, cookware), dining area. No TV; Wi-Fi/cell limited. No pets. 2-night minimum.$$,
      'Yurt; ensuite bath; kitchenette; queen; A/C. No pets. No TV. Shared resort amenities.',
      E'[2026-09-04] Added Yurt qty 3 (Y1–Y3) from twocreekscrossingresort.com/lodging/yurts.'
    ),
    (
      'Treehouse', 1::numeric, 'Treehouse', '6', '3 King',
      'Yes', 'Yes', 'Yes', 'No', 'No', 'No', 'No', 'Yes',
      'Year-round. Treescape (T1) only. More treehouses planned — do not invent. 2-night minimum.',
      '2',
      '325', '325', '325', '325', '350', '350', '350', '350',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 325, 'weekend', 325), 'spring', jsonb_build_object('weekday', 325, 'weekend', 325), 'summer', jsonb_build_object('weekday', 350, 'weekend', 350), 'fall', jsonb_build_object('weekday', 350, 'weekend', 350), 'note', 'USD room_only. Operator treehouse from-rate peak $350 / non-peak $325. 2-night min.')),
      $$Treehouse (qty 1): Treescape (T1). Elevated cabin with master king, upstairs room with two more kings, full bath/shower, living/dining, kitchenette (stovetop, microwave, fridge, coffee), propane grill, four porches. No pets. Operator says more treehouses are planned — do not invent a 2nd unit. 2-night minimum.$$,
      'Treehouse; 3 kings; ensuite; kitchenette; four porches; grill. No pets. Shared pool, water park, Icehouse.',
      E'[2026-09-04] Added Treehouse qty 1 (Treescape T1) from twocreekscrossingresort.com/lodging/treehouses.'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed,
  ensuite, shower, kitchenette, full_kitchen, pets, campfire, ada, fridge,
  season, min_nights,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE g.id = 11571
  AND g.property_id = 'd6a39f3c-39c5-496e-8a5d-91c61ee6b76d'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = 'd6a39f3c-39c5-496e-8a5d-91c61ee6b76d'
      AND x.site_name = v.site_name
  );

COMMIT;
