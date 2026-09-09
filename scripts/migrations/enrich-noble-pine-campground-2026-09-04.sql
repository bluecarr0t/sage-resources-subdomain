-- ============================================================================
-- Noble Pine Campground (Mammoth Cave, KY / Lincoln Trailhead): publish and
-- split A-frame / bell-tent / Trailboss / RV-tent inventory. Distinct from
-- Mammoth Cave BaseCamp, Rock Cabin Camping, Maple Springs Group Campground,
-- Three Springs, and NPS Mammoth Cave Campground. Do not merge those.
--
-- Sources (retrieved 2026-09-04):
--   https://www.noblepine.net/ (+ /book-now /camp-site /what-we-offer
--     /glamping-tent /tulip-a-frame /trail-boss /camping-with-horses /contact)
--   Hipcamp (Kristen C.):
--     https://www.hipcamp.com/en-US/land/kentucky-noble-pine-campground-2ejhzln8
--   RV LIFE: 10 sites; 510 Ollie Road
--   Google Maps business pin:
--     https://www.google.com/maps/place/Noble+Pine+Cabins,+Glamping,+%26+Horse+Camp/@37.2562365,-86.1616907,17z
--     lat 37.2562365 / lon -86.1616907; plus code 7R4Q+F8
--     510 Ollie Rd, Mammoth Cave, KY 42259
--     (skip google_place_id — CID /g/11q24knck4 only, not ChIJ)
--
-- Operating inventory:
--   A-Frame qty 1 — Tulip A-frame (existing stub). Shared bath ~40 yards.
--   Glamping Tent qty 2 — Hipcamp “Glamping Tent Queen” + “Glamping Farm
--     Tent”; homepage “2 glamping tents.” Dedicated tent page “1 tent” is
--     stale. Hipcamp labels them bell tents.
--   Cabin qty 1 — Trailboss (3BR / 1 bath / kitchen). Shared walls with
--     camp bathrooms.
--   RV Site qty 10 — Hipcamp host + RV LIFE published total. Water / 30-amp
--     on mixed RV/tent pads (do not add a second Tent Site SKU). Operator:
--     sites 2–9 pull-through; sites 10–11 30-amp + household outlet. Hipcamp
--     lists 1–4 only; remaining book by phone. Horse stalls are amenities.
--   property_total_sites = 14 (1+2+1+10)
--
-- Rates USD, room_only. Do not set rate_avg_retail_daily_rate (trigger).
--   Operator: pull-through / sites 10–11 $40; tent $150 (2-night min, $35
--     clean); A-frame $95 (2-night min, $40 clean, pet $40); Trailboss $165
--     (2-night min, $75 clean, pet $40). Horse stall $5.
--   Hipcamp from: RV $36–$40; Farm Tent $140; Queen tent $150; A-frame $95;
--     Trailboss $169. Replaces Travelocity Mammoth Cave cabin scrape 343/437/406.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Noble Pine Campground',
  slug = 'noble-pine-campground-mammoth-cave-ky',
  property_type = 'Campground',
  source = 'Sage',
  discovery_source = 'web_research_noble_pine_operator_gmaps_2026_09',
  address = '510 Ollie Road',
  city = 'Mammoth Cave',
  state = 'KY',
  zip_code = '42259',
  country = 'United States',
  lat = 37.2562365,
  lon = -86.1616907,
  url = 'https://www.noblepine.net/',
  phone_number = '+1-270-286-8130',
  property_total_sites = 14,
  year_site_opened = 2021,
  property_clubhouse = 'Yes',
  property_food_on_site = 'No',
  property_restaurant = 'No',
  property_laundry = 'Yes',
  property_pool = 'No',
  property_hot_tub = 'No',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  property_playground = 'No',
  property_general_store = 'No',
  property_extended_stay = 'No',
  property_pickball_courts = 'No',
  property_fitness_room = 'No',
  property_waterfront = 'No',
  property_alcohol_available = 'No',
  property_ota_platforms = ARRAY['hipcamp', 'airbnb', 'vrbo']::text[],
  ota_url_hipcamp = 'https://www.hipcamp.com/en-US/land/kentucky-noble-pine-campground-2ejhzln8',
  ota_url_airbnb = 'https://www.airbnb.com/h/tulipaframeatnoblepine',
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Small family horse camp on ~10 acres at 510 Ollie Road, 800 ft from Mammoth Cave Lincoln Trailhead. Erik & Kristen bought it March 2021. 10 W/E RV-tent pads, 2 bell tents, Tulip A-frame, Trailboss cabin. Two renovated private-feel bathhouses. Farm animals (horses, goats, chickens). Midscale — tents/A-frame share baths; Trailboss has its own. Distinct from Mammoth Cave BaseCamp and NPS campgrounds. kristen@noblepine.net.',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD. Campsites by phone/text (270) 286-8130; lodging also Hipcamp / Airbnb / VRBO. 2-night min on tent, A-frame, and Trailboss. Cleaning: tent $35, A-frame $40, Trailboss $75. Pets $40 on A-frame and Trailboss (leash); tents no pets. Horse stall $5 + free shavings. Free firewood (unseasoned); ice $3/bag. Edmonson County is dry. Taxes extra. kristen@noblepine.net; +1-270-286-8130.',
  description = $$Small family horse camp and glamping ground at 510 Ollie Road, Mammoth Cave, Kentucky (Google Maps 37.2562365, -86.1616907; plus code 7R4Q+F8), 800 feet from Mammoth Cave National Park’s Lincoln Trailhead. Ten water/30-amp RV-tent sites, two furnished bell tents, the Tulip A-frame, and the 3-bedroom Trailboss cabin. Pavilion, two bathhouses, covered 10×10 horse stalls, farm animals. Erik and Kristen purchased the campground in March 2021. Distinct from Mammoth Cave BaseCamp and the NPS campground.$$,
  activities_raw = 'On-site: pavilion and charcoal grill, yard games (cornhole, giant Jenga, croquet, bocce, steer lasso), farm animals, stargazing, horse stalls, dump station, Wi-Fi. Nearby: Lincoln Trailhead (~800 ft) and 60+ miles of Mammoth Cave horse/hike trails, Green River Ferry / Visitor Center (~25 min via ferry), Nolin Lake State Park (~10 min), Cub Run Amish stores, Cave City attractions.',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_horseback_riding = 'Yes',
  activities_fishing = 'Yes',
  activities_swimming = 'Yes',
  activities_paddling = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_historic_sightseeing = 'Yes',
  setting_forest = 'Yes',
  setting_farm = 'Yes',
  setting_field = 'Yes',
  rv_parking = 'Yes',
  rv_sewer_hook_up = 'No',
  rv_electrical_hook_up = 'Yes',
  rv_water_hookup = 'Yes',
  rv_accommodates_slideout = 'Yes',
  rv_vehicle_length = '50',
  rv_surface_level = 'Yes',
  rv_surface_type = 'Grass',
  rv_generators_allowed = 'No',
  rv_vehicles_fifth_wheels = 'Yes',
  rv_vehicles_class_a_rvs = 'Yes',
  rv_vehicles_class_b_rvs = 'Yes',
  rv_vehicles_class_c_rvs = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 13111
  AND property_id = 'fbe6a571-ecb2-4010-bf25-4f41445f1f7d';

