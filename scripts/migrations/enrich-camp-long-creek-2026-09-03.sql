-- ============================================================================
-- Camp Long Creek (Ridgedale, MO / Big Cedar Lodge): publish and split SKUs.
-- Distinct from rejected id 205 (Camp Long Creek at Big Cedar Lodge) —
-- do not un-reject or merge that row (Lodge HQ pin 190 Top of the Rock Rd).
--
-- Sources (retrieved 2026-09-03):
--   https://bigcedar.com/camp-long-creek/
--   https://bigcedar.com/package/camp-long-creek-bundles/
--   https://bigcedar.com/meetings/rfp-test/  (Glamping & Camp Cabins unit counts +
--     published shoulder/peak rack)
--   2025 fact sheet:
--     https://johnnymorrisnatureresorts.com/wp-content/uploads/2025/12/Camp-Long-Creek-Fact-Sheet_Final-2025.pdf
--   Google Maps business pin:
--     https://www.google.com/maps/place/Camp+Long+Creek/@36.5201928,-93.3072486,17z
--     lat 36.5201928 / lon -93.3072486; plus code GMCV+34
--     1358 Long Creek Rd, Ridgedale, MO 65739
--     (skip google_place_id — CID /g/1tl9n2y1 only, not ChIJ)
--
-- Operating inventory (Big Cedar meetings RFP unit counts; total 70):
--   Glamping Unit — Safari Tent qty 15; 2 guests; 280 sq ft
--   Family Glamping Unit — Safari Tent qty 3; 4 guests; 280 sq ft + kids’ tent
--   Camp Hut — Hut qty 10; 2 guests; 180 sq ft
--   Two Bedroom Camp Cabin — Cabin qty 12; 6 guests
--   Camp Cabin With Private Bedroom — Cabin qty 12; 4 guests; 330 sq ft
--   Single Room Camp Cabin — Cabin qty 18; 4 guests; 330 sq ft (ADA options)
--   property_total_sites = 70 (RFP named-SKU sum). 2025 fact sheet said 74;
--     2019 Bass Pro opening 64; Kayak 67. Do not invent a 7th SKU for the gap.
--   Entire-property / Big Cedar Lodge rooms are not extra camp sites.
--
-- Rates USD, room_only. Do not set rate_avg_retail_daily_rate (trigger).
--   RFP published: *Shoulder Jan/Feb/early Mar/Apr/late Aug/early Nov/early Dec
--     **Peak late Mar/May–Jul/early Aug/Oct/late Nov/late Dec.
--   Applied: winter/fall weekday = shoulder; spring/summer + peak weekends = peak
--     (+~10% on spring/summer weekends). Hut winter weekday $303 from Google
--     Hotels Dec 1–2 2026 (live from-rate; RFP hut shoulder was $235+).
--   Do not store 2-night bundle totals ($1050–$1350) as ADR — credits/vouchers
--     and $22 resort fee are extra.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Camp Long Creek',
  slug = 'camp-long-creek-ridgedale-mo',
  property_type = 'Glamping Resort',
  source = 'Sage',
  discovery_source = 'web_research_camp_long_creek_operator_gmaps_2026_09',
  address = '1358 Long Creek Road',
  city = 'Ridgedale',
  state = 'MO',
  zip_code = '65739',
  country = 'United States',
  lat = 36.5201928,
  lon = -93.3072486,
  url = 'https://bigcedar.com/camp-long-creek/',
  phone_number = '+1-800-225-6343',
  property_total_sites = 70,
  year_site_opened = 2019,
  property_clubhouse = 'No',
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
  property_extended_stay = 'No',
  property_pickball_courts = 'No',
  property_ota_platforms = ARRAY['expedia', 'hotels.com']::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Johnny Morris / Big Cedar 70-unit lakeside glamping camp (opened Memorial Day 2019) on Table Rock Lake, ~3 miles west of Big Cedar Lodge. Safari-style glamping tents with private indoor showers and outdoor tubs, shepherd-style Camp Huts, and camp cabins. Infinity pool + hot tub (overnight camp guests only), Long Creek Marina, Canteen Grill, Long Creek Market, shuttle, bocce, grill huts, beach, dog park. Upscale camp — not the full Lodge & Spa. Distinct from rejected Lodge-HQ stub (id 205).',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD. Direct book via Big Cedar. Check-in 4:00 PM / check-out 11:00 AM (Maps lists 3:00 PM in; operator FAQ is 4:00 PM). $22/night resort fee (fact sheet) for Big Cedar Lodge amenity access; marina day-use $8/vehicle. Pets $75/pet/night, max 2 (bundle may waive one fee). Non-smoking; no rollaways; no portable gas grills on porches. Daily housekeeping. Reservations 1-800-225-6343; Maps local (417) 348-3440. Do not treat 2-night camp bundles as ADR.',
  description = $$Johnny Morris glamping camp at 1358 Long Creek Road, Ridgedale, Missouri (Google Maps 36.5201928, -93.3072486; plus code GMCV+34), on Table Rock Lake about 3 miles west of Big Cedar Lodge and 10 miles south of Branson. Seventy custom retreats: canvas glamping tents, shepherd-style Camp Huts, and camp cabins. Infinity pool and hot tub for overnight camp guests, Long Creek Marina and boat ramp, Canteen Grill, Long Creek Market, shuttle, bocce, community grill huts, beach, and dog park. Opened 2019. Distinct from Big Cedar Lodge rooms and from rejected id 205 (Lodge HQ address).$$,
  activities_raw = 'On-site: lakeside infinity pool and hot tub (camp overnight guests only), Long Creek Marina / boat ramp, bank fishing, Long Creek Beach, bocce, community grill huts, playground, dog park, campfire s’mores on arrival, shuttle to Big Cedar Lodge. Nearby: Table Rock Lake boating/paddling, Top of the Rock golf, Ancient Ozarks Natural History Museum, hiking, Branson ~10 miles north.',
  activities_hiking = 'Yes',
  activities_fishing = 'Yes',
  activities_swimming = 'Yes',
  activities_boating = 'Yes',
  activities_paddling = 'Yes',
  activities_golf = 'Yes',
  activities_stargazing = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_scenic_drives = 'Yes',
  setting_lake = 'Yes',
  setting_forest = 'Yes',
  setting_mountainous = 'Yes',
  date_updated = '2026-09-03'
