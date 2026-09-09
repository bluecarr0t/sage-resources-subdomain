-- Official named inventory / rates. Never write rate_avg_retail_daily_rate.

BEGIN;

-- ============================================================================
-- Casa Tuia — official 5 safari tents + 4 townhouses + 2 villas.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Casa Tuia', slug = 'casa-tuia',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_casa_tuia_2026_09',
  address = 'Poço Partido', city = 'Carvoeiro', state = 'Algarve',
  zip_code = '8400-557', country = 'Portugal',
  lat = NULL, lon = NULL,
  url = 'https://www.casatuia.com/', phone_number = '+351-910-544-544',
  property_total_sites = 11, year_site_opened = 2014,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Casa Tuia, Poço Partido 8400-557 Carvoeiro (Olivier & Kim). Homepage: 5 stilted safari tents (2×4 + 3×6) + 4 townhouses + 2 private-pool villas = 11 on 3.7 ha. +351 910 544 544, info@casatuia.com. Sage Estrada do Carvoeiro 8400-527 / +351 917 232 452 / total 9 stale. About-us older “5 flats” not stored. No operator GPS published.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Dynamic Amenitiz calendar. Do not store Sage 150.',
  description = $$Casa Tuia, Poço Partido, 8400-557 Carvoeiro. Official 5 safari tents, 4 townhouses and 2 villas on a hill above Carvoeiro. No operator pin published.$$,
  activities_raw = 'On-site: 15×7 m pool, lounge-bar, basketball, petanque, playground. Nearby: Carvoeiro beach 1.6 km, Algarve cliffs.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11143 AND property_id = '51530986-a447-4515-bca8-a7bbcc4bd75a';

UPDATE public.all_sage_data
SET
  site_name = 'Safari Tent', unit_type = 'Safari Tent', quantity_of_units = 5,
  unit_capacity = '4-6', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. This row is the official 5 safari tents (2 sleep 4, 3 sleep 6). 4 townhouses + 2 villas unpublished. Do not invent a 6th tent.',
  minimum_nights = '1',
  unit_description = $$Safari Tent (qty 5): official raised wooden-floor tents with ensuite and kitchen. Two 4-guest + three 6-guest. Townhouses and villas unpublished.$$,
  amenities_raw = 'Stilted safari tent; ensuite; kitchen; private terrace; shared pool and lounge-bar.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Amenitiz calendar. Do not store Sage 150 or total 9.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 11 units at Poço Partido. This row is Safari Tent qty 5. Townhouses + villas unpublished. Cleared invented 9 / 150 / stale phone.'
WHERE id = 11143 AND property_id = '51530986-a447-4515-bca8-a7bbcc4bd75a';

-- ============================================================================
-- ReLive Retreat — official 5 unique stays (2 yurts named).
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'ReLive Retreat', slug = 'relive-retreat',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_relive_retreat_2026_09',
  address = '159 Prince Street', city = 'Priceville', state = 'ON',
  zip_code = 'N0C 1K0', country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://reliveretreat.com/', phone_number = '416-456-6831',
  property_total_sites = 5, year_site_opened = 2017,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official ReLive Retreat, Priceville / Grey Highlands: 5 unique stays — Dream Capsule, Spruce Peak, Scarlet Yurt, Juniper Yurt, Hilltop Chalet. 72 acres, pet-friendly, off-grid typical. 416-456-6831, milena@reliveretreat.com. 159 Prince Street N0C 1K0 is the Visit Grey / corporate address used for on-site events. Sage Pod qty 5 / 115 invented. No operator GPS published.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Cloudbeds calendar only. Do not store Sage 115.',
  description = $$ReLive Retreat, 159 Prince Street, Priceville ON N0C 1K0. Official five unique stays on ~72 acres (2 yurts + capsule + cabin + chalet). No operator pin published.$$,
  activities_raw = 'On-site: trails, Saugeen River, communal Finnish sauna, fire pits. Nearby: Grey Highlands, ~2 hr from Toronto.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13069 AND property_id = '2c537cfd-bd19-446a-9f75-59de79d30926';

