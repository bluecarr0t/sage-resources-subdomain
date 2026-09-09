-- Canada screenshot domes: Misty Oak (1), Balsam Ridge (7), Northeast Cove (4),
-- Quisibis (6), Maynooth (1), Lakeside Luxury (6). Never write rate_avg_retail_daily_rate.

BEGIN;

-- ============================================================================
-- Misty Oak Hollow — one adults-only riverside dome.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Misty Oak Hollow', slug = 'misty-oak-hollow',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_misty_oak_hollow_2026_09',
  address = '35 Nashua Road', city = 'Saint Malo', state = 'MB',
  zip_code = 'R0A 1T0', country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://www.mistyoakhollow.com/', phone_number = NULL,
  property_total_sites = 1, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'No',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'One queen geodome for 2 adults on the river at 35 Nashua Rd, Saint Malo MB R0A 1T0. Indoor bath, kitchen, private deck/hot tub, outdoor kitchen (BBQ/griddle/pizza oven), fire pit. Sauna mentioned as coming (Airbnb: ready summer 2026). Not suitable for children. Booked via Airbnb. Mistyoakhollow@gmail.com. No operator GPS or phone published.',
  rate_basis = 'unknown',
  rate_basis_notes = 'CAD room_only typical. No official static from-rate. Weekend min 2 nights; long weekends min 3. No cleaning fee. Do not store Sage 218.',
  description = $$Misty Oak Hollow, 35 Nashua Road, Saint Malo MB R0A 1T0. One riverside geodome for two adults. No operator pin published.$$,
  activities_raw = 'On-site: river, hot tub, fire pit, outdoor kitchen. Nearby: Saint Malo Provincial Park.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13051 AND property_id = '92eab8f7-1a71-4545-be68-30f8d2936266';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 1,
  unit_capacity = '2', unit_bed = 'Queen',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'Yes',
  operating_season_months = 'Year-round typical. One dome only. Do not invent a 2nd.',
  minimum_nights = '2',
  unit_description = $$Dome (qty 1): queen, ensuite, kitchen, private hot tub. Adults only. Do not invent a 2nd.$$,
  amenities_raw = 'Geodome; ensuite; kitchen; private deck and hot tub; outdoor kitchen; fire pit.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD unknown. Airbnb calendar only. Do not store Sage 218.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. 35 Nashua Road. This row is Dome qty 1. Rates unpublished.'
WHERE id = 13051 AND property_id = '92eab8f7-1a71-4545-be68-30f8d2936266';

