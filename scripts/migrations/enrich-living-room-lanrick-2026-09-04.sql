-- Living Room Treehouses (6) + The Treehouses at Lanrick (5).

BEGIN;

-- Living Room Treehouses, Machynlleth
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Living Room Treehouses', slug = 'living-room-treehouses-machynlleth',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_living_room_treehouses_2026_09',
  address = 'Living Room Treehouses', city = 'Machynlleth', state = 'Powys',
  zip_code = 'SY20 9AJ', country = 'United Kingdom',
  lat = 52.61, lon = -3.851,
  url = 'https://www.living-room.co/', phone_number = '+44-1650-511991',
  property_total_sites = 6, year_site_opened = 2010,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Six unique treehouses in a hidden Welsh mountain valley near Machynlleth. Wood stoves, streams, wobbly bridges. Guardian / George Clarke Amazing Spaces.',
  rate_basis = 'room_only',
  rate_basis_notes = 'GBP. Self-cater. No published static from-rate on living-room.co — stub 300 retained as unconfirmed sample in notes only; seasonal cells use 300. +44 1650 511991.',
  description = $$Six unique treehouses at SY20 9AJ Machynlleth, Powys (52.61, -3.851), in a hidden valley near the Welsh coast. Wood-burning stoves and woodland streams. Not a campground.$$,
  activities_raw = 'On-site: woodland walks, streams, wildlife (red kites). Nearby: Machynlleth, Cadair Idris, coast.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11284 AND property_id = '1ebfd341-c24b-49dc-b230-884545fc2c77';

UPDATE public.all_sage_data
SET
  site_name = 'Treehouse', unit_type = 'Treehouse', quantity_of_units = 6,
  unit_capacity = '2-4', unit_bed = 'Varies by house',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Six unique named treehouses lumped.',
  minimum_nights = '2',
  unit_description = $$Treehouse (qty 6): Six unique living-room.co treehouses. Lumped — do not invent a 7th.$$,
  amenities_raw = 'Treehouse; wood stove; lush interiors. Operator does not publish Wi-Fi.',
  rate_winter_weekday = '300', rate_winter_weekend = '300',
  rate_spring_weekday = '300', rate_spring_weekend = '300',
  rate_summer_weekday = '300', rate_summer_weekend = '300',
  rate_fall_weekday = '300', rate_fall_weekend = '300',
  rate_unit_rates_by_year = jsonb_build_object('2026', jsonb_build_object('note', 'GBP room_only. No operator from-rate; stub 300 kept as unconfirmed sample.')),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published Treehouse qty 6 from living-room.co. rate_basis unknown → room_only.'
WHERE id = 11284 AND property_id = '1ebfd341-c24b-49dc-b230-884545fc2c77';

-- Lanrick
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'The Treehouse at Lanrick', slug = 'treehouses-at-lanrick-doune',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_lanrick_treehouses_2026_09',
  address = 'Lanrick', city = 'Doune', state = 'Stirlingshire',
  zip_code = 'FK16 6HJ', country = 'United Kingdom',
  lat = 56.2049, lon = -4.05,
  url = 'https://www.lanricktreehouses.co.uk/', phone_number = '+44-1786-842707',
  property_total_sites = 5, year_site_opened = 2020,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Five Mallett-designed treehouses (Willow Warbler, Flycatcher, Pipit, Treecreeper, Nuthatch) on the River Teith. Two linked by a rope bridge. Keeper''s Bothy is not a 6th sleeping SKU. No dogs (sister Leckie is dog-friendly). No Wi-Fi.',
  rate_basis = 'room_only',
  rate_basis_notes = 'GBP. Self-cater; farm-shop meals extra. Child sofa-bed surcharge £40/stay. No published static ADR — stub 350 retained as unconfirmed sample. No dogs. miranda@lanrick.co.uk / +44 1786 842707.',
  description = $$Five luxury treehouses at Lanrick, Doune FK16 6HJ (56.2049, -4.05), on the River Teith near the Trossachs. Hot tub / outdoor bathing, wood stove, self-cater. No dogs, no Wi-Fi. Not a castle hotel.$$,
  activities_raw = 'On-site: woodland/river walks, fishing, hot tub, BBQ. Nearby: Doune Castle, Trossachs, Stirling.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11286 AND property_id = 'a5593883-eb00-4c3a-8bb0-4662d38749aa';

UPDATE public.all_sage_data
SET
  site_name = 'Treehouse', unit_type = 'Treehouse', quantity_of_units = 5,
  unit_capacity = '2-4', unit_bed = '1 Super King + sofa bed',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round. Five bird-named treehouses. Keeper''s Bothy not counted as a 6th unit.',
  minimum_nights = '2',
  unit_description = $$Treehouse (qty 5): Willow Warbler, Flycatcher, Pipit, Treecreeper, Nuthatch. Super king + child sofa bed. Hot tub / outdoor bath, wood stove, BBQ. No dogs. Do not add Bothy as a 6th house.$$,
  amenities_raw = 'Treehouse; super king; kitchenette; hot tub; wood stove; BBQ. No Wi-Fi. No dogs.',
  rate_winter_weekday = '350', rate_winter_weekend = '350',
  rate_spring_weekday = '350', rate_spring_weekend = '350',
  rate_summer_weekday = '350', rate_summer_weekend = '350',
  rate_fall_weekday = '350', rate_fall_weekend = '350',
  rate_unit_rates_by_year = jsonb_build_object('2026', jsonb_build_object('note', 'GBP room_only. No operator from-rate; stub 350 unconfirmed sample. URL lanricktreehouses.co.uk (plural).')),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published Treehouse qty 5 from lanricktreehouses.co.uk. URL corrected from lanricktreehouse.co.uk. rate_basis unknown → room_only.'
WHERE id = 11286 AND property_id = 'a5593883-eb00-4c3a-8bb0-4662d38749aa';

COMMIT;
