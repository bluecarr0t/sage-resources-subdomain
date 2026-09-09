-- Hotels / outdoor resort (not invented SKUs). Never write rate_avg_retail_daily_rate.

BEGIN;

-- ============================================================================
-- Etnalodge — 3-room converted palmento B&B. Not yurts. Piedimonte, not Zafferana.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Etnalodge', slug = 'etnalodge',
  property_type = 'Outdoor Boutique Hotel', source = 'Sage',
  discovery_source = 'web_research_etnalodge_2026_09',
  address = 'Via Bassi 21', city = 'Piedimonte Etneo', state = 'Sicily',
  zip_code = '95017', country = 'Italy',
  lat = NULL, lon = NULL,
  url = 'https://www.etnalodge.it/', phone_number = '+39-328-416-0936',
  property_total_sites = 3, year_site_opened = 2018,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'Yes', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Etnalodge Antico Palmento dell''Etna: converted winery cottage ~1 km from Piedimonte Etneo (Davide and Kate). Two double rooms (Castagno, Terracotta) + one triple (Larice) = 3. Whole-house self-catering also offered (up to 7). Not Zafferana yurts. Sage etnalodge.com / Via Cassone / +39 095 7081810 stale. Directory phone +39 328 416 0936. Official site contact form is placeholder. No operator GPS published.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Official whole-house self-catering €150/night up to 7, 2-night minimum. Per-room calendar unpublished. Stored 150 as official whole-house from-rate. Do not store Sage Yurt 150 as a glamping ADR.',
  description = $$Etnalodge, Via Bassi 21, 95017 Piedimonte Etneo. Official 3 ensuite rooms in a converted palmento (Castagno, Larice, Terracotta). Not a yurt camp and not in Zafferana Etnea. No operator pin published.$$,
  activities_raw = 'On-site: sun terrace, winter garden, olive/fruit terraces. Nearby: Etna Nord, Piano Provenzana, Alcantara, Taormina, Giardini Naxos.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11069 AND property_id = 'e04ed7d2-a60a-4a3f-984a-5690d89aeeec';

UPDATE public.all_sage_data
SET
  site_name = 'Hotel Room', unit_type = 'Hotel Room', quantity_of_units = 3,
  unit_capacity = '2-3', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. This row is the 3 official ensuite rooms. Whole-house booking sleeps 7. Do not invent yurts.',
  minimum_nights = '2',
  unit_description = $$Hotel Room (qty 3): official Castagno and Terracotta doubles plus Larice triple, all ensuite with antique Sicilian furniture. Shared cottage kitchen when booked as rooms or whole house.$$,
  amenities_raw = 'Ensuite rooms; shared eat-in kitchen; outdoor dining under vines; sun terrace; washing machine.',
  rate_summer_weekday = '150', rate_summer_weekend = '150',
  rate_winter_weekday = '150', rate_winter_weekend = '150',
  rate_spring_weekday = '150', rate_spring_weekend = '150',
  rate_fall_weekday = '150', rate_fall_weekend = '150',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 150, 'weekend', 150),
      'spring', jsonb_build_object('weekday', 150, 'weekend', 150),
      'summer', jsonb_build_object('weekday', 150, 'weekend', 150),
      'fall', jsonb_build_object('weekday', 150, 'weekend', 150),
      'note', 'EUR room_only. Official whole-house self-catering €150/night up to 7. Per-room unpublished. Do not store as Yurt ADR.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Outdoor Boutique Hotel, not glamping. Relocated from Zafferana stub to Piedimonte Etneo. Official 3 rooms. Cleared invented Yurt / Zafferana GPS.'
WHERE id = 11069 AND property_id = 'e04ed7d2-a60a-4a3f-984a-5690d89aeeec';

-- ============================================================================
-- Octant Douro (ex Douro41) — 79 hotel keys. Not glamping.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Octant Douro', slug = 'octant-douro',
  property_type = 'Outdoor Boutique Hotel', source = 'Sage',
  discovery_source = 'web_research_octant_douro_2026_09',
  address = 'Rua Quinta das Fontaínhas 672', city = 'Castelo de Paiva', state = 'Douro',
  zip_code = '4550-603', country = 'Portugal',
  lat = 41.0629, lon = -8.2705,
  url = 'https://douro.octanthotels.com/', phone_number = '+351-255-690-160',
  property_total_sites = 79, year_site_opened = 2009,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'Yes', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Octant Douro (formerly Douro41 / Eurostars), Rua Quinta das Fontaínhas 672, 4550-603 Raiva, Castelo de Paiva. +351 255 690 160. Operator/press: 79 rooms, suites and House Collection (20 residential-style houses added 2025). Sage douro41.com / EN 222 Km 41 / Lodge 55 stale. Existing pin kept (same hillside property).',
  rate_basis = 'unknown',
  rate_basis_notes = 'EUR. Dynamic Octant calendar. Do not store Sage 250.',
  description = $$Octant Douro (formerly Douro41 Hotel & Spa), Rua Quinta das Fontaínhas 672, 4550-603 Raiva, Castelo de Paiva. Official 79 hotel keys on Douro terraces. Not glamping.$$,
  activities_raw = 'On-site: spa, hydrotherapy, restaurants, river views. Nearby: Douro Valley, Castelo de Paiva, wine estates.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11151 AND property_id = 'dea75845-9d21-493e-957c-53784c79767d';