UPDATE public.all_sage_data
SET
  site_name = 'Yurt', unit_type = 'Yurt', quantity_of_units = 2,
  unit_capacity = '3-4', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. This row is official Scarlet + Juniper yurts (qty 2). Dream Capsule, Spruce Peak and Hilltop Chalet unpublished. Do not store Pod qty 5.',
  minimum_nights = '1',
  unit_description = $$Yurt (qty 2): official Scarlet and Juniper Mongolian yurts with kitchenette, compost toilet, deck and fire pit. Other three unique stays unpublished.$$,
  amenities_raw = 'Yurt; kitchenette; eco toilet; private deck; fire pit; BBQ. Shared Finnish sauna on trails.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD room_only. Cloudbeds calendar. Do not store Sage Pod 5 / 115.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 5 unique stays. This row is Yurt qty 2. Capsule/cabin/chalet unpublished. Cleared invented Pod 5 / 115.'
WHERE id = 13069 AND property_id = '2c537cfd-bd19-446a-9f75-59de79d30926';

-- ============================================================================
-- Exode en Nature — official 6 mixed unique units. Not 6 domes.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Exode en Nature', slug = 'exode-en-nature',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_exode_en_nature_2026_09',
  address = '1516 Route de Tadoussac', city = 'Sainte-Rose-du-Nord', state = 'QC',
  zip_code = 'G0V 1T0', country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://exodeennature.com/', phone_number = '418-540-1455',
  property_total_sites = 6, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Exode en Nature S.E.N.C., 1516 route De Tadoussac, Sainte-Rose-du-Nord G0V 1T0. Bonjour Québec / Saguenay tourism: 6 unique prêt-à-camper (dome, yurt, pod, triangular mini-house, contemporary unit, rustic cabin), each with wood-fired Nordic bath + private sauna. 418-540-1455. Registration 627793. Sage Dome qty 6 / 213 invented. 2026 mountain expansion unpublished. No operator GPS published.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Calendar only. Bonjour Québec lists a max $285 prêt-à-camper — not a from-rate, not stored. Do not store Sage 213.',
  description = $$Exode en Nature, 1516 Route de Tadoussac, Sainte-Rose-du-Nord QC G0V 1T0. Official six mixed unique units on the Pelletier River, each with Nordic bath and sauna. Not six domes. No operator pin published.$$,
  activities_raw = 'On-site: Pelletier River, private Nordic baths and saunas. Nearby: Saguenay Fjord, Monts-Valin, Sainte-Rose-du-Nord.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13070 AND property_id = 'dd9f1572-a279-4c4a-a638-75039e7c3397';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 1,
  unit_capacity = '2', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'Yes',
  operating_season_months = 'Year-round. This row is the official 1 dome. Yurt, pod, A-frame, contemporary and cabin unpublished. Do not store Dome qty 6.',
  minimum_nights = '1',
  unit_description = $$Dome (qty 1): official stargazing dome with private wood-fired Nordic bath and barrel sauna. Five other unique units unpublished.$$,
  amenities_raw = 'Dome; kitchenette; ensuite; private Nordic bath; private sauna; fire pit.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD room_only. Calendar only. Do not store Sage 213 or Dome 6.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 6 mixed units. This row is Dome qty 1. Cleared invented Dome 6 / 213.'
WHERE id = 13070 AND property_id = 'dd9f1572-a279-4c4a-a638-75039e7c3397';

