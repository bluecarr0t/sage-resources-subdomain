-- ============================================================================
-- Acorns Resort (Milford, KS / Milford Lake): publish and split cabin /
-- lodge / yurt / RV inventory. Distinct from Sunset Ridge Campground
-- (Milford State Park, id 11870), Milford Lake KOA Holiday, and off-resort
-- Acorns Wild (Elk House / Studio Hayloft / Elk Ranch RV, ~20 miles south
-- near I-70). Do not merge those. Do not add pontoon/kayak rental SKUs.
--
-- Sources (retrieved 2026-09-04):
--   https://www.acornsresortkansas.com/ (+ /lodging.html /yurt-1-3-tour.html
--     /cabins-1-3-tour.html /ContactUs/)
--   Live ResNexus (Sep 5–6 2026 Labor Day weekend, all SKUs expanded):
--     https://resnexus.com/resnexus/reservations/book/E9A4F37A-6E6B-41DF-8E3D-6ACCF6EF6105
--     Cabins 1–24 + Sportsman's Cabin = 25; FHL102–105 + FHL201–205 = 9
--     lodge rooms; Yurt 01–06; nightly RV listed 26, 27, 46–61 only (18).
--     Operator published 61 FHU RV sites — remaining ~43 are seasonal /
--     monthly, not a cut to 18. Elk Ranch RV / Hayloft / Home are Acorns Wild.
--   Hipcamp:
--     https://www.hipcamp.com/en-US/land/kansas-acorns-resort-1-kk9hreqd
--   Google Maps business pin:
--     https://www.google.com/maps/place/Acorns+Resort/@39.156297,-96.898319,17z
--     lat 39.156297 / lon -96.898319; plus code 5442+GM
--     3710 Farnum Creek Rd, Milford, KS 66514
--     (skip google_place_id — CID /g/1tq8k1xs only, not ChIJ)
--   Good Sam / Go Camping America / The Dyrt / Outdoorsy (directory)
--
-- Operating inventory:
--   Cabin qty 25 — ResNexus 1–24 + Sportsman's Cabin. Mix of 1BR+loft
--     through deluxe multi-BR. Do not invent per-SKU cabin rows. Existing
--     stub qty 6 was the yurt count, not cabins.
--   Lodge Room qty 9 — Flint Hills Lodge hotel-style rooms (unit_type
--     Hotel Room). 2 queens; microwave / apt fridge; no full cookware.
--   Yurt qty 6 — Pacific Yurts on wood platforms; electricity + A/C/heat;
--     no running water; portable toilet nearby.
--   RV Site qty 61 — operator + Hipcamp published FHU total. Nightly
--     bookable subset is 46–61 (newer concrete, 14-night max) plus 26–27.
--   property_total_sites = 101 (25+9+6+61)
--
-- Rates USD, room_only. Do not set rate_avg_retail_daily_rate (trigger).
--   Cabin: keep 2026-09-01 OTA 2BR from-rate $165 band (145–205). Official
--     site has no cabin rate card; Labor Day weekend cabins occupied.
--   RV: Go Camping America from $32; Good Sam / Hipcamp from $40.
--     ResNexus $50 on this date was Elk Ranch RV (Acorns Wild) — ignore.
--   Lodge / yurt: no published card; Labor Day weekend occupied. Leave
--     null — do not invent ADR. Dyrt $25–$350 is a directory range.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Acorns Resort',
  slug = 'acorns-resort-milford-ks',
  property_type = 'Outdoor Resort',
  source = 'Sage',
  discovery_source = 'web_research_acorns_resort_operator_gmaps_2026_09',
  address = '3710 Farnum Creek Road',
  city = 'Milford',
  state = 'KS',
  zip_code = '66514',
  country = 'United States',
  lat = 39.156297,
  lon = -96.898319,
  url = 'https://www.acornsresortkansas.com/',
  phone_number = '+1-785-463-4000',
  property_total_sites = 101,
  year_site_opened = 2005,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'Yes',
  property_laundry = 'Yes',
  property_pool = 'Yes',
  property_hot_tub = 'No',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  property_playground = 'No',
  property_general_store = 'Yes',
  property_extended_stay = 'Yes',
  property_pickball_courts = 'No',
  property_fitness_room = 'No',
  property_golf_cart_rental = 'No',
  property_waterfront = 'Yes',
  property_alcohol_available = 'Yes',
  property_ota_platforms = ARRAY['hipcamp', 'resnexus', 'airbnb', 'outdoorsy', 'thedyrt']::text[],
  ota_url_hipcamp = 'https://www.hipcamp.com/en-US/land/kansas-acorns-resort-1-kk9hreqd',
  ota_url_airbnb = 'https://www.airbnb.com/rooms/925453808553367423',
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Kansas Premier Lakeside Resort (est. 2005) on Milford Lake: 25 custom cabins, 9 Flint Hills Lodge rooms, 6 Pacific Yurts, 61 FHU RV sites. The Cove Bar & Grill, seasonal pool, beaches, boat slips, pontoon/kayak/SUP/canoe rentals, Milford Lake Event Center, convenience store, Wi-Fi. Upscale mixed outdoor resort — keep Outdoor Resort (not RV Resort) so is_glamping_property can stay Yes. Yurts are rustic (no running water). Distinct from Sunset Ridge / Milford State Park and off-site Acorns Wild. acornsresort@gmail.com.',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD. Direct book ResNexus via acornsresortkansas.com. Check-in 4:00 PM / check-out 11:00 AM. Fri+Sat must book together; holidays 3-night min. Pets $40/pet/night (Hipcamp; older GCA copy said $25). Credit-card surcharge 3%. Extra guest $20/person/night up to max occ. Office daily 8:00 AM–5:00 PM. Text 785-450-8181; acornsresort@gmail.com; +1-785-463-4000. Cabin ADR is the 2026-09-01 2BR OTA $165 band (official site has no rate card). RV from GCA $32 / Good Sam+Hipcamp $40. Lodge and yurt have no published card — leave null.',
  description = $$Lakeside outdoor resort at 3710 Farnum Creek Road, Milford, Kansas (Google Maps 39.156297, -96.898319; plus code 5442+GM), on Milford Lake (15,000+ acres). 101 accommodations: 25 custom cabins, 9 Flint Hills Lodge hotel-style rooms, 6 Pacific Yurts, and 61 full-hookup RV sites. The Cove Bar & Grill, seasonal pool, beaches, boat slips and rentals, event center, convenience store. Opened 2005. Distinct from Sunset Ridge Campground at Milford State Park and from off-resort Acorns Wild (elk farm).$$,
  activities_raw = 'On-site: The Cove Bar & Grill (live music / patio), seasonal pool, sandy beaches, boat slips, pontoon / kayak / SUP / canoe rentals, Milford Lake Event Center, convenience store, Wi-Fi, picnic / BBQ / fire rings, laundry, restrooms/showers. Nearby: Milford Lake fishing and boating, Milford Nature Center / fish hatchery, Milford State Park, Fort Riley, Junction City, Manhattan.',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_fishing = 'Yes',
  activities_swimming = 'Yes',
  activities_paddling = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_historic_sightseeing = 'Yes',
  setting_forest = 'Yes',
  setting_field = 'Yes',
  rv_parking = 'Yes',
  rv_sewer_hook_up = 'Yes',
  rv_electrical_hook_up = 'Yes',
  rv_water_hookup = 'Yes',
  rv_accommodates_slideout = 'Yes',
  rv_vehicle_length = '40',
  rv_surface_level = 'Yes',
  rv_surface_type = 'Mixed gravel / concrete',
  rv_generators_allowed = 'No',
  rv_vehicles_fifth_wheels = 'Yes',
  rv_vehicles_class_a_rvs = 'Yes',
  rv_vehicles_class_b_rvs = 'Yes',
  rv_vehicles_class_c_rvs = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 13126
  AND property_id = '1893a0c3-1cbc-4e6e-bf02-a6d6f96df3b2';

