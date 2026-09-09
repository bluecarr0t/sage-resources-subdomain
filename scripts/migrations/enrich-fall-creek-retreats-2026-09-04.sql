-- ============================================================================
-- Fall Creek Retreats (Purlear, NC / Boone / Blue Ridge): publish and split
-- A-frame / geodome / tiny-home / modern-cabin inventory. Distinct from
-- Fall Creek Falls State Park (Spencer, TN, id 11738), 36 North Cabins,
-- Misty Mountain Falls Cabin, Greene Mountain Retreat, and Serenity Falls.
-- Do not merge those.
--
-- Sources (retrieved 2026-09-04):
--   https://fallcreekretreats.com/ (+ /transforming-a-frame/ /geodome/
--     /tiny-home/ /modern-cabin-2-2/ /frequently-asked-questions/)
--   Hipcamp (Paul D.; 3 lodging sites / 122 acres):
--     https://www.hipcamp.com/en-US/land/north-carolina-glamping-at-fall-creek-retreats-lz9h5v91
--     Live from-rates Oct 13–14 and Oct 16–17 2026: A-frame $84, Tiny $92,
--     Geodome $93. Pet fee $30 (operator tiny-home page $35).
--   Google Maps business pin:
--     https://www.google.com/maps/place/Fall+Creek+Retreats/@36.2265508,-81.4343185,17z
--     lat 36.2265508 / lon -81.4343185; plus code 6HG8+J7
--     Maps label 2852 Fall Creek Rd, Purlear, NC 28665
--     Operator address sign / FAQ: 2598 Fall Creek Road
--     (skip google_place_id — CID /g/11s98jd5p_ only, not ChIJ)
--
-- Operating inventory:
--   A-Frame qty 1 — existing stub (Transforming A-Frame). 12×10, swing wall.
--   Dome qty 1 — Geodome Creekside, ~200 sq ft. unit_type Dome.
--   Tiny Home qty 1 — Tiny Tranquility / Creekside Tiny Home, 288 sq ft.
--   Cabin qty 1 — Modern Cabin Creekside (2 king BR, hot tub, full kitchen).
--     Separate from the 3-site glamping cluster. Do not invent extra cabins.
--   property_total_sites = 4. Hipcamp “3 sites” is the glamping area only.
--
-- Rates USD, room_only. Do not set rate_avg_retail_daily_rate (trigger).
--   Glamping: Hipcamp from-rates above (weekday and Friday night identical).
--     Replaces 2026-09-01 $119 typical-NC-mountain stub (105–148).
--   Cabin: no public operator card; aggregator listings $182–$597 are
--     inconsistent. Leave cabin ADR null — do not invent.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Fall Creek Retreats',
  slug = 'fall-creek-retreats-purlear-nc',
  property_type = 'Glamping',
  source = 'Sage',
  discovery_source = 'web_research_fall_creek_retreats_operator_gmaps_2026_09',
  address = '2598 Fall Creek Road',
  city = 'Purlear',
  state = 'NC',
  zip_code = '28665',
  country = 'United States',
  lat = 36.2265508,
  lon = -81.4343185,
  url = 'https://fallcreekretreats.com/',
  phone_number = '+1-336-303-1564',
  property_total_sites = 4,
  year_site_opened = 2021,
  property_clubhouse = 'Yes',
  property_food_on_site = 'No',
  property_restaurant = 'No',
  property_laundry = 'Yes',
  property_pool = 'No',
  property_hot_tub = 'Yes',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'No',
  property_playground = 'No',
  property_general_store = 'No',
  property_extended_stay = 'No',
  property_pickball_courts = 'No',
  property_fitness_room = 'No',
  property_waterfront = 'Yes',
  property_alcohol_available = 'No',
  property_ota_platforms = ARRAY['hipcamp', 'airbnb']::text[],
  ota_url_hipcamp = 'https://www.hipcamp.com/en-US/land/north-carolina-glamping-at-fall-creek-retreats-lz9h5v91',
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Paul’s 122-acre creek property 7 minutes off US-421, ~22 min to Boone. Three off-grid glamping sites (A-frame, geodome, tiny home) share a pavilion hot shower; dry-flush / portable toilets; generator or solar. Separate remodeled 2021 2BR modern cabin with hot tub and full kitchen. Midscale — not rustic tents, not hotel. Distinct from Fall Creek Falls State Park, TN. support@fallcreekretreats.com.',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD. Book direct (cleaning + tax only) or Hipcamp / Airbnb. Check-in 4:00 PM / check-out 10:00 AM. Pets $30 Hipcamp / $35 operator tiny-home page; no dogs on beds. Firewood extra $10/bundle after one free. Glamping: no running water (starter water supplied). Hipcamp Oct 2026 from A-frame $84 / tiny $92 / geodome $93. Cabin has no published card. support@fallcreekretreats.com; +1-336-303-1564.',
  description = $$Creek-side glamping and cabin retreat at 2598 Fall Creek Road, Purlear, North Carolina (Google Maps 36.2265508, -81.4343185; plus code 6HG8+J7; Maps also labels 2852 Fall Creek Rd), on 122 forested acres about 7 minutes off US-421 and 22 minutes from Boone. Four units: Transforming A-Frame, Geodome, Tiny Tranquility, and a remodeled 2-bedroom modern cabin with hot tub. Shared pavilion shower for the three glamping sites. Distinct from Fall Creek Falls State Park in Tennessee.$$,
  activities_raw = 'On-site: Fall Creek (state trout stream) wading and fishing, fire pits, pavilion / cornhole, glamping-area hot shower, modern-cabin hot tub / gazebo / game room. Nearby: Boone and Blowing Rock (~22–30 min), Blue Ridge Parkway, W. Kerr Scott Reservoir, New River / Elk Knob / Grandfather Mountain state parks, Wilkesboro, West Jefferson.',
  activities_hiking = 'Yes',
  activities_fishing = 'Yes',
  activities_swimming = 'Yes',
  activities_paddling = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_fall_fun = 'Yes',
  setting_forest = 'Yes',
  setting_mountainous = 'Yes',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13105
  AND property_id = '87acd71c-d907-4dfe-b2a9-f6ba31a9b142';

