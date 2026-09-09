-- Parks / resorts with unpublished SKU splits. Official pitch counts only
-- where the operator (or their EMAS filing) publishes them.
-- Never write rate_avg_retail_daily_rate.

BEGIN;

-- ============================================================================
-- OHAI Nazaré — boutique glamping launching; counts unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'OHAI Nazaré Outdoor Resort', slug = 'ohai-nazare-outdoor-resort',
  property_type = 'Outdoor Resort', source = 'Sage',
  discovery_source = 'web_research_ohai_nazare_2026_09',
  address = 'Estrada Nacional 242, Km 31.5', city = 'Nazaré', state = 'Leiria',
  zip_code = '2450-138', country = 'Portugal',
  lat = 39.620355, lon = -9.056278,
  url = 'https://ohairesorts.com/nazare/en/', phone_number = '+351-262-561-800',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'Yes', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official OHAI Nazaré family outdoor resort. Classic glamping temporarily unavailable; Boutique Glamping (3 BR / 6) and view bungalows launching. Official tent/bungalow counts unpublished. EN 242 Km 31.5, +351 262 561 800 / +351 933 089 416, info.nazare@ohairesorts.com. Official GPS 39.620355, -9.056278.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Dynamic OHAI calendar. Do not store Sage 150.',
  description = $$OHAI Nazaré Outdoor Resort, Estrada Nacional 242 Km 31.5, 2450-138 Nazaré (39.620355, -9.056278). Family resort with ecological pools. Official glamping/bungalow counts unpublished.$$,
  activities_raw = 'On-site: ecological pool / water park, restaurant, coworking, animation. Nearby: Nazaré beach and town.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11168 AND property_id = 'eca00bde-b537-40eb-8099-7f14756f0a80';

UPDATE public.all_sage_data
SET
  site_name = 'Safari Tent', unit_type = 'Safari Tent', quantity_of_units = NULL,
  unit_capacity = '6', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal typical. Classic glamping temporarily unavailable. Boutique glamping + bungalows qty unpublished. Do not store Sage 40.',
  minimum_nights = '2',
  unit_description = $$Safari Tent: official Boutique Glamping (3 bedroom / 6). Quantity unpublished. View bungalows unpublished.$$,
  amenities_raw = 'Boutique glamping tent; kitchen; terrace; resort pools and restaurant.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Dynamic calendar. Do not store Sage 150 or qty 40.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. EN 242 Km 31.5. Counts unpublished. Cleared invented 40 / 150.'
WHERE id = 11168 AND property_id = 'eca00bde-b537-40eb-8099-7f14756f0a80';

-- ============================================================================
-- Resort de Parel — Groenewoudseweg 71. Counts unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Resort de Parel', slug = 'resort-de-parel-zeewolde',
  property_type = 'Outdoor Resort', source = 'Sage',
  discovery_source = 'web_research_resort_de_parel_2026_09',
  address = 'Groenewoudseweg 71', city = 'Zeewolde', state = 'Flevoland',
  zip_code = '3896 LS', country = 'Netherlands',
  lat = NULL, lon = NULL,
  url = 'https://www.resortdeparel.com/', phone_number = '+31-36-522-7862',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official De Parel van Horsterwold, Groenewoudseweg 71, 3896 LS Zeewolde. +31 36 522 78 62, hello@deparel.com. Safari tents (Arriba, La Vida) and luxury lodges / waterlodge. Official SKU counts unpublished. Sage Spiekweg 15 / glampingdeparel.nl / +31 85 3032747 stale. No operator GPS published.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Dynamic Resort de Parel calendar. Do not store Sage 150.',
  description = $$Resort de Parel, Groenewoudseweg 71, 3896 LS Zeewolde, Horsterwold. Glamping tents and lodges. Official counts unpublished. Not Spiekweg 15.$$,
  activities_raw = 'On-site: restaurant, beach, bike hire, some hot tubs/saunas. Nearby: Veluwemeer, Walibi, Amsterdam ~45 min.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11131 AND property_id = '9b60ae24-fc0b-4662-a5a7-bdc44596904a';