-- Existing A-Frame stub → Tulip A-frame qty 1.
UPDATE public.all_sage_data
SET
  site_name = 'A-Frame',
  unit_type = 'A-Frame',
  quantity_of_units = 1,
  unit_capacity = '2',
  unit_bed = '1 King (foam)',
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
  unit_mini_fridge = 'Yes',
  unit_picnic_table = 'Yes',
  unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  unit_gas_fireplace = 'Yes',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. Tulip A-frame (named for the tulip tree). Shared camp bathrooms ~40 yards / ~40 steps. 2-night minimum.',
  minimum_nights = '2',
  unit_description = $$Tulip A-frame (qty 1): king foam mattress, wall A/C, gas fireplace, mini-fridge, microwave, Keurig. Outside: fire pit, small charcoal grill, table and chairs, hammock. Shared campground bathrooms about 40 yards away. Pets $40 (leash). 2-night minimum; $40 cleaning includes linens. Do not invent a 2nd A-frame.$$,
  amenities_raw = 'A-frame; king foam; A/C; gas fireplace; mini-fridge; microwave; Keurig; fire pit; charcoal grill; hammock. Shared bathhouse. Pets $40.',
  rate_winter_weekday = '95',
  rate_winter_weekend = '95',
  rate_spring_weekday = '95',
  rate_spring_weekend = '95',
  rate_summer_weekday = '95',
  rate_summer_weekend = '95',
  rate_fall_weekday = '95',
  rate_fall_weekend = '95',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 95, 'weekend', 95),
      'spring', jsonb_build_object('weekday', 95, 'weekend', 95),
      'summer', jsonb_build_object('weekday', 95, 'weekend', 95),
      'fall', jsonb_build_object('weekday', 95, 'weekend', 95),
      'note', 'USD room_only. Operator $95/night + $40 cleaning; 2-night min; pet $40. Hipcamp from $95. Replaces Travelocity Mammoth Cave cabin scrape 343/437/406 (wrong listing). noblepine.net/tulip-a-frame.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published + split from A-Frame stub using noblepine.net + Hipcamp + Google Maps @37.2562365,-86.1616907 (7R4Q+F8). property_type Glamping → Campground; is_glamping_property Yes. This row is Tulip A-frame qty 1. Distinct from Mammoth Cave BaseCamp and NPS campgrounds.'
