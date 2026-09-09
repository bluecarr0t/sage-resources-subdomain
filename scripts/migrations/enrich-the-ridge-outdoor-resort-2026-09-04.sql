-- ============================================================================
-- The Ridge Outdoor Resort (Sevierville, TN / Pigeon Forge / Smokies):
-- publish and split RV / tiny-home / safari-tent inventory.
-- Distinct from Star Gazer Glamping Village (Sevierville), Eagle's Nest
-- Retreat, The Ridge at Stanley Gap (Blue Ridge, GA / Hipcamp), and
-- Blue Ridge Treehouse Rentals. Do not merge those properties.
--
-- Sources (retrieved 2026-09-04):
--   https://theridgeoutdoorresort.com/ (+ /accommodations/ /rv-sites/
--     /luxury-tent-glamping/ /tiny-home-glamping-cabins/ /signature/ /map/)
--   Jan 2026 operator sitemap PDF:
--     https://theridgeoutdoorresort.com/wp-content/uploads/2026/01/The-Ridge-Outdoor-Resort-sitemap-3.pdf
--   Live ResNexus book engine (all SKUs expanded):
--     https://resnexus.com/resnexus/reservations/book/5F4156C7-145D-4985-AA8E-A4E82541A9E7
--   Google Maps business pin:
--     https://www.google.com/maps/place/The+Ridge+Outdoor+Resort/@35.8412592,-83.5405319,17z
--     lat 35.8412592 / lon -83.5405319; plus code RFR5+GQ
--     1250 Middle Creek Rd, Sevierville, TN 37862
--     (skip google_place_id — CID 0x885bf907d0a6332d /g/11fkqjqnxs only, not ChIJ)
--   The Dyrt / Kidding Around Greenville: opened 2019
--
-- Operating inventory (live ResNexus 2026-09-04, not directory guesses):
--   RV Site qty 187 — bookable Premiere + Signature + buddy / pull-through /
--     pull-in / motorhome-only / back-in pads numbered 001–206 minus 19 unused
--     numbers (18, 28–29, 33–34, 44–45, 124–127, 157, 163, 183–184, 186–187,
--     194–195). Signature (hot tub, outdoor TV, fireplace, stainless grill)
--     is a subset — do not add a second RV SKU. Visit Sevierville Phase 1+2
--     49+97=146, RVshare 133/140, Spot2Nite 155, Campendium 49 are stale.
--   Tiny Home qty 6 — TH1–TH5 sleep 2; TH6 sleeps 6 with private hot tub.
--   Glamping Tent qty 8 — T01–T08 safari tents (existing stub). Pets on
--     Tents 1, 2, and 8 only.
--   property_total_sites = 201 (187+6+8)
--
-- Rates USD, room_only. Do not set rate_avg_retail_daily_rate (trigger).
--   Operator: Premiere $88.99–$159.99; Signature $149.99–$249.99 (subset);
--     tents $199.99–$229.99; tiny homes $189.99–$309.99.
--   ResNexus Sat–Sun Sep 5–6 2026: RV $133.66–$142.99; T03 $176.66
--     (below published tent band — likely promo). Maps “from $88.”
--   Monthly Premiere Nov–Mar $750–$850 is extended-stay, not ADR.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'The Ridge Outdoor Resort',
  slug = 'the-ridge-outdoor-resort-sevierville-tn',
  property_type = 'Outdoor Resort',
  source = 'Sage',
  discovery_source = 'web_research_ridge_outdoor_resort_operator_gmaps_2026_09',
  address = '1250 Middle Creek Road',
  city = 'Sevierville',
  state = 'TN',
  zip_code = '37862',
  country = 'United States',
  lat = 35.8412592,
  lon = -83.5405319,
  url = 'https://theridgeoutdoorresort.com/',
  phone_number = '+1-865-505-3111',
  property_total_sites = 201,
  year_site_opened = 2019,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'Yes',
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
  property_golf_cart_rental = 'Yes',
  property_basketball = 'Yes',
  property_propane_refilling_station = 'Yes',
  property_alcohol_available = 'No',
  property_ota_platforms = ARRAY['resnexus']::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Operator-branded “Smokies #1 Outdoor Resort” / luxury RV + outdoor resort on 50+ acres, 3 miles from Pigeon Forge and Dollywood (opened 2019). Mixed product: 187 FHU stamped-concrete RV sites (Signature subset), 8 ensuite safari tents, 6 tiny homes. Two zero-entry pools, lazy river, events center, fitness, pickleball, 2 dog parks, deli, jeep/golf-cart rentals. Upscale — not rustic. Keep Outdoor Resort (not RV Resort) so is_glamping_property can stay Yes. Distinct from Star Gazer Glamping Village. info@theridgeoutdoorresort.com.',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD. Direct book ResNexus via theridgeoutdoorresort.com. Premiere RV check-in 12:00 PM; Signature / tents / tiny homes 3:00 PM; all check-out 11:00 AM. Pets on RV sites and Tents 1, 2, 8; no pets in tiny homes. Operator Premiere $88.99–$159.99; Signature $149.99–$249.99; tents $199.99–$229.99; tiny homes $189.99–$309.99. Monthly Premiere Nov–Mar $750–$850 is not ADR. Reservations also 888-559-2267. info@theridgeoutdoorresort.com; +1-865-505-3111.',
  description = $$Upscale outdoor resort at 1250 Middle Creek Road, Sevierville, Tennessee (Google Maps 35.8412592, -83.5405319; plus code RFR5+GQ), on 50+ acres three miles from Pigeon Forge and Dollywood. 201 bookable sites: 187 full-hookup stamped-concrete RV pads (Premiere plus Signature), 8 luxury safari tents, and 6 tiny homes. Two zero-entry pools, lazy river, events center, fitness room, pickleball and sports courts, two dog parks, fishing pond, on-site deli, jeep and golf-cart rentals. Opened 2019. Distinct from Star Gazer Glamping Village.$$,
  activities_raw = 'On-site: two zero-entry pools, lazy river, hot tub, events center / arcade, fitness center, 24-hour laundry, luxury bathhouses, pickleball / basketball / gaga ball, playground, two dog parks, catch-and-release fishing pond, on-site deli, jeep rentals, golf-cart rentals, firewood / ice / propane, planned resort activities. Nearby: Pigeon Forge (~3 mi), Dollywood / Splash Country, Sevierville, Gatlinburg, Great Smoky Mountains National Park, Tennessee Mountain View Winery.',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_fishing = 'Yes',
  activities_swimming = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_fall_fun = 'Yes',
  activities_historic_sightseeing = 'Yes',
  setting_forest = 'Yes',
  setting_mountainous = 'Yes',
  rv_parking = 'Yes',
  rv_sewer_hook_up = 'Yes',
  rv_electrical_hook_up = 'Yes',
  rv_water_hookup = 'Yes',
  rv_accommodates_slideout = 'Yes',
  rv_vehicle_length = '70',
  rv_surface_level = 'Yes',
  rv_surface_type = 'Concrete',
  rv_generators_allowed = 'No',
  rv_vehicles_fifth_wheels = 'Yes',
  rv_vehicles_class_a_rvs = 'Yes',
  rv_vehicles_class_b_rvs = 'Yes',
  rv_vehicles_class_c_rvs = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 12959
  AND property_id = 'aaed32da-3abc-482c-a74f-62bb5366fa3d';

