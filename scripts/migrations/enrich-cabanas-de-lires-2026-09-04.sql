-- ============================================================================
-- Cabañas de Lires (Lires, Cee, Costa da Morte): publish 3 log cabins.
-- Not Safari Tent qty 5 / total 6. Do not add Cabanas da Ría (separate
-- thematic cabins mentioned on third-party pages).
--
-- Sources (retrieved 2026-09-04):
--   https://cabanasdelires.com/ — Peralta, Montené, A Roxeira
--   Xunta / Camino: LG. DE LIRES 99, 15138 Cee
--   42°59′49.3″N 9°14′29.6″W = 42.9970278, -9.2415556
--   Brujulea 2026: 2p 80 / 100 / 130 EUR by season
--
-- Operating inventory:
--   Cabin qty 3
--   property_total_sites = 3
--
-- Rates EUR, room_only.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Cabañas de Lires',
  slug = 'cabanas-de-lires-cee-galicia',
  property_type = 'Glamping',
  source = 'Sage',
  discovery_source = 'web_research_cabanas_de_lires_operator_2026_09',
  address = 'Lugar de Lires 99',
  city = 'Cee',
  state = 'Galicia',
  zip_code = '15138',
  country = 'Spain',
  lat = 42.9970278,
  lon = -9.2415556,
  url = 'https://cabanasdelires.com/',
  phone_number = '+34-696-029-810',
  property_total_sites = 3,
  year_site_opened = NULL,
  property_clubhouse = 'No',
  property_food_on_site = 'No',
  property_restaurant = 'No',
  property_laundry = 'Yes',
  property_pool = 'Yes',
  property_hot_tub = 'No',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'No',
  property_playground = 'Yes',
  property_general_store = 'No',
  property_extended_stay = 'No',
  property_pickball_courts = 'No',
  property_fitness_room = 'No',
  property_waterfront = 'No',
  property_alcohol_available = 'No',
  property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'rustic',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Three identical 3-llaves log cabins (Peralta, Montené, A Roxeira) in Lires, Cee, on the Fisterra–Muxía Camino. Shared garden, pool, BBQ gazebo, playground, small farm animals. Ecoturismo Ría de Lires. Do not add Cabanas da Ría. Q de Calidad apartments — not safari tents.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR inc IVA. Brujulea 2026 1–2 pax: baja 80 / alta 100 / especial (Semana Santa + August) 130. 3–4 pax 110–130. Pets €6/night. Children ≤3 free. +34 696 029 810. Address is Lires 99 / 15138, not Lires 15 / 15270.',
  description = $$Three rustic log cabins at Lugar de Lires 99, 15138 Cee, A Coruña (42.9970278, -9.2415556), in the coastal hamlet of Lires on the Costa da Morte. Peralta, Montené and A Roxeira — identical 40 m² cabins (double + loft twins, kitchen-living, bath) sharing a garden pool and BBQ. Not five safari tents. Cabanas da Ría is a different product.$$,
  activities_raw = 'On-site: pool, playground, BBQ, small farm. Nearby: Praia de Lires, Nemiña, Fisterra, Muxía, Camino Fisterra–Muxía (~200m).',
  activities_hiking = 'Yes',
  activities_swimming = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  setting_ranch = 'No',
  setting_field = 'Yes',
  setting_mountainous = 'No',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11202
  AND property_id = 'a0fec64e-acc0-4f7c-aa0a-b10bf01475a3';

UPDATE public.all_sage_data
SET
  site_name = 'Cabin',
  unit_type = 'Cabin',
  quantity_of_units = 3,
  unit_capacity = '4-5',
  unit_bed = '1 Double 1.50m + 2 singles in loft',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes',
  unit_air_conditioning = 'No',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'No',
  unit_patio = 'Yes',
  unit_cable = 'Yes',
  unit_mini_fridge = 'Yes',
  unit_picnic_table = 'Yes',
  unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. Three identical cabins (Peralta, Montené, A Roxeira) differing only by interior colour. Extra bed possible on the double. Do not add Cabanas da Ría.',
  minimum_nights = '1',
  unit_description = $$Cabin (qty 3): Peralta, Montené and A Roxeira — identical 40 m² log cabins with terrace, kitchen-living, bathroom (hydromassage cabin), double bedroom (extra bed possible) and loft with two 90 cm beds. Sleeps 4–5. Shared pool and BBQ. Pets €6/night. Do not invent a 4th Lires cabin or safari tents.$$,
  amenities_raw = 'Log cabin; full kitchen; bath with hydromassage cabin; terrace; TV; heating; shared pool, BBQ, playground. Pets €6/night.',
  rate_winter_weekday = '80',
  rate_winter_weekend = '80',
  rate_spring_weekday = '80',
  rate_spring_weekend = '100',
  rate_summer_weekday = '100',
  rate_summer_weekend = '130',
  rate_fall_weekday = '80',
  rate_fall_weekend = '80',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 80, 'weekend', 80),
      'spring', jsonb_build_object('weekday', 80, 'weekend', 100),
      'summer', jsonb_build_object('weekday', 100, 'weekend', 130),
      'fall', jsonb_build_object('weekday', 80, 'weekend', 80),
      'note', 'EUR room_only 1–2 pax (brujulea.net 2026): baja 80 / alta 100 / especial 130 (Semana Santa + August). 3–4 pax 110–130. Pets €6.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Safari Tent qty 5 / total 6 stub. Cabin qty 3. Address Lires 15/15270 → Lires 99/15138. Phone → +34 696 029 810. rate_basis unknown → room_only.'
WHERE id = 11202
  AND property_id = 'a0fec64e-acc0-4f7c-aa0a-b10bf01475a3';

COMMIT;