-- ============================================================================
-- Balsam Ridge Forest Domes — 7 named geodesic domes from CAD 309.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Balsam Ridge Forest Domes', slug = 'balsam-ridge-forest-domes',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_balsam_ridge_forest_domes_2026_09',
  address = '330 Route 895', city = 'Portage Vale', state = 'NB',
  zip_code = 'E4Z 3C9', country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://balsamridgeforestdomes.ca/', phone_number = '+1-506-340-3663',
  property_total_sites = 7, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'Yes', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official seven themed domes: Adventure, Farmhouse, Fun, Anchor, Arizona, Treehouse, Mossy Log. Each has private hot tub, deck, kitchen, ensuite. Four have saunas (Anchor, Mossy Log, Arizona, Treehouse). Fun sleeps 6; others typically 4 (+ optional 5th). Pet-friendly. Wheelchair-access to main level. 5-star Canada Select. hello@balsamridgeforestdomes.ca. No operator GPS published. Not Balsam Ridge Lodging cabins.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Official from $309/night (Adventure, Farmhouse). Fun / Anchor / Arizona / Treehouse from $359. Mossy Log from $369. Standard 2-night minimum. Select Sunday singles $369 by email.',
  description = $$Balsam Ridge Forest Domes, 330 Route 895, Portage Vale NB E4Z 3C9. Seven named forest geodomes. No operator pin published.$$,
  activities_raw = 'On-site: forest trails, fire table, hot tub, some saunas, forest library, giant chess. Nearby: Moncton ~35 min.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13036 AND property_id = '8adcc5bb-03b5-43d5-a6e9-615b11c089f9';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 7,
  unit_capacity = '4-6', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'Yes', unit_hot_tub = 'Yes', unit_sauna = 'Yes',
  operating_season_months = 'Year-round. Seven named domes lumped. Do not invent an 8th.',
  minimum_nights = '2',
  unit_description = $$Dome (qty 7): Adventure, Farmhouse, Fun, Anchor, Arizona, Treehouse, Mossy Log. Private hot tub. Do not invent an 8th.$$,
  amenities_raw = 'Geodesic dome; ensuite; kitchen; private hot tub and deck. Some saunas. Pet-friendly.',
  rate_summer_weekday = '309', rate_summer_weekend = '309',
  rate_winter_weekday = '309', rate_winter_weekend = '309',
  rate_spring_weekday = '309', rate_spring_weekend = '309',
  rate_fall_weekday = '309', rate_fall_weekend = '309',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 309, 'weekend', 309),
      'spring', jsonb_build_object('weekday', 309, 'weekend', 309),
      'summer', jsonb_build_object('weekday', 309, 'weekend', 309),
      'fall', jsonb_build_object('weekday', 309, 'weekend', 309),
      'note', 'CAD room_only from $309. Fun/Anchor/Arizona/Treehouse from $359. Mossy Log from $369.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. 330 Route 895. This row is Dome qty 7 from CAD 309.'
WHERE id = 13036 AND property_id = '8adcc5bb-03b5-43d5-a6e9-615b11c089f9';

-- ============================================================================
-- Northeast Cove Geodomes — 4 named waterfront domes from CAD 279.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Northeast Cove Geodomes', slug = 'northeast-cove-geodomes',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_northeast_cove_geodomes_2026_09',
  address = '355 Mabou Harbour Road', city = 'Mabou', state = 'NS',
  zip_code = 'B0E 1X0', country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://northeastcove.com/', phone_number = '+1-902-984-1160',
  property_total_sites = 4, year_site_opened = 2022,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'No',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Danny and Lorna MacDonald. Four named waterfront geodomes since spring 2022: Rising Tide, Fair Winds, Starlight, Aquila Sky. Each for 1–2. Ensuite, kitchenette, heat pump, deck over Mabou Harbour. Complimentary kayaks/SUP/bikes/coffee. Aquila Sky is the premium VIP (higher, unpublished static). No pets. Children under 12 not allowed. Lorna +1 902-984-1150. No operator GPS published.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Official from $279/night + tax/fees. 2-night minimum on Rising Tide listing. Aquila Sky priced higher; no official VIP static stored.',
  description = $$Northeast Cove Geodomes, 355 Mabou Harbour Road, Mabou NS B0E 1X0. Four waterfront geodomes. No operator pin published.$$,
  activities_raw = 'On-site: cove swim, kayak, SUP, bikes, dock. Nearby: Mabou village, Cape Breton Highlands.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13074 AND property_id = '75af461a-a0b8-47c2-9adc-d6ba5f18967f';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 4,
  unit_capacity = '2', unit_bed = 'Queen',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal typical. Four named domes lumped. Do not invent a 5th.',
  minimum_nights = '2',
  unit_description = $$Dome (qty 4): Rising Tide, Fair Winds, Starlight, Aquila Sky. Max 2. Ensuite, kitchenette. Do not invent a 5th.$$,
  amenities_raw = 'Waterfront geodome; ensuite; kitchenette; deck; complimentary kayaks/SUP/bikes.',
  rate_summer_weekday = '279', rate_summer_weekend = '279',
  rate_winter_weekday = '279', rate_winter_weekend = '279',
  rate_spring_weekday = '279', rate_spring_weekend = '279',
  rate_fall_weekday = '279', rate_fall_weekend = '279',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 279, 'weekend', 279),
      'spring', jsonb_build_object('weekday', 279, 'weekend', 279),
      'summer', jsonb_build_object('weekday', 279, 'weekend', 279),
      'fall', jsonb_build_object('weekday', 279, 'weekend', 279),
      'note', 'CAD room_only from $279. Aquila Sky higher; VIP static unpublished.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. 355 Mabou Harbour Road. This row is Dome qty 4 from CAD 279.'
