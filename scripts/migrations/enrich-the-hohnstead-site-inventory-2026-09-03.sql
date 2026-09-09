-- ============================================================================
-- The Hohnstead (Bonner, MT): merge duplicate property_ids and split into
-- 5 named cabin SKUs (qty 1 each).
--
-- Sources (retrieved 2026-09-03):
--   https://www.thehohnstead.com/ (+ /faq /about-us + 5 cabin pages)
--   Google Maps place pin:
--     https://www.google.com/maps/place/The+Hohnstead+Glamping+%26+Cabins/@46.936375,-113.6875034,17z
--     lat 46.936375 / lon -113.6875034 (URL @ param; pin on Anarchy Ave)
--   Houfy host listings: A-Frame 18501, Blind 18502, Stargazer 18503, Ranch Hand 61077
--   TripAdvisor (not stored; no ota_url_tripadvisor column):
--     https://www.tripadvisor.com/Hotel_Review-g45090-d27102327-Reviews-The_Hohnstead_Glamping_and_Cabins-Bonner_Montana.html
--
-- Inventory (operator FAQ + cabin pages — 5 unique hand-built cabins):
--   Transforming A-Frame (Jun–Sep, 80 sq ft, 2 singles)
--   The Blind (Jun–Sep, ~80 sq ft, 2 twins)
--   The Stargazer (Jun–Sep, 160 sq ft Houfy, Queen)
--   The Ranch Hand (Apr–Oct, 150 sq ft Houfy, Queen, AC power)
--   The Shed (Jun–Sep, Queen; only cabin with in-cabin WiFi / A/C / mini fridge)
--   property_total_sites = 5
--
-- Duplicate merge:
--   Canonical property_id a74485dd-ce65-4c0d-82e7-e8e0a46404d6 (ids 9610, 13104)
--   Sparse shell id 13211 (property_id d0dd09fb-…) remapped onto canonical id.
--   Property name unified to "The Hohnstead" (user request; operator also
--   styles as The Hohnstead Glamping & Cabins).
--   9610 description previously said Wisconsin — replaced with Bonner, MT copy.
--
-- Rates (USD, room_only, 2 adults):
--   Operator does not publish a rack rate. City Lifestyle reported $120–$200/night.
--   Seasonal USD from 2026-09-01 Tavily/TripAdvisor sample on A-Frame sibling:
--     spring 150/162, summer 168/186, fall 156/171 (winter 132/147 invalid —
--     Jun–Sep cabins are closed). Ranch Hand keeps spring (opens April).
--
-- rate_avg_retail_daily_rate maintained by calc_avg_rate_trigger on all_sage_data.
-- ============================================================================

BEGIN;

-- Remap the 2026-09-03 Google News shell onto the canonical Bonner property
UPDATE public.all_sage_data
SET property_id = 'a74485dd-ce65-4c0d-82e7-e8e0a46404d6'
WHERE id = 13211
  AND property_id = 'd0dd09fb-850f-4c08-ac57-48848d2423f7';