UPDATE public.all_sage_data
SET
  site_name = 'Safari Tent', unit_type = 'Safari Tent', quantity_of_units = NULL,
  unit_capacity = '2-7', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Official safari/lodge counts unpublished. Do not store Sage 20.',
  minimum_nights = '1',
  unit_description = $$Safari Tent: official Arriba / La Vida types. Quantity unpublished. Lodges unpublished.$$,
  amenities_raw = 'Furnished safari tent; ensuite; kitchen; terrace; some kamado BBQ.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Dynamic calendar. Do not store Sage 150 or qty 20.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Resort de Parel. Counts unpublished. Cleared invented 20 / 150.'
WHERE id = 11131 AND property_id = '9b60ae24-fc0b-4662-a5a7-bdc44596904a';

-- ============================================================================
-- hu Montescudaio village — hu glamp exists; counts unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'hu Montescudaio Village', slug = 'hu-montescudaio-village',
  property_type = 'Outdoor Resort', source = 'Sage',
  discovery_source = 'web_research_hu_montescudaio_2026_09',
  address = 'Via del Poggetto, km 2', city = 'Montescudaio', state = 'Tuscany',
  zip_code = '56040', country = 'Italy',
  lat = 43.315956, lon = 10.552974,
  url = 'https://montescudaio.huopenair.com/', phone_number = '+39-055-0298080',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official hu Open Air Montescudaio village. Pitches (Easy/Smart/Premium), hu stay mobile homes, hu glamp tents. Official counts unpublished. Via del Poggetto km 2, GPS 43.315956, 10.552974. Booking +39 055 0298080. Sage campingmontescudaio.com / +39 0586 650018 stale as primary.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Dynamic hu Open Air calendar. Do not store Sage 150.',
  description = $$hu Montescudaio village, Via del Poggetto km 2, 56040 Montescudaio (43.315956, 10.552974). Pitches, mobile homes, and hu glamp. Official SKU counts unpublished.$$,
  activities_raw = 'On-site: pool, restaurant, animation. Nearby: Cecina, Etruscan Coast, Elba ferries.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11076 AND property_id = '78396ea1-2753-45d0-a0e9-7a343d322536';

UPDATE public.all_sage_data
SET
  site_name = 'Safari Tent', unit_type = 'Safari Tent', quantity_of_units = NULL,
  unit_capacity = NULL, unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal typical. Official hu glamp / stay / pitch counts unpublished. Do not store Sage 20.',
  minimum_nights = '1',
  unit_description = $$Safari Tent: hu glamp rentals exist. Official quantity unpublished. Pitches and mobile homes unpublished.$$,
  amenities_raw = 'Furnished hu glamp tent typical; village pools and restaurants.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Dynamic calendar. Do not store Sage 150 or qty 20.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as hu Montescudaio village. Counts unpublished. Cleared invented 20 / 150.'
WHERE id = 11076 AND property_id = '78396ea1-2753-45d0-a0e9-7a343d322536';

-- ============================================================================
-- Camping-Resort Allweglehen — rental/pitch counts unpublished on official.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Camping-Resort Allweglehen', slug = 'camping-resort-allweglehen',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_allweglehen_2026_09',
  address = 'Allweggasse 4', city = 'Berchtesgaden', state = 'Bavaria',
  zip_code = '83471', country = 'Germany',
  lat = NULL, lon = NULL,
  url = 'https://www.allweglehen.de/', phone_number = '+49-8652-2396',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official 5-star-superior Camping-Resort Allweglehen, Allweggasse 4, 83471 Berchtesgaden. +49 8652 2396 (Sage +49 8652 2326 stale), urlaub@allweglehen.de. Rentals: chalets, Almkaser, wood lodges, camping barrels — per-SKU unpublished (PiNCAMP 218 pitches / 15 rentals not stored). Sage 47.6333, 13.0000 rounded — cleared. Heated pool and wellness included for rentals.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Dynamic operator calendar. Do not store Sage 200.',
  description = $$Camping-Resort Allweglehen, Allweggasse 4, 83471 Berchtesgaden. Terraced 5-star campground with Watzmann views. Official pitch and rental counts unpublished.$$,
  activities_raw = 'On-site: heated outdoor pool, sauna/wellness, restaurant, playground. Nearby: Königssee, Berchtesgaden National Park.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11033 AND property_id = 'ed830837-e7f7-4b56-9f56-bd766b3c6142';