-- ============================================================================
-- Rustico Resort Domes — official 7 geodesic domes.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Rustico Resort Domes', slug = 'rustico-resort-domes',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_rustico_resort_domes_2026_09',
  address = '496 Grand Pere Point Road', city = 'Rustico', state = 'PE',
  zip_code = NULL, country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://rusticoresort.com/', phone_number = '902-393-8677',
  property_total_sites = 7, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Rustico Resort Golf & Domes, 496 Grand Pere Point Road, waterfront on Rustico Bay. Operator: 7 geodesic domes (two queens, ensuite, private deck). Tourism PEI licence 2203375, 902-393-8677 / david@rusticoresort.com. Golf + Dhalia restaurant. Seasonal typical (Tourism PEI mid-May–Nov). Sage 650 invented. No operator GPS published.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Cloudbeds calendar only. Do not store Sage 650.',
  description = $$Rustico Resort Domes, 496 Grand Pere Point Road, Rustico PE. Official seven waterfront geodesic domes on an 18-hole golf course. No operator pin published.$$,
  activities_raw = 'On-site: 18-hole golf, kayaks, shoreline, Dhalia restaurant. Nearby: Brackley Beach, Cavendish, Charlottetown airport ~18 km.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13058 AND property_id = 'bd83f29a-14d9-4cc4-8c5c-8f5e53ed2f90';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 7,
  unit_capacity = '4', unit_bed = '2 Queen',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal typical (Tourism PEI mid-May–November). This row is official 7 domes. Do not invent an 8th.',
  minimum_nights = '1',
  unit_description = $$Dome (qty 7): official waterfront geodesic domes with two queen beds, ensuite and private deck overlooking Rustico Bay.$$,
  amenities_raw = 'Geodesic dome; two queens; ensuite; private deck; golf and restaurant on site.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD room_only. Cloudbeds calendar. Do not store Sage 650.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 7 waterfront domes. Rates unpublished. Cleared invented 650.'
WHERE id = 13058 AND property_id = 'bd83f29a-14d9-4cc4-8c5c-8f5e53ed2f90';

-- ============================================================================
-- OG Domes — 3 named 20' domes + Hightower chalet. Experience page “4” unused.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'OG Domes', slug = 'og-domes',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_og_domes_2026_09',
  address = NULL, city = 'Magaguadavic', state = 'NB',
  zip_code = NULL, country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://ogales.ca/domes/', phone_number = '506-238-0462',
  property_total_sites = 4, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'No',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official OG Domes / OG Ales on Magaguadavic Lake. Booking page names 3 × 20'' domes (Campfire Red, Sunny Day, Smooth Sailing) + Hightower lakefront chalet = 4. Adult-only 19+. Experience page “four geodesic domes” conflicts — named booking inventory used. 506-238-0462, ogdomes@ogales.ca. Official dome from $250 CDN. No street or GPS published.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Official dome from $250; Hightower from $400. Stored 250 as official dome from-rate. Do not overwrite with Sage 250 as invented — this matches the operator from-rate.',
  description = $$OG Domes, Magaguadavic Lake, New Brunswick. Official three named 20' lakeside domes plus Hightower chalet, adult-only, off-grid brewery on site. No operator pin published.$$,
  activities_raw = 'On-site: lake, kayaking, off-grid taproom. Nearby: Magaguadavic Lake beaches and islands.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13043 AND property_id = 'd04c2750-a64e-48af-8d34-0f6fd7e61375';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 3,
  unit_capacity = '2-4', unit_bed = 'Queen or King',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. This row is 3 named 20'' domes. Hightower chalet unpublished. Do not store a 4th dome from the experience-page line.',
  minimum_nights = '1',
  unit_description = $$Dome (qty 3): official Campfire Red, Sunny Day and Smooth Sailing — 20' units with ensuite, kitchenette and private saltwater hot tub. Adult-only.$$,
  amenities_raw = '20'' dome; ensuite; kitchenette; private terrace; saltwater hot tub; BBQ. Adult-only 19+.',
  rate_summer_weekday = '250', rate_summer_weekend = '250',
  rate_winter_weekday = '250', rate_winter_weekend = '250',
  rate_spring_weekday = '250', rate_spring_weekend = '250',
  rate_fall_weekday = '250', rate_fall_weekend = '250',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 250, 'weekend', 250),
      'spring', jsonb_build_object('weekday', 250, 'weekend', 250),
      'summer', jsonb_build_object('weekday', 250, 'weekend', 250),
      'fall', jsonb_build_object('weekday', 250, 'weekend', 250),
      'note', 'CAD room_only. Official dome from $250. Hightower from $400 unpublished.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 3 named domes + Hightower. This row is Dome qty 3. Official from CAD 250.'