-- Property-level fields shared by every SKU (Google Maps lat/lon + operator FAQ)
UPDATE public.all_sage_data
SET
  property_name = 'The Hohnstead',
  slug = 'the-hohnstead-bonner-mt',
  property_total_sites = 5,
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_type = 'Glamping',
  source = 'Sage',
  discovery_source = 'web_research_the_hohnstead_operator_gmaps_2026_09',
  address = '7012 Anarchy Ave',
  city = 'Bonner',
  state = 'MT',
  zip_code = '59823',
  country = 'United States',
  lat = 46.936375,
  lon = -113.6875034,
  google_place_id = 'ChIJdZ_TKdLmXKsRmR9up0NVv7Q',
  url = 'https://www.thehohnstead.com/',
  phone_number = '+1-406-233-9119',
  year_site_opened = 2016,
  season_open_month = 4,
  season_close_month = 10,
  operating_season_months = 'Ranch Hand Apr–Oct; Transforming A-Frame, The Blind, The Stargazer, and The Shed Jun–Sep. Verify annually.',
  unit_private_bathroom = 'No',
  unit_shower = 'No',
  unit_full_kitchen = 'No',
  unit_pets = 'Yes',
  unit_water = 'No',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_gas_fireplace = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  unit_ada_accessibility = NULL,
  unit_picnic_table = 'Yes',
  unit_charcoal_grill = 'Yes',
  property_clubhouse = 'Yes',
  property_food_on_site = 'No',
  property_restaurant = 'No',
  property_laundry = 'No',
  property_pool = 'No',
  property_hot_tub = 'Yes',
  property_sauna = 'No',
  property_family_friendly = 'No',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  property_lgbtiq_friendly = 'Yes',
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Five unique dry / mostly solar micro-cabins; shared outdoor restroom + 2 solar showers; shared 2-seater hot tub; Commons lounge with full guest kitchen and WiFi. ADR band ~$150–$186 (City Lifestyle $120–$200). Adults-only, pet-friendly. Midscale — not upscale (no ensuite baths).',
  rate_basis = 'room_only',
  rate_basis_notes = 'No meals included. Commons guest kitchen (full kitchen, fridge shelf per cabin). Pet fee $50/pet/stay, max 2 dogs. Adults only. Check-in 3 PM / check-out 11 AM (Google Maps). Operator does not publish a rack rate; seasonal USD from 2026-09-01 Tavily/TripAdvisor A-Frame sample + City Lifestyle $120–$200 range. Direct book via Houfy.',
  description = $$Adults-only, pet-friendly glamping on ~100 forested acres at 7012 Anarchy Ave, Bonner, Montana — about 25 minutes from Missoula and 15 minutes from Kettlehouse Amphitheater. Five unique hand-built cabins (sleep 2 each) share an outdoor restroom (~1-minute walk), two solar showers, a 2-seater hot tub, a propane/wood fire pit, and the Commons lounge (full kitchen, WiFi, AC power). Hosts Alla Ponomareva & Garrett Hohn. Land purchased 2010; guest hosting ~2016+.$$,
  activities_raw = 'On-property scavenger-hunt hike and sightseeing loop (~100 acres); stargazing / star-bathing; shared hot tub; hammocks; outdoor games (Jenga, Ladderball, KanJam); archery and wood-splitting stations; Blackfoot River / Johnsrud FAS (~2 miles); Garnet Ghost Town; Missoula (~25 min); Kettlehouse Amphitheater (~15 min); Glacier NP day trip (~2 hr 45 min).',
  activities_hiking = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_canoeing_kayaking = 'Yes',
  activities_paddling = 'Yes',
  activities_fishing = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_historic_sightseeing = 'Yes',
  activities_biking = 'Yes',
  setting_forest = 'Yes',
  setting_mountainous = 'Yes',
  date_updated = '2026-09-03'
WHERE property_id = 'a74485dd-ce65-4c0d-82e7-e8e0a46404d6'
  AND id IN (9610, 13104, 13211);

-- 9610: The Shed (was generic Cabin qty 5; only climate-controlled / in-cabin WiFi SKU)
UPDATE public.all_sage_data
SET
  site_name = 'The Shed',
  unit_type = 'Cabin',
  quantity_of_units = 1,
  unit_capacity = '2',
  unit_sq_ft = NULL,
  unit_bed = '1 Queen',
  unit_kitchenette = 'Yes',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_electricity = 'Yes',
  unit_cable = 'No',
  unit_mini_fridge = 'Yes',
  season_open_month = 6,
  season_close_month = 9,
  operating_season_months = 'June–September. 2-night minimum.',
  minimum_nights = '2',
  ota_url_airbnb = 'https://www.airbnb.com/rooms/573514467329411663',
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = NULL,
  rate_spring_weekend = NULL,
  rate_summer_weekday = '168',
  rate_summer_weekend = '186',
  rate_fall_weekday = '156',
  rate_fall_weekend = '171',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', null, 'weekend', null),
      'spring', jsonb_build_object('weekday', null, 'weekend', null),
      'summer', jsonb_build_object('weekday', 168, 'weekend', 186),
      'fall', jsonb_build_object('weekday', 156, 'weekend', 171),
      'note', 'The Shed (Jun–Sep). Seasonal USD proxied from 2026-09-01 Tavily/TripAdvisor A-Frame sibling (summer 168/186, fall 156/171). Winter/spring closed. City Lifestyle reported property range $120–$200/night. Airbnb 573514467329411663.'
    )
  ),
  unit_description = $$The Shed: climate-controlled garden cabin sharing a wall with the Commons lounge. Queen bed, sleeps 2. Only cabin with in-cabin WiFi, A/C, mini fridge, TV/projector, and full AC power. Garden / forest / mountain views. Adults-only; pet-friendly ($50/pet/stay, max 2). Shared outdoor restroom and solar showers (~1 min). Open June–September; 2-night minimum.$$,
  amenities_raw = 'Garden cabin connected to Commons; 1 Queen; sleeps 2; in-cabin WiFi; A/C; mini fridge; TV/projector; AC power; coffee/tea station; designated parking. Shared: outdoor restroom; 2 solar showers; 2-seater hot tub; Commons full kitchen / lounge / WiFi; fire pit; hammocks. Pet-friendly. Adults only. No ensuite bath.',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-03] Site/rate enrichment from thehohnstead.com + Google Maps @46.936375,-113.6875034. Split generic Cabin qty 5 into 5 named SKUs (total 5). The Shed is the connected climate-controlled cabin. Wisconsin description removed. Winter $150 flat rates cleared (Jun–Sep only).'
