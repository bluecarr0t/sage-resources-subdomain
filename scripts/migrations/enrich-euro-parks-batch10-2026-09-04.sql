-- Outdoor parks from screenshot batch 10. Holiday-home / safari / bungalow
-- SKUs unpublished unless an official count exists. Never write
-- rate_avg_retail_daily_rate.

BEGIN;

-- ============================================================================
-- EuroParcs Buitenhuizen — holiday-home park. Not glamping. Count unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'EuroParcs Buitenhuizen', slug = 'europarcs-buitenhuizen',
  property_type = 'Outdoor Resort', source = 'Sage',
  discovery_source = 'web_research_europarcs_buitenhuizen_2026_09',
  address = 'Buitenhuizerweg 2', city = 'Velsen-Zuid', state = 'North Holland',
  zip_code = '1981 LK', country = 'Netherlands',
  lat = 52.4392, lon = 4.6589,
  url = 'https://www.europarcsbuitenhuizen.nl/', phone_number = '+31-88-055-1593',
  property_total_sites = NULL, year_site_opened = NULL,
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
  glamping_service_tier_notes = 'Official EuroParcs Buitenhuizen (ex Droompark). Holiday-home park at Buitenhuizerweg 2, 1981 LK Velsen-Zuid. Reception +31 88 055 1593. Sage droomparken.com / +31 23 5201010 / Safari Tent 100 were stale. Official holiday-home count unpublished — not stored.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Dynamic EuroParcs calendar. Do not store Sage 150.',
  description = $$EuroParcs Buitenhuizen, Buitenhuizerweg 2, 1981 LK Velsen-Zuid (52.4392, 4.6589). Holiday-home park. Official unit count unpublished. Not a safari-tent glamping site.$$,
  activities_raw = 'On-site: park facilities, playground, restaurant. Nearby: Amsterdam, IJmond, beach.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11105 AND property_id = 'cb5ab52a-df3f-4116-81f6-6092cd31a387';

UPDATE public.all_sage_data
SET
  site_name = 'Holiday Home', unit_type = 'Cabin', quantity_of_units = NULL,
  unit_capacity = NULL, unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'Yes',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Official holiday-home count unpublished. Do not store Sage Safari Tent 100.',
  minimum_nights = '1',
  unit_description = $$Holiday Home: EuroParcs cottages. Official quantity unpublished. Not safari tents.$$,
  amenities_raw = 'Self-catering holiday home; kitchen; ensuite typical; park pool and restaurant.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Dynamic calendar. Do not store Sage 150 or Safari Tent 100.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as EuroParcs Buitenhuizen, not glamping. Holiday-home count unpublished. Cleared invented Safari Tent 100 / 150.'
WHERE id = 11105 AND property_id = 'cb5ab52a-df3f-4116-81f6-6092cd31a387';

-- ============================================================================
-- Resort Veluwe (TopParken) — ex Camping de Hertshoorn. Count unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Resort Veluwe', slug = 'topparken-resort-veluwe',
  property_type = 'Outdoor Resort', source = 'Sage',
  discovery_source = 'web_research_topparken_resort_veluwe_2026_09',
  address = 'Putterweg 70', city = 'Garderen', state = 'Gelderland',
  zip_code = '3886 PG', country = 'Netherlands',
  lat = NULL, lon = NULL,
  url = 'https://www.topparken.nl/vakantieparken/resort-veluwe',
  phone_number = '+31-88-500-2478',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official TopParken Resort Veluwe (ex Camping de Hertshoorn). Holiday homes at Putterweg 70, 3886 PG Garderen. Reception +31 88 500 2478; guest service +31 88 500 2424. Sage Hogesteeg 27 / +31 577 461 529 / Safari Tent 50 were stale. Official holiday-home count unpublished. Do not merge ghost Glamping De Veluwe (Krimweg 140 / Landal Hoenderloo). No operator GPS published.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Dynamic TopParken calendar. Do not store Sage 150.',
  description = $$Resort Veluwe (TopParken), Putterweg 70, 3886 PG Garderen. Holiday-home park. Official unit count unpublished. Not Camping de Hertshoorn and not the Hoenderloo Landal ghost.$$,
  activities_raw = 'On-site: heated outdoor pool, restaurant, playgrounds. Nearby: Veluwe forest and heath, Garderen.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11126 AND property_id = '34467d39-6e23-48d2-b1d1-37608a0d655a';

