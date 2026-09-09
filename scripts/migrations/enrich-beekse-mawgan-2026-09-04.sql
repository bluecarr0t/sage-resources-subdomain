-- Safari Resort Beekse Bergen (225 stays) and The Park Mawgan Porth (named lodges).

BEGIN;

-- ============================================================================
-- Safari Resort Beekse Bergen — official 225 accommodations. SKU split unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Safari Resort Beekse Bergen', slug = 'safari-resort-beekse-bergen',
  property_type = 'Outdoor Resort', source = 'Sage',
  discovery_source = 'web_research_beekse_bergen_safari_2026_09',
  address = 'Beekse Bergen 1', city = 'Hilvarenbeek', state = 'North Brabant',
  zip_code = '5081 NJ', country = 'Netherlands',
  lat = 51.5185, lon = 5.1451,
  url = 'https://www.beeksebergen.nl/en/stay-the-night/hotel-resorts/safari-resort',
  phone_number = '+31-13-5491111',
  property_total_sites = 225, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Libéma safari holiday park beside Beekse Bergen. Official: 225 accommodations (lodges 6/8/14, safari tents 6/8, tree huts, Kidslodge, group jungalow). Per-SKU counts unpublished — do not invent a safari-tent number. Karibu Town / Moto / Maji Springs. Min 2 nights.',
  rate_basis = 'unknown',
  rate_basis_notes = 'EUR package pricing; Attraction Pass included. No official static nightly stored. +31 13 549 1111.',
  description = $$Safari Resort Beekse Bergen, Beekse Bergen 1, 5081 NJ Hilvarenbeek (51.5185, 5.1451). 225 stays beside the safari park. Safari-tent count unpublished.$$,
  activities_raw = 'On-site: safari park access, pool, bowling, playgrounds. Nearby: Speelland, Lake Resort.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11124 AND property_id = '8b30b3a8-6bab-4a3c-9c2a-16e790e378cc';

UPDATE public.all_sage_data
SET
  site_name = 'Safari Tent', unit_type = 'Safari Tent', quantity_of_units = NULL,
  unit_capacity = '6-8', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Official park total 225. This SKU count unpublished. Do not invent a tent number.',
  minimum_nights = '2',
  unit_description = $$Safari Tent (qty unpublished): official 6- and 8-person tents. Lodge/treehouse SKUs unpublished. Park total 225.$$,
  amenities_raw = 'Safari tent; ensuite; kitchen; savannah setting. Resort pool and restaurant.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR unknown. Package/attraction pricing; no official from-rate stored.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 225 accommodations. This row is Safari Tent qty unpublished.'
WHERE id = 11124 AND property_id = '8b30b3a8-6bab-4a3c-9c2a-16e790e378cc';

-- ============================================================================
-- The Park at Mawgan Porth — holiday village. Sage 30 yurts stale.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'The Park at Mawgan Porth', slug = 'the-park-at-mawgan-porth',
  property_type = 'Outdoor Resort', source = 'Sage',
  discovery_source = 'web_research_the_park_mawgan_porth_2026_09',
  address = 'The Park, Mawgan Porth', city = 'Mawgan Porth', state = 'Cornwall',
  zip_code = 'TR8 4BD', country = 'United Kingdom',
  lat = 50.4678, lon = -5.0318,
  url = 'https://theparkcornwall.com', phone_number = '+44-1637-860322',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = '5* self-catering holiday village ~300 yards from Mawgan Porth beach. Official catalog (2026): named luxury lodges plus cottages/cabins (Lanerick, Zennor, Daymer, park cabin). theparkcornwall.com/yurts/ is 404 — do not store Sage 30 yurts or older 4-yurt / 4-Airstream cards as current inventory. Total unpublished. Indoor pool, Mojo/Wildwood Spa. hello@theparkcornwall.com.',
  rate_basis = 'unknown',
  rate_basis_notes = 'GBP self-catering. No official static nightly stored. +44 1637 860322.',
  description = $$The Park, Mawgan Porth, Cornwall TR8 4BD (50.4678, -5.0318). Holiday village of named lodges and cottages. Sage yurt qty 30 retired.$$,
  activities_raw = 'On-site: indoor pool, spa, bistro, play areas. Nearby: Mawgan Porth beach, Newquay, coast path.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11247 AND property_id = '5206e65e-3289-4b6b-b4c9-990e840f58c5';

UPDATE public.all_sage_data
SET
  site_name = 'Luxury Lodge', unit_type = 'Cabin', quantity_of_units = NULL,
  unit_capacity = '2-12', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Named lodges on official /lodges/. Cottage/cabin SKUs unpublished. Do not store Sage 30 yurts.',
  minimum_nights = '1',
  unit_description = $$Luxury Lodge (qty unpublished): official named lodges sleeping 2–12. Cottages/cabins unpublished. Yurt village not on current official catalog.$$,
  amenities_raw = 'Self-catering lodge; full kitchen; ensuite; some hot tubs. Resort pool and bistro.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'GBP unknown. No official from-rate stored. Do not store Sage 30 yurts.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Outdoor Resort. Not 30 yurts. Lodge/cottage counts unpublished.'
WHERE id = 11247 AND property_id = '5206e65e-3289-4b6b-b4c9-990e840f58c5';

COMMIT;