WHERE id = 13074 AND property_id = '75af461a-a0b8-47c2-9adc-d6ba5f18967f';

-- ============================================================================
-- Quisibis Domes — 6 named river domes from CAD 251.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Quisibis Domes', slug = 'quisibis-domes',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_quisibis_domes_2026_09',
  address = '844 chemin de la Rivière Quisibis', city = 'Rivière-Verte', state = 'NB',
  zip_code = 'E7C 2Z5', country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://quisibisdomes.com/en/', phone_number = NULL,
  property_total_sites = 6, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Six named 4-season domes on the Quisibis River: Aloha, Dreamcatcher, Moonlight, Soulmate (2p / $251), Pointu and Bee Happy (2–4p / $296). Each ensuite, kitchen, private electric jacuzzi, BBQ, fire pit. No pets. Aloha is the only no-stair dome. Arrival Mon/Wed/Fri. quisibisdomes@gmail.com. No operator GPS or phone published.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Official 2p $251 + tax; 4p $296 + tax. FAQ also says from $251 up to $296 depending weekday/weekend. 2-night minimum.',
  description = $$Quisibis Domes, 844 chemin de la Rivière Quisibis, Rivière-Verte NB E7C 2Z5. Six river geodesic domes. No operator pin published.$$,
  activities_raw = 'On-site: river, fire pit, jacuzzi. Nearby: Edmundston, Grand Falls, Mont Pointu.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13035 AND property_id = '7e7d09cc-6cc6-4614-bb92-f770f69d3a06';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 6,
  unit_capacity = '2-4', unit_bed = 'Queen',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round. Six named domes lumped. Do not invent a 7th.',
  minimum_nights = '2',
  unit_description = $$Dome (qty 6): Aloha, Dreamcatcher, Moonlight, Soulmate, Pointu, Bee Happy. Private jacuzzi. Do not invent a 7th.$$,
  amenities_raw = 'Geodesic dome; ensuite; kitchen; private jacuzzi, BBQ, fire pit. No pets.',
  rate_summer_weekday = '251', rate_summer_weekend = '251',
  rate_winter_weekday = '251', rate_winter_weekend = '251',
  rate_spring_weekday = '251', rate_spring_weekend = '251',
  rate_fall_weekday = '251', rate_fall_weekend = '251',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 251, 'weekend', 251),
      'spring', jsonb_build_object('weekday', 251, 'weekend', 251),
      'summer', jsonb_build_object('weekday', 251, 'weekend', 251),
      'fall', jsonb_build_object('weekday', 251, 'weekend', 251),
      'note', 'CAD room_only from $251 (2p). 4p $296. Weekend may be higher per FAQ.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. 844 chemin de la Rivière Quisibis. This row is Dome qty 6 from CAD 251.'
WHERE id = 13035 AND property_id = '7e7d09cc-6cc6-4614-bb92-f770f69d3a06';