UPDATE public.all_sage_data
SET
  site_name = 'Chalet', unit_type = 'Cabin', quantity_of_units = NULL,
  unit_capacity = NULL, unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Official chalet / Almkaser / lodge / barrel / pitch counts unpublished. Do not store Sage Safari Tent 5.',
  minimum_nights = '1',
  unit_description = $$Chalet: official rental types exist (chalet, Almkaser, wood lodge, barrel). Quantity unpublished. Pitches unpublished.$$,
  amenities_raw = 'Rental chalet/lodge typical; wellness and heated pool included.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Dynamic calendar. Do not store Sage 200 or Safari Tent 5.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official Allweggasse 4 / +49 8652 2396. Counts unpublished. Cleared invented Safari Tent 5 / 200.'
WHERE id = 11033 AND property_id = 'ed830837-e7f7-4b56-9f56-bd766b3c6142';

-- ============================================================================
-- wecamp Reserva Alecrim — SKU count unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'wecamp Reserva Alecrim', slug = 'wecamp-reserva-alecrim',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_wecamp_reserva_alecrim_2026_09',
  address = 'Ademas, Santa Cruz', city = 'Santiago do Cacém', state = 'Alentejo',
  zip_code = '7540-051', country = 'Portugal',
  lat = NULL, lon = NULL,
  url = 'https://wecamp.net/en/locations/reserva-alecrim',
  phone_number = '+34-900-056-003',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official wecamp Reserva Alecrim eco resort between Melides and Santiago do Cacém. Domes, safari tents, eco suites, bungalows, country houses. Official SKU counts unpublished (blog 46 lodges not stored). Ademas, Santa Cruz, 7540-051. Sage Herdade do Juncalinho / reservalecrim.com / +351 269 909 016 stale. wecamp +34 900 056 003, info@wecamp.net. VisitAlentejo 38.0753097, -8.7007598 is tourism — not stored as operator GPS.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Dynamic wecamp calendar. Do not store Sage 150.',
  description = $$wecamp Reserva Alecrim, Ademas, Santa Cruz, 7540-051 Santiago do Cacém. Eco glamping resort. Official unit counts unpublished.$$,
  activities_raw = 'On-site: pools (including dome/infinity), restaurant, yoga. Nearby: Melides, Alentejo coast.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11149 AND property_id = 'd1ea6ca0-f8d0-4847-9b5c-45a775c11a6d';

UPDATE public.all_sage_data
SET
  site_name = 'Safari Tent', unit_type = 'Safari Tent', quantity_of_units = NULL,
  unit_capacity = NULL, unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Official safari / dome / suite counts unpublished. Do not store Sage 20.',
  minimum_nights = '1',
  unit_description = $$Safari Tent: official safari tents exist. Quantity unpublished. Domes, eco suites, bungalows unpublished.$$,
  amenities_raw = 'Furnished safari / eco unit typical; ensuite; kitchen; resort pools and restaurant.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Dynamic wecamp calendar. Do not store Sage 150 or qty 20.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as wecamp Reserva Alecrim. Counts unpublished. Cleared invented 20 / 150.'
WHERE id = 11149 AND property_id = 'd1ea6ca0-f8d0-4847-9b5c-45a775c11a6d';

-- ============================================================================
-- Cocoon Eco Design Lodges — Comporta, not Herdade da Matinha.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Cocoon Eco Design Lodges', slug = 'cocoon-eco-design-lodges',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_cocoon_eco_design_lodges_2026_09',
  address = 'Herdade da Comporta, 105', city = 'Muda', state = 'Alentejo',
  zip_code = '7570-337', country = 'Portugal',
  lat = NULL, lon = NULL,
  url = 'https://www.cocoonlodges.com/', phone_number = '+351-929-308-371',
  property_total_sites = NULL, year_site_opened = 2009,
  property_clubhouse = 'Yes', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Cocoon at Herdade da Comporta 105, Muda / Alcácer do Sal (RNET 8021). Suites, Lodge T1, Lodge T2; biological pool, bikes. Official lodge count unpublished (OTA 8 / RNT 90 camper capacity not stored). Sage Herdade da Matinha / Odemira / +351 283 990 010 is a different hotel — not merged. +351 929 308 371. No operator GPS published.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Calendar only. Do not store Sage 150.',
  description = $$Cocoon Eco Design Lodges, Herdade da Comporta 105, 7570-337 Muda. Eco lodges and suites near Comporta. Not Herdade da Matinha in Odemira. Official count unpublished.$$,
  activities_raw = 'On-site: biological pool, bikes, vegetable garden, kids area. Nearby: Comporta / Pego beaches, Alcácer do Sal.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11138 AND property_id = 'f3f3293b-d96b-4896-899e-42e6f96a0b12';