WHERE id = 9610
  AND property_id = 'a74485dd-ce65-4c0d-82e7-e8e0a46404d6';

-- 13104: Transforming A-Frame
UPDATE public.all_sage_data
SET
  site_name = 'Transforming A-Frame',
  unit_type = 'A-Frame',
  quantity_of_units = 1,
  unit_capacity = '2',
  unit_sq_ft = 80,
  unit_bed = '2 Single (push together)',
  unit_kitchenette = 'Yes',
  unit_air_conditioning = 'No',
  unit_wifi = 'No',
  unit_electricity = 'Yes',
  unit_cable = 'No',
  unit_mini_fridge = 'No',
  season_open_month = 6,
  season_close_month = 9,
  operating_season_months = 'June–September. 2-night minimum. Solar/dry cabin.',
  minimum_nights = '2',
  ota_url_airbnb = 'https://www.airbnb.com/rooms/22440493',
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = NULL,
  rate_spring_weekend = NULL,
  rate_summer_weekday = '168',
  rate_summer_weekend = '186',
  rate_fall_weekday = '156',
  rate_fall_weekend = '171',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', null, 'weekend', null),
      'spring', jsonb_build_object('weekday', null, 'weekend', null),
      'summer', jsonb_build_object('weekday', 168, 'weekend', 186),
      'fall', jsonb_build_object('weekday', 156, 'weekend', 171),
      'note', 'Transforming A-Frame (Jun–Sep). Summer/fall from 2026-09-01 Tavily/TripAdvisor sample (168/186, 156/171). Winter 132/147 and spring 150/162 cleared — cabin is closed Nov–May. Houfy 18501 (80 sq ft). Airbnb 22440493.'
    )
  ),
  unit_description = $$Transforming A-Frame: 80 sq ft solar/dry micro-cabin with a rope-operated liftable stargazing wall. Two single beds that push together; sleeps 2. Kitchenette / camp stove. Adults-only; pet-friendly ($50/pet/stay, max 2). Shared outdoor restroom and solar showers (~1 min). Open June–September; 2-night minimum. Featured by Airbnb, Scholastic, Apartment Therapy.$$,
  amenities_raw = '80 sq ft solar A-frame; 2 singles (push together); sleeps 2; rope-operated open wall; camp stove / coffee-tea; solar DC power; outdoor chairs & hammock; designated parking. Shared: outdoor restroom; 2 solar showers; 2-seater hot tub; Commons full kitchen / lounge / WiFi; fire pit. No in-cabin WiFi or A/C. Pet-friendly. Adults only.',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-03] Enriched from thehohnstead.com/transforming-aframe-cabin-missoula + Houfy 18501. Winter/spring rates nulled (Jun–Sep only). Google Maps lat/lon 46.936375 / -113.6875034 applied to canonical property.'
WHERE id = 13104
  AND property_id = 'a74485dd-ce65-4c0d-82e7-e8e0a46404d6';