-- Existing Canvas Tent stub → Glamping Tent qty 8.
UPDATE public.all_sage_data
SET
  site_name = 'Glamping Tent',
  unit_type = 'Safari Tent',
  quantity_of_units = 8,
  unit_capacity = '6',
  unit_bed = 'Queen / twins / bunks / sleeper sofa (varies by tent)',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_cable = 'Yes',
  unit_picnic_table = 'Yes',
  unit_charcoal_grill = 'Yes',
  unit_mini_fridge = 'Yes',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. T01–T08 named luxury canvas tents. Tents 1, 2, and 8 are pet-friendly. Sleeps 4–6. Extreme temps can affect canvas even with HVAC.',
  minimum_nights = '1',
  unit_description = $$Luxury canvas safari tent (qty 8): operator Tents 1–8 / ResNexus T01–T08 with private bathroom and shower, kitchenette, mini-fridge, living area, HVAC, cable/Wi-Fi/streaming, gas fire pit, charcoal grill, and picnic table. Sleeps 4–6 (most sleep 6; T07/T08 sleep 4). Pets only on Tents 1, 2, and 8. Check-in 3:00 PM / check-out 11:00 AM. Linens included. Shared resort amenities (pools, lazy river, events center).$$,
  amenities_raw = 'Ensuite safari tent; kitchenette; mini-fridge; HVAC; cable/Wi-Fi; fire pit; charcoal grill; picnic table. Pets on Tents 1, 2, 8 only. Shared pools, lazy river, deli.',
  rate_winter_weekday = '188',
  rate_winter_weekend = '210',
  rate_spring_weekday = '200',
  rate_spring_weekend = '220',
  rate_summer_weekday = '220',
  rate_summer_weekend = '230',
  rate_fall_weekday = '210',
  rate_fall_weekend = '225',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 188, 'weekend', 210),
      'spring', jsonb_build_object('weekday', 200, 'weekend', 220),
      'summer', jsonb_build_object('weekday', 220, 'weekend', 230),
      'fall', jsonb_build_object('weekday', 210, 'weekend', 225),
      'note', 'USD room_only. Operator tent $199.99–$229.99. Capped prior 2026-09-01 summer weekend 265 to published max. ResNexus T03 $176.66 Sep 5–6 2026 is below band (promo). theridgeoutdoorresort.com/luxury-tent-glamping/.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published + split from Canvas Tent stub using theridgeoutdoorresort.com + live ResNexus + Google Maps @35.8412592,-83.5405319 (RFR5+GQ). property_type Glamping Resort → Outdoor Resort; is_glamping_property Yes. This row is Glamping Tent qty 8. Replaced stub lat/lon 35.8384,-83.5088. Distinct from Star Gazer Glamping Village.'
