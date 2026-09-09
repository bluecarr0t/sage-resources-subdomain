-- Caserío del Mirador (6), Torre dello Ziro (7 rooms), Domein Holset (11 rooms).

BEGIN;

-- ============================================================================
-- Caserío del Mirador — 5 suites/apartments + Casita. Not yurts.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Caserío del Mirador', slug = 'caserio-del-mirador-jalon',
  property_type = 'Outdoor Boutique Hotel', source = 'Sage',
  discovery_source = 'web_research_caserio_del_mirador_2026_09',
  address = 'Camino Barranco Murtas 13', city = 'Jalón', state = 'Valencian Community',
  zip_code = '03727', country = 'Spain',
  lat = NULL, lon = NULL,
  url = 'https://caseriodelmirador.com/', phone_number = '+34-607-811-197',
  property_total_sites = 6, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Child-friendly boutique country hotel near Xaló. Operator: five elegant suites/apartments plus one standalone Casita. Not a campground and not yurts. Sage Partida la Solana / hyphenated URL / +34 966 480 130 / zip 3727 were wrong. No operator GPS published. Meals are extras. CN Traveller from ~£300 is press only — not stored.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Meals (breakfast hampers, kids tea, dinner) sold separately. No operator from-rate. +34 607 811 197. sarah@caseriodelmirador.com. Typical min 1 week Sat–Sat, Apr–Oct.',
  description = $$Boutique family hotel at Camino Barranco Murtas 13, 03727 Jalón / Xaló. Five suites/apartments plus one Casita. Pool, farm animals, Sierra Bernia views. Not yurt glamping. No operator pin published.$$,
  activities_raw = 'On-site: pool, farm animals, play areas, optional meals and yoga. Nearby: Xaló, Sierra Bernia, Alicante coast (~30 min).',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'Yes', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'No',
  season_open_month = 4, season_close_month = 10,
  date_updated = '2026-09-04'
WHERE id = 11182 AND property_id = '34784373-eb67-433c-8813-daf9f7b0f896';

UPDATE public.all_sage_data
SET
  site_name = 'Suite', unit_type = 'Suite', quantity_of_units = 5,
  unit_capacity = '2-5', unit_bed = 'Varies (king / super king / Euro double)',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal April–October typical. Five named suites/apartments lumped (Vinya, Olivera, Taronger, Carrasca, Palmera). Casita split out.',
  minimum_nights = '7',
  unit_description = $$Suite (qty 5): Vinya, Olivera, Taronger, Carrasca, Palmera. Lumped — do not invent a 6th suite. Casita is separate.$$,
  amenities_raw = 'Suite/apartment; kitchenette; A/C; Wi-Fi; terrace; baby kit. Meals extra.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object('note', 'EUR room_only. No operator from-rate. CN Traveller ~£300 press not stored. Cleared stub 220 yurt ADR.')
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Yurt stub. Type → Outdoor Boutique Hotel. is_glamping_property No. This row is Suite qty 5. Casita added. Zip 03727. Phone +34 607 811 197. No lat/lon.'
WHERE id = 11182 AND property_id = '34784373-eb67-433c-8813-daf9f7b0f896';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, unit_picnic_table, unit_charcoal_grill, unit_ada_accessibility,
  operating_season_months, minimum_nights,
  unit_description, amenities_raw, activities_raw,
  url, property_id, phone_number,
  property_clubhouse, property_food_on_site, property_restaurant, property_laundry,
  property_pool, property_hot_tub, property_sauna, property_family_friendly,
  property_remote_work_friendly, property_has_rentals, property_playground,
  property_general_store, property_extended_stay, property_pickball_courts,
  property_fitness_room, property_waterfront, property_alcohol_available,
  property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_swimming, activities_wildlife_watching,
  activities_stargazing, activities_scenic_drives,
  setting_ranch, setting_field, setting_mountainous, rv_parking,
  season_open_month, season_close_month,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes, description, notes
)
SELECT
  'published', 'Yes', 'No', 'Sage', 'Caserío del Mirador', 'Casita',
  'web_research_caserio_del_mirador_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country, g.slug, g.property_type,
  6, 1::numeric, 'Cottage', '4', 'Super king',
  'Yes', 'Yes', 'Yes', 'No',
  'Yes', 'Yes', 'No', 'Yes', 'Yes',
  'No', 'Yes', 'No', 'No', 'No',
  'Yes', 'No', 'No', 'No',
  'Seasonal April–October typical. One standalone Casita in its own garden. Two bedrooms.',
  '7',
  $$Casita (qty 1): Standalone cottage. Do not invent a 2nd Casita or an Airstream.$$,
  'Cottage; kitchenette; terrace; A/C; Wi-Fi. Meals extra.',
  g.activities_raw, g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_fitness_room, g.property_waterfront, g.property_alcohol_available,
  g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_swimming, g.activities_wildlife_watching,
  g.activities_stargazing, g.activities_scenic_drives,
  g.setting_ranch, g.setting_field, g.setting_mountainous, g.rv_parking,
  g.season_open_month, g.season_close_month,
  jsonb_build_object('2026', jsonb_build_object('note', 'EUR room_only. No operator Casita from-rate.')),
  g.rate_basis, g.rate_basis_notes, g.description,
  E'[2026-09-04] Added Casita qty 1 from caseriodelmirador.com.'