-- 13211: The Blind (was sparse "The Hohnstead" shell)
UPDATE public.all_sage_data
SET
  site_name = 'The Blind',
  unit_type = 'Cabin',
  quantity_of_units = 1,
  unit_capacity = '2',
  unit_sq_ft = 80,
  unit_bed = '2 Twin (push together)',
  unit_kitchenette = 'Yes',
  unit_air_conditioning = 'No',
  unit_wifi = 'No',
  unit_electricity = 'Yes',
  unit_cable = 'No',
  unit_mini_fridge = 'No',
  season_open_month = 6,
  season_close_month = 9,
  operating_season_months = 'June–September. 2-night minimum. Solar/dry cabin.',
  minimum_nights = '2',
  ota_url_airbnb = NULL,
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = NULL,
  rate_spring_weekend = NULL,
  rate_summer_weekday = '168',
  rate_summer_weekend = '186',
  rate_fall_weekday = '156',
  rate_fall_weekend = '171',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', null, 'weekend', null),
      'spring', jsonb_build_object('weekday', null, 'weekend', null),
      'summer', jsonb_build_object('weekday', 168, 'weekend', 186),
      'fall', jsonb_build_object('weekday', 156, 'weekend', 171),
      'note', 'The Blind (Jun–Sep, ~80 sq ft). Seasonal USD proxied from A-Frame 2026-09-01 Tavily/TripAdvisor sample. Houfy 18502. Views toward Sheep Mountain; one mechanical stargazing wall.'
    )
  ),
  unit_description = $$The Blind: ~80 sq ft solar/dry lookout micro-cabin facing Sheep Mountain. Two translucent walls (one mechanical / liftable) for stargazing from bed. Two twin beds that push together; sleeps 2. Deck with mountain views. Adults-only; pet-friendly ($50/pet/stay, max 2). Shared outdoor restroom and solar showers. Open June–September; 2-night minimum.$$,
  amenities_raw = '~80 sq ft solar lookout cabin; 2 twins (push together); sleeps 2; two translucent walls (one liftable); deck toward Sheep Mountain; camp stove / coffee-tea; solar DC power; hammock. Shared: outdoor restroom; 2 solar showers; 2-seater hot tub; Commons full kitchen / lounge / WiFi; fire pit. No in-cabin WiFi or A/C. Pet-friendly. Adults only.',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-03] Remapped from duplicate property_id d0dd09fb-850f-4c08-ac57-48848d2423f7 onto canonical a74485dd-ce65-4c0d-82e7-e8e0a46404d6. Enriched as The Blind from thehohnstead.com/the-blind-lookout-cabin-missoula + Houfy 18502. Country USA → United States. Google Maps lat/lon added.'
WHERE id = 13211
  AND property_id = 'a74485dd-ce65-4c0d-82e7-e8e0a46404d6';

