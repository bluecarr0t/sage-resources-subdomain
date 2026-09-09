-- Official named inventory / rates: Furnas (13 keys), Azul (rates), Nomad
-- (4 yurts), Fahala (6), Fraser (2 domes). Never write rate_avg_retail_daily_rate.

BEGIN;

-- ============================================================================
-- Furnas Lake Forest Living — 8 villas + 4 studios + 1 house. Not glamping.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Furnas Lake Forest Living', slug = 'furnas-lake-forest-living',
  property_type = 'Outdoor Boutique Hotel', source = 'Sage',
  discovery_source = 'web_research_furnas_lake_forest_living_2026_09',
  address = 'Estrada Regional do Sul', city = 'Furnas', state = 'Azores',
  zip_code = '9675-090', country = 'Portugal',
  lat = 37.749985, lon = -25.32607,
  url = 'https://www.furnaslake.com/', phone_number = '+351-296-584-107',
  property_total_sites = 13, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Furnas Lake Forest Living rustic-luxury hotel 150 m from Lagoa das Furnas. 8 Japanese Cedar Villas + 4 Oak Studios + 1 Chestnut House = 13. Sage furnaslakevillas.pt / +351 296 584 177 stale. reservas@furnaslake.com. Official GPS 37.749985 / -25.32607.',
  rate_basis = 'unknown',
  rate_basis_notes = 'EUR. Calendar / packages via furnaslake.com. Do not store Sage 200.',
  description = $$Furnas Lake Forest Living, Estrada Regional do Sul, 9675-090 Furnas, São Miguel (37.749985, -25.32607). Official 13 keys: 8 Japanese villas, 4 Oak Studios, 1 Chestnut House. Not a campground.$$,
  activities_raw = 'On-site: forest, restaurant. Nearby: Furnas Lake, Furnas village, hot springs.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11158 AND property_id = 'edbc9384-6b6a-4cb2-a045-d1ba0ae4ea6c';

UPDATE public.all_sage_data
SET
  site_name = 'Villa', unit_type = 'Villa', quantity_of_units = 8,
  unit_capacity = '2-4', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. This row is the 8 Japanese Cedar Villas. 4 Oak Studios + 1 Chestnut House unpublished. Do not invent a 9th villa.',
  minimum_nights = '1',
  unit_description = $$Villa (qty 8): official Japanese Cedar Villas on pillars over a pond. Studios and Chestnut House unpublished.$$,
  amenities_raw = 'Raised villa; ensuite; kitchenette typical; forest hotel restaurant.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR unknown. Calendar only. Do not store Sage 200.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Outdoor Boutique Hotel, not glamping. Official 13 keys. This row is Villa qty 8.'
WHERE id = 11158 AND property_id = 'edbc9384-6b6a-4cb2-a045-d1ba0ae4ea6c';

-- ============================================================================
-- Azul Singular — official seasonal rates. Per-SKU count unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Azul Singular', slug = 'azul-singular-faial',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_azul_singular_2026_09',
  address = 'Rua da Granja 61', city = 'Feteira', state = 'Azores',
  zip_code = '9900-361', country = 'Portugal',
  lat = NULL, lon = NULL,
  url = 'https://azulsingular.pt/', phone_number = '+351-960-069-890',
  property_total_sites = NULL, year_site_opened = 2017,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'Yes', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official first Azores glamping park in an ornamental plantation, Rua da Granja 61, 9900-361 Feteira, Faial. +351 960 069 890 / +351 292 945 095, info@azulsingular.pt. Three types: Large Tent (4), Couple Tent (2), Yurt (2). Per-SKU counts unpublished (travel-agent 4+2+2 not stored). Sage Rua do Cabeço Verde / azulsingular.com / +351 967 789 125 stale. No operator GPS published.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR for 2 people. Official: Large €90–185; Couple/Yurt €80–170 by season. Breakfast €10. From-rate stored 80 (low-season couple/yurt). Extra bed €15–25. Children under 3 free.',
  description = $$Azul Singular, Rua da Granja 61, 9900-361 Feteira, Faial. Canvas-and-wood tents and yurts in a botanical plantation. Official unit counts unpublished. No operator pin published.$$,
  activities_raw = 'On-site: lounge, sea-view terrace, bike hire. Nearby: Horta 5.5 km, airport 4.5 km, Poça da Rainha.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11157 AND property_id = '1edbd078-89c4-45fc-a4dd-31808b4d3392';