WHERE id = 13246
  AND property_id = '09e783b9-2d64-443a-aa9d-353560dbd3bd';

-- Existing Safari Tent shell becomes the 2-guest Glamping Unit (qty 15).
UPDATE public.all_sage_data
SET
  site_name = 'Glamping Unit',
  unit_type = 'Safari Tent',
  quantity_of_units = 15,
  unit_capacity = '2',
  unit_bed = '1 King',
  unit_sq_ft = 280,
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_picnic_table = 'Yes',
  unit_mini_fridge = 'Yes',
  unit_charcoal_grill = 'No',
  unit_hot_tub = 'Yes',
  unit_sauna = 'No',
  unit_cable = NULL,
  unit_ada_accessibility = 'No',
  rv_parking = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. 15 two-guest canvas glamping tents with lake or woods views. Private outdoor tub on stone patio (not the community pool spa).',
  minimum_nights = '1',
  unit_description = $$Canvas glamping tent (qty 15): 280 sq ft, sleeps 2. King bed with chandelier, private indoor shower, mini-fridge and coffee maker, table and chairs, heating and cooling. Private stone patio with firepit and outdoor tub. Lake-front or wooded views. Dog-friendly ($75/pet/night, max 2). Daily housekeeping. Distinct from the 3 Family Glamping Units (kids’ tent in the courtyard).$$,
  amenities_raw = '280 sq ft canvas tent; King; sleeps 2; private indoor shower; mini-fridge; coffee; HVAC; Wi-Fi; private stone patio; firepit; outdoor tub. Dog-friendly. Lake or woods views.',
  rate_winter_weekday = '525',
  rate_winter_weekend = '575',
  rate_spring_weekday = '575',
  rate_spring_weekend = '633',
  rate_summer_weekday = '575',
  rate_summer_weekend = '633',
  rate_fall_weekday = '525',
  rate_fall_weekend = '575',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 525, 'weekend', 575),
      'spring', jsonb_build_object('weekday', 575, 'weekend', 633),
      'summer', jsonb_build_object('weekday', 575, 'weekend', 633),
      'fall', jsonb_build_object('weekday', 525, 'weekend', 575),
      'note', 'USD room_only. Big Cedar meetings RFP Glamping Unit shoulder $525+ / peak $575+ (2026-09-03). Winter/fall weekday = shoulder; spring/summer = peak; peak weekends +10%. $22 resort fee extra. 2-night glamping bundle $1300 is not ADR (credits/vouchers included).'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-03] Published + split from Safari Tent shell using bigcedar.com/camp-long-creek + meetings RFP unit counts + Google Maps @36.5201928,-93.3072486 (GMCV+34). This row is Glamping Unit qty 15. Left rejected id 205 untouched.'