-- Remaining SKUs cloned from The Shed geo/property shell
INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type, google_place_id,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed, unit_sq_ft,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_gas_fireplace, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, unit_picnic_table, unit_charcoal_grill,
  year_site_opened, season_open_month, season_close_month,
  operating_season_months, minimum_nights, ota_url_airbnb,
  unit_description, amenities_raw, activities_raw,
  url, property_id, phone_number,
  property_clubhouse, property_food_on_site, property_restaurant, property_laundry,
  property_pool, property_hot_tub, property_sauna, property_family_friendly,
  property_remote_work_friendly, property_has_rentals, property_lgbtiq_friendly,
  land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_wildlife_watching, activities_stargazing,
  activities_canoeing_kayaking, activities_paddling, activities_fishing,
  activities_scenic_drives, activities_historic_sightseeing, activities_biking,
  setting_mountainous, setting_forest,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', COALESCE(g.is_glamping_property, 'Yes'), 'Sage', 'The Hohnstead', v.site_name,
  'web_research_the_hohnstead_operator_gmaps_2026_09', '2026-09-03', '2026-09-03',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, COALESCE(g.country, 'United States'),
  g.slug, g.property_type, g.google_place_id,
  5, v.qty, v.unit_type, v.capacity, v.bed, v.sq_ft,
  'No', 'No', 'Yes', 'No',
  v.ac, v.wifi, 'Yes', 'Yes', 'No',
  'Yes', 'Yes', 'No', 'No', 'No', 'No',
  v.mini_fridge, 'Yes', 'Yes',
  g.year_site_opened, v.open_mo, v.close_mo,
  v.season, v.min_nights, v.airbnb,
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_lgbtiq_friendly,
  g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_wildlife_watching, g.activities_stargazing,
  g.activities_canoeing_kayaking, g.activities_paddling, g.activities_fishing,
  g.activities_scenic_drives, g.activities_historic_sightseeing, g.activities_biking,
  g.setting_mountainous, g.setting_forest,
  v.win_wd, v.win_we,
  v.spr_wd, v.spr_we,
  v.sum_wd, v.sum_we,
  v.fal_wd, v.fal_we,
  v.rates_json, 'room_only', g.rate_basis_notes,
  g.description, v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    (
      'The Stargazer', 1, 'Cabin', '2', '1 Queen', 160::numeric,
      'No', 'No', 'No',
      6::smallint, 9::smallint,
      'June–September. 2-night minimum. Solar/dry cabin with button-operated open wall.',
      '2',
      NULL::text,
      $$The Stargazer: 160 sq ft solar/dry cabin with a button-operated wall that opens the bedside to the forest and night sky. Queen bed, sleeps 2. Adults-only; pet-friendly ($50/pet/stay, max 2). Shared outdoor restroom and solar showers. Open June–September; 2-night minimum.$$,
      '160 sq ft solar cabin (Houfy); 1 Queen; sleeps 2; button-operated open wall; camp stove / coffee-tea; solar DC power; 2-person hammock; designated parking. Shared: outdoor restroom; 2 solar showers; 2-seater hot tub; Commons full kitchen / lounge / WiFi; fire pit. No in-cabin WiFi or A/C. Pet-friendly. Adults only.',
      NULL::text, NULL::text,
      NULL::text, NULL::text,
      '168', '186',
      '156', '171',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', null, 'weekend', null),
          'summer', jsonb_build_object('weekday', 168, 'weekend', 186),
          'fall', jsonb_build_object('weekday', 156, 'weekend', 171),
          'note', 'The Stargazer (Jun–Sep, 160 sq ft Houfy 18503). Seasonal USD proxied from A-Frame 2026-09-01 Tavily/TripAdvisor sample.'
        )
      ),
      E'[2026-09-03] Added from thehohnstead.com/stargazer-cabin-missoula + Houfy 18503 (160 sq ft).'
    ),
    (
      'The Ranch Hand', 1, 'Cabin', '2', '1 Queen', 150::numeric,
      'No', 'No', 'No',
      4::smallint, 10::smallint,
      'April–October. 1-night minimum Apr/May/Oct; 2-night minimum Jun–Sep. Newest cabin; AC power.',
      '2 (Jun–Sep); 1 (Apr, May, Oct)',
      NULL::text,
      $$The Ranch Hand: newest hand-built forest cabin (150 sq ft Houfy) with Queen bed, sleeps 2. Windows on three sides, generous deck, lemon theme, AC power, private coffee/tea station. Adults-only; pet-friendly ($50/pet/stay, max 2). Shared outdoor restroom and solar showers. Open April–October.$$,
      '150 sq ft forest cabin (Houfy 61077); 1 Queen; sleeps 2; deck; AC power; coffee/tea station; lemon theme; designated parking. Shared: outdoor restroom; 2 solar showers; 2-seater hot tub; Commons full kitchen / lounge / WiFi; fire pit. No in-cabin WiFi or A/C. Pet-friendly. Adults only. Converted from a glamping tent.',
      NULL::text, NULL::text,
      '150', '162',
      '168', '186',
      '156', '171',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 150, 'weekend', 162),
          'summer', jsonb_build_object('weekday', 168, 'weekend', 186),
          'fall', jsonb_build_object('weekday', 156, 'weekend', 171),
          'note', 'The Ranch Hand (Apr–Oct, 150 sq ft Houfy 61077). Only cabin with a spring season. Summer/fall proxied from A-Frame 2026-09-01 sample; spring 150/162 from that same Tavily pipeline (valid here because the cabin opens in April). Winter closed.'
        )
      ),
      E'[2026-09-03] Added from thehohnstead.com/ranch-hand-forest-cabin-missoula + Houfy 61077 (150 sq ft). Extended Apr–Oct season.'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed, sq_ft,
  ac, wifi, mini_fridge,
  open_mo, close_mo, season, min_nights, airbnb,
  unit_desc, amenities,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, note
)
WHERE g.id = 9610
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = g.property_id AND x.site_name = v.site_name
  );

UPDATE public.all_sage_data
SET property_total_sites = 5, date_updated = '2026-09-03'
WHERE property_id = 'a74485dd-ce65-4c0d-82e7-e8e0a46404d6';

COMMIT;