UPDATE public.all_sage_data
SET
  site_name = 'Safari Tent', unit_type = 'Safari Tent', quantity_of_units = NULL,
  unit_capacity = '2-4', unit_bed = 'Double',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round. Large / couple tents on this row; yurts unpublished. Official counts unpublished. Do not store Sage 9.',
  minimum_nights = '1',
  unit_description = $$Safari Tent: official Large (4) and Couple (2) cabin-tents. Quantity unpublished. Yurts unpublished.$$,
  amenities_raw = 'Cabin-tent; ensuite; kitchenette; private deck and barbecue. Breakfast basket optional.',
  rate_summer_weekday = '80', rate_summer_weekend = '80',
  rate_winter_weekday = '80', rate_winter_weekend = '80',
  rate_spring_weekday = '80', rate_spring_weekend = '80',
  rate_fall_weekday = '80', rate_fall_weekend = '80',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 80, 'weekend', 80),
      'spring', jsonb_build_object('weekday', 80, 'weekend', 80),
      'summer', jsonb_build_object('weekday', 80, 'weekend', 80),
      'fall', jsonb_build_object('weekday', 80, 'weekend', 80),
      'note', 'EUR room_only from €80 (couple/yurt Nov–Mar). Large from €90. High season Large €185 / Couple-Yurt €170. Do not store Sage 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Rua da Granja 61, Feteira. Counts unpublished. Official from EUR 80.'
WHERE id = 11157 AND property_id = '1edbd078-89c4-45fc-a4dd-31808b4d3392';

-- ============================================================================
-- Nomad Planet — official 4 yurts + 1 treehouse.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Nomad Planet', slug = 'nomad-planet-montalegre',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_nomad_planet_2026_09',
  address = 'Rua do Forno 20', city = 'Fiães do Rio', state = 'Vila Real',
  zip_code = '5470-151', country = 'Portugal',
  lat = NULL, lon = NULL,
  url = 'https://nomadplanet-portugal.com/', phone_number = '+351-936-799-886',
  property_total_sites = 5, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Nomad Planet at Rua do Forno 20, 5470-151 Fiães do Rio (Montalegre), ~900 m, facing Peneda-Gerês. VisitPortugal / operator: 4 × 30 m² yurts (up to 4) + Toca do Lobo treehouse (up to 4) = 5. +351 936 799 886, info@nomadplanet-portugal.com, RNET 5436. Sage Vilar de Perdizes / nomadplanet.com / +351 276 145 678 stale. No operator GPS published.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. No official static from-rate. Do not store Sage 120.',
  description = $$Nomad Planet, Rua do Forno 20, 5470-151 Fiães do Rio, Montalegre. Official four yurts plus one wolf-den treehouse. Not Vilar de Perdizes. No operator pin published.$$,
  activities_raw = 'On-site: mountain views. Nearby: Peneda-Gerês, Montalegre ~17 km.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11139 AND property_id = 'ac20d956-a94e-4a6f-ad8d-c6f407d7d170';

UPDATE public.all_sage_data
SET
  site_name = 'Yurt', unit_type = 'Yurt', quantity_of_units = 4,
  unit_capacity = '4', unit_bed = 'Varies',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical (heating in winter). This row is 4 official yurts. Treehouse unpublished. Do not invent a 5th yurt.',
  minimum_nights = '1',
  unit_description = $$Yurt (qty 4): official 30 m² Mongolian yurts, double + 2 singles, stove. Shared sanitary. Toca do Lobo unpublished.$$,
  amenities_raw = 'Yurt; stove; shared hot showers. Treehouse separate.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. No official from-rate. Do not store Sage 120.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Fiães do Rio. This row is Yurt qty 4. Treehouse unpublished. Rates unpublished.'
WHERE id = 11139 AND property_id = 'ac20d956-a94e-4a6f-ad8d-c6f407d7d170';