UPDATE public.all_sage_data
SET
  site_name = 'Holiday Home', unit_type = 'Cabin', quantity_of_units = NULL,
  unit_capacity = NULL, unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'Yes',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Official holiday-home count unpublished. Do not store Sage Safari Tent 50.',
  minimum_nights = '1',
  unit_description = $$Holiday Home: TopParken cottages. Official quantity unpublished. Not safari tents.$$,
  amenities_raw = 'Self-catering holiday home; kitchen; ensuite typical; park pool and restaurant.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Dynamic calendar. Do not store Sage 150 or Safari Tent 50.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Resort Veluwe (TopParken), not glamping. Count unpublished. Cleared invented Safari Tent 50 / 150.'
WHERE id = 11126 AND property_id = '34467d39-6e23-48d2-b1d1-37608a0d655a';

-- ============================================================================
-- Strandpark De Zeeuwse Kust — screenshot Camping row. Sibling 11095 rejected.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Strandpark De Zeeuwse Kust', slug = 'strandpark-de-zeeuwse-kust',
  property_type = 'Outdoor Resort', source = 'Sage',
  discovery_source = 'web_research_strandpark_zeeuwse_kust_2026_09',
  address = 'Helleweg 8', city = 'Renesse', state = 'Zeeland',
  zip_code = '4326 LJ', country = 'Netherlands',
  lat = 51.7341, lon = 3.7823,
  url = 'https://www.strandparkdezeeuwsekust.nl/', phone_number = '+31-111-468-282',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'Yes',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Strandpark De Zeeuwse Kust (ANWB 5-star), Helleweg 8, 4326 LJ Renesse / Noordwelle. +31 111 468 282, info@dezeeuwsekust.eu. Chalets, hotel rooms, glamping, pitches, camper places. Pitch and safari-tent counts unpublished (directories say ~300 pitches — not stored). Sage campingdezeeuwsekust.nl / +31 111 461414 stale. Duplicate Strandpark stub id 11095 rejected.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Dynamic operator / Ardoer calendar. Do not store Sage 150.',
  description = $$Strandpark De Zeeuwse Kust, Helleweg 8, 4326 LJ Renesse (51.7341, 3.7823), ~250 m from the Renesse beach. Chalets, hotel, glamping, and pitches. Official counts unpublished.$$,
  activities_raw = 'On-site: indoor pool, spray park, bowling, padel, wellness, Strand Café Dok, animation. Nearby: Renesse beach and village.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11093 AND property_id = '78331128-685d-4599-a7b7-0dd7857787f6';

UPDATE public.all_sage_data
SET
  site_name = 'Safari Tent', unit_type = 'Safari Tent', quantity_of_units = NULL,
  unit_capacity = NULL, unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round. Official safari-tent and pitch counts unpublished. Do not store Sage 50.',
  minimum_nights = '1',
  unit_description = $$Safari Tent: Strandpark glamping rentals exist (Kustwacht and siblings). Official quantity unpublished. Pitches / chalets / hotel unpublished.$$,
  amenities_raw = 'Furnished safari tent typical; park pool, wellness, bowling, beach 250 m.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Dynamic calendar. Do not store Sage 150 or qty 50.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Strandpark De Zeeuwse Kust. Safari/pitch counts unpublished. Sibling 11095 rejected. Cleared invented 50 / 150.'
WHERE id = 11093 AND property_id = '78331128-685d-4599-a7b7-0dd7857787f6';

-- ============================================================================
-- Schlosspark Bad Saarow — Scandinavian holiday homes. Not glamping.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Schlosspark Bad Saarow', slug = 'schlosspark-bad-saarow',
  property_type = 'Outdoor Resort', source = 'Sage',
  discovery_source = 'web_research_schlosspark_bad_saarow_2026_09',
  address = 'Am Theresienhof 60', city = 'Bad Saarow', state = 'Brandenburg',
  zip_code = '15526', country = 'Germany',
  lat = 52.2852, lon = 14.0624,
  url = 'https://www.schlosspark-badsaarow.com/', phone_number = '+49-33631-64730',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Schlosspark Bad Saarow holiday homes and apartments on Scharmützelsee (Mön, Alsen, Falster, Bornholm, Fünen, Romsö, XXL, forest family house). Not glamping — /en/glamping URL was stale marketing. Reception Am Theresienhof 60, +49 33631 6473-0 (Sage +49 33631 8680 stale). Directory “133 accommodations” is not an official operator count — not stored.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Official from €65 (apartment Mön). Alsen from €80, Falster from €90. Utilities-included SKUs higher. Do not store Sage 150 as ADR.',
  description = $$Schlosspark Bad Saarow, Am Theresienhof 60, 15526 Bad Saarow (52.2852, 14.0624), on Scharmützelsee. Scandinavian holiday homes and apartments. Not a safari-tent glamping site. Official home count unpublished.$$,
  activities_raw = 'On-site: lake. Nearby: Saarow Therme, SATAMA Saunapark, Berlin ~50 min, Spreewald, Tropical Islands.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11029 AND property_id = '62d33a6d-ca2e-48df-93b0-e57b5650a17a';

