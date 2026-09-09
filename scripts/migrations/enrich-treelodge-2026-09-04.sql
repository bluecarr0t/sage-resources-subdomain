-- ============================================================================
-- Treelodge (Retie, Antwerp — NOT Roeselare): publish 3 operating
-- treehouses. UPDATE id=10985 only — property_id is wrongly shared with
-- Treelodge Winterswijk (id 11089). Do not touch 11089 or Peer / Veluwe /
-- Holland siblings.
--
-- Bonte Specht burned 26 Dec 2024; rebuild underway — not counted.
--
-- Sources (retrieved 2026-09-04):
--   https://treelodge.be/  Hoevendijk 27, 2470 Retie
--   51.262223, 5.032559
--   Operator: Tjiftjaf from €290, Bosuil from €305, Buizerd from €315
--
-- Operating inventory:
--   Treehouse qty 3 — lumped
--   property_total_sites = 3
--
-- Rates EUR, room_only. From 290 (Tjiftjaf).
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Treelodge',
  slug = 'treelodge-retie-antwerp',
  property_type = 'Glamping',
  source = 'Sage',
  discovery_source = 'web_research_treelodge_retie_operator_2026_09',
  address = 'Hoevendijk 27',
  city = 'Retie',
  state = 'Antwerp',
  zip_code = '2470',
  country = 'Belgium',
  lat = 51.262223,
  lon = 5.032559,
  url = 'https://treelodge.be/',
  phone_number = NULL,
  property_total_sites = 3,
  year_site_opened = 2020,
  property_clubhouse = 'Yes',
  property_food_on_site = 'No',
  property_restaurant = 'No',
  property_laundry = 'No',
  property_pool = 'No',
  property_hot_tub = 'Yes',
  property_sauna = 'Yes',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No',
  property_has_rentals = 'No',
  property_playground = 'No',
  property_general_store = 'No',
  property_extended_stay = 'No',
  property_pickball_courts = 'No',
  property_fitness_room = 'No',
  property_waterfront = 'No',
  property_alcohol_available = 'No',
  property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Karen Van Rompaey + Bram Paulussen private-forest treehouses in Retie (Kempen), opened 9 Jun 2020. Three operating: Tjiftjaf, Bosuil, Buizerd. Bonte Specht burned 26 Dec 2024 and is being rebuilt — not in the total. Vuurschuur communal fire kitchen. No Wi-Fi. No pets. Stub Roeselare / Moorseelsesteenweg was wrong. Do not edit Winterswijk id 11089 (same property_id).',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Self-cater (Vuurschuur / terrace). Tjiftjaf from €290, Bosuil from €305, Buizerd from €315 per hut/night. Hot tub €175 / sauna €125 per stay extra. Linen extra. Min 2 nights; check-in Mon/Wed/Fri. No pets. info@treelodge.be. Stub +32 51 26 26 26 cleared (Roeselare placeholder).',
  description = $$Three treehouses in a private forest at Hoevendijk 27, 2470 Retie, Antwerp province, Belgium (51.262223, 5.032559) — not Roeselare. Tjiftjaf, Bosuil and Buizerd with optional terrace hot tubs and the Vuurschuur fire kitchen. Opened 9 June 2020. Fourth hut Bonte Specht burned December 2024 and is not operating. Distinct from Treelodge Winterswijk, Peer, Holland and Veluwe.$$,
  activities_raw = 'On-site: forest, Vuurschuur (open fire / pizza oven), optional hot tub and sauna, bikes. Nearby: Kasterlee, Prinsenpark, Liereman. No Wi-Fi.',
  activities_hiking = 'Yes',
  activities_swimming = 'No',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  setting_ranch = 'No',
  setting_field = 'No',
  setting_mountainous = 'No',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 10985
  AND property_id = 'f4322829-398b-4f7a-a67e-855ffb749166';

UPDATE public.all_sage_data
SET
  site_name = 'Treehouse',
  unit_type = 'Treehouse',
  quantity_of_units = 3,
  unit_capacity = '2-6',
  unit_bed = 'Varies (Tjiftjaf 2–4, Bosuil 5, Buizerd 6)',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'No',
  unit_wifi = 'No',
  unit_pets = 'No',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_cable = 'No',
  unit_mini_fridge = 'Yes',
  unit_picnic_table = 'Yes',
  unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'Yes',
  unit_sauna = 'Yes',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. Three operating huts. Bonte Specht burned Dec 2024 — rebuild, not counted. Electric stoves after the fire. Min 2 nights.',
  minimum_nights = '2',
  unit_description = $$Treehouse (qty 3): Tjiftjaf, Bosuil and Buizerd in the Retie forest. Private bath, terrace, optional hot tub/sauna extra. No Wi-Fi. No pets. Do not count Bonte Specht. Do not invent 10 Roeselare treehouses.$$,
  amenities_raw = 'Treehouse; private bath; terrace; fridge; fire kitchen nearby; optional hot tub/sauna extra. No Wi-Fi. No pets.',
  rate_winter_weekday = '290',
  rate_winter_weekend = '290',
  rate_spring_weekday = '290',
  rate_spring_weekend = '290',
  rate_summer_weekday = '290',
  rate_summer_weekend = '290',
  rate_fall_weekday = '290',
  rate_fall_weekend = '290',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 290, 'weekend', 290),
      'spring', jsonb_build_object('weekday', 290, 'weekend', 290),
      'summer', jsonb_build_object('weekday', 290, 'weekend', 290),
      'fall', jsonb_build_object('weekday', 290, 'weekend', 290),
      'note', 'EUR room_only. Tjiftjaf from €290; Bosuil €305; Buizerd €315 (treelodge.be). Stored lowest from-rate. Hot tub/sauna extra.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published id 10985 only. Corrected Roeselare/West Flanders stub → Retie, Antwerp, Hoevendijk 27. qty 10 → 3. year 2018 stub → 2020. Cleared dummy Roeselare phone. Did not update Winterswijk id 11089.'
WHERE id = 10985
  AND property_id = 'f4322829-398b-4f7a-a67e-855ffb749166';

COMMIT;