-- ============================================================================
-- Finca Fahala — official 4 bell + 1 yurt + 1 cabin. Not Casa Las Cuevas.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Finca Fahala', slug = 'finca-fahala-cartama',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_finca_fahala_2026_09',
  address = NULL, city = 'Cártama', state = 'Andalusia',
  zip_code = '29570', country = 'Spain',
  lat = NULL, lon = NULL,
  url = 'https://www.fincafahala.nl/', phone_number = '+34-659-270-979',
  property_total_sites = 6, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official six on-finca units in Cártama: bell tents El Andaluz, El Moro, Gitana, Jungle + Mongolian yurt + La Cabaña. Shared bathrooms, pool, honesty bar. Do not add Casa Las Cuevas (El Palo, Málaga). Sage Alhaurín / Camino de las Minas / fincafahala.com / +34 617 123456 stale. contact@fincafahala.nl. No operator street or GPS published.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Official 2026 (1 May–30 Sep), same all season, min 2 nights: Andaluz €70; Moro/Gitana/Jungle €75; yurt/cabaña €85 (2p). From-rate 70.',
  description = $$Finca Fahala, Cártama, Málaga. Official six glamping units on a 4000 m² finca. Not Alhaurín el Grande. Casa Las Cuevas is a separate Málaga rental. No operator pin published.$$,
  activities_raw = 'On-site: pool, honesty bar, ping pong, badminton/volleyball. Nearby: Cártama, Málaga ~25 min, Costa del Sol beaches.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11178 AND property_id = 'e9be66e9-92d6-4360-a69f-672473cb53cf';

UPDATE public.all_sage_data
SET
  site_name = 'Bell Tent', unit_type = 'Bell Tent', quantity_of_units = 4,
  unit_capacity = '2-4', unit_bed = 'Double',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Season 2026: 1 May–30 Sep. This row is 4 official bell tents. Yurt + cabin unpublished. Do not add Casa Las Cuevas.',
  minimum_nights = '2',
  unit_description = $$Bell Tent (qty 4): Andaluz, Moro, Gitana, Jungle. Outdoor kitchen, shared sanitary. Yurt and La Cabaña unpublished.$$,
  amenities_raw = 'Bell tent; outdoor kitchen; terrace; shared bathrooms; pool.',
  rate_summer_weekday = '70', rate_summer_weekend = '70',
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = '70', rate_spring_weekend = '70',
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'spring', jsonb_build_object('weekday', 70, 'weekend', 70),
      'summer', jsonb_build_object('weekday', 70, 'weekend', 70),
      'note', 'EUR room_only from €70 (Andaluz). Moro/Gitana/Jungle €75. Yurt/cabaña €85. Season 1 May–30 Sep.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Cártama. This row is Bell Tent qty 4 from EUR 70. Official 6 on-finca. Casa Las Cuevas unpublished.'
WHERE id = 11178 AND property_id = 'e9be66e9-92d6-4360-a69f-672473cb53cf';

-- ============================================================================
-- Fraser Canyon Riverside Domes — official 2 geodesic domes.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Fraser Canyon Riverside Domes', slug = 'fraser-canyon-riverside-domes',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_fraser_canyon_riverside_domes_2026_09',
  address = NULL, city = 'Yale', state = 'BC',
  zip_code = NULL, country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://greatriverfishing.com/plan-your-fishing-adventure/accommodations/',
  phone_number = '+1-604-792-3544',
  property_total_sites = 2, year_site_opened = 2021,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY['airbnb']::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Great River Fishing Adventures: official 2 geodesic domes (North Bear / South Eagle) on the Fraser near Yale, ~10–15 min north of Hope. ~550 sq ft, propane fireplace, A/C, private deck, shared wood-fired cedar hot tub, BBQ, fire pit. info@greatriverfishing.com, +1 604 792 3544. Sage thefraservalley.ca listing URL is tourism copy. No operator street or GPS published. Do not merge Fraser River Lodge hotel rooms.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. No official static from-rate. Do not store Sage/Airbnb 513.',
  description = $$Fraser Canyon Riverside Domes, Fraser River near Yale, BC. Official two geodesic riverside domes operated by Great River Fishing. No operator pin published.$$,
  activities_raw = 'On-site: riverfront, hot tub, fire pit, jet-boat sturgeon fishing with the operator. Nearby: Hope, Fraser Canyon.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13079 AND property_id = 'cc25fe36-e4f6-4a3a-b7e3-78371b8564ae';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 2,
  unit_capacity = '2-4', unit_bed = 'King',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'Yes', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Seasonal typical Apr–Nov. Official 2 domes only. Do not invent a 3rd.',
  minimum_nights = '1',
  unit_description = $$Dome (qty 2): North Bear and South Eagle. King, kitchenette, private bath, shared riverside hot tub. Do not invent a 3rd.$$,
  amenities_raw = 'Geodesic dome; ensuite; kitchenette; private deck; shared wood-fired hot tub; BBQ; fire pit.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD room_only. No official from-rate. Do not store Sage 513.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 2 Fraser riverside domes. Rates unpublished. Cleared invented 513.'
WHERE id = 13079 AND property_id = 'cc25fe36-e4f6-4a3a-b7e3-78371b8564ae';

COMMIT;