UPDATE public.all_sage_data
SET
  site_name = 'Holiday Home', unit_type = 'Cabin', quantity_of_units = NULL,
  unit_capacity = '4-16', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'Yes',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Official SKU count unpublished. Do not store directory 133 or Sage Safari Tent 20.',
  minimum_nights = '1',
  unit_description = $$Holiday Home: official types Mön through forest family house. Quantity unpublished. Not safari tents.$$,
  amenities_raw = 'Self-catering holiday home or apartment; kitchen; ensuite; lake park.',
  rate_summer_weekday = '65', rate_summer_weekend = '65',
  rate_winter_weekday = '65', rate_winter_weekend = '65',
  rate_spring_weekday = '65', rate_spring_weekend = '65',
  rate_fall_weekday = '65', rate_fall_weekend = '65',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 65, 'weekend', 65),
      'spring', jsonb_build_object('weekday', 65, 'weekend', 65),
      'summer', jsonb_build_object('weekday', 65, 'weekend', 65),
      'fall', jsonb_build_object('weekday', 65, 'weekend', 65),
      'note', 'EUR room_only from €65 (Mön). Larger homes from €80–220. Do not store Sage 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Outdoor Resort, not glamping. From EUR 65. Count unpublished. Cleared invented Safari Tent 20 / 150.'
WHERE id = 11029 AND property_id = '62d33a6d-ca2e-48df-93b0-e57b5650a17a';

-- ============================================================================
-- TAIGA Bassegoda Park — bungalow / safari counts unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'TAIGA Bassegoda Park', slug = 'taiga-bassegoda-park',
  property_type = 'Outdoor Resort', source = 'Sage',
  discovery_source = 'web_research_taiga_bassegoda_park_2026_09',
  address = 'Camí de Bassegoda, s/n', city = 'Albanyà', state = 'Catalonia',
  zip_code = '17733', country = 'Spain',
  lat = 42.3119, lon = 2.7351,
  url = 'https://www.taigaresorts.com/en/taiga-bassegoda-park.html',
  phone_number = '+34-972-542-020',
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
  glamping_service_tier_notes = 'Official TAIGA Bassegoda Park in Alta Garrotxa, Camí de Bassegoda s/n, 17733 Albanyà. Local +34 972 542 020; TAIGA booking also +34 951 20 45 31. Bungalows and glamping; observatory. Directory 46–64 rental counts unpublished — not stored. Sage bassegodapark.com still resolves as a brand alias.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Dynamic TAIGA calendar. Do not store Sage 120.',
  description = $$TAIGA Bassegoda Park, Camí de Bassegoda s/n, 17733 Albanyà (42.3119, 2.7351), Alta Garrotxa. Bungalows and glamping. Official SKU counts unpublished.$$,
  activities_raw = 'On-site: observatory / stargazing, pool, restaurant. Nearby: Alta Garrotxa walks, French border.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11193 AND property_id = '4cde94b0-1d8e-4925-a620-ff3531eec112';

UPDATE public.all_sage_data
SET
  site_name = 'Safari Tent', unit_type = 'Safari Tent', quantity_of_units = NULL,
  unit_capacity = NULL, unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal typical. Official safari / bungalow counts unpublished. Do not store Sage 40.',
  minimum_nights = '1',
  unit_description = $$Safari Tent: TAIGA glamping rentals exist. Official quantity unpublished. Bungalows unpublished.$$,
  amenities_raw = 'Furnished glamping / bungalow typical; park pool; observatory.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Dynamic calendar. Do not store Sage 120 or qty 40.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as TAIGA Bassegoda Park. Safari/bungalow counts unpublished. Cleared invented 40 / 120.'