FROM public.all_sage_data g
WHERE g.id = 11182 AND g.property_id = '34784373-eb67-433c-8813-daf9f7b0f896'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = '34784373-eb67-433c-8813-daf9f7b0f896' AND x.site_name = 'Casita'
  );

-- ============================================================================
-- Torre dello Ziro — villa / 7 ensuite rooms. Not a treehouse.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Torre dello Ziro', slug = 'torre-dello-ziro-ravello',
  property_type = 'Outdoor Boutique Hotel', source = 'Sage',
  discovery_source = 'web_research_torre_dello_ziro_2026_09',
  address = 'Via delle Cartiere 6', city = 'Ravello', state = 'Campania',
  zip_code = '84010', country = 'Italy',
  lat = 40.6341, lon = 14.602,
  url = 'https://torredelloziro.com/', phone_number = '+39-089-872982',
  property_total_sites = 7, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'Yes', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Restored historic villa between Ravello and Amalfi. Operator: exclusive vacation rental / B&B language, seven double rooms with ensuite, up to 16 guests. CIN IT065104C2CI7SGZRH. Not treehouse glamping. Seasonal late March–early October on the Italian page.',
  rate_basis = 'breakfast',
  rate_basis_notes = 'EUR. Italian operator page lists breakfasts for the B&B stay. No operator from-rate. +39 089 872 982.',
  description = $$Historic villa at Via delle Cartiere 6, 84010 Ravello (40.6341, 14.602). Seven ensuite double rooms. Sea and lemon-grove views. Not a treehouse and not glamping.$$,
  activities_raw = 'On-site: terrace, garden, patio. Nearby: Ravello, Amalfi, Valle delle Ferriere, Amalfi Coast.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'No',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  season_open_month = 3, season_close_month = 10,
  date_updated = '2026-09-04'
WHERE id = 11062 AND property_id = '4452df28-e16e-4f93-89c4-d4ddc6d54a1f';

UPDATE public.all_sage_data
SET
  site_name = 'Hotel Room', unit_type = 'Hotel Room', quantity_of_units = 7,
  unit_capacity = '2', unit_bed = 'Double',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'Yes',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal late March–early October (operator IT page). Seven ensuite doubles. Shared villa kitchen when rented as a house.',
  minimum_nights = '1',
  unit_description = $$Hotel Room (qty 7): Ensuite doubles in Villa Torre dello Ziro. Do not invent treehouses.$$,
  amenities_raw = 'Ensuite double; A/C; Wi-Fi; villa kitchen/laundry shared. Breakfast on B&B stays.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object('note', 'EUR breakfast. No operator from-rate. Cleared stub 230 treehouse ADR.')
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Treehouse stub. Type → Outdoor Boutique Hotel. is_glamping_property No. This row is Hotel Room qty 7. URL torredelloziro.com.'
WHERE id = 11062 AND property_id = '4452df28-e16e-4f93-89c4-d4ddc6d54a1f';

-- ============================================================================
-- Domein Holset — 11 boutique hotel rooms. Not safari tents.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Domein Holset', slug = 'domein-holset-lemiers',
  property_type = 'Outdoor Boutique Hotel', source = 'Sage',
  discovery_source = 'web_research_domein_holset_2026_09',
  address = 'Holset 34-36', city = 'Lemiers', state = 'Limburg',
  zip_code = '6295 NC', country = 'Netherlands',
  lat = 50.7792, lon = 5.9871,
  url = 'https://www.domeinholset.nl/', phone_number = '+31-43-850-2928',
  property_total_sites = 11, year_site_opened = 2017,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'Yes',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Sparkling-wine estate and boutique hotel in a restored farmhouse. Operator: eleven unique themed rooms. Not safari-tent glamping. Sage zip 6295 ND / +31 43 306 1020 were wrong. Breakfast offered; packages exist. Third-party from €107.50 excl breakfast not stored.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Breakfast is a sold add-on / arrangement, not stated as included in the base room rate. No operator from-rate on domeinholset.nl/slapen. +31 43 850 2928. info@domeinholset.nl.',
  description = $$Boutique hotel and vineyard at Holset 34-36, 6295 NC Lemiers (50.7792, 5.9871). Eleven unique rooms. Wine shop and tastings. Not safari-tent glamping.$$,
  activities_raw = 'On-site: vineyard walks, sparkling-wine tasting, wine shop, terrace. Nearby: Vaalserberg / Drielandenpunt, Aachen, Maastricht, Valkenburg.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'No',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11108 AND property_id = '79a76414-297f-49eb-9892-257a4b1fdda1';

UPDATE public.all_sage_data
SET
  site_name = 'Hotel Room', unit_type = 'Hotel Room', quantity_of_units = 11,
  unit_capacity = '2', unit_bed = 'Double',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical with January/February closed check-in days. Eleven unique themed rooms lumped.',
  minimum_nights = '1',
  unit_description = $$Hotel Room (qty 11): Unique themed rooms including attic and Panoramasuite, lumped. Do not invent safari tents.$$,
  amenities_raw = 'Ensuite hotel room; shared lounge and terrace; wine estate. Breakfast extra.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object('note', 'EUR room_only. No operator from-rate. Cleared stub 150 safari ADR.')
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Safari Tent stub. Type → Outdoor Boutique Hotel. is_glamping_property No. This row is Hotel Room qty 11. Zip 6295 NC. Phone +31 43 850 2928. Year 2017.'
WHERE id = 11108 AND property_id = '79a76414-297f-49eb-9892-257a4b1fdda1';

COMMIT;