UPDATE public.all_sage_data
SET
  site_name = 'Lodge', unit_type = 'Lodge', quantity_of_units = NULL,
  unit_capacity = '2-4', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'Yes',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Official suite/lodge counts unpublished. Do not store Sage 12. Not Matinha.',
  minimum_nights = '1',
  unit_description = $$Lodge: official Suites, T1 and T2. Quantity unpublished. Kitchenette, deck, A/C.$$,
  amenities_raw = 'Eco lodge/suite; ensuite; kitchenette; deck; biological pool; bikes.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Calendar only. Do not store Sage 150 or qty 12.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published at Herdade da Comporta, not Matinha/Odemira. Counts unpublished. Cleared invented 12 / 150.'
WHERE id = 11138 AND property_id = 'f3f3293b-d96b-4896-899e-42e6f96a0b12';

-- ============================================================================
-- La Ballena Alegre — official EMAS 809 pitches + 315 bungalows.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'La Ballena Alegre Costa Brava', slug = 'ballena-alegre-costa-brava',
  property_type = 'Outdoor Resort', source = 'Sage',
  discovery_source = 'web_research_ballena_alegre_2026_09',
  address = 'Carretera Sant Martí d''Empúries 13', city = 'Sant Pere Pescador',
  state = 'Catalonia', zip_code = '17470', country = 'Spain',
  lat = 42.1911, lon = 3.1021,
  url = 'https://www.ballena-alegre.com/costabrava/en/',
  phone_number = '+34-972-520-302',
  property_total_sites = 809, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'Yes',
  property_fitness_room = 'Yes', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Camping & Bungalow Resort & Spa. Operator EMAS filing: 809 parcels + 315 bungalows. This row is tourist pitches. Bungalow SKUs unpublished. Carretera Sant Martí d''Empúries 13, +34 972 520 302 (Sage +34 972 520 512 stale). Beachfront, spa, gym. Not glamping-primary.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Dynamic calendar. High-season pitch min 7 nights. Do not store Sage 200.',
  description = $$La Ballena Alegre Costa Brava, Carretera Sant Martí d'Empúries 13, 17470 Sant Pere Pescador (42.1911, 3.1021). Official 809 pitches plus 315 unpublished-split bungalows on the Bay of Roses.$$,
  activities_raw = 'On-site: beach, pools, spa, gym, sports, animation. Nearby: Empúries, Aiguamolls.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11177 AND property_id = 'bf01d609-ee64-4f86-95e4-feee6eb57c8f';

UPDATE public.all_sage_data
SET
  site_name = 'Tourist Pitch', unit_type = 'Campsite', quantity_of_units = 809,
  unit_capacity = '6', unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal typical May–Oct. Official 809 pitches. 315 bungalows unpublished split. Do not store Sage Safari Tent 150.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty 809): official EMAS parcels. Plus-dog area exists. 315 bungalows unpublished.$$,
  amenities_raw = 'Pitch; water/drain typical; 10A; beach resort facilities. Dogs on Plus Dog pitches only.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Dynamic calendar. Do not store Sage 200 or Safari Tent 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Outdoor Resort, not glamping. Official 809 pitches. Bungalows unpublished. Cleared invented Safari Tent 150 / 200.'
WHERE id = 11177 AND property_id = 'bf01d609-ee64-4f86-95e4-feee6eb57c8f';