-- Existing Cabin stub (qty 6 was the yurt count) → Cabin residual qty 25.
UPDATE public.all_sage_data
SET
  site_name = 'Cabin',
  unit_type = 'Cabin',
  quantity_of_units = 25,
  unit_capacity = '8',
  unit_bed = 'Varies by cabin (1BR+loft through deluxe multi-BR)',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_cable = 'Yes',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  unit_mini_fridge = 'Yes',
  unit_picnic_table = 'Yes',
  unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. 25 custom cabins (ResNexus 1–24 + Sportsman). Weekly discount on a 6-person cabin subset. Cabin 1 has an entry ramp + shower; 2–3 have tubs. Do not invent per-SKU cabin rows.',
  minimum_nights = '2',
  unit_description = $$Custom cabin (qty 25): ResNexus Cabins 1–24 plus Sportsman's Cabin. Mix of 1-bedroom+loft through deluxe multi-bedroom units with full kitchen, heat/AC, Wi-Fi, cable, porch, picnic table, BBQ, and fire ring. Linens in standard cabins (not Sportsman). Pets $40/pet/night. Weekend Fri+Sat together; holidays 3-night min. Occupancy varies (policy max 8–20 by cabin). Do not add Elk House / Hayloft (Acorns Wild).$$,
  amenities_raw = 'Full kitchen; private bath; HVAC; Wi-Fi; cable; porch; picnic table; charcoal grill; fire ring. Pets $40. Shared pool, The Cove, beaches, event center.',
  rate_winter_weekday = '145',
  rate_winter_weekend = '162',
  rate_spring_weekday = '165',
  rate_spring_weekend = '178',
  rate_summer_weekday = '185',
  rate_summer_weekend = '205',
  rate_fall_weekday = '172',
  rate_fall_weekend = '188',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 145, 'weekend', 162),
      'spring', jsonb_build_object('weekday', 165, 'weekend', 178),
      'summer', jsonb_build_object('weekday', 185, 'weekend', 205),
      'fall', jsonb_build_object('weekday', 172, 'weekend', 188),
      'note', 'USD room_only. Official site has no cabin rate card. Keep 2026-09-01 2BR cabin OTA from-rate $165 band (145–205). Labor Day weekend Sep 5–6 2026 ResNexus cabins occupied. Weekly 6-person cabin discount exists (subset).'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published + split from Cabin stub using acornsresortkansas.com + live ResNexus + Hipcamp + Google Maps @39.156297,-96.898319 (5442+GM). property_type RV Resort → Outdoor Resort; is_glamping_property No → Yes. Stub qty 6 was the yurt count — this row is Cabin qty 25. Distinct from Sunset Ridge (Milford State Park) and Acorns Wild.'