-- Existing Transforming A-Frame stub → A-Frame qty 1.
UPDATE public.all_sage_data
SET
  site_name = 'A-Frame',
  unit_type = 'A-Frame',
  quantity_of_units = 1,
  unit_capacity = '2',
  unit_bed = '1 Double',
  unit_private_bathroom = 'No',
  unit_shower = 'No',
  unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_electricity = 'Yes',
  unit_water = 'No',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_mini_fridge = 'No',
  unit_picnic_table = 'No',
  unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. Transforming A-Frame (swing-open wall). Shared pavilion hot shower with Geodome and Tiny Home. Dry-flush closet toilet. ~250 ft walk from parking.',
  minimum_nights = '1',
  unit_description = $$Transforming A-Frame (qty 1): 12×10 off-grid creek cabin with a crank-up swing wall, double bed, kitchenette (Keurig, microwave, Blackstone griddle), propane heater, portable A/C, 6×12 deck, fire pit, and dry-flush half-bath closet. Shared pavilion hot shower. No running water; cooler + guest ice. Pets $30–$35; no dogs on the bed. Do not invent a 2nd A-frame.$$,
  amenities_raw = 'Swing-wall A-frame; double bed; kitchenette; propane heat; portable A/C; generator; deck; fire pit; dry-flush toilet. Shared pavilion shower. Pets $30–$35.',
  rate_winter_weekday = '84',
  rate_winter_weekend = '84',
  rate_spring_weekday = '84',
  rate_spring_weekend = '84',
  rate_summer_weekday = '84',
  rate_summer_weekend = '84',
  rate_fall_weekday = '84',
  rate_fall_weekend = '84',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 84, 'weekend', 84),
      'spring', jsonb_build_object('weekday', 84, 'weekend', 84),
      'summer', jsonb_build_object('weekday', 84, 'weekend', 84),
      'fall', jsonb_build_object('weekday', 84, 'weekend', 84),
      'note', 'USD room_only. Hipcamp from $84 (Tue Oct 13 and Fri Oct 16 2026). Replaces 2026-09-01 $119 typical-NC-mountain stub. Direct book fallcreekretreats.com/transforming-a-frame (cleaning + tax). Pet $30–$35.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published + split from A-Frame stub using fallcreekretreats.com + Hipcamp + Google Maps @36.2265508,-81.4343185 (6HG8+J7). This row is A-Frame qty 1. Distinct from Fall Creek Falls State Park, TN.'
