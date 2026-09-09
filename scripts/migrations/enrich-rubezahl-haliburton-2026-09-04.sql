-- Ferienpark Rübezahl (21 holiday homes, not glamping) and Haliburton Forest (12 units).

BEGIN;

-- ============================================================================
-- Ferienpark Rübezahl — Müggelsee holiday homes. Not glamping.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Ferienpark Rübezahl', slug = 'ferienpark-rubezahl',
  property_type = 'Outdoor Resort', source = 'Sage',
  discovery_source = 'web_research_ferienpark_rubezahl_2026_09',
  address = 'Müggelheimer Damm 143', city = 'Berlin', state = 'Berlin',
  zip_code = '12559', country = 'Germany',
  lat = 52.435, lon = 13.618,
  url = 'https://ruebezahl-berlin.de/', phone_number = '+49-30-65661688-0',
  property_total_sites = 21, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Rübezahl am Müggelsee, Köpenick. Official homepage: 21 Ferienhäuser with private wellness (sauna/bath). Bistro, beer garden, winter ice rink, events. Sage +49 30 6598250 / Lodge qty 26 were wrong. Current phone +49 30 65661688-0. event@ / rezeption@. Not the Harz Rübezahl park.',
  rate_basis = 'unknown',
  rate_basis_notes = 'EUR self-catering. No official static nightly stored. Tuesday/Thursday call discount mentioned; not stored as a rate.',
  description = $$Ferienpark Rübezahl, Müggelheimer Damm 143, 12559 Berlin (52.435, 13.618). Twenty-one wellness holiday homes on Müggelsee. Not glamping.$$,
  activities_raw = 'On-site: lake, beer garden, ice rink, playground. Nearby: Köpenick forest, Müggelberge, Berlin.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11037 AND property_id = '8086936e-14b6-453d-940c-56a28a204a11';

UPDATE public.all_sage_data
SET
  site_name = 'Holiday Home', unit_type = 'Cabin', quantity_of_units = 21,
  unit_capacity = 'Varies', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'Yes',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'Yes',
  operating_season_months = 'Year-round. Official 21 homes. Do not store Sage 26.',
  minimum_nights = '1',
  unit_description = $$Holiday Home (qty 21): ~130–140 m², full kitchen, private sauna/bath, terrace. Do not invent 26.$$,
  amenities_raw = 'Holiday home; full kitchen; ensuite; private wellness; terrace. Resort bistro and lake.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR unknown. No official from-rate stored.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Outdoor Resort, not glamping. Official 21 Ferienhäuser.'
WHERE id = 11037 AND property_id = '8086936e-14b6-453d-940c-56a28a204a11';

-- ============================================================================
-- Haliburton Forest — official 12 holiday units. Not 5 treehouses.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Haliburton Forest & Wild Life Reserve', slug = 'haliburton-forest-wild-life-reserve',
  property_type = 'Outdoor Resort', source = 'Sage',
  discovery_source = 'web_research_haliburton_forest_2026_09',
  address = '1095 Redkenn Road', city = 'Haliburton', state = 'ON',
  zip_code = 'K0M 1S0', country = 'Canada',
  lat = 45.2, lon = -78.5833,
  url = 'https://www.haliburtonforest.com/', phone_number = '+1-705-754-2198',
  property_total_sites = 12, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'Yes',
  property_playground = 'No', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official stay-overnight: 12 fully furnished holiday units (refurbished logger camboose/snowmobile houses, loft cabins, lakeside). Waterfront car-camp and backcountry campsites exist — count unpublished. Sage Treehouse qty 5 is invented. Do not merge Fort Treehouse The Baltic or Cabinscape units on the land. +1 800-631-2198 / +1 705-754-2198. info@haliburtonforest.com. Listing pin coarse 45.2, -78.5833.',
  rate_basis = 'unknown',
  rate_basis_notes = 'CAD self-catering. No official static nightly stored. Book via Checkfront.',
  description = $$Haliburton Forest & Wild Life Reserve, 1095 Redkenn Road, Haliburton ON K0M 1S0. Twelve holiday units on a 100,000-acre private forest. Not treehouse glamping.$$,
  activities_raw = 'On-site: canopy tour, wolf centre, trails, canoe, snowmobile, astronomy. Nearby: Haliburton village.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 72 AND property_id = '19074d5e-be00-4962-a681-2a9ad4c34a18';

UPDATE public.all_sage_data
SET
  site_name = 'Holiday Unit', unit_type = 'Cabin', quantity_of_units = 12,
  unit_capacity = 'Varies', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Official 12 holiday units. Campsite count unpublished. Do not invent 5 treehouses.',
  minimum_nights = '1',
  unit_description = $$Holiday Unit (qty 12): camboose / snowmobile houses / loft and lakeside cabins lumped. Campsites unpublished. Do not invent 5 treehouses.$$,
  amenities_raw = 'Self-contained holiday unit; kitchenette; waterfront campsites also offered (count unpublished).',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD unknown. No official from-rate stored. Not 5 treehouses.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Outdoor Resort, not glamping. Official 12 holiday units. Campsites unpublished.'
WHERE id = 72 AND property_id = '19074d5e-be00-4962-a681-2a9ad4c34a18';

COMMIT;