WHERE id = 13126
  AND property_id = '1893a0c3-1cbc-4e6e-bf02-a6d6f96df3b2';

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
  property_fitness_room, property_golf_cart_rental, property_waterfront,
  property_alcohol_available,
  property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_biking, activities_fishing,
  activities_swimming, activities_paddling, activities_wildlife_watching,
  activities_stargazing, activities_scenic_drives, activities_historic_sightseeing,
  setting_forest, setting_field,
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
  'published', 'Yes', 'Yes', 'Sage', 'Acorns Resort', v.site_name,
  'web_research_acorns_resort_operator_gmaps_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  101, v.qty, v.unit_type, v.capacity, v.bed,
  v.ensuite, v.shower, v.kitchenette, v.full_kitchen,
  'Yes', 'Yes', v.pets, 'Yes', v.in_water,
  v.campfire, 'Yes', v.cable, 'No', 'No',
  v.fridge, v.picnic, v.grill, 'No',
  2005::numeric, NULL::smallint, NULL::smallint,
  v.season, v.min_nights, g.ota_url_hipcamp, g.ota_url_airbnb,
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_fitness_room, g.property_golf_cart_rental, g.property_waterfront,
  g.property_alcohol_available,
  g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_biking, g.activities_fishing,
  g.activities_swimming, g.activities_paddling, g.activities_wildlife_watching,
  g.activities_stargazing, g.activities_scenic_drives, g.activities_historic_sightseeing,
  g.setting_forest, g.setting_field,
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
      'Lodge Room', 9::numeric, 'Hotel Room', '6', '2 Queen',
      'Yes', 'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
      'Year-round. Flint Hills Lodge FHL102–105 and FHL201–205 (9 hotel-style rooms). Overlooking Farnum Creek boat ramp / Milford Lake. No full cookware (microwave, apt fridge, coffeemaker only).',
      '2',
      NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text,
      jsonb_build_object('2026', jsonb_build_object('note', 'USD room_only. No published lodge rate card. Labor Day weekend Sep 5–6 2026 ResNexus lodge rooms occupied. Maps Hotels: contact property. Do not invent ADR.')),
      $$Flint Hills Lodge room (qty 9): ResNexus FHL102–105 and FHL201–205. Two queen beds, private bath, cable TV, Wi-Fi, microwave, apartment-size refrigerator, coffeemaker, heat/AC, walk-out porch, charcoal BBQ. Lake / boat-ramp views. No full kitchen cookware. Pets $40/pet/night. Sleeps 6 (Hipcamp); occupancy policy 4/room. Weekend Fri+Sat together.$$,
      'Hotel-style lodge room; 2 queens; private bath; HVAC; Wi-Fi; cable; microwave; apt fridge; porch; charcoal BBQ. Pets $40. Shared pool and The Cove.',
      E'[2026-09-04] Added Lodge Room qty 9 (Hotel Room / Flint Hills Lodge FHL102–205) from operator + live ResNexus.'
    ),
    (
      'Yurt', 6::numeric, 'Yurt', '4', '1 Queen + 2 cots',
      'No', 'No', 'No', 'No', 'Yes', 'No', 'Yes', 'Yes', 'No', 'No', 'No',
      'Year-round. Pacific Yurts 01–06 on wood platforms above rocky shoreline. Electricity, A/C, and heat. No running water; portable toilet nearby. Shared resort baths.',
      '2',
      NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text,
      jsonb_build_object('2026', jsonb_build_object('note', 'USD room_only. No published yurt rate card. Labor Day weekend Sep 5–6 2026 ResNexus yurts occupied. Do not invent ADR.')),
      $$Pacific Yurt (qty 6): operator Yurts 1–6 / ResNexus Yurt 01–06 on wood platforms overlooking rocky Milford Lake shore. Queen bed plus two cots (sleeps 4; policy max 6). Electricity, A/C, and heat. No running water and no ensuite — portable toilet nearby; shared resort showers. Pets $40/pet/night. Weekend Fri+Sat together.$$,
      'Pacific Yurt on platform; queen + cots; electricity; A/C/heat. No running water. Portable toilet nearby. Pets $40. Shared resort baths / pool / The Cove.',
      E'[2026-09-04] Added Yurt qty 6 (Pacific Yurts 01–06) from operator yurt tour + Hipcamp + live ResNexus.'
    ),
    (
      'RV Site', 61::numeric, 'RV Site', '6', NULL,
      'No', 'No', 'No', 'No', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
      'Year-round. Operator/Hipcamp 61 FHU sites. Nightly bookable subset on 2026-09-04 ResNexus: RV-26, RV-27, RV-46–61 (18). Sites 46–61 are newer concrete pads (approx. 30×20 ft, ~120–125 ft drive), 14-night max. Remaining ~43 are seasonal/monthly — do not cut inventory to 18. GCA/RVshare “16 RV sites” is that nightly subset, stale vs 61.',
      '1',
      '32', '40', '40', '45', '40', '50', '40', '45',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 32, 'weekend', 40), 'spring', jsonb_build_object('weekday', 40, 'weekend', 45), 'summer', jsonb_build_object('weekday', 40, 'weekend', 50), 'fall', jsonb_build_object('weekday', 40, 'weekend', 45), 'note', 'USD room_only. GCA from $32; Good Sam / Hipcamp from $40. ResNexus $50 on Sep 5–6 2026 was Elk Ranch RV (Acorns Wild) — not this row. FHU 20/30/50-amp. Nightly 46–61 Hipcamp lists vehicles under 30 ft on the concrete pad; Outdoorsy says mixed gravel pads take a wider range — rv_vehicle_length 40 is a mixed-park figure.')),
      $$Full-hookup RV site (qty 61): operator and Hipcamp published total. Water / 20–30–50-amp electric / sewer, Wi-Fi, picnic table, fire ring. Newer nightly sites 46–61 are concrete (approx. 30×20 ft pad, ~120–125 ft curved drive, 14-night max). Sites 26–27 also nightly. Remaining inventory is seasonal/monthly — still counts in 61. Pets $40/pet/night. Do not add Elk Ranch RV (Acorns Wild) or pontoon rentals.$$,
      'FHU 20/30/50-amp; Wi-Fi; picnic table; fire ring. Mixed gravel / newer concrete. Pet-friendly. Shared pool, The Cove, baths, laundry.',
      E'[2026-09-04] Added RV Site qty 61 from operator + Hipcamp (live ResNexus nightly subset 18; do not cut to GCA 16).'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed,
  ensuite, shower, kitchenette, full_kitchen, pets, fridge, campfire, picnic, grill, cable, in_water,
  season, min_nights,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE g.id = 13126
  AND g.property_id = '1893a0c3-1cbc-4e6e-bf02-a6d6f96df3b2'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = '1893a0c3-1cbc-4e6e-bf02-a6d6f96df3b2'
      AND x.site_name = v.site_name
  );

COMMIT;
