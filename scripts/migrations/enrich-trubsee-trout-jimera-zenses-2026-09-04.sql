-- Non-glamping / lodge-hotel rows: Trübsee (34 rooms), Trout Point (12 keys),
-- Camping Jimera (cabañas unpublished), Zenses (11 villas).
-- Never write rate_avg_retail_daily_rate.

BEGIN;

-- ============================================================================
-- Trübsee Alpine Lodge — Titlis mountain hotel. Not igloos.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Trübsee Alpine Lodge', slug = 'alpine-lodge-trubsee',
  property_type = 'Outdoor Boutique Hotel', source = 'Sage',
  discovery_source = 'web_research_trubsee_alpine_lodge_2026_09',
  address = 'Bergstation Trübsee', city = 'Engelberg', state = 'Obwalden',
  zip_code = '6390', country = 'Switzerland',
  lat = 46.7705, lon = 8.3833,
  url = 'https://www.titlis.ch/en/accommodations/truebsee-alpine-lodge',
  phone_number = '+41-41-639-66-00',
  property_total_sites = 34, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Titlis: Trübsee Alpine Lodge / Berghotel Trübsee at 1800 m, cable-car access only. 34 rooms (single/double/family/4–5 bed). Restaurant 3-course dinner, breakfast, sauna. Sage Igloo qty 5 and +41 41 639 50 50 were wrong (Titlis switchboard). Reservations +41 41 639 66 00. Do not merge Iglu-Dorf Engelberg (seasonal snow igloos, separate operator). Valley luggage: Gerschnistrasse 12. Older meeting cards listing 37 rooms not stored.',
  rate_basis = 'unknown',
  rate_basis_notes = 'CHF. Packages (half-board / ski-pass) via Titlis calendar. No official static room-only stored. Do not store Sage 300.',
  description = $$Trübsee Alpine Lodge, Bergstation Trübsee, 6390 Engelberg. Official 34 mountain-hotel rooms. Not igloos.$$,
  activities_raw = 'On-site: ski-in, lake walks, snowshoes, sauna, restaurant. Nearby: Titlis, Engelberg.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'No',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11222 AND property_id = '4122ecf7-c5aa-4dfe-8301-ef99e836f748';

UPDATE public.all_sage_data
SET
  site_name = 'Hotel Room', unit_type = 'Hotel Room', quantity_of_units = 34,
  unit_capacity = '1-5', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'Yes',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal Titlis calendar (summer Sat-start + winter). Official 34 rooms. Not igloos. Do not store 5 or 37.',
  minimum_nights = '1',
  unit_description = $$Hotel Room (qty 34): singles, doubles, family, 4–5 bed. Ensuite. Not Iglu-Dorf. Do not invent igloos.$$,
  amenities_raw = 'Mountain hotel room; ensuite; TV; wifi. Lodge restaurant, sauna, ski storage.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CHF unknown. Packages via Titlis. Do not store Sage 300.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Outdoor Boutique Hotel, not glamping. Official 34 rooms. Not igloos.'
WHERE id = 11222 AND property_id = '4122ecf7-c5aa-4dfe-8301-ef99e836f748';

-- ============================================================================
-- Trout Point Lodge — official 12 keys. Not glamping cabins.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Trout Point Lodge', slug = 'trout-point-lodge',
  property_type = 'Outdoor Boutique Hotel', source = 'Sage',
  discovery_source = 'web_research_trout_point_lodge_2026_09',
  address = '189 Trout Point Road', city = 'East Kemptville', state = 'NS',
  zip_code = 'B5A 5X9', country = 'Canada',
  lat = 44.0306, lon = -65.8881,
  url = 'https://www.troutpoint.com/', phone_number = '+1-902-761-2142',
  property_total_sites = 12, year_site_opened = 2000,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'No',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Adults-only wilderness lodge (Small Luxury Hotels / Starlight Hotel) on the Tusket River, Tobeatic / UNESCO Southwest Nova Biosphere. Official fact sheet: 12 keys (11 suites + 1 two-bedroom Black Bear lakeside cottage). Main Lodge 8 suites; Beaver Hall 3; cottage on East Meadow Lake. Ensuite. Season 22 May–1 Nov 2026. info@troutpoint.com. +1 877-812-0112 also listed. Sage Cabin qty invented — not glamping.',
  rate_basis = 'unknown',
  rate_basis_notes = 'CAD. Official 2026 is curated packages (Getaway / Romance / Wine / Wellness), not a static room-only. Do not store Sage 450 or stale OTA $357–439.',
  description = $$Trout Point Lodge, 189 Trout Point Road, East Kemptville NS B5A 5X9 (44.0306, -65.8881). Official 12 keys. Not glamping.$$,
  activities_raw = 'On-site: river, stargazing, forest bathing, kayak/canoe, hiking. Nearby: Yarmouth, Tobeatic Wilderness.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 17 AND property_id = '004f20f9-2bfd-45eb-a380-f149c4dd8915';

UPDATE public.all_sage_data
SET
  site_name = 'Lodge', unit_type = 'Lodge', quantity_of_units = 12,
  unit_capacity = '2-4', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = '22 May–1 Nov 2026 official. Official 12 keys (11 suites + 1 cottage) lumped. Do not invent cabins.',
  minimum_nights = '1',
  unit_description = $$Lodge (qty 12): 11 suites + Black Bear cottage. Ensuite, water views. Adults 18+. Not glamping cabins.$$,
  amenities_raw = 'Lodge suite or lakeside cottage; ensuite; river/lake views. Dining rooms, Great Room, stargazing.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD unknown. Package pricing only. Do not store Sage 450.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Outdoor Boutique Hotel, not glamping. Official 12 keys.'