UPDATE public.all_sage_data
SET
  site_name = 'Hotel Room', unit_type = 'Hotel Room', quantity_of_units = NULL,
  unit_capacity = '2', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round. Official 79 keys. Rooms vs House Collection split unpublished on this row. Do not store Sage Lodge 55.',
  minimum_nights = '1',
  unit_description = $$Hotel Room: official rooms, suites and House Collection residences. Per-SKU split unpublished. Property total 79.$$,
  amenities_raw = 'Hotel rooms/suites; House Collection with gardens/plunge pools on selected keys; spa; restaurants.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR unknown. Octant calendar. Do not store Sage 250 or Lodge 55.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Octant Douro (ex Douro41), not glamping. Official 79 keys. Room/house split unpublished. Cleared invented Lodge / 250.'
WHERE id = 11151 AND property_id = 'dea75845-9d21-493e-957c-53784c79767d';

-- ============================================================================
-- The Fish Hotel — official 66 keys including 3 treehouses.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'The Fish Hotel', slug = 'the-fish-hotel',
  property_type = 'Outdoor Boutique Hotel', source = 'Sage',
  discovery_source = 'web_research_the_fish_hotel_2026_09',
  address = 'Farncombe Estate', city = 'Broadway', state = 'Worcestershire',
  zip_code = 'WR12 7LH', country = 'United Kingdom',
  lat = 52.0351, lon = -1.8388,
  url = 'https://thefishhotel.co.uk/', phone_number = '+44-1386-858000',
  property_total_sites = 66, year_site_opened = 2015,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official The Fish, Farncombe Estate, Broadway WR12 7LH. Exclusive-use page: 66 bedrooms including 5 Hilly Huts, 3 Treehouses and 10 Hideaway Huts. +44 1386 858000. Sage 63 is the older key count. Not a glamping park.',
  rate_basis = 'breakfast',
  rate_basis_notes = 'GBP. Official treehouse from £605 for 2 including Cotswold breakfast; extra child 3–12 £60. Dynamic calendar for hotel rooms. Stored 605 as official treehouse from-rate. Do not store Sage 350.',
  description = $$The Fish Hotel, Farncombe Estate, Broadway WR12 7LH. Official 66 hillside rooms, huts and 3 woodland treehouses. Not a campground.$$,
  activities_raw = 'On-site: Hook restaurant, estate walks, clay shooting, archery, falconry. Nearby: Broadway, Cotswolds.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11257 AND property_id = '1688580a-7e2a-4b1c-8607-cb226c41d0ad';

UPDATE public.all_sage_data
SET
  site_name = 'Treehouse', unit_type = 'Treehouse', quantity_of_units = 3,
  unit_capacity = '4', unit_bed = 'King + bunks',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. This row is the official 3 treehouses. 5 Hilly Huts + 10 Hideaway Huts + remaining hotel rooms unpublished. Do not invent a 4th treehouse.',
  minimum_nights = '1',
  unit_description = $$Treehouse (qty 3): official 50 m² woodland units, king + child bunks (2 adults + 2 children under 12), ensuite, two heated outdoor baths. Two accessed by rope bridge.$$,
  amenities_raw = 'Treehouse; ensuite; underfloor heating; minibar; deck with two heated outdoor baths; breakfast included in from-rate.',
  rate_summer_weekday = '605', rate_summer_weekend = '605',
  rate_winter_weekday = '605', rate_winter_weekend = '605',
  rate_spring_weekday = '605', rate_spring_weekend = '605',
  rate_fall_weekday = '605', rate_fall_weekend = '605',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 605, 'weekend', 605),
      'spring', jsonb_build_object('weekday', 605, 'weekend', 605),
      'summer', jsonb_build_object('weekday', 605, 'weekend', 605),
      'fall', jsonb_build_object('weekday', 605, 'weekend', 605),
      'note', 'GBP breakfast. Official treehouse from £605 for 2. Do not store Sage 350.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Outdoor Boutique Hotel, not glamping. Official 66 keys. This row is Treehouse qty 3. Official from GBP 605 breakfast.'
WHERE id = 11257 AND property_id = '1688580a-7e2a-4b1c-8607-cb226c41d0ad';

