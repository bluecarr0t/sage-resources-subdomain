-- Palmaïa 234 suites, not 8 domes.
-- Treehouse Belgium is a ghost — rejected in reject-screenshot-ghosts-2026-09-04.sql.
-- Do not merge it into Boomkamp.

BEGIN;

-- ============================================================================
-- Palmaïa — 234 oceanfront suites. Not 8 domes. Not glamping.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Palmaïa - The House of AïA', slug = 'palmaia-the-house-of-aia-playacar',
  property_type = 'Outdoor Resort', source = 'Sage',
  discovery_source = 'web_research_palmaia_house_of_aia_2026_09',
  address = 'Paseo Xaman-Ha, Mz 1, Lote 1, Playacar',
  city = 'Playa del Carmen', state = 'Quintana Roo',
  zip_code = '77710', country = 'Mexico',
  lat = 20.6013, lon = -87.0914,
  url = 'https://thehouseofaia.com/', phone_number = '+52-55-8526-6112',
  property_total_sites = 234, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'Yes', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'All-inclusive oceanfront wellness resort in Playacar. Operator: 234 oceanfront suites — not geodesic domes. Jungle spa, cenotes, plant-forward dining, Architects of Life program. Red Tree Collection / wellness enclave.',
  rate_basis = 'all_inclusive',
  rate_basis_notes = 'USD. All meals, snacks, drinks, 24h room service, holistic activities. KAYAK sample avg ~$414 (2026-09-01 note). MX +52 55 8526 6112; US +1 863 485 8268. Stub +52 984 689 0577 not used.',
  description = $$All-inclusive wellness resort at Paseo Xaman-Ha Mz 1 Lote 1, Playacar, 77710 Playa del Carmen (20.6013, -87.0914). 234 oceanfront suites — not 8 domes. Jungle spa, pools, beach club, cenotes.$$,
  activities_raw = 'On-site: beach, pools, jungle spa/gym, yoga/meditation, cenotes, kids club, bikes. Nearby: Playa del Carmen, Tulum corridor.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 142 AND property_id = '3fd0c119-c0b4-4ed7-a956-8979a5b2b5da';

UPDATE public.all_sage_data
SET
  site_name = 'Oceanfront Suite', unit_type = 'Hotel Room', quantity_of_units = 234,
  unit_capacity = '2-4', unit_bed = 'King / queen / family suite (lumped)',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'Yes',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'Yes', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round. 234 oceanfront suites lumped (king, queen, family, swim-out, meditation). Do not invent dome inventory.',
  minimum_nights = '1',
  unit_description = $$Oceanfront Suite (qty 234): All suites lumped. Private terrace, AC, minibar, vegan-material rooms. Not 8 domes. Do not invent a per-SKU suite split.$$,
  amenities_raw = 'Suite; AC; terrace; minibar; 24h room service; Wi-Fi. All-inclusive. Swim-out / family variants lumped.',
  rate_winter_weekday = '414', rate_winter_weekend = '414',
  rate_spring_weekday = '414', rate_spring_weekend = '414',
  rate_summer_weekday = '414', rate_summer_weekend = '414',
  rate_fall_weekday = '414', rate_fall_weekend = '414',
  rate_unit_rates_by_year = jsonb_build_object('2026', jsonb_build_object('note', 'USD all_inclusive. KAYAK avg ~$414 sample. Stub 464 aligned to that from-rate.')),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Dome qty 8 stub. This row is Oceanfront Suite / Hotel Room qty 234 (thehouseofaia.com). Type Glamping → Outdoor Resort. is_glamping_property No. rate_basis unknown → all_inclusive.'
WHERE id = 142 AND property_id = '3fd0c119-c0b4-4ed7-a956-8979a5b2b5da';

COMMIT;
