-- Island Beach Hideaways (4 domes) + EKÖ Nature Glamping (4 domes + 2 cabins).

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Island Beach Hideaways', slug = 'island-beach-hideaways-monks-head',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_island_beach_hideaways_2026_09',
  address = '259 Pomquet Beach Road', city = 'Monks Head', state = 'NS',
  zip_code = 'B2G 2L4', country = 'Canada',
  lat = 45.645442, lon = -61.826828,
  url = 'https://www.islandbeachhideaways.ca/', phone_number = '+1-902-200-4200',
  property_total_sites = 4, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'No',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Adults-only 11-acre waterfront geodesic-dome resort next to Pomquet Beach Provincial Park. Four domes; one wheelchair accessible. Gift shop + seasonal ice cream. Kayak/canoe rentals.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. NovaScotia.com $295–$325/night. Direct-book 15% off. Weekday discounts off-season. +1 902-200-4200.',
  description = $$Adults-only luxury geodesic domes at 259 Pomquet Beach Road, Monks Head NS B2G 2L4 (45.645442, -61.826828). Four waterfront domes with private hot tubs. Last property before Pomquet Beach Provincial Park.$$,
  activities_raw = 'On-site: hot tub, kayak/canoe, gift shop, ice cream (May–Oct). Nearby: Pomquet Beach, Antigonish, Acadian trails.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13032 AND property_id = '11988caa-9154-47a0-9f6a-6f58d26eba57';

UPDATE public.all_sage_data
SET
  site_name = 'Geodesic Dome', unit_type = 'Dome', quantity_of_units = 4,
  unit_capacity = '2', unit_bed = 'King / queen (adults-only)',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'Yes',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'Yes', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round. Adults-only. One of four domes is wheelchair accessible.',
  minimum_nights = '1',
  unit_description = $$Geodesic Dome (qty 4): Waterfront luxury domes with private hot tub and open-air shower. Adults-only. One ADA. Do not invent a 5th dome.$$,
  amenities_raw = 'Dome; kitchenette; private hot tub; open-air shower; fireplace; Wi-Fi. Adults-only.',
  rate_winter_weekday = '295', rate_winter_weekend = '325',
  rate_spring_weekday = '295', rate_spring_weekend = '325',
  rate_summer_weekday = '295', rate_summer_weekend = '325',
  rate_fall_weekday = '295', rate_fall_weekend = '325',
  rate_unit_rates_by_year = jsonb_build_object('2026', jsonb_build_object('note', 'CAD room_only. NovaScotia.com $295–$325/night.')),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published Dome qty 4 from islandbeachhideaways.ca + novascotia.com. rate_basis unknown → room_only. Adults-only.'
WHERE id = 13032 AND property_id = '11988caa-9154-47a0-9f6a-6f58d26eba57';

UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'EKÖ Nature Glamping', slug = 'eko-nature-glamping-lac-baker',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_eko_nature_glamping_2026_09',
  address = '575 chemin de l''Église', city = 'Lac Baker', state = 'NB',
  zip_code = 'E7A 1L4', country = 'Canada',
  lat = 47.353874, lon = -68.661355,
  url = 'https://www.ekonatureglamping.com/', phone_number = '+1-506-992-3436',
  property_total_sites = 6, year_site_opened = 2021,
  property_clubhouse = 'No', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Four identical luxury domes + two modern cabins on 235 acres overlooking Lac Baker. Private terrace spas. ACOA-funded 2021. Gourmet boxes extra. Pets allowed (Tourism NB).',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Self-cater; gourmet boxes extra. No published static ADR — stub 185 retained as unconfirmed sample. +1 506-992-3436.',
  description = $$Four-season glamping at 575 chemin de l''Église, Lac Baker NB E7A 1L4 (47.353874, -68.661355). Four mountain-side luxury domes and two cabins with private spas overlooking Lac Baker. Not 4 units only.$$,
  activities_raw = 'On-site: private spa, lake views, hiking/snowmobile nearby, gourmet pickup. Nearby: Lac Baker beach, Appalachians, US border.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13038 AND property_id = 'e3fca711-a1f7-4755-8c24-37652640a7e2';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 4,
  unit_capacity = '4', unit_bed = 'Queen + mezzanine queen',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round. Four identical domes with pellet stove + heat pump + terrace spa.',
  minimum_nights = '1',
  unit_description = $$Dome (qty 4): Identical luxury domes with full bath, kitchen, mezzanine queen, pellet stove and private terrace spa. Do not invent a 5th dome.$$,
  amenities_raw = 'Dome; full kitchen; bath; mezzanine; pellet stove; heat pump; private spa. Pets yes.',
  rate_winter_weekday = '185', rate_winter_weekend = '185',
  rate_spring_weekday = '185', rate_spring_weekend = '185',
  rate_summer_weekday = '185', rate_summer_weekend = '185',
  rate_fall_weekday = '185', rate_fall_weekend = '185',
  rate_unit_rates_by_year = jsonb_build_object('2026', jsonb_build_object('note', 'CAD room_only. No operator from-rate; stub 185 unconfirmed sample.')),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published Dome qty 4 from ekonatureglamping.com. Cabins split out. Address/phone/coords filled.'
WHERE id = 13038 AND property_id = 'e3fca711-a1f7-4755-8c24-37652640a7e2';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, unit_picnic_table, unit_charcoal_grill, unit_ada_accessibility,
  year_site_opened, operating_season_months, minimum_nights,
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
  rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes, description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', 'EKÖ Nature Glamping', 'Cabin',
  'web_research_eko_nature_glamping_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country, g.slug, g.property_type,
  6, 2::numeric, 'Cabin', '4', 'Cabin beds',
  'Yes', 'Yes', 'No', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'No', 'Yes', 'No', 'Yes', 'No',
  'Yes', 'No', 'No', 'No',
  2021::numeric, 'Year-round. Two modern cabins with terrace spa.', '1',
  $$Cabin (qty 2): Two modern mountainside cabins with kitchen, bath and private terrace spa. Do not invent a 3rd cabin.$$,
  'Cabin; kitchen; bath; heat pump; private spa. Pets yes.',
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
  '185', '185', '185', '185', '185', '185', '185', '185',
  jsonb_build_object('2026', jsonb_build_object('note', 'CAD room_only. No cabin-specific from-rate.')),
  g.rate_basis, g.rate_basis_notes, g.description,
  E'[2026-09-04] Added Cabin qty 2 from ekonatureglamping.com (4 domes + 2 cabins).'
FROM public.all_sage_data g
WHERE g.id = 13038 AND g.property_id = 'e3fca711-a1f7-4755-8c24-37652640a7e2'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = 'e3fca711-a1f7-4755-8c24-37652640a7e2' AND x.site_name = 'Cabin'
  );

COMMIT;
