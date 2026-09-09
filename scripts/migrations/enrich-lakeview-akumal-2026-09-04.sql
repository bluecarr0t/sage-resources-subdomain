-- Lakeview Dome (1 geodesic) and Akumal Natura Glamping (20 tent bungalows).

BEGIN;

-- ============================================================================
-- Lakeview Dome — one 2024 geodesic at Lakeview Motel & Resort.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Lakeview Dome', slug = 'lakeview-dome',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_lakeview_dome_2026_09',
  address = '4951 Haliburton County Road 21', city = 'Haliburton', state = 'ON',
  zip_code = 'K0M 1S0', country = 'Canada',
  lat = 45.0439, lon = -78.5447,
  url = 'https://www.lakeviewhaliburton.ca/', phone_number = '+1-705-457-1027',
  property_total_sites = 1, year_site_opened = 2024,
  property_clubhouse = 'No', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'Yes', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'No',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'One four-season geodesic at Lakeview Motel & Resort (opened Sept 2024). Highlander: 15x22 ft, king, kitchenette, ensuite, private deck/hot tub/BBQ, Grass Lake view. Operator landing geodome.netlify.app: adults only, 2-night minimum. Motel rooms are a different product and not counted here. Listing pin 45.0439, -78.5447.',
  rate_basis = 'unknown',
  rate_basis_notes = 'CAD room_only typical. No official static nightly stored. +1 705-457-1027 / +1 866-385-9347. info@lakeviewhaliburton.ca.',
  description = $$Lakeview Dome at Lakeview Motel & Resort, 4951 Haliburton County Road 21, Haliburton ON K0M 1S0 (45.0439, -78.5447). One geodesic. Adults only.$$,
  activities_raw = 'On-site: heated pool, trails, snowmobile access. Nearby: Haliburton village, Nordic trails.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13068 AND property_id = 'f73845e7-3581-449e-94ac-018e242ba95a';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 1,
  unit_capacity = '2', unit_bed = 'King',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round. One unit only. Do not invent a 2nd dome.',
  minimum_nights = '2',
  unit_description = $$Dome (qty 1): four-season geodesic. King, ensuite, kitchenette, private hot tub. Adults only. Do not invent a 2nd.$$,
  amenities_raw = 'Geodesic dome; ensuite; kitchenette; private deck and hot tub; motel pool access.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD unknown. No official from-rate stored.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. 4951 County Road 21. This row is Dome qty 1. Motel rooms not counted.'
WHERE id = 13068 AND property_id = 'f73845e7-3581-449e-94ac-018e242ba95a';

-- ============================================================================
-- Akumal Natura Glamping — 20 eco tent bungalows. Not 7 domes.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Akumal Natura Glamping', slug = 'akumal-natura-glamping',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_akumal_natura_2026_09',
  address = 'Camino de Acceso Uxuxubi con Torres Alta Tensión S/N', city = 'Akumal',
  state = 'Quintana Roo', zip_code = '77760', country = 'Mexico',
  lat = NULL, lon = NULL,
  url = 'https://akumalnaturaglamping.com/', phone_number = '+52-984-187-5189',
  property_total_sites = 20, year_site_opened = 2016,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Operator/OTA copy: 20 thatched canvas tent bungalows (15 California king, 5 twin), ensuite, patio, jungle. Private cenote, restaurant, yoga. Sage akumalnatura.com / +52 984 875 7044 / Dome qty 7 were wrong. No operator GPS published. akumalnaturaglamping@gmail.com.',
  rate_basis = 'unknown',
  rate_basis_notes = 'MXN/USD. No official static nightly stored. +52 984 187 5189.',
  description = $$Akumal Natura Glamping, Camino de Acceso Uxuxubi con Torres Alta Tensión S/N, 77760 Akumal. Twenty eco tent bungalows. No operator pin published.$$,
  activities_raw = 'On-site: private cenote, yoga, bikes. Nearby: Akumal Bay, Xcacel.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 139 AND property_id = '96377bd9-1b06-4dc7-b9f6-4725eab8c1a9';

UPDATE public.all_sage_data
SET
  site_name = 'Tent Bungalow', unit_type = 'Safari Tent', quantity_of_units = 20,
  unit_capacity = '2', unit_bed = 'King or Twin',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. 15 king + 5 twin lumped. Do not invent 7 domes.',
  minimum_nights = '1',
  unit_description = $$Tent Bungalow (qty 20): 15 California king + 5 twin. Ensuite, patio. Do not invent 7 domes.$$,
  amenities_raw = 'Canvas tent bungalow; ensuite; patio; restaurant; private cenote.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'No official from-rate stored.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Uxuxubi access road. This row is Tent Bungalow qty 20.'
WHERE id = 139 AND property_id = '96377bd9-1b06-4dc7-b9f6-4725eab8c1a9';

COMMIT;