-- ============================================================================
-- Havelberge — official 320 tourist pitches.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Havelberge Camping Resort', slug = 'havelberge-camping-resort',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_havelberge_camping_resort_2026_09',
  address = 'An den Havelbergen 1', city = 'Userin', state = 'Mecklenburg-Vorpommern',
  zip_code = '17237', country = 'Germany',
  lat = 53.2927, lon = 12.9318,
  url = 'https://www.havelberge.de/', phone_number = '+49-39821-22480',
  property_total_sites = 320, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Havelberge Camping Resort on Woblitzsee. Operator: 320 tourist pitches (90–200 m²) plus 35-pitch motorhome park and 70 permanent (not in this qty). Holiday houses / rental caravans / 1 bungalow tent — counts unpublished (PiNCAMP 305/110 not stored). An den Havelbergen 1, 17237 Userin / Groß Quassow.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Official 2026 pitch packages from €31.60 (Cat S low) — dynamic by size/season, not stored as a single ADR. Do not store Sage 150.',
  description = $$Havelberge Camping Resort, An den Havelbergen 1, 17237 Userin (53.2927, 12.9318), on Lake Woblitz. Official 320 tourist pitches. Holiday-home SKUs unpublished.$$,
  activities_raw = 'On-site: lake beach, sauna, playground, high ropes, canoe, restaurant. Nearby: Mecklenburg Lake District, Neustrelitz.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11031 AND property_id = 'd81da5e0-8580-4e50-bb56-4e3969ac729b';

UPDATE public.all_sage_data
SET
  site_name = 'Tourist Pitch', unit_type = 'Campsite', quantity_of_units = 320,
  unit_capacity = '2-6', unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'Yes',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal typical. Official 320 tourist pitches. 35 motorhome-park + 70 permanent noted only. Holiday homes unpublished. Do not store Sage Safari Tent 20.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty 320): official operator pitches 90–200 m². Motorhome park and rentals unpublished.$$,
  amenities_raw = 'Pitch; electricity and showers in package typical; lake access; supermarket; restaurant.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Size/season packages. Do not store Sage 150 or Safari Tent 20.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Campground, not glamping. Official 320 tourist pitches. Cleared invented Safari Tent 20 / 150.'
WHERE id = 11031 AND property_id = 'd81da5e0-8580-4e50-bb56-4e3969ac729b';

-- ============================================================================
-- Quinta Alma — real Aljezur retreat. Shelter counts unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Quinta Alma', slug = 'quinta-alma-aljezur',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_quinta_alma_2026_09',
  address = 'Sítio do Trancão', city = 'Aljezur', state = 'Algarve',
  zip_code = '8670-052', country = 'Portugal',
  lat = NULL, lon = NULL,
  url = 'https://quintaalma.com/', phone_number = '+351-916-787-871',
  property_total_sites = NULL, year_site_opened = 2017,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official off-grid ecological retreat at Sítio do Trancão, 8670-052 Aljezur. Safari shelters, riverside deluxe, grand teepee, mountain cabins — per-SKU unpublished (directories 8–10 not stored). +351 916 787 871 / inspiration@quintaalma.com. Sage Chabouco / +351 912 123 456 stale. Breakfast typical. No operator GPS published.',
  rate_basis = 'breakfast',
  rate_basis_notes = 'EUR. Breakfast included typical. No official static from-rate. Do not store Sage 150.',
  description = $$Quinta Alma, Sítio do Trancão, 8670-052 Aljezur. Off-grid ecological retreat with safari shelters. Official shelter counts unpublished. Not Chabouco.$$,
  activities_raw = 'On-site: lake, yoga, permaculture, farm. Nearby: Aljezur, Arrifana, Costa Vicentina.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11144 AND property_id = 'e7881117-d820-47fd-b235-b2c3591e656c';

UPDATE public.all_sage_data
SET
  site_name = 'Safari Tent', unit_type = 'Safari Tent', quantity_of_units = NULL,
  unit_capacity = '2-6', unit_bed = 'Varies',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Official shelter mix unpublished. Do not store Sage Yurt 10.',
  minimum_nights = '1',
  unit_description = $$Safari Tent: official safari / riverside / teepee shelters exist. Quantity unpublished. Not yurts.$$,
  amenities_raw = 'Canvas shelter; shared or nearby sanitary depending on type; farm breakfast typical.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR breakfast typical. No official from-rate. Do not store Sage 150 or Yurt 10.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Sítio do Trancão. Shelter counts unpublished. Cleared invented Yurt 10 / 150.'
WHERE id = 11144 AND property_id = 'e7881117-d820-47fd-b235-b2c3591e656c';

COMMIT;