WHERE id = 13246
  AND property_id = '09e783b9-2d64-443a-aa9d-353560dbd3bd';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed, unit_sq_ft,
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
  property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_fishing, activities_swimming, activities_boating,
  activities_paddling, activities_golf, activities_stargazing,
  activities_wildlife_watching, activities_scenic_drives,
  setting_lake, setting_forest, setting_mountainous,
  rv_parking,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', 'Camp Long Creek', v.site_name,
  'web_research_camp_long_creek_operator_gmaps_2026_09', '2026-09-03', '2026-09-03',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  70, v.qty, v.unit_type, v.capacity, v.bed, v.sq_ft,
  'Yes', 'Yes', v.kitchenette, 'No',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  v.campfires, 'Yes', NULL, v.hot_tub, 'No',
  v.mini_fridge, v.picnic, 'No', v.ada,
  2019::numeric, NULL::smallint, NULL::smallint,
  v.season, '1',
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_fishing, g.activities_swimming, g.activities_boating,
  g.activities_paddling, g.activities_golf, g.activities_stargazing,
  g.activities_wildlife_watching, g.activities_scenic_drives,
  g.setting_lake, g.setting_forest, g.setting_mountainous,
  'No',
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
      'Family Glamping Unit', 3::numeric, 'Safari Tent', '4', '1 King + kids courtyard tent', 280::numeric,
      'No', 'Yes', 'Yes', 'Yes', 'Yes', 'No',
      'Year-round. Three family canvas tents (2 adults + 2 children) with extra teepee/kids’ tent in the courtyard.',
      '580', '625', '625', '688', '625', '688', '580', '625',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 580, 'weekend', 625), 'spring', jsonb_build_object('weekday', 625, 'weekend', 688), 'summer', jsonb_build_object('weekday', 625, 'weekend', 688), 'fall', jsonb_build_object('weekday', 580, 'weekend', 625), 'note', 'USD room_only. Big Cedar meetings RFP Family Glamping Unit shoulder $580+ / peak $625+ (2026-09-03). Winter/fall weekday = shoulder; spring/summer = peak; peak weekends +10%.')),
      $$Family canvas glamping tent (qty 3): 280 sq ft plus kids’ tent in the courtyard, sleeps 4 (2 adults + 2 children). King bed with chandelier, private indoor shower, mini-fridge and coffee maker, table and chairs, HVAC. Private stone patio with firepit and outdoor tub. Dog-friendly ($75/pet/night, max 2).$$,
      '280 sq ft family canvas tent + courtyard kids’ tent; King; sleeps 4; private shower; mini-fridge; coffee; HVAC; patio firepit; outdoor tub. Dog-friendly.',
      E'[2026-09-03] Added Family Glamping Unit qty 3 from bigcedar.com/meetings/rfp-test Glamping & Camp Cabins.'
    ),
    (
      'Camp Hut', 10::numeric, 'Hut', '2', '1 Queen', 180::numeric,
      'Yes', 'Yes', 'No', 'No', 'No', 'No',
      'Year-round. Ten shepherd-style Camp Huts (180 sq ft). Community pool/spa and grill huts; no private outdoor tub.',
      '303', '330', '300', '330', '300', '330', '235', '300',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 303, 'weekend', 330), 'spring', jsonb_build_object('weekday', 300, 'weekend', 330), 'summer', jsonb_build_object('weekday', 300, 'weekend', 330), 'fall', jsonb_build_object('weekday', 235, 'weekend', 300), 'note', 'USD room_only. RFP Camp Hut shoulder $235+ / peak $300+. Winter weekday $303 from Google Hotels Camp Long Creek Dec 1–2 2026 (from-rate; Kayak from $305). Fall weekday uses RFP shoulder. 2-night hut bundle $1050 is not ADR.')),
      $$Shepherd-style Camp Hut (qty 10): 180 sq ft, sleeps 2. Queen bed, indoor shower, kitchenette (refrigerator, microwave, electric cooktop), small dining nook, HVAC. Dog-friendly ($75/pet/night, max 2). No private outdoor tub — use the camp pool hot tub.$$,
      '180 sq ft hut; Queen; sleeps 2; private shower; kitchenette (fridge/microwave/cooktop); dining nook; HVAC; Wi-Fi. Dog-friendly. No private outdoor tub.',
      E'[2026-09-03] Added Camp Hut qty 10 from bigcedar.com/camp-long-creek + meetings RFP.'
    ),
    (
      'Two Bedroom Camp Cabin', 12::numeric, 'Cabin', '6', '2 King + queen sleeper sofa', NULL::numeric,
      'Yes', 'No', 'No', 'Yes', 'No', 'No',
      'Year-round. Twelve two-bedroom camp cabins. Screened porch; community pool/spa and grill huts. 2025 fact sheet listed 3 — RFP count of 12 used.',
      '630', '700', '700', '770', '700', '770', '630', '700',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 630, 'weekend', 700), 'spring', jsonb_build_object('weekday', 700, 'weekend', 770), 'summer', jsonb_build_object('weekday', 700, 'weekend', 770), 'fall', jsonb_build_object('weekday', 630, 'weekend', 700), 'note', 'USD room_only. RFP Two Bedroom Camp Cabin shoulder $630+ / peak $700+ (2026-09-03). Winter/fall weekday = shoulder; spring/summer = peak; peak weekends +10%. 2-night camp-cabin bundle $1350 is not ADR.')),
      $$Two-bedroom camp cabin (qty 12): sleeps 6. Two private king bedrooms, living area with queen sleeper sofa, bathroom with shower and tub, kitchen (refrigerator, microwave, electric cooktop), screened porch, HVAC. Dog-friendly ($75/pet/night, max 2). Daily housekeeping. Dishes and cookware provided.$$,
      '2BR camp cabin; 2 King + queen sofa; sleeps 6; shower+tub; kitchen (fridge/microwave/cooktop); screened porch; HVAC; Wi-Fi. Dog-friendly.',
      E'[2026-09-03] Added Two Bedroom Camp Cabin qty 12 from meetings RFP (fact sheet had listed 3).'
    ),
    (
      'Camp Cabin With Private Bedroom', 12::numeric, 'Cabin', '4', '1 King + queen sleeper sofa', 330::numeric,
      'Yes', 'No', 'No', 'Yes', 'No', 'No',
      'Year-round. Twelve 1-bedroom camp cabins (330 sq ft). Screened porch; community pool/spa and grill huts.',
      '475', '532', '600', '660', '600', '660', '475', '600',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 475, 'weekend', 532), 'spring', jsonb_build_object('weekday', 600, 'weekend', 660), 'summer', jsonb_build_object('weekday', 600, 'weekend', 660), 'fall', jsonb_build_object('weekday', 475, 'weekend', 600), 'note', 'USD room_only. RFP 1BR camp cabin (unnamed card, 330 sq ft / 12 units) shoulder $475+ / peak $600+. Winter weekend +12%; spring/summer weekends +10%.')),
      $$One-bedroom camp cabin (qty 12): 330 sq ft, sleeps 4. Private king bedroom, living area with queen sleeper sofa, bathroom with shower and tub, kitchen (refrigerator, microwave, electric cooktop), screened porch, HVAC. Dog-friendly ($75/pet/night, max 2).$$,
      '330 sq ft 1BR camp cabin; King + queen sofa; sleeps 4; shower+tub; kitchen (fridge/microwave/cooktop); screened porch; HVAC; Wi-Fi. Dog-friendly.',
      E'[2026-09-03] Added Camp Cabin With Private Bedroom qty 12 from meetings RFP + operator lodging cards.'
    ),
    (
      'Single Room Camp Cabin', 18::numeric, 'Cabin', '4', '1 King + queen sleeper sofa', 330::numeric,
      'Yes', 'No', 'No', 'Yes', 'No', 'Yes',
      'Year-round. Eighteen open-plan single-room camp cabins (330 sq ft). ADA options (no sofa / no shower-tub combo; max 2). Screened porch; community pool/spa.',
      '475', '532', '600', '660', '600', '660', '475', '600',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 475, 'weekend', 532), 'spring', jsonb_build_object('weekday', 600, 'weekend', 660), 'summer', jsonb_build_object('weekday', 600, 'weekend', 660), 'fall', jsonb_build_object('weekday', 475, 'weekend', 600), 'note', 'USD room_only. RFP single-room camp cabin (330 sq ft / 18 units, ADA options) shoulder $475+ / peak $600+. Same band as 1BR camp cabin.')),
      $$Single-room camp cabin (qty 18): 330 sq ft open-plan, sleeps 4. King bed plus queen sleeper sofa, bathroom with shower and tub, kitchen (refrigerator, microwave, electric cooktop), screened porch, HVAC. ADA version: no sofa / no shower-tub combo, max 2 guests. Dog-friendly ($75/pet/night, max 2).$$,
      '330 sq ft open-plan camp cabin; King + queen sofa; sleeps 4; shower+tub; kitchen; screened porch; HVAC; Wi-Fi. ADA options. Dog-friendly.',
      E'[2026-09-03] Added Single Room Camp Cabin qty 18 from meetings RFP (ADA options noted).'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed, sq_ft,
  kitchenette, mini_fridge, campfires, picnic, hot_tub, ada,
  season,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE g.id = 13246
  AND g.property_id = '09e783b9-2d64-443a-aa9d-353560dbd3bd'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = '09e783b9-2d64-443a-aa9d-353560dbd3bd'
      AND x.site_name = v.site_name
  );

COMMIT;
