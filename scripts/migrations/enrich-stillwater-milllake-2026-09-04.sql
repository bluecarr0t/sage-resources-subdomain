-- Still Water Glamping (3 domes) and Mill Lake Retreat (3 domes).

BEGIN;

-- ============================================================================
-- Still Water Glamping — 3 named waterfront domes.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Still Water Glamping', slug = 'still-water-glamping',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_still_water_glamping_2026_09',
  address = '739 Route 740', city = 'Hayman Hill', state = 'NB',
  zip_code = 'E3L 5A7', country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://stillwaterglamping.com/', phone_number = '+1-506-467-6800',
  property_total_sites = 3, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Three named stays on a private lake ~20 min from St. Andrews: Green Haven, Eagles Nest, Hilltop Hideaway. Private patio/hot tub. Kayaks/sauna mentioned. No operator GPS published. Phone from listings +1 506-467-6800. info@stillwaterglamping.com.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Operator $240/night ($20 cleaning on 1-night). $210/night for 5+ nights. 2-night minimum June–August.',
  description = $$Still Water Glamping, 739 Route 740, Hayman Hill NB E3L 5A7. Three waterfront glamping stays. No operator pin published.$$,
  activities_raw = 'On-site: private lake, kayaks, hot tub, sauna. Nearby: St. Andrews, Maine border.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13041 AND property_id = 'b61960ef-fd27-470f-aadc-f03ed3fa6477';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 3,
  unit_capacity = '2-4', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'Yes',
  operating_season_months = 'Year-round. Three named units lumped. Do not invent a 4th.',
  minimum_nights = '1',
  unit_description = $$Dome (qty 3): Green Haven, Eagles Nest, Hilltop Hideaway. Private hot tub. Do not invent a 4th.$$,
  amenities_raw = 'Glamping dome; ensuite; kitchenette; private patio and hot tub.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 240, 'weekend', 240),
      'spring', jsonb_build_object('weekday', 240, 'weekend', 240),
      'summer', jsonb_build_object('weekday', 240, 'weekend', 240),
      'fall', jsonb_build_object('weekday', 240, 'weekend', 240),
      'note', 'CAD room_only. Operator $240/night. $210 for 5+ nights.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. 739 Route 740. This row is Dome qty 3 at CAD 240.'
WHERE id = 13041 AND property_id = 'b61960ef-fd27-470f-aadc-f03ed3fa6477';

-- ============================================================================
-- Mill Lake Retreat — 3 geodesic domes (Bootes, Lyra, Hydra).
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Mill Lake Retreat', slug = 'mill-lake-retreat',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_mill_lake_retreat_2026_09',
  address = '8 Constellation Lane', city = 'Hubbards', state = 'NS',
  zip_code = 'B0J 1T0', country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://milllakeretreat.ca/', phone_number = '+1-782-370-1848',
  property_total_sites = 3, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Three named geodesic domes (Bootes, Lyra, Hydra) by Mill Lake, ~10 min from Hubbards / 45 min Halifax. Official site: open May–October (Tourism NS also listed Apr–Dec — stored official May–Oct). Max 4 per dome. No pets. No operator GPS published. Hydra has private hot tub per Instagram copy.',
  rate_basis = 'unknown',
  rate_basis_notes = 'CAD. Tourism Nova Scotia range $200–600/night. No official static from-rate stored. +1 782-370-1848. info@milllakeretreat.ca.',
  description = $$Mill Lake Retreat, 8 Constellation Lane, Hubbards NS B0J 1T0. Three lakefront geodesic domes. No operator pin published.$$,
  activities_raw = 'On-site: lake/dock, swim, fire pit, BBQ. Nearby: Hubbards, Shore Club, Aspotogan Trail.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13034 AND property_id = '5f36d1a9-6b80-408f-b7b0-97849e538c5a';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 3,
  unit_capacity = '4', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'May–October official. Three named domes lumped (Bootes, Lyra, Hydra). Do not invent a 4th.',
  minimum_nights = '1',
  unit_description = $$Dome (qty 3): Bootes, Lyra, Hydra. Max 4. Ensuite, kitchen, fire pit. No pets. Do not invent a 4th.$$,
  amenities_raw = 'Geodesic dome; ensuite; kitchen; BBQ; fire pit; lake access. No pets.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD unknown. Tourism NS $200–600 range; no official from-rate stored.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. 8 Constellation Lane. Phone +1 782-370-1848. This row is Dome qty 3.'
WHERE id = 13034 AND property_id = '5f36d1a9-6b80-408f-b7b0-97849e538c5a';

COMMIT;
