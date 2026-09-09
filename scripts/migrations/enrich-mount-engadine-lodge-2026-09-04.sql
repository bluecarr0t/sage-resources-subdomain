-- Mount Engadine Lodge: convert in-progress stub id 12 to Lodge Rooms (qty 6).
-- Do not duplicate already-published Yurt 1 / Tents 5 / Cabins 3.
-- Operator: 6 lodge rooms + 3 cabins + 5 tents + 1 yurt = 15. All-inclusive meals.
-- Sources: mountengadine.com/accommodations/.

BEGIN;

-- Property-level fields on every sibling row.
UPDATE public.all_sage_data
SET
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Mount Engadine Lodge',
  slug = 'mount-engadine-lodge-kananaskis',
  property_type = 'Ranch & Lodge',
  source = 'Sage',
  discovery_source = 'web_research_mount_engadine_lodge_2026_09',
  address = '1 Mount Shark Road',
  city = 'Kananaskis',
  state = 'AB',
  zip_code = 'T1W 3H9',
  country = 'Canada',
  lat = 50.8364882,
  lon = -115.3448377,
  url = 'https://mountengadine.com/',
  phone_number = '+1-587-807-0570',
  property_total_sites = 15,
  year_site_opened = 1987,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'Yes',
  property_laundry = 'No',
  property_pool = 'No',
  property_hot_tub = 'No',
  property_sauna = 'Yes',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'No',
  property_playground = 'No',
  property_general_store = 'No',
  property_extended_stay = 'No',
  property_pickball_courts = 'No',
  property_fitness_room = 'No',
  property_waterfront = 'No',
  property_alcohol_available = 'Yes',
  property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Year-round Kananaskis wilderness lodge. Operator inventory: 6 lodge rooms/suites, 3 private cabins, 5 ensuite glamping tents, 1 seasonal yurt (request-only). Gourmet meals included (breakfast, packed lunch, afternoon tea, dinner). Dual occupancy. Pets in tents, cabins, yurt, Elk suite. Wi-Fi in main lodge / lodge rooms only. Capacity ~38 guests.',
  rate_basis = 'all_inclusive',
  rate_basis_notes = 'CAD. Dual occupancy includes breakfast, packed lunch, afternoon tea and 3-course dinner. Taxes 9.2% + 2.4% card surcharge extra. No published static lodge-room from-rate — do not invent. Existing tent 583 / cabin 668 cells left on those rows. +1 587-807-0570.',
  description = $$Wilderness lodge at 1 Mount Shark Road, Kananaskis AB (50.8364882, -115.3448377), south of Canmore. 15 units: 6 lodge rooms, 3 cabins, 5 glamping tents and 1 yurt. All-inclusive gourmet meals. Sauna, fire pit, trail access. Not a tent-only camp.$$,
  activities_raw = 'On-site: hiking, e-bikes, paddle boards, snowshoes, XC ski, sauna, fire pit, gourmet dining. Nearby: Spray Valley / Peter Lougheed, Canmore, Banff.',
  activities_hiking = 'Yes',
  activities_swimming = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  setting_ranch = 'No',
  setting_field = 'No',
  setting_mountainous = 'Yes',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE property_id = '33387855-ffc9-4b5c-a51c-52c18c93b495';

-- Stub id 12 → Lodge Room qty 6 (the missing SKU).
UPDATE public.all_sage_data
SET
  research_status = 'published',
  site_name = 'Lodge Room',
  unit_type = 'Hotel Room',
  quantity_of_units = 6,
  unit_capacity = '1-4',
  unit_bed = 'King (splits) / suite / Chickadee single',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'No',
  unit_wifi = 'Yes',
  unit_pets = 'No',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'No',
  unit_patio = 'Yes',
  unit_cable = 'No',
  unit_mini_fridge = 'No',
  unit_picnic_table = 'No',
  unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  operating_season_months = 'Year-round. Six lodge rooms/suites lumped (Eagle, Raven, Owl, Chickadee single, Moose, Elk pet-friendly). Do not add a 7th room.',
  minimum_nights = '1',
  unit_description = $$Lodge Room (qty 6): Main-lodge rooms and suites with ensuite baths. Elk suite is the pet-friendly lodge SKU. Chickadee is single occupancy. Do not invent a 7th lodge room.$$,
  amenities_raw = 'Lodge room; ensuite; Wi-Fi in lodge. Meals included. Elk suite pets yes; others no.',
  rate_winter_weekday = '250',
  rate_winter_weekend = '250',
  rate_spring_weekday = '250',
  rate_spring_weekend = '250',
  rate_summer_weekday = '250',
  rate_summer_weekend = '250',
  rate_fall_weekday = '250',
  rate_fall_weekend = '250',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD all_inclusive dual occupancy. No operator lodge-room from-rate; stub 250 kept as unconfirmed sample only.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published stub id 12 as Lodge Room / Hotel Room qty 6. Did not duplicate Yurt 1 / Tents 5 / Cabins 3. Type Glamping → Ranch & Lodge. rate_basis unknown → all_inclusive. Coords aligned to published siblings 50.8364882,-115.3448377.'
WHERE id = 12
  AND property_id = '33387855-ffc9-4b5c-a51c-52c18c93b495';

-- Align already-published SKU rows (qty unchanged).
UPDATE public.all_sage_data
SET
  research_status = 'published',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Property-level refresh from mountengadine.com. Qty unchanged. Type → Ranch & Lodge. rate_basis → all_inclusive. City Canmore → Kananaskis.'
WHERE id IN (10678, 10746, 10755)
  AND property_id = '33387855-ffc9-4b5c-a51c-52c18c93b495';

COMMIT;