WHERE id = 17 AND property_id = '004f20f9-2bfd-45eb-a380-f149c4dd8915';

-- ============================================================================
-- Cabañas Jimera de Líbar / Camping Jimera — bungalows, not glamping.
-- Official count unpublished (directories say 9).
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Camping Jimera de Líbar', slug = 'cabanas-jimera-de-libar',
  property_type = 'Outdoor Resort', source = 'Sage',
  discovery_source = 'web_research_camping_jimera_2026_09',
  address = 'Carretera de Cortes de la Frontera, Km 1', city = 'Jimera de Líbar',
  state = 'Andalusia', zip_code = '29392', country = 'Spain',
  lat = 36.6553, lon = -5.2885,
  url = 'https://www.rural-jimera.com/', phone_number = '+34-952-180-102',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Camping Jimera / Cabañas Jimera de Líbar on the Guadiaro. Official rural-jimera.com: wooden cabañas/bungalows with bath, heat, TV, kitchen, porch BBQ; plus one group cabin for 15. Not glamping. Sage cabanasrurales.com / +34 952 123456 / Cabin qty 10 were placeholders. Official phone +34 952 18 01 02. Directories list 9 wooden bungalows — official site does not publish a total, so count unpublished. Pool, river, playground. Pets 1 per cabin.',
  rate_basis = 'unknown',
  rate_basis_notes = 'EUR self-catering. No official static from-rate. Do not store Sage 100.',
  description = $$Camping Jimera de Líbar, Carretera de Cortes de la Frontera Km 1, 29392 Jimera de Líbar. Wooden bungalows. Official count unpublished. Not glamping.$$,
  activities_raw = 'On-site: pool, river, playground, canoe, zip-line. Nearby: Ronda, Grazalema, Cueva del Gato.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11179 AND property_id = '32f6cc79-4343-4d20-b1ea-60b40dd9ebd4';

UPDATE public.all_sage_data
SET
  site_name = 'Cabin', unit_type = 'Cabin', quantity_of_units = NULL,
  unit_capacity = '2-15', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'Yes',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Official bungalow count unpublished. Do not store Sage 10 or directory 9.',
  minimum_nights = '1',
  unit_description = $$Cabin (qty unpublished): wooden bungalows 2–4 plus one 15-person group cabin. Kitchen, ensuite, porch BBQ. Do not invent 10.$$,
  amenities_raw = 'Wooden bungalow; ensuite; kitchen; porch BBQ. Campground pool and river.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR unknown. Count and from-rate unpublished. Do not store Sage 100.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Outdoor Resort, not glamping. Official bungalow count unpublished.'
WHERE id = 11179 AND property_id = '32f6cc79-4343-4d20-b1ea-60b40dd9ebd4';

-- ============================================================================
-- Zenses Wellness & Yoga Resort — official 11 villas. Not 5 domes.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Zenses Wellness and Yoga Resort', slug = 'zenses-wellness-and-yoga-resort',
  property_type = 'Outdoor Boutique Hotel', source = 'Sage',
  discovery_source = 'web_research_zenses_tulum_2026_09',
  address = 'Mercurio Ote. 80, Col. Huracanes', city = 'Tulum',
  state = 'Quintana Roo', zip_code = '77760', country = 'Mexico',
  lat = NULL, lon = NULL,
  url = 'https://zensesresort.com/', phone_number = '+52-984-321-9952',
  property_total_sites = 11, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'No',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Adults-only boutique hotel a few steps from Tulum avenue. Official: 11 spacious villas with private patio, pool, yoga, Botanic Mayan Spa. Nomadic-style villas — not geodesic domes. Sage Calle 6 Sur / +52 984 688 5028 / Dome qty 5 / rustic were wrong. Official Mercurio Ote. 80, Col. Huracanes, +52 984 321 9952. No operator GPS published.',
  rate_basis = 'unknown',
  rate_basis_notes = 'MXN/USD. Cloudbeds calendar; best-rate guarantee on official site. Do not store Sage 361.',
  description = $$Zenses Wellness and Yoga Resort, Mercurio Ote. 80, Col. Huracanes, 77760 Tulum. Official 11 villas. Not 5 domes.$$,
  activities_raw = 'On-site: pool, daily yoga, spa. Nearby: Tulum Centro, cenotes, beach clubs.',
  activities_hiking = 'No', activities_swimming = 'Yes', activities_wildlife_watching = 'No',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 141 AND property_id = '19dc7517-ccf4-4366-846e-160ce82a1600';

UPDATE public.all_sage_data
SET
  site_name = 'Villa', unit_type = 'Villa', quantity_of_units = 11,
  unit_capacity = '2', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Official 11 villas. Do not store Sage Dome qty 5.',
  minimum_nights = '1',
  unit_description = $$Villa (qty 11): adults-only boutique rooms with patio. Not geodesic domes. Do not invent a 12th.$$,
  amenities_raw = 'Villa; ensuite; AC; patio; minibar. Resort pool, yoga, spa, restaurant.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'Unknown. Calendar only. Do not store Sage 361.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Outdoor Boutique Hotel, not glamping. Official 11 villas. Not 5 domes.'
WHERE id = 141 AND property_id = '19dc7517-ccf4-4366-846e-160ce82a1600';

COMMIT;