-- ============================================================================
-- Sublime Comporta — luxury hotel villas/rooms. Not safari tents. Count conflict.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Sublime Comporta', slug = 'sublime-comporta',
  property_type = 'Outdoor Boutique Hotel', source = 'Sage',
  discovery_source = 'web_research_sublime_comporta_2026_09',
  address = 'EN 261-1', city = 'Muda', state = 'Alentejo',
  zip_code = '7570-337', country = 'Portugal',
  lat = 38.3695, lon = -8.7854,
  url = 'https://www.sublimehotels.pt/', phone_number = '+351-269-449-376',
  property_total_sites = NULL, year_site_opened = 2014,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'Yes', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Sublime Comporta Country Retreat & Spa, EN 261-1, 7570-337 Muda, CCI 3954 Grândola. +351 269 449 376 / reservations +351 269 449 397. Rooms, suites and cabana villas (Terracotta RNET 6510 + Sand RNET 13177). Not a campground and not safari tents. Published totals conflict (fact sheet 23 rooms + 22 villas vs 2026 Sand 43 villas / press 100) — total unpublished. Sage EN261 Carvalhal / Safari Tent 23 / 400 stale.',
  rate_basis = 'unknown',
  rate_basis_notes = 'EUR. Dynamic Sublime calendar. Do not store Sage 400.',
  description = $$Sublime Comporta, EN 261-1, 7570-337 Muda, Grândola. Pine-and-sand luxury hotel of rooms, suites and cabana villas. Not glamping. Official key total unpublished (sources conflict).$$,
  activities_raw = 'On-site: spa, pools, restaurants, pine forest. Nearby: Comporta, Carvalhal beach, Alentejo rice fields.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11162 AND property_id = 'afeda4c1-7b47-4121-94e0-883b84e143d1';

UPDATE public.all_sage_data
SET
  site_name = 'Villa', unit_type = 'Villa', quantity_of_units = NULL,
  unit_capacity = 'Varies', unit_bed = 'King',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round. This row is cabana villas; hotel rooms/suites unpublished. Official villa/room counts conflict — not stored. Do not store Sage Safari Tent 23.',
  minimum_nights = '1',
  unit_description = $$Villa: official 2–5 bedroom cabana villas with private pools. Quantity unpublished (Terracotta vs Sand sources conflict).$$,
  amenities_raw = 'Cabana villa; private pool; kitchen; decks; hotel-serviced. Rooms/suites unpublished.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR unknown. Calendar only. Do not store Sage 400 or Safari Tent 23.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Outdoor Boutique Hotel, not glamping. Counts unpublished (source conflict). Cleared invented Safari Tent 23 / 400.'
WHERE id = 11162 AND property_id = 'afeda4c1-7b47-4121-94e0-883b84e143d1';

-- ============================================================================
-- Caravan Park Sexten — 5-star outdoor resort. Pitch counts conflict.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Caravan Park Sexten', slug = 'caravan-park-sexten',
  property_type = 'Outdoor Resort', source = 'Sage',
  discovery_source = 'web_research_caravan_park_sexten_2026_09',
  address = 'Via San Giuseppe 54', city = 'Sesto', state = 'Trentino-Alto Adige',
  zip_code = '39030', country = 'Italy',
  lat = 46.6908, lon = 12.3538,
  url = 'https://www.caravanparksexten.it/', phone_number = '+39-0474-710444',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'Yes', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official 5-star CaravanPark Sexten + Mountain Resort Patzenfeld, Via San Giuseppe 54 / St. Josefstraße 54, I-39030 Sesto/Moso. +39 0474 710444. Pitches (Comfort / Premium / Leading 600 / Leading Forest) plus treehouses (Trend/Vintage) and lodges. Pitch counts conflict (camping.info 265 vs PiNCAMP 303 tourist / 42 rentals) — totals unpublished. Sage Treehouse 15 / 250 invented.',
  rate_basis = 'unknown',
  rate_basis_notes = 'EUR. TCS-style dynamic calendar / per-person pitch tariffs. Do not store Sage 250 or third-party from-rates as ADR.',
  description = $$Caravan Park Sexten, Via San Giuseppe 54, 39030 Sesto. Official 5-star Dolomites outdoor resort with pitches, luxury treehouses and lodges. Official pitch/rental counts unpublished (sources conflict).$$,
  activities_raw = 'On-site: indoor pool, spa, climbing wall, kids club, restaurants. Nearby: Tre Cime, Sexten hiking, 3 Zinnen ski.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11059 AND property_id = 'ebc646e6-d85e-466a-8723-30d69331b704';

UPDATE public.all_sage_data
SET
  site_name = 'Treehouse', unit_type = 'Treehouse', quantity_of_units = NULL,
  unit_capacity = '2', unit_bed = 'Double',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'Yes',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'Yes',
  operating_season_months = 'Year-round. This row is official Trend/Vintage treehouses; qty unpublished. Pitches and lodges unpublished. Do not store Sage 15.',
  minimum_nights = '1',
  unit_description = $$Treehouse: official Trend and Vintage treehouses (~35 m²) with whirlpool and private sauna. Quantity unpublished.$$,
  amenities_raw = 'Treehouse; ensuite; whirlpool; private sauna; wellness bag. Pitches/lodges/hotel unpublished.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR unknown. Calendar / per-person pitch tariffs. Do not store Sage 250 or Treehouse 15.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Outdoor Resort. Official treehouse/lodge/pitch counts unpublished (265 vs 303 conflict). Cleared invented Treehouse 15 / 250.'
WHERE id = 11059 AND property_id = 'ebc646e6-d85e-466a-8723-30d69331b704';

COMMIT;
