-- Acre Resort (13 treehouses), La Cabane du Bois Dormant (1),
-- Glamping Collective Chattanooga (21), Serenity Xpu-Ha (tents unpublished).
-- Never write rate_avg_retail_daily_rate.

BEGIN;

-- ============================================================================
-- Acre Resort — official 12 single + 1 double treehouse. Villas unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Acre Resort', slug = 'acre-baja',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_acre_resort_2026_09',
  address = 'Calle Rincón de las Ánimas S/N, Ánimas Bajas', city = 'San José del Cabo',
  state = 'Baja California Sur', zip_code = '23407', country = 'Mexico',
  lat = 23.0696, lon = -109.7314,
  url = 'https://acreresort.com/', phone_number = '+1-877-955-2670',
  property_total_sites = 13, year_site_opened = 2015,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'Yes', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Acre Resort (Sage Acre Baja / acrebaja.com / +52 624 171 8226 stale). 25-acre farm with Michelin Green Star restaurant. Official treehouses: 12 single (1–2) + 1 double with sky bridge (3–4) = 13. King, ensuite, private terrace, outdoor shower, breakfast in a basket. 2–3 BR villas and 2–4 BR haciendas qty unpublished. Jungle/Cactus pools. reservations@acreresort.com. Restaurant +52 624 172 1021. Stay +52 624 247 3059.',
  rate_basis = 'breakfast',
  rate_basis_notes = 'USD. Treehouse stay includes complimentary breakfast biscuits/coffee. No official static from-rate. Do not store Sage 350 or OTA scrapes.',
  description = $$Acre Resort, Calle Rincón de las Ánimas S/N, Ánimas Bajas, 23407 San José del Cabo (23.0696, -109.7314). Thirteen official treehouses. Villas unpublished.$$,
  activities_raw = 'On-site: farm, restaurant, jungle/cactus pools, fitness, coffee shop. Nearby: San José del Cabo, SJD ~25 min.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 27 AND property_id = 'c7798102-374d-44f3-ab88-b530e8db08e0';

UPDATE public.all_sage_data
SET
  site_name = 'Treehouse', unit_type = 'Treehouse', quantity_of_units = 13,
  unit_capacity = '2-4', unit_bed = 'King',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round. Official 12 single + 1 double lumped. Villas unpublished. Do not invent a 14th treehouse.',
  minimum_nights = '1',
  unit_description = $$Treehouse (qty 13): 12 single + 1 double sky-bridge. King, ensuite, terrace, outdoor shower. Villas unpublished.$$,
  amenities_raw = 'Canopy treehouse; ensuite; mini fridge; outdoor shower; breakfast basket. Resort restaurant and pools.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'USD breakfast. No official from-rate. Do not store Sage 350.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official Acre Resort. This row is Treehouse qty 13. Villas unpublished.'
WHERE id = 27 AND property_id = 'c7798102-374d-44f3-ab88-b530e8db08e0';

-- ============================================================================
-- La Cabane du Bois Dormant — one treehouse B&B in Spa.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'La Cabane du Bois Dormant', slug = 'la-cabane-du-bois-dormant',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_cabane_du_bois_dormant_2026_09',
  address = 'Avenue Peltzer de Clermont 26', city = 'Spa', state = 'Wallonia',
  zip_code = '4900', country = 'Belgium',
  lat = NULL, lon = NULL,
  url = 'https://www.lacabaneduboisdormant.be/', phone_number = '+32-494-57-68-98',
  property_total_sites = 1, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'No',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'One ~35 m² African-hut treehouse B&B for two. Ensuite, terrace, minibar, TV, wifi. Breakfast hoisted in a basket. Sage Chemin de la Herde 11 / +32 87 77 15 00 / qty 5 / lacabaneduboisdormant.com were wrong. Official Avenue Peltzer de Clermont 26, +32 494 57 68 98, BE0549903688, regisgoffin@hotmail.be. Cash only on site. Small children not allowed. No operator GPS published.',
  rate_basis = 'breakfast',
  rate_basis_notes = 'EUR. Official Fri–Sat €220. Sun–Thu €200 (July–August midweek €220). Breakfast and tourist tax included.',
  description = $$La Cabane du Bois Dormant, Avenue Peltzer de Clermont 26, 4900 Spa. One treehouse for two. No operator pin published.$$,
  activities_raw = 'On-site: forest terrace. Nearby: Spa town, Francorchamps, Liège.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 10977 AND property_id = 'b6fd9057-2290-41a3-8e1b-7126ce49e880';

UPDATE public.all_sage_data
SET
  site_name = 'Treehouse', unit_type = 'Treehouse', quantity_of_units = 1,
  unit_capacity = '2', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'Yes',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. One treehouse only. Do not invent a 2nd or Sage qty 5.',
  minimum_nights = '1',
  unit_description = $$Treehouse (qty 1): ~35 m² African hut, ensuite, terrace, breakfast basket. For two. Do not invent a 2nd.$$,
  amenities_raw = 'Heated treehouse; ensuite; terrace; minibar; TV; wifi; breakfast hoisted up.',
  rate_summer_weekday = '200', rate_summer_weekend = '220',
  rate_winter_weekday = '200', rate_winter_weekend = '220',
  rate_spring_weekday = '200', rate_spring_weekend = '220',
  rate_fall_weekday = '200', rate_fall_weekend = '220',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 200, 'weekend', 220),
      'spring', jsonb_build_object('weekday', 200, 'weekend', 220),
      'summer', jsonb_build_object('weekday', 200, 'weekend', 220),
      'fall', jsonb_build_object('weekday', 200, 'weekend', 220),
      'note', 'EUR breakfast. Sun–Thu €200; Fri–Sat €220. Jul–Aug midweek €220.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Avenue Peltzer de Clermont 26. This row is Treehouse qty 1 from €200.'