WHERE id = 13111
  AND property_id = 'fbe6a571-ecb2-4010-bf25-4f41445f1f7d';

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
  operating_season_months, minimum_nights, ota_url_hipcamp, ota_url_airbnb,
  unit_description, amenities_raw, activities_raw,
  url, property_id, phone_number,
  property_clubhouse, property_food_on_site, property_restaurant, property_laundry,
  property_pool, property_hot_tub, property_sauna, property_family_friendly,
  property_remote_work_friendly, property_has_rentals, property_playground,
  property_general_store, property_extended_stay, property_pickball_courts,
  property_fitness_room, property_waterfront, property_alcohol_available,
  property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_biking, activities_horseback_riding, activities_fishing,
  activities_swimming, activities_paddling, activities_wildlife_watching,
  activities_stargazing, activities_scenic_drives, activities_historic_sightseeing,
  setting_forest, setting_farm, setting_field,
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
  'published', 'Yes', 'Yes', 'Sage', 'Noble Pine Campground', v.site_name,
  'web_research_noble_pine_operator_gmaps_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  14, v.qty, v.unit_type, v.capacity, v.bed,
  v.ensuite, v.shower, v.kitchenette, v.full_kitchen,
  'Yes', 'Yes', v.pets, 'Yes', v.in_water,
  'Yes', 'Yes', 'No', 'No', 'No',
  v.fridge, 'Yes', v.grill, 'No',
  2021::numeric, NULL::smallint, NULL::smallint,
  v.season, v.min_nights, g.ota_url_hipcamp, v.airbnb,
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_fitness_room, g.property_waterfront, g.property_alcohol_available,
  g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_biking, g.activities_horseback_riding, g.activities_fishing,
  g.activities_swimming, g.activities_paddling, g.activities_wildlife_watching,
  g.activities_stargazing, g.activities_scenic_drives, g.activities_historic_sightseeing,
  g.setting_forest, g.setting_farm, g.setting_field,
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
      'Glamping Tent', 2::numeric, 'Bell Tent', '4', '1 Queen + 2 convertible chairs',
      'No', 'No', 'Yes', 'No', 'No', 'Yes', 'Yes', 'No',
      'Year-round. Two Hipcamp bell tents (Queen + Farm Tent). Operator tent page “1 tent” is stale vs homepage and Hipcamp. Shared bath <80 yards. 2-night minimum. No pets.',
      '2',
      'https://www.airbnb.com/h/glamptentatnoblepine',
      '150', '150', '150', '150', '150', '150', '150', '150',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 150, 'weekend', 150), 'spring', jsonb_build_object('weekday', 150, 'weekend', 150), 'summer', jsonb_build_object('weekday', 150, 'weekend', 150), 'fall', jsonb_build_object('weekday', 150, 'weekend', 150), 'note', 'USD room_only. Operator $150/night + $35 cleaning; 2-night min. Hipcamp Queen $150 / Farm Tent $140. No pets. noblepine.net/glamping-tent.')),
      $$Bell / glamping tent (qty 2): Hipcamp Queen tent and Farm Tent. Queen foam mattress, two chairs that convert to twins (sleeps 4), A/C and heat, mini-fridge, microwave, Keurig, dinnerware, linens. Deck, hammock, table/chairs, small charcoal grill, fire pit. Shared camp bathrooms. No pets. 2-night minimum.$$,
      'Bell tent on deck; queen + convertible chairs; A/C; kitchenette; fire pit; grill; hammock. Shared bath. No pets.',
      E'[2026-09-04] Added Glamping Tent qty 2 (Bell Tent) from homepage + Hipcamp Queen/Farm Tent listings.'
    ),
    (
      'Cabin', 1::numeric, 'Cabin', '6', '2 Queen + 2 twins',
      'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
      'Year-round. Trailboss Cabin only. 3BR / 1 bath / kitchen; shared roof with camp bathrooms. 2-night minimum. Pets $40.',
      '2',
      NULL,
      '165', '165', '165', '165', '165', '165', '165', '165',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 165, 'weekend', 165), 'spring', jsonb_build_object('weekday', 165, 'weekend', 165), 'summer', jsonb_build_object('weekday', 165, 'weekend', 165), 'fall', jsonb_build_object('weekday', 165, 'weekend', 165), 'note', 'USD room_only. Operator $165/night + $75 cleaning; 2-night min; pet $40. Hipcamp from $169. Older homepage $150–$165. noblepine.net/trail-boss.')),
      $$Trailboss Cabin (qty 1): 3 bedrooms (queen / queen / two twins), 1 bathroom, kitchen (no dishwasher), living room, stackable washer-dryer, pellet stove, mini-split A/C. Linens included. Shares roof/walls with the camp bathhouse. Pets $40. 2-night minimum. Do not invent extra cabins — bunkhouse is the owners’ home.$$,
      '3BR cabin; private bath; full kitchen; laundry; pellet stove; mini-split. Pets $40. Shared walls with camp bathrooms.',
      E'[2026-09-04] Added Cabin qty 1 (Trailboss) from noblepine.net/trail-boss + Hipcamp.'
    ),
    (
      'RV Site', 10::numeric, 'RV Site', '4', NULL,
      'No', 'No', 'No', 'No', 'Yes', 'No', 'Yes', 'Yes',
      'Year-round. 10 W/E RV-tent pads (Hipcamp host + RV LIFE). Sites 2–9 pull-through; 10–11 30-amp + household outlet. Same pads take tents — do not add a Tent Site row. Hipcamp lists 1–4; rest by phone. Stalls $5 are not extra sites.',
      '1',
      NULL,
      '40', '40', '40', '40', '40', '40', '40', '40',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 40, 'weekend', 40), 'spring', jsonb_build_object('weekday', 40, 'weekend', 40), 'summer', jsonb_build_object('weekday', 40, 'weekend', 40), 'fall', jsonb_build_object('weekday', 40, 'weekend', 40), 'note', 'USD room_only. Operator $40/night W/E 30-amp. Hipcamp from $36–$40. Horse stall $5 extra. Dump station on site. noblepine.net/camp-site.')),
      $$Water/30-amp RV or tent site (qty 10): Hipcamp host and RV LIFE published total. Mixed grass pads; sites 2–9 pull-through; sites 10–11 30-amp plus a regular outlet. Vehicles under ~50 ft (Hipcamp). Dump station; no sewer hookup. Shared bathhouses. Pets welcome on campsites. Horse stalls $5 are amenities, not lodging. Do not add a separate Tent Site SKU — tents use these same pads.$$,
      'W/E 30-amp grass pad; some pull-through; dump station; shared bathhouse. Pet-friendly. No sewer hookup.',
      E'[2026-09-04] Added RV Site qty 10 from Hipcamp host + RV LIFE (operator 2–9 pull-through; 10–11 electric variant).'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed,
  ensuite, shower, kitchenette, full_kitchen, pets, fridge, grill, in_water,
  season, min_nights, airbnb,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE g.id = 13111
  AND g.property_id = 'fbe6a571-ecb2-4010-bf25-4f41445f1f7d'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = 'fbe6a571-ecb2-4010-bf25-4f41445f1f7d'
      AND x.site_name = v.site_name
  );

COMMIT;