WHERE id = 13043 AND property_id = 'd04c2750-a64e-48af-8d34-0f6fd7e61375';

-- ============================================================================
-- PEI Centerline Escapes — official 3 named domes.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'PEI Centerline Escapes', slug = 'pei-centerline-escapes',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_pei_centerline_escapes_2026_09',
  address = '2074 Center Line Road', city = 'St. Lawrence', state = 'PE',
  zip_code = NULL, country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://peicenterlineescapes.com/', phone_number = '647-335-6035',
  property_total_sites = 3, year_site_opened = NULL,
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
  glamping_service_tier_notes = 'Official PEI Centerline Escapes (operator spelling Centerline), 2074 Center Line Rd, St. Lawrence / North Cape Coastal Drive. Tourism PEI licence 4014486, 647-335-6035, info@peicenterlineescapes.com. Three named domes: Birchwood Meadow, Harbor Haven, Gatherwood Retreat. Year-round heated. Sage Centreline / 250 invented. No operator GPS published.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Calendar only. Do not store Sage 250.',
  description = $$PEI Centerline Escapes, 2074 Center Line Road, St. Lawrence PE. Official three named forest domes with private hot tubs. No operator pin published.$$,
  activities_raw = 'On-site: 100-acre trails, ATV/snowmobile access, fire tables. Nearby: North Cape Coastal Drive beaches.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13057 AND property_id = 'a19d611e-7ec2-4215-b05d-2d87c7a6e964';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 3,
  unit_capacity = '4', unit_bed = 'King or Queen',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round (heated). This row is official 3 named domes. Do not invent a 4th.',
  minimum_nights = '1',
  unit_description = $$Dome (qty 3): official Birchwood Meadow, Harbor Haven and Gatherwood Retreat — heated domes with ensuite, kitchenette and private hot tub.$$,
  amenities_raw = 'Heated dome; ensuite; kitchenette; private hot tub; deck; fire table.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD room_only. Calendar only. Do not store Sage 250.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as PEI Centerline Escapes. Official 3 named domes. Rates unpublished. Cleared invented 250.'
WHERE id = 13057 AND property_id = 'a19d611e-7ec2-4215-b05d-2d87c7a6e964';

-- ============================================================================
-- Forest Lane Domes — official from-rate. Count unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Forest Lane Domes', slug = 'forest-lane-domes',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_forest_lane_domes_2026_09',
  address = '396 Guthrie Road', city = 'Bloomfield', state = 'NB',
  zip_code = 'E5N 4L8', country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://www.forestlanedomes.com/', phone_number = '+1-519-216-9803',
  property_total_sites = NULL, year_site_opened = NULL,
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
  glamping_service_tier_notes = 'Official Forest Lane Domes & Experiences, 396 Guthrie Road, Bloomfield NB E5N 4L8. +1 519-216-9803, hello@forestlanedomes.com. Geodesic forest domes with private hot tub, kitchenette and ensuite. Official unit count unpublished. Homepage from C$269 / up to 4 guests. Do not merge Balsam Ridge Forest Domes. No operator GPS published.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Official homepage from C$269 per night, up to 4 guests. Weekends/summer/Christmas 2-night minimum. Stored 269. Do not store Sage 289.',
  description = $$Forest Lane Domes, 396 Guthrie Road, Bloomfield NB E5N 4L8. Official forest geodesic domes with private hot tubs near Hampton / Fundy. Official count unpublished. No operator pin published.$$,
  activities_raw = 'On-site: forest, fire pit, dark-sky typical. Nearby: Hampton, Saint John ~30 min, Fundy National Park.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13039 AND property_id = '2274211b-44bf-4c41-ab4e-63a8c18b9d1b';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = NULL,
  unit_capacity = '4', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Official dome count unpublished. Do not invent a qty.',
  minimum_nights = '2',
  unit_description = $$Dome: official forest geodesic dome with ensuite, kitchenette and private hot tub. Quantity unpublished.$$,
  amenities_raw = 'Geodesic dome; ensuite with hot shower; kitchenette; private hot tub; fire pit; dog-friendly.',
  rate_summer_weekday = '269', rate_summer_weekend = '269',
  rate_winter_weekday = '269', rate_winter_weekend = '269',
  rate_spring_weekday = '269', rate_spring_weekend = '269',
  rate_fall_weekday = '269', rate_fall_weekend = '269',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 269, 'weekend', 269),
      'spring', jsonb_build_object('weekday', 269, 'weekend', 269),
      'summer', jsonb_build_object('weekday', 269, 'weekend', 269),
      'fall', jsonb_build_object('weekday', 269, 'weekend', 269),
      'note', 'CAD room_only. Official from C$269. Do not store Sage 289.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official from CAD 269. Count unpublished. Cleared invented 289.'