WHERE id = 12959
  AND property_id = 'aaed32da-3abc-482c-a74f-62bb5366fa3d';

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
  property_golf_cart_rental, property_basketball, property_propane_refilling_station,
  property_alcohol_available, property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_biking, activities_fishing, activities_swimming,
  activities_wildlife_watching, activities_stargazing, activities_scenic_drives,
  activities_fall_fun, activities_historic_sightseeing,
  setting_forest, setting_mountainous,
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
  'published', 'Yes', 'Yes', 'Sage', 'The Ridge Outdoor Resort', v.site_name,
  'web_research_ridge_outdoor_resort_operator_gmaps_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  201, v.qty, v.unit_type, v.capacity, v.bed,
  v.ensuite, v.shower, v.kitchenette, v.full_kitchen,
  'Yes', 'Yes', v.pets, 'Yes', 'Yes',
  v.campfire, 'Yes', v.cable, v.hot_tub, 'No',
  v.fridge, 'Yes', v.grill, 'No',
  2019::numeric, NULL::smallint, NULL::smallint,
  v.season, '1',
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_fitness_room, g.property_dog_park, g.property_waterpark, g.property_waterfront,
  g.property_golf_cart_rental, g.property_basketball, g.property_propane_refilling_station,
  g.property_alcohol_available, g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_biking, g.activities_fishing, g.activities_swimming,
  g.activities_wildlife_watching, g.activities_stargazing, g.activities_scenic_drives,
  g.activities_fall_fun, g.activities_historic_sightseeing,
  g.setting_forest, g.setting_mountainous,
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
      'Tiny Home', 6::numeric, 'Tiny Home', '2', 'Private bedroom (TH6 adds loft twins)',
      'Yes', 'Yes', 'No', 'Yes', 'No', 'Yes', 'Yes', 'No', 'Yes', 'Yes',
      'Year-round. TH1–TH5 sleep 2; TH6 sleeps 6 with private hot tub on the waterside deck. Not pet-friendly.',
      '190', '210', '210', '240', '280', '310', '230', '270',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 190, 'weekend', 210), 'spring', jsonb_build_object('weekday', 210, 'weekend', 240), 'summer', jsonb_build_object('weekday', 280, 'weekend', 310), 'fall', jsonb_build_object('weekday', 230, 'weekend', 270), 'note', 'USD room_only. Operator tiny-home $189.99–$309.99. TH1–TH5 couples; TH6 family + hot tub is the top of the band. Do not invent a separate TH6 SKU. theridgeoutdoorresort.com/tiny-home-glamping-cabins/.')),
      $$Tiny Home (qty 6): TH1–TH5 sleep 2 with private bedroom, full bathroom, full kitchen, living area, gas fire pit, charcoal grill, Wi-Fi/cable. TH6 sleeps 6 (downstairs bedroom + loft twins) with a private hot tub on the waterside deck across from the lazy river and deli. Linens included. Not pet-friendly. Check-in 3:00 PM / check-out 11:00 AM. Do not split TH6 into its own row — operator published one tiny-home product.$$,
      'Tiny home; ensuite; full kitchen; fire pit; charcoal grill; Wi-Fi/cable. TH6 private hot tub. No pets. Shared pools, lazy river, deli.',
      E'[2026-09-04] Added Tiny Home qty 6 (TH1–TH6) from theridgeoutdoorresort.com/tiny-home-glamping-cabins + ResNexus.'
    ),
    (
      'RV Site', 187::numeric, 'RV Site', '6', NULL,
      'No', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes', 'No', 'No', 'No',
      'Year-round. 187 bookable FHU pads from ResNexus numbers 001–206 minus 19 unused. Signature / buddy / pull-through / pull-in / motorhome-only / back-in are subsets. Monthly Premiere Nov–Mar $750–$850 is inside this 187.',
      '89', '110', '110', '140', '145', '160', '134', '155',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 89, 'weekend', 110), 'spring', jsonb_build_object('weekday', 110, 'weekend', 140), 'summer', jsonb_build_object('weekday', 145, 'weekend', 160), 'fall', jsonb_build_object('weekday', 134, 'weekend', 155), 'note', 'USD room_only. Operator Premiere $88.99–$159.99; Signature subset $149.99–$249.99 (not a second SKU). ResNexus Sep 5–6 2026 weekend $133.66–$142.99. Maps from $88. Do not store monthly $750–$850 as ADR. theridgeoutdoorresort.com/rv-sites/.')),
      $$Full-hookup RV site (qty 187): live ResNexus bookable pads numbered 001–206 minus 19 unused site numbers. Premiere FHU 50/30-amp stamped/level concrete 62–100 ft (average ~70 ft), plus Signature subset (private hot tub, outdoor TV, wood-burning fireplace, stainless grill; check-in 3:00 PM). Buddy, pull-through, pull-in, motorhome-only, and back-in are layout types inside this 187 — do not add extra rows. Pets welcome. Picnic table and fire pit on Premiere. Cable, Wi-Fi/ethernet. Big-rig friendly. Monthly Premiere Nov–Mar $750–$850 is extended stay, not extra inventory. Directory 49/133/140/146/155 counts are stale vs the 2026 booking engine.$$,
      'FHU stamped concrete; 50/30-amp; cable/Wi-Fi; picnic table; fire pit. Signature subset adds hot tub/TV/fireplace/grill. Pet-friendly. Shared pools, lazy river, laundry.',
      E'[2026-09-04] Added RV Site qty 187 from live ResNexus (001–206 minus 19 unused). Signature is a subset.'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed,
  ensuite, shower, kitchenette, full_kitchen, pets, campfire, cable, hot_tub, fridge, grill,
  season,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE g.id = 12959
  AND g.property_id = 'aaed32da-3abc-482c-a74f-62bb5366fa3d'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = 'aaed32da-3abc-482c-a74f-62bb5366fa3d'
      AND x.site_name = v.site_name
  );

COMMIT;
