-- Camping Molignon (pitches), Le Pianore (1 yurt), Camping Scarabeo (pitches).

BEGIN;

-- ============================================================================
-- Camping Molignon — tourist pitches. Not safari-tent glamping.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Camping Molignon', slug = 'camping-molignon',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_camping_molignon_2026_09',
  address = 'Route du Camping', city = 'Les Haudères', state = 'Valais',
  zip_code = '1984', country = 'Switzerland',
  lat = 46.09051667, lon = 7.5074,
  url = 'https://www.camping-molignon.ch/en/', phone_number = '+41-27-283-15-53',
  property_total_sites = 110, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = '4-star Val d''Hérens campsite on the Borgne. Official EN: 110 marked pitches, 80 electricity points, year-round. PiNCAMP ADAC VS4600: 95 tourist pitches + 10 rentals (7 with sanitary / 3 without) — rental SKU split unpublished. Sage Safari Tent qty 10 / total 5 was wrong. Coords from PiNCAMP 46.09051667, 7.5074.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CHF. Official EN pitch Comfort 16.20 all listed seasons (adult/child/electricity extra). Pods from CHF 65 low / 85 high per night — unpublished qty. +41 27 283 15 53.',
  description = $$Camping Molignon, Route du Camping, 1984 Les Haudères (46.09051667, 7.5074). Official 110 pitches by the Borgne. Heated pool, restaurant, year-round. Not safari-tent glamping. Pods / Chalets Abeille / Bungalows Morea / mobile home exist — rental counts unpublished.$$,
  activities_raw = 'On-site: heated/coverable pool, playground, table tennis, communal kitchen. Nearby: Val d''Hérens hiking, Arolla, Sion.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11230 AND property_id = '32949540-66bd-4f0f-a0d8-0e0b3411719a';

UPDATE public.all_sage_data
SET
  site_name = 'Camping Pitch', unit_type = 'Campsite', quantity_of_units = 110,
  unit_capacity = '6', unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'Yes', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round. Official 110 pitches. PiNCAMP 95 tourist + 10 rentals unpublished split.',
  minimum_nights = '1',
  unit_description = $$Camping Pitch (qty 110): Official EN marked pitches. Do not invent 10 safari tents or a rental SKU split.$$,
  amenities_raw = 'Pitch; electricity (80 points); shared sanitary; pool; restaurant. Pets yes.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 16.20, 'weekend', 16.20),
      'spring', jsonb_build_object('weekday', 16.20, 'weekend', 16.20),
      'summer', jsonb_build_object('weekday', 16.20, 'weekend', 16.20),
      'fall', jsonb_build_object('weekday', 16.20, 'weekend', 16.20),
      'note', 'CHF room_only. Official EN Pitch Comfort 16.20 (people/electricity extra).'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Safari Tent stub. Official 110 pitches. URL camping-molignon.ch. is_glamping_property No. Rentals unpublished.'
WHERE id = 11230 AND property_id = '32949540-66bd-4f0f-a0d8-0e0b3411719a';

-- ============================================================================
-- Le Pianore — organic-farm retreat. One yurt, not a glamping village.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Le Pianore', slug = 'le-pianore',
  property_type = 'Vacation Rental', source = 'Sage',
  discovery_source = 'web_research_le_pianore_2026_09',
  address = 'Località Le Pianore', city = 'Monticello Amiata', state = 'Tuscany',
  zip_code = '58044', country = 'Italy',
  lat = 42.885639, lon = 11.492972,
  url = 'https://www.lepianore.it/', phone_number = '+39-339-774-5348',
  property_total_sites = 1, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'CCPB organic farm / retreat centre, ~50 ha. Operator lists Villa (Campostefani, Fienile), Pagliatella straw-bale cottage (2 ensuite doubles), and 1 woodland Yurta. Sage +39 0564 992 142 was wrong; operator +39 339 7745348. GPS from operator 42°53''08.3"N 11°29''34.7"E. No public nightly card — villa/retreat quote only. Pagliatella + villa room counts unpublished as separate SKUs.',
  rate_basis = 'unknown',
  rate_basis_notes = 'EUR. No public nightly rate. Retreat/group and exclusive villa quotes on request. lepianore@gmail.com. +39 339 7745348.',
  description = $$Le Pianore, Località Le Pianore, 58044 Monticello Amiata (GR) (42.885639, 11.492972). Organic farm retreat with one woodland yurt plus villa/Pagliatella for groups. Not a multi-yurt glamping park.$$,
  activities_raw = 'On-site: natural pool, seminar hall, forest bathing, organic farm. Nearby: Monte Amiata, Giardino Spoerri.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11072 AND property_id = '174c7b72-6d75-4db7-b9ad-58978dca53a1';