WHERE id = 13105
  AND property_id = '87acd71c-d907-4dfe-b2a9-f6ba31a9b142';

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
  property_fitness_room, property_waterfront, property_alcohol_available,
  property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_fishing, activities_swimming, activities_paddling,
  activities_wildlife_watching, activities_stargazing, activities_scenic_drives,
  activities_fall_fun,
  setting_forest, setting_mountainous,
  rv_parking,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', 'Fall Creek Retreats', v.site_name,
  'web_research_fall_creek_retreats_operator_gmaps_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  4, v.qty, v.unit_type, v.capacity, v.bed,
  v.ensuite, v.shower, v.kitchenette, v.full_kitchen,
  v.ac, v.wifi, 'Yes', 'Yes', v.in_water,
  'Yes', 'Yes', 'No', v.hot_tub, 'No',
  v.fridge, 'No', 'Yes', 'No',
  2021::numeric, NULL::smallint, NULL::smallint,
  v.season, '1', g.ota_url_hipcamp,
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_fitness_room, g.property_waterfront, g.property_alcohol_available,
  g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_fishing, g.activities_swimming, g.activities_paddling,
  g.activities_wildlife_watching, g.activities_stargazing, g.activities_scenic_drives,
  g.activities_fall_fun,
  g.setting_forest, g.setting_mountainous,
  g.rv_parking,
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
      'Geodome', 1::numeric, 'Dome', '3', '1 Queen + fold-out double mattress',
      'No', 'No', 'Yes', 'No', 'Yes', 'Yes', 'No', 'No', 'No',
      'Year-round. Geodome Creekside ~200 sq ft, ~100 ft from parking. Shared pavilion hot shower. Dry-flush closet toilet. Pellet / gas-log stove; A/C in warm weather.',
      '93', '93', '93', '93', '93', '93', '93', '93',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 93, 'weekend', 93), 'spring', jsonb_build_object('weekday', 93, 'weekend', 93), 'summer', jsonb_build_object('weekday', 93, 'weekend', 93), 'fall', jsonb_build_object('weekday', 93, 'weekend', 93), 'note', 'USD room_only. Hipcamp from $93 (Oct 13 and Oct 16 2026). Direct book fallcreekretreats.com/geodome. Pet $30.')),
      $$Geodome (qty 1): ~200 sq ft off-grid geodesic dome on Fall Creek. Queen bed, fold-out mattress for kids (sleeps 3), pellet/gas-log stove, dining table, 20×8 deck, screened gazebo, kitchenette, generator/solar, dry-flush toilet. Shared pavilion hot shower. No running water. Pets $30. Do not invent extra domes.$$,
      'Geodome; queen + kid mattress; stove; kitchenette; deck/gazebo; fire pit; dry-flush toilet. Shared pavilion shower. Pets $30.',
      E'[2026-09-04] Added Geodome qty 1 (unit_type Dome) from operator /geodome/ + Hipcamp.'
    ),
    (
      'Tiny Home', 1::numeric, 'Tiny Home', '3', '1 Queen + pull-out single',
      'No', 'No', 'Yes', 'No', 'No', 'Yes', 'No', 'No', 'No',
      'Year-round. Tiny Tranquility 288 sq ft, ~60 ft from parking. Shared pavilion hot shower. Private portable toilet off side/back porch. Screened porch. No A/C.',
      '92', '92', '92', '92', '92', '92', '92', '92',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 92, 'weekend', 92), 'spring', jsonb_build_object('weekday', 92, 'weekend', 92), 'summer', jsonb_build_object('weekday', 92, 'weekend', 92), 'fall', jsonb_build_object('weekday', 92, 'weekend', 92), 'note', 'USD room_only. Hipcamp from $92 (Oct 13 and Oct 16 2026). Direct book fallcreekretreats.com/tiny-home. Pet $30–$35.')),
      $$Tiny Tranquility (qty 1): 288 sq ft one-room creekside tiny home. Queen bed plus pull-out single (sleeps 3), kitchenette, dining table, screened porch with rockers, propane heater, ceiling fan, gas grill, fire pit, portable toilet, camping shower bag. Shared pavilion hot shower. No running water; operator page says no Wi-Fi (Hipcamp lists Wi-Fi). Pets $30–$35. Do not invent extra tiny homes.$$,
      'Tiny home; queen + pull-out; kitchenette; screened porch; propane heat; fire pit; portable toilet. Shared pavilion shower. Pets $30–$35.',
      E'[2026-09-04] Added Tiny Home qty 1 from operator /tiny-home/ + Hipcamp.'
    ),
    (
      'Cabin', 1::numeric, 'Cabin', '4', '2 King',
      'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
      'Year-round. Modern Cabin Creekside — remodeled 2021, separate from the 3-site glamping cluster. Creek crossing on a concrete pad (~3 in water). Sleeps 4.',
      NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text,
      jsonb_build_object('2026', jsonb_build_object('note', 'USD room_only. No published cabin rate card. Direct book fallcreekretreats.com/modern-cabin-2-2. Aggregator listings $182–$597 are inconsistent — leave ADR null. Do not invent.')),
      $$Modern Cabin Creekside (qty 1): remodeled 2021 two-bedroom / two-king cabin on the same 122-acre tract, separate from the A-frame / geodome / tiny-home cluster. Full kitchen, luxury bath, washer-dryer, central heat/A/C, 100 Mbps Wi-Fi, screened porch, hot tub, fire pit, creek gazebo, game room, gas grill. Pets with prepaid fee. Creek-crossing driveway. Do not invent additional cabins.$$,
      '2BR / 2 king; full kitchen; ensuite bath; laundry; A/C; Wi-Fi; screened porch; hot tub; fire pit; gazebo. Pets with fee.',
      E'[2026-09-04] Added Cabin qty 1 (Modern Cabin Creekside) from operator /modern-cabin-2-2/. ADR left null — no public card.'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed,
  ensuite, shower, kitchenette, full_kitchen, ac, wifi, fridge, hot_tub, in_water,
  season,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE g.id = 13105
  AND g.property_id = '87acd71c-d907-4dfe-b2a9-f6ba31a9b142'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = '87acd71c-d907-4dfe-b2a9-f6ba31a9b142'
      AND x.site_name = v.site_name
  );

COMMIT;