WHERE id = 10977 AND property_id = 'b6fd9057-2290-41a3-8e1b-7126ce49e880';

-- ============================================================================
-- The Glamping Collective Chattanooga — 21 bluff-top domes. Split unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'The Glamping Collective Chattanooga', slug = 'the-glamping-collective-chattanooga',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_glamping_collective_chattanooga_2026_09',
  address = '200 Hwy 301', city = 'Trenton', state = 'GA',
  zip_code = '30752', country = 'United States',
  lat = 34.824986, lon = -85.574303,
  url = 'https://www.theglampingcollective.com/locations/chattanooga/',
  phone_number = '+1-423-888-0150',
  property_total_sites = 21, year_site_opened = 2026,
  property_clubhouse = 'Yes', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'Yes', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'No',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Second Glamping Collective site (Asheville Clyde is a separate published property). Sand Mountain / Outlook Mountain, 37 acres. Founder to Dade County Sentinel (Mar 2026): 21 geodesic domes. Official catalog: Ultra Luxe (cliff-front) and Luxe; per-SKU split unpublished. Private deck, hot tub, fire table. Cliff-edge infinity pool. Adults 21+ only. chattanooga@theglampingcollective.com. Do not merge Clyde rows.',
  rate_basis = 'unknown',
  rate_basis_notes = 'USD. Cloudbeds calendar only. Do not store Sage 590 or promo from-$220 cards.',
  description = $$The Glamping Collective Chattanooga, 200 Hwy 301, Trenton GA 30752 (34.824986, -85.574303). Twenty-one mountaintop domes. Adults 21+.$$,
  activities_raw = 'On-site: cliff-edge infinity pool, hiking trails, fire tables, hot tubs. Nearby: Chattanooga, Lookout Mountain.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13082 AND property_id = '1e7b2870-0a4f-4874-8e21-a53df22bd59d';

UPDATE public.all_sage_data
SET
  site_name = 'Geodesic Dome', unit_type = 'Dome', quantity_of_units = 21,
  unit_capacity = '2', unit_bed = 'King',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Official 21 domes lumped. Ultra Luxe vs Luxe split unpublished. Do not invent a 22nd.',
  minimum_nights = '1',
  unit_description = $$Dome (qty 21): Ultra Luxe and Luxe lumped. King, ensuite, private hot tub. Adults 21+. Split unpublished.$$,
  amenities_raw = 'Geodesic dome; ensuite; kitchenette; private deck, hot tub, fire table. Cliff-edge pool.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'USD unknown. Calendar only. Do not store Sage 590.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. 200 Hwy 301. This row is Dome qty 21. Rates unpublished. Clyde siblings untouched.'
WHERE id = 13082 AND property_id = '1e7b2870-0a4f-4874-8e21-a53df22bd59d';

-- ============================================================================
-- Serenity Eco Luxury Tented Camp — now Serenity Authentic Glamping Tulum.
-- Official tent count unpublished (OTA 30 vs tour 31).
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Serenity Eco Luxury Tented Camp', slug = 'serenity-eco-luxury-tented-camp',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_serenity_xpuha_2026_09',
  address = 'Carretera Federal Xpu-Ha Km 265 Lote 6', city = 'Xpu-Ha',
  state = 'Quintana Roo', zip_code = '77790', country = 'Mexico',
  lat = 20.4689, lon = -87.2765,
  url = 'https://www.tulumglampingmexico.com/', phone_number = '+52-984-222-9193',
  property_total_sites = NULL, year_site_opened = 2017,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'Yes', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'No',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Adults-only tented camp at Xpu-Ha, opened 2017 (ex Xperience / Serenity Eco Luxury Tented Camp; now marketed as Serenity Authentic Glamping Tulum). Ensuite safari tents with AC, terrace, hammock, mini-fridge. Pool, restaurant, yoga, beach club walk. Sage serenityecocamp.com / +52 984 875 1950 stale. Official +52 984 222 9193, info@glampingserenity.com. OTA rooms 30 vs one tour card 31 — official current count unpublished. Do not store either number.',
  rate_basis = 'unknown',
  rate_basis_notes = 'MXN/USD. No official static from-rate. Do not store Sage 314.',
  description = $$Serenity Eco Luxury Tented Camp (Serenity Authentic Glamping Tulum), Carretera Federal Xpu-Ha Km 265 Lote 6, 77790 Xpu-Ha. Adults-only tents. Official count unpublished.$$,
  activities_raw = 'On-site: pool, yoga, restaurant. Nearby: Xpu-Ha Beach, cenotes, Playa del Carmen, Tulum.',
  activities_hiking = 'No', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 20 AND property_id = 'd53d0ff7-fc34-4a5f-a9e9-0d148af5f7e1';

UPDATE public.all_sage_data
SET
  site_name = 'Safari Tent', unit_type = 'Safari Tent', quantity_of_units = NULL,
  unit_capacity = '2-3', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Adults only. Official tent count unpublished. Do not store OTA 30 or tour 31.',
  minimum_nights = '1',
  unit_description = $$Safari Tent (qty unpublished): ensuite, AC, terrace. Adults only. Do not invent 30 or 31.$$,
  amenities_raw = 'Luxury tent; ensuite; AC; terrace; hammock; mini-fridge. Resort pool and restaurant.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'Unknown. Count and from-rate unpublished. Do not store Sage 314.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Km 265 Lote 6. Safari Tent qty unpublished. Phone +52 984 222 9193.'
WHERE id = 20 AND property_id = 'd53d0ff7-fc34-4a5f-a9e9-0d148af5f7e1';

COMMIT;