UPDATE public.all_sage_data
SET
  site_name = 'Yurt', unit_type = 'Yurt', quantity_of_units = 1,
  unit_capacity = '4', unit_bed = 'Double + 2 singles',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. One named Yurta. Villa/Pagliatella unpublished.',
  minimum_nights = '1',
  unit_description = $$Yurt (qty 1): Operator woodland Yurta with nearby private bath. Do not invent a yurt village.$$,
  amenities_raw = 'Yurt; nearby private bath with shower; 1 double + 2 singles. Retreat setting.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR unknown. No public nightly card; retreat/villa quotes on request.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Phone +39 339 7745348. This row is Yurt qty 1. Villa/Pagliatella unpublished.'
WHERE id = 11072 AND property_id = '174c7b72-6d75-4db7-b9ad-58978dca53a1';

-- ============================================================================
-- Camping Scarabeo — beach campground. Not safari-tent glamping.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Camping Scarabeo', slug = 'camping-scarabeo',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_camping_scarabeo_2026_09',
  address = 'Via Canalotti', city = 'Punta Braccetto', state = 'Sicily',
  zip_code = '97017', country = 'Italy',
  lat = 36.817230, lon = 14.466430,
  url = 'https://scarabeocamping.it/', phone_number = '+39-0932-918096',
  property_total_sites = 75, year_site_opened = 1999,
  property_clubhouse = 'Yes', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'Yes', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Small beach campsite, Santa Croce Camerina / Punta Braccetto. Official Areas A/B/C pitches + Green Nature / Blue Nature mobile homes. Spottocamp 75 pitches. Sage campingscarabeo.com / Via del Tramonto / 97100 / +39 0932 826009 / Safari Tent 20 were wrong. Mobile-home qty unpublished. CIN IT088010B1AS8WIFDI.',
  rate_basis = 'unknown',
  rate_basis_notes = 'EUR. No public nightly card on scarabeocamping.it (request). +39 0932 918096 / +39 338 9793062. info@scarabeocamping.it.',
  description = $$Scarabeo Camping, Via Canalotti, 97017 Punta Braccetto (RG) (36.817230, 14.466430). Direct beach access. Pitches A/B/C plus mobile homes. Not safari-tent glamping.$$,
  activities_raw = 'On-site: beach access, playground, bike rental, laundry, dog area. Nearby: Santa Croce Camerina, Ragusa coast.',
  activities_hiking = 'No', activities_swimming = 'Yes', activities_wildlife_watching = 'No',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11070 AND property_id = '05ebfeeb-e497-481f-994f-8ea40b361dbd';

UPDATE public.all_sage_data
SET
  site_name = 'Camping Pitch', unit_type = 'Campsite', quantity_of_units = 75,
  unit_capacity = '6', unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'Yes', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round. Spottocamp 75 pitches (Areas A/B/C). Mobile homes unpublished.',
  minimum_nights = '1',
  unit_description = $$Camping Pitch (qty 75): Spottocamp. Areas A/B/C. Do not invent 20 safari tents or a mobile-home SKU split.$$,
  amenities_raw = 'Pitch; electricity; shared sanitary; beach. Pets yes. Green/Blue Nature mobile homes unpublished.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR unknown. Official site is request-only; no public pitch card stored.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Safari Tent stub. URL scarabeocamping.it. Address Via Canalotti 97017. is_glamping_property No. This row is Pitch 75.'
WHERE id = 11070 AND property_id = '05ebfeeb-e497-481f-994f-8ea40b361dbd';

COMMIT;