WHERE id = 13039 AND property_id = '2274211b-44bf-4c41-ab4e-63a8c18b9d1b';

-- ============================================================================
-- Wild Skies Resort — official 8 rentals; this row 3 domes; couple-dome $190.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Wild Skies Resort', slug = 'wild-skies-resort',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_wild_skies_resort_2026_09',
  address = '71057 Brookfield Road', city = 'River Hills', state = 'MB',
  zip_code = 'R0E 1T0', country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://wildskiesresort.com/', phone_number = NULL,
  property_total_sites = 8, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Wild Skies, 71057 Brookfield Road, River Hills MB. Homepage: 8 private rentals on 10 acres / Whitemouth River — Aurora + Eclipse couple domes, Solstice family dome, Astra + Luna stargazer tents, Cosmos + Nebula canvas bunkies, Milky Way cabin. hello@wildskiesresort.com. Sage Dome qty 8 / 180 invented (8 is the whole resort, not 8 domes). No operator GPS or public phone published.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Official summer (May–Oct) couple dome $190/night. Solstice $230+ / tents $160+ / cabin $275+ unpublished on this row. Stored 190. Do not store Sage 180.',
  description = $$Wild Skies Resort, 71057 Brookfield Road, River Hills MB R0E 1T0. Official eight mixed glamping rentals (3 domes + tents + cabin) on the Whitemouth River. No operator pin published.$$,
  activities_raw = 'On-site: river, canoe/SUP, sauna, pizza oven, trails. Nearby: eastern Manitoba, ~60 min from Winnipeg Perimeter.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13050 AND property_id = '0fe8b0e0-5878-4c08-9344-c33df4b8ceeb';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 3,
  unit_capacity = '2-5', unit_bed = 'Varies',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'No',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Domes year-round typical (winter wood-stove; no in-dome water Oct–May). This row is official 3 domes (Aurora, Eclipse, Solstice). Tents + cabin unpublished. Do not store Dome qty 8.',
  minimum_nights = '1',
  unit_description = $$Dome (qty 3): official Aurora and Eclipse couple domes (sleep 2) plus Solstice family dome (sleep 5). Composting toilets; outdoor shower; shared sauna.$$,
  amenities_raw = 'Geodesic dome; kitchenette; wood stove; outdoor shower; composting toilet; BBQ. Shared sauna and pavilion.',
  rate_summer_weekday = '190', rate_summer_weekend = '190',
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'summer', jsonb_build_object('weekday', 190, 'weekend', 190),
      'note', 'CAD room_only. Official May–Oct couple dome $190. Winter unpublished. Do not store Sage 180 or Dome 8.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 8 rentals. This row is Dome qty 3. Official summer from CAD 190. Cleared invented Dome 8 / 180.'
WHERE id = 13050 AND property_id = '0fe8b0e0-5878-4c08-9344-c33df4b8ceeb';

COMMIT;