WHERE id = 11193 AND property_id = '4cde94b0-1d8e-4925-a620-ff3531eec112';

-- ============================================================================
-- hu Norcenni Girasole village — hu glamp exists; SKU count unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'hu Norcenni Girasole Village', slug = 'hu-norcenni-girasole-village',
  property_type = 'Outdoor Resort', source = 'Sage',
  discovery_source = 'web_research_hu_norcenni_girasole_2026_09',
  address = 'Via Norcenni 7', city = 'Figline e Incisa Valdarno', state = 'Tuscany',
  zip_code = '50063', country = 'Italy',
  lat = 43.6122297, lon = 11.4136314,
  url = 'https://norcenni.huopenair.com/', phone_number = '+39-055-915141',
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
  glamping_service_tier_notes = 'Official hu Open Air Norcenni Girasole village, Via Norcenni 7, 50063 Figline e Incisa Valdarno. Reception +39 055 915141; booking +39 055 0298080. Official GPS 43.6122297, 11.4136314. hu glamp tents exist; official tent/mobile-home count unpublished (Gustocamp 1028 pitches not stored). Sage humancompany.com URL stale.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Dynamic hu Open Air calendar. Do not store Sage 150.',
  description = $$hu Norcenni Girasole village, Via Norcenni 7, 50063 Figline e Incisa Valdarno (43.6122297, 11.4136314). Family outdoor village with hu glamp rentals. Official SKU counts unpublished.$$,
  activities_raw = 'On-site: pools, restaurant, animation, sports. Nearby: Chianti, Florence, medieval villages.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11050 AND property_id = 'cbc6fe69-a495-405c-adc7-7c2846549f58';

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
  operating_season_months = 'Seasonal typical. Official hu glamp / lodge counts unpublished. Do not store Sage 30.',
  minimum_nights = '1',
  unit_description = $$Safari Tent: hu glamp rentals exist. Official quantity unpublished. Pitches / mobile homes unpublished.$$,
  amenities_raw = 'Furnished hu glamp tent typical; village pools and restaurants.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Dynamic calendar. Do not store Sage 150 or qty 30.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as hu Norcenni Girasole village. SKU counts unpublished. Cleared invented 30 / 150.'
WHERE id = 11050 AND property_id = 'cbc6fe69-a495-405c-adc7-7c2846549f58';

-- ============================================================================
-- Orlando in Chianti Glamping Resort — tent count unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Orlando in Chianti Glamping Resort', slug = 'orlando-in-chianti-glamping-resort',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_orlando_in_chianti_2026_09',
  address = 'Località Cafaggiolo 170', city = 'Cavriglia', state = 'Tuscany',
  zip_code = '52022', country = 'Italy',
  lat = 43.5419, lon = 11.4574,
  url = 'https://www.orlandoinchianti.it/', phone_number = '+39-055-960-202',
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
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Orlando in Chianti Glamping Resort, Località Cafaggiolo 170, 52022 Cavriglia. +39 055 960 202. Lodge tents and mobile homes. Official tent/mobile-home count unpublished (ACSI 230 rental figure not stored).',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Dynamic operator calendar. Do not store Sage 150.',
  description = $$Orlando in Chianti Glamping Resort, Località Cafaggiolo 170, 52022 Cavriglia (43.5419, 11.4574). Lodge-tent glamping resort in Chianti. Official unit count unpublished.$$,
  activities_raw = 'On-site: pool, restaurant, animation. Nearby: Chianti, Cavriglia, Florence.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11046 AND property_id = 'ba500275-bdf3-47b5-8205-29925d044817';

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
  operating_season_months = 'Seasonal typical. Official tent / mobile-home counts unpublished. Do not store Sage 40.',
  minimum_nights = '1',
  unit_description = $$Safari Tent: Orlando lodge tents exist. Official quantity unpublished. Mobile homes unpublished.$$,
  amenities_raw = 'Furnished lodge tent typical; resort pool and restaurant.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Dynamic calendar. Do not store Sage 150 or qty 40.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official Orlando in Chianti. Tent count unpublished. Cleared invented 40 / 150.'
WHERE id = 11046 AND property_id = 'ba500275-bdf3-47b5-8205-29925d044817';

COMMIT;