-- ============================================================================
-- Maynooth Station Lodge — one Graphite geodesic dome.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Maynooth Station Lodge', slug = 'maynooth-station-lodge',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_maynooth_station_lodge_2026_09',
  address = '52 Maynooth Station Road', city = 'Maynooth', state = 'ON',
  zip_code = 'K0L 2S0', country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://maynoothstationlodge.ca/', phone_number = '+1-519-703-8413',
  property_total_sites = 1, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Host Jenn. One ~600 sq ft two-storey Graphite Dome across from historic Maynooth Station / Hastings Heritage Trail. Ensuite, kitchen, forced-air heat, AC, private deck/hot tub/fire pit. Booked via Airbnb. Phase-one copy mentions future domes — only Graphite is bookable. info@maynoothstationlodge.ca. No operator GPS published.',
  rate_basis = 'unknown',
  rate_basis_notes = 'CAD. Airbnb calendar only. Do not store Sage 249.',
  description = $$Maynooth Station Lodge, 52 Maynooth Station Road, Maynooth ON K0L 2S0. One Graphite geodesic dome. No operator pin published.$$,
  activities_raw = 'On-site: forest, fire pit, hot tub. Nearby: Hastings Heritage Trail, Bancroft, Algonquin Park ~35 min.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13066 AND property_id = 'c8003c42-0c74-44f1-9e0f-3703ffe38d42';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 1,
  unit_capacity = '4', unit_bed = 'Queen',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Multi-season. One Graphite Dome. Do not invent a 2nd.',
  minimum_nights = '1',
  unit_description = $$Dome (qty 1): Graphite, ~600 sq ft, kitchen, ensuite, private hot tub. Do not invent a 2nd.$$,
  amenities_raw = 'Large geodesic dome; ensuite; full kitchen; private deck and hot tub; fire pit.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD unknown. Airbnb calendar only. Do not store Sage 249.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. 52 Maynooth Station Road. This row is Dome qty 1. Rates unpublished.'
WHERE id = 13066 AND property_id = 'c8003c42-0c74-44f1-9e0f-3703ffe38d42';

-- ============================================================================
-- Lakeside Luxury Domes — official 6 Bras d'Or geodomes. Cottage unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Lakeside Luxury Domes', slug = 'lakeside-luxury-domes',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_lakeside_luxury_domes_2026_09',
  address = '3741 West Bay Road', city = 'Saint Georges Channel', state = 'NS',
  zip_code = 'B0E 3K0', country = 'Canada',
  lat = 45.7256, lon = -61.0291,
  url = 'https://lakesideluxury.ca/', phone_number = '+1-902-482-8820',
  property_total_sites = 6, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Tourism NS / booking portal: six 26-ft geodesic domes (Dome 1–6) on Bras d''Or Lake. Each max 4, full kitchen, ensuite, private hot tub, BBQ, fire pit, picnic table. Pet-friendly. Separate Lakeside Luxury Cottage qty unpublished. contact@lakesideluxury.ca. Listing pin 45.7256, -61.0291.',
  rate_basis = 'unknown',
  rate_basis_notes = 'CAD. Booking calendar only. Do not store Sage 297 or OTA scrapes.',
  description = $$Lakeside Luxury Domes, 3741 West Bay Road, Saint Georges Channel NS B0E 3K0 (45.7256, -61.0291). Six Bras d'Or geodomes. Cottage unpublished.$$,
  activities_raw = 'On-site: lake, kayak/SUP rental, fire pit, hot tub. Nearby: Dundee Resort & Golf, St. Peter''s.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13073 AND property_id = 'ea88a8c1-47e6-4fc3-a54e-763ae7b7cfb1';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 6,
  unit_capacity = '4', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round. Six numbered domes lumped. Cottage unpublished. Do not invent a 7th dome.',
  minimum_nights = '1',
  unit_description = $$Dome (qty 6): numbered 1–6 on Bras d'Or. Max 4. Kitchen, ensuite, private hot tub. Cottage unpublished.$$,
  amenities_raw = '26-ft geodesic dome; ensuite; full kitchen; private hot tub, BBQ, fire pit. Pet-friendly.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD unknown. Calendar only. Do not store Sage 297.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. 3741 West Bay Road. This row is Dome qty 6. Cottage unpublished.'
WHERE id = 13073 AND property_id = 'ea88a8c1-47e6-4fc3-a54e-763ae7b7cfb1';

COMMIT;
