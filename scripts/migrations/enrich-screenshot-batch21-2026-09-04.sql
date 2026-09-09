-- Official named inventory / rates. Never write rate_avg_retail_daily_rate.

BEGIN;

-- ============================================================================
-- Loch Ken Eco Bothies — official 4 bothies. Weekly lets; no nightly from-rate.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Loch Ken Eco Bothies', slug = 'loch-ken-eco-bothies',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_loch_ken_eco_bothies_2026_09',
  address = 'Parton', city = 'Castle Douglas', state = 'Dumfries and Galloway',
  zip_code = 'DG7 3NQ', country = 'United Kingdom',
  url = 'https://lochkenecobothies.co.uk/', phone_number = '+44 1556 502011',
  property_total_sites = 4, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Loch Ken Eco Bothies, Parton, Castle Douglas DG7 3NQ. Phone 01556 502011 (Sage +44 1644 420646 stale). Official four: Red Kite, Red Squirrel, Otter eco yurt, Osprey. Each with wood-fired hot tub and kayak. Sage Cabin / 3 / 150 incomplete.',
  rate_basis = 'room_only',
  rate_basis_notes = 'GBP. Official 3-day weekend / 4-day midweek / 7-day week lets. Directory from £805/week is not a nightly from-rate. Do not store Sage 150.',
  description = $$Loch Ken Eco Bothies, Parton, Castle Douglas DG7 3NQ, Galloway UNESCO Biosphere. Official four off-grid bothies on Loch Ken.$$,
  activities_raw = 'On-site: kayak, loch access, dark skies, hot tubs. Nearby: Galloway Activity Centre, Castle Douglas, Threave.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11244 AND property_id = '52bc56ee-49ad-46c5-8222-ccb3fd9a77e6';

UPDATE public.all_sage_data
SET
  site_name = 'Eco Bothy', unit_type = 'Cabin', quantity_of_units = 4,
  unit_capacity = '2-8', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Official Red Kite, Red Squirrel, Otter yurt, Osprey = 4. Do not store qty 3.',
  minimum_nights = '3',
  unit_description = $$Cabin (qty 4): official four Eco Bothies including Otter eco yurt. Off-grid, wood-fired hot tub, kayak.$$,
  amenities_raw = 'Off-grid bothy; kitchen; ensuite typical; wood-fired hot tub; kayak; dogs welcome.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'GBP room_only. Weekly/short-break calendar. Do not store Sage 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 4 bothies. Phone 01556 502011. Cleared qty 3 / invented 150 / stale 01644.'
WHERE id = 11244 AND property_id = '52bc56ee-49ad-46c5-8222-ccb3fd9a77e6';

-- ============================================================================
-- Roompot Domein Het Camperveer — villas, not yurts.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Roompot Domein Het Camperveer', slug = 'roompot-domein-het-camperveer',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_domein_het_camperveer_2026_09',
  address = 'Camperveer 1', city = 'Kamperland', state = 'Zeeland',
  zip_code = '4493 DK', country = 'Netherlands',
  url = 'https://www.roompot.nl/', phone_number = '+31 113 885 100',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Roompot / Largo Domein Het Camperveer, Camperveer 1, 4493 DK Kamperland. Luxury villas and apartments only — no yurts or pitches. Guests use Roompot Beach Resort amenities 5 km away. Sage Yurt / 20 / +31 113 123456 / 175 invented. Villa count unpublished (directories 15–16). is_glamping_property No.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Roompot calendar only. Do not store Sage 175.',
  description = $$Roompot Domein Het Camperveer, Camperveer 1, 4493 DK Kamperland, Veerse Meer. Official villa/apartment holiday estate. Not a yurt camp.$$,
  activities_raw = 'On-site: Veerse Meer watersports nearby. Amenities at Roompot Beach Resort 5 km. Nearby: Kamperland, Veere, Middelburg.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11088 AND property_id = '0613c659-3707-4eae-aa0c-5d18e25dca99';

UPDATE public.all_sage_data
SET
  site_name = 'Holiday Villa', unit_type = 'Lodge', quantity_of_units = NULL,
  unit_capacity = '4-8', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Official villa/apartment mix unpublished. Do not store Yurt / 20.',
  minimum_nights = NULL,
  unit_description = $$Lodge (qty unpublished): official Roompot villas and Villa Helena apartments. Not yurts.$$,
  amenities_raw = 'Villa/apartment; full kitchen; wifi; terrace. No on-site park facilities.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Roompot calendar. Do not store Sage 175.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Roompot Domein Het Camperveer. Villas unpublished. Cleared Yurt / 20 / 175 / fake 113 123456. is_glamping_property No.'
WHERE id = 11088 AND property_id = '0613c659-3707-4eae-aa0c-5d18e25dca99';

-- ============================================================================
-- Sunnd Eco Resort — official 2 named domes. Breakfast included.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Sunnd Eco Resort', slug = 'sunnd-eco-resort',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_sunnd_eco_resort_2026_09',
  address = '14904 Highway 17 North', city = 'Batchawana Bay', state = 'ON',
  zip_code = 'P0S 1A0', country = 'Canada',
  url = 'https://www.sunndecoresort.com/', phone_number = '+1 506-588-6280',
  property_total_sites = 2, year_site_opened = NULL,
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
  glamping_service_tier_notes = 'Official Sunnd Nordic Eco Resort, 14904 Highway 17 North, Batchawana Bay P0S 1A0. Phone 506-588-6280. Official Valoa 20ft (2 guests) and Rauhaa 26ft (2–4). Third accessible dome mentioned as under construction — not stored. Breakfast foods included. Sage 350 invented.',
  rate_basis = 'breakfast',
  rate_basis_notes = 'CAD. Official breakfast foods included. Calendar / pitch-comp $249 is not a current official from-rate. Do not store Sage 350.',
  description = $$Sunnd Eco Resort, 14904 Highway 17 North, Batchawana Bay, ON. Official two Nordic geodesic domes with wood-fired hot tubs near Pancake Bay / Lake Superior.$$,
  activities_raw = 'On-site: private lake, wood-fired hot tubs, forest. Nearby: Pancake Bay, Lake Superior, Batchawana.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13067 AND property_id = '18db49d4-1886-4221-9942-f551e6921fa7';

UPDATE public.all_sage_data
SET
  site_name = 'Geodesic Dome', unit_type = 'Dome', quantity_of_units = 2,
  unit_capacity = '2-4', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Seasonal typical. Official Valoa + Rauhaa = 2. Third dome unpublished until open.',
  minimum_nights = NULL,
  unit_description = $$Dome (qty 2): official Valoa (20 ft) and Rauhaa (26 ft) with private wood-fired hot tubs.$$,
  amenities_raw = 'Geodesic dome; ensuite typical; kitchenette; wood-fired hot tub; breakfast foods; wifi.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD breakfast. Calendar only. Do not store Sage 350.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 2 named domes at 14904 Hwy 17 N. Cleared invented 350.'
WHERE id = 13067 AND property_id = '18db49d4-1886-4221-9942-f551e6921fa7';

-- ============================================================================
-- TCS Camping Samedan — official 60 pitches. Renovation closed until spring 2027.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'TCS Camping Samedan', slug = 'tcs-camping-samedan',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_tcs_camping_samedan_2026_09',
  address = 'Via da Bernina 2', city = 'Samedan', state = 'Graubünden',
  zip_code = '7503', country = 'Switzerland',
  url = 'https://camping.tcs.ch/en/campsites/tcs-camping-samedan/',
  phone_number = '+41 81 842 81 97',
  lat = 46.5100, lon = 9.8789,
  property_total_sites = 60, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'Yes', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official TCS Camping Samedan, Via da Bernina 2, 7503 Samedan. Official 60 pitches + 1 rental caravan. Phone +41 81 842 81 97 (Sage +41 81 852 46 26 / Via Nouva 3 stale). Official GPS 46°30''36"N 9°52''44"E. Closed 1 Sept 2026–spring 2027 for renovation; reception reopens 28 May 2027. Sage Safari Tent / 250 invented. is_glamping_property No.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CHF. TCS booking calendar only. Do not store Sage 250/280.',
  description = $$TCS Camping Samedan, Via da Bernina 2, 7503 Samedan, Upper Engadin. Official 60 pitches. Temporarily closed for renovation until spring 2027.$$,
  activities_raw = 'On-site: Flazbach, winter camping, wifi. Nearby: Engadin ski areas, Muottas Muragl, Samedan.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11234 AND property_id = '18663e5b-a4f0-43e8-aa1b-9e380bd9dbc3';

UPDATE public.all_sage_data
SET
  site_name = 'Tourist Pitch', unit_type = 'Campsite', quantity_of_units = 60,
  unit_capacity = '5', unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Closed 1 Sept 2026–spring 2027 (renovation). Official 60 pitches. One rental caravan unpublished. Do not store Safari Tent.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty 60): official TCS standard / premium / tent pitches. Rental caravan unpublished.$$,
  amenities_raw = 'Pitch; electricity; wifi; kiosk; winter camping when open.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CHF room_only. TCS calendar. Closed for renovation until 2027. Do not store Sage 250.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official Via da Bernina 2 / +41 81 842 81 97 / 60 pitches. Cleared Safari Tent / 250 / Via Nouva 3. Renovation close until spring 2027.'
WHERE id = 11234 AND property_id = '18663e5b-a4f0-43e8-aa1b-9e380bd9dbc3';

-- ============================================================================
-- wecamp Cádiz — Dehesa de las Yeguas. SKU split unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'wecamp Cádiz', slug = 'wecamp-cadiz',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_wecamp_cadiz_2026_09',
  address = 'Carretera del Portal CA-3113 km 3,7 Buzón 54', city = 'Puerto Real',
  state = 'Andalusia', zip_code = '11510', country = 'Spain',
  url = 'https://wecamp.net/en/locations/cadiz', phone_number = '+34 936 268 900',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official wecamp Cádiz in Dehesa de las Yeguas / Bay of Cádiz Natural Park. Phone +34 936 268 900 (Sage +34 956 123456 invented). Lodge tents and wooden cabins — Puerto Real municipal visit cited 72 (53 tents + 19 cabins) at expansion; current SKU split unpublished. Sage Safari Tent / 5 / 150 invented.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. wecamp calendar only. Do not store Sage 150.',
  description = $$wecamp Cádiz, Carretera del Portal CA-3113, 11510 Puerto Real, Dehesa de las Yeguas. Official glamping eco-resort. Tent and cabin counts unpublished.$$,
  activities_raw = 'On-site: pool, restaurant, pine forest. Nearby: Cádiz, Costa de la Luz beaches, Puerto Real.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11180 AND property_id = '4ffcbfef-e6db-43b4-b481-aa57a3a45cda';

UPDATE public.all_sage_data
SET
  site_name = 'Lodge Tent', unit_type = 'Safari Tent', quantity_of_units = NULL,
  unit_capacity = '2-4', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Typical late March–mid October. Official tent/cabin split unpublished. Do not store qty 5.',
  minimum_nights = NULL,
  unit_description = $$Safari Tent (qty unpublished): official wecamp lodge tents. Wooden cabins unpublished.$$,
  amenities_raw = 'Lodge tent; ensuite; A/C; terrace; pool; restaurant.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. wecamp calendar. Do not store Sage 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as wecamp Cádiz. SKU split unpublished. Cleared fake 956 123456 / qty 5 / 150.'
WHERE id = 11180 AND property_id = '4ffcbfef-e6db-43b4-b481-aa57a3a45cda';

-- ============================================================================
-- Flora Bora — official 3 named yurts. CAD 196 / 223 / 242.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Flora Bora', slug = 'flora-bora',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_flora_bora_2026_09',
  address = 'RR#1 Site 7 Comp 14', city = 'Christopher Lake', state = 'SK',
  zip_code = 'S0J 0N0', country = 'Canada',
  url = 'https://www.florabora.ca/', phone_number = '+1 306-961-9554',
  property_total_sites = 3, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'No',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Flora Bora Forest Lodging, RR#1 Site 7 Comp 14, Christopher Lake SK. Official Lily, Otter, Fern yurts (452 sq ft each), ensuite + kitchen. Official high $242 / mid $223 / low $196 CAD double occupancy. Sage flat 200 flattened.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Official high season (Jul–Aug) $242, mid (Jun/Sep + weekends) $223, low (May/Oct Sun–Thu) $196. Stored 242 summer / 223 spring+fall / 196 winter. 2-night minimum. Do not store Sage flat 200.',
  description = $$Flora Bora, Christopher Lake, SK, 30 acres beside Tuddles Lake near Prince Albert National Park. Official three ensuite yurts.$$,
  activities_raw = 'On-site: Tuddles Lake paddling, forest trails, fire pits. Nearby: Prince Albert National Park, Christopher Lake.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13049 AND property_id = 'a41c24b6-dee1-4068-afb5-1cd6453f0927';

UPDATE public.all_sage_data
SET
  site_name = 'Yurt', unit_type = 'Yurt', quantity_of_units = 3,
  unit_capacity = '4', unit_bed = 'Queen + sofa bed',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'May–October typical. Official Lily + Otter + Fern = 3.',
  minimum_nights = '2',
  unit_description = $$Yurt (qty 3): official Lily, Otter and Fern. Ensuite, full kitchen, deck, fire pit.$$,
  amenities_raw = 'Yurt 452 sq ft; ensuite; kitchen; BBQ; fire pit; lake.',
  rate_summer_weekday = '242', rate_summer_weekend = '242',
  rate_winter_weekday = '196', rate_winter_weekend = '196',
  rate_spring_weekday = '223', rate_spring_weekend = '223',
  rate_fall_weekday = '223', rate_fall_weekend = '223',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 196, 'weekend', 196),
      'spring', jsonb_build_object('weekday', 223, 'weekend', 223),
      'summer', jsonb_build_object('weekday', 242, 'weekend', 242),
      'fall', jsonb_build_object('weekday', 223, 'weekend', 223),
      'note', 'CAD room_only. Official low 196 / mid 223 / high 242. Do not store Sage 200.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 3 named yurts. Stored 196/223/242. Cleared flat 200.'
WHERE id = 13049 AND property_id = 'a41c24b6-dee1-4068-afb5-1cd6453f0927';

-- ============================================================================
-- Fforest — official 5 Domes + 4 Onsen Domes = 9. Other SKUs unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Fforest', slug = 'fforest',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_fforest_2026_09',
  address = 'Cwm Plysgog, Cilgerran', city = 'Cilgerran', state = 'Ceredigion',
  zip_code = 'SA43 2TB', country = 'United Kingdom',
  url = 'https://www.coldatnight.co.uk/fforest-farm', phone_number = '+44 1239 623633',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official fforest farm, Cwm Plysgog, Cilgerran SA43 2TB. HQ +44 1239 623633. Official wedding inventory: 5 Domes + 4 Onsen Domes = 9. Ty Fforest, crog lofts, Hill/Garden Shacs unpublished. Sage Dome / 25 / 200 invented.',
  rate_basis = 'room_only',
  rate_basis_notes = 'GBP. Official calendar / two-night guest minimums. Do not store Sage 200.',
  description = $$Fforest farm, Cwm Plysgog, Cilgerran SA43 2TB, 200 acres by the Teifi gorge. Official 9 geodesic / onsen domes plus unpublished farmhouse and shacs.$$,
  activities_raw = 'On-site: lodge, food, woodland. Nearby: Cilgerran Castle, Cardigan, Teifi Marshes, Pembrokeshire coast.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11296 AND property_id = '4090c8be-ac8a-436d-a2b7-44a2ed3eb66b';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 9,
  unit_capacity = '4', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal / event calendar. Official 5 Domes + 4 Onsen Domes = 9. Farmhouse and shacs unpublished. Do not store qty 25.',
  minimum_nights = '2',
  unit_description = $$Dome (qty 9): official 5 geodesic Domes plus 4 Onsen Domes. Other fforest SKUs unpublished.$$,
  amenities_raw = 'Geodesic / onsen dome; farm lodge nearby; shared or ensuite depending on type.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'GBP room_only. Official calendar. Do not store Sage 200.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 9 domes at Cilgerran. Cleared invented 25 / 200.'
WHERE id = 11296 AND property_id = '4090c8be-ac8a-436d-a2b7-44a2ed3eb66b';

-- ============================================================================
-- Campingplatz am Nordseestrand — relocate Neuharlingersiel ghost city to Dornumersiel.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Campingplatz am Nordseestrand', slug = 'campingplatz-am-nordseestrand',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_campingplatz_am_nordseestrand_2026_09',
  address = 'Am Nordseestrand 1', city = 'Dornumersiel', state = 'Lower Saxony',
  zip_code = '26553', country = 'Germany',
  url = 'https://www.campingplatz-am-nordseestrand.de', phone_number = '+49 4933 351',
  lat = NULL, lon = NULL,
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'other_public',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Campingplatz am Nordseestrand, Am Nordseestrand 1, 26553 Dornum-Dornumersiel (Tourismus GmbH Gemeinde Dornum). Phone +49 4933 351. Sage Neuharlingersiel / Nordseestraße 2 / +49 4464 123456 is the wrong village plus a fake phone — that is Nordsee-Camping Neuharlingersiel at Alt Addenhausen 4. Do not merge Neuharlingersiel. Official 200 tourist caravan + 60 tent + 100 permanent + 7 pipowagens / 2 NordseeKarren — per-SKU unpublished. Safari Tent / 150 invented.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Official period listino / calendar. Do not store Sage 150.',
  description = $$Campingplatz am Nordseestrand, Am Nordseestrand 1, Dornumersiel. Official municipal Wattenmeer beach camp. Pitch counts unpublished.$$,
  activities_raw = 'On-site: beach, heated seawater pool included in season, playground. Nearby: Dornumersiel harbour, Wattenmeer.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11022 AND property_id = '2fd0b6bd-1d8f-4c8c-b2b4-36ec91021e92';

UPDATE public.all_sage_data
SET
  site_name = 'Tourist Pitch', unit_type = 'Campsite', quantity_of_units = NULL,
  unit_capacity = NULL, unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'Yes', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Typical late March–early October (dike foreshore). Official pitch split unpublished. 7 pipowagens unpublished. Do not store Safari Tent.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty unpublished): official Dornumersiel beach pitches. Pipowagens unpublished.$$,
  amenities_raw = 'Pitch; electricity; seawater pool included in season; modern sanitary.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Official calendar. Do not store Sage 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published and relocated to Dornumersiel (name match). Cleared Neuharlingersiel GPS / fake 04464 123456 / Safari Tent. Do not merge Nordsee-Camping Neuharlingersiel.'
WHERE id = 11022 AND property_id = '2fd0b6bd-1d8f-4c8c-b2b4-36ec91021e92';

-- ============================================================================
-- Strandcamping Groede — official 3 Dunetenten (W41/W43/W45).
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Strandcamping Groede', slug = 'strandcamping-groede',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_strandcamping_groede_2026_09',
  address = 'Zeeweg 1', city = 'Groede', state = 'Zeeland',
  zip_code = '4503 PA', country = 'Netherlands',
  url = 'https://www.strandcampinggroede.nl/', phone_number = '+31 117 371 384',
  lat = NULL, lon = NULL,
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Strandcamping Groede, Zeeweg 1, 4503 PA Groede. Reception +31 117 371 384 (Sage Nieuwesluisweg 44 / +31 117 371 691 stale). Official Dunetenten at pitches W41, W43, W45 = 3. Chalets, Vliegerlodge, panoramahuisjes and tourist pitches unpublished. Sage Safari Tent / 20 / 150 invented.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Official booking calendar. Do not store Sage 150.',
  description = $$Strandcamping Groede, Zeeweg 1, 4503 PA Groede, Zeeuws-Vlaanderen beach. Official 3 Dunetenten. Pitch and chalet counts unpublished.$$,
  activities_raw = 'On-site: beach, indoor pool, playground, shop, restaurant. Nearby: Groede, Zeeuws-Vlaanderen coast.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11086 AND property_id = '3f48fa0e-9e3b-4de9-8a98-1afd1f0ac237';

UPDATE public.all_sage_data
SET
  site_name = 'Dunetent', unit_type = 'Safari Tent', quantity_of_units = 3,
  unit_capacity = '4', unit_bed = 'Double + twins',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal Zeeland calendar. Official Dunetenten W41/W43/W45 = 3. Pitches unpublished. Do not store qty 20.',
  minimum_nights = NULL,
  unit_description = $$Safari Tent (qty 3): official Dunetenten at the water. Chalets and pitches unpublished.$$,
  amenities_raw = 'Dunetent; ensuite; kitchenette; A/C; wifi; no pets.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Official calendar. Do not store Sage 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official Zeeweg 1 / +31 117 371 384 / 3 Dunetenten. Cleared Nieuwesluisweg GPS / 20 / 150.'
WHERE id = 11086 AND property_id = '3f48fa0e-9e3b-4de9-8a98-1afd1f0ac237';

-- ============================================================================
-- Camping Aaregg — official 180 tourist pitches.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Camping Aaregg', slug = 'camping-aaregg',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_camping_aaregg_2026_09',
  address = 'Seestrasse 28a', city = 'Brienz', state = 'Bern',
  zip_code = '3855', country = 'Switzerland',
  url = 'https://www.aaregg.ch/', phone_number = '+41 33 951 18 43',
  lat = 46.748641, lon = 8.048280,
  property_total_sites = 180, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Camping Aaregg, Seestrasse 28a, 3855 Brienz. Phone +41 33 951 18 43 (Sage +41 33 951 12 82 / Seestrasse 22 stale). Official 180 tourist + 25 seasonal + 40 annual. Official GPS 46.748641 / 8.048280. Pods, sleeping huts and lakeside villas unpublished. Sage Safari Tent / 5 / 200 invented.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CHF. Official price list / calendar. Do not store Sage 200.',
  description = $$Camping Aaregg, Seestrasse 28a, 3855 Brienz, Lake Brienz. Official 180 tourist pitches. Rental pods and villas unpublished.$$,
  activities_raw = 'On-site: lake swimming, playground, Aareggstube restaurant, shop. Nearby: Brienz, Interlaken, Bernese Oberland.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11224 AND property_id = 'a2d31928-6ee1-4273-a09d-eeba7b607ebf';

UPDATE public.all_sage_data
SET
  site_name = 'Tourist Pitch', unit_type = 'Campsite', quantity_of_units = 180,
  unit_capacity = NULL, unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Typical 1 Apr–24 Oct. This row is official 180 tourist pitches. Pods/huts/villas unpublished. Do not store Safari Tent / 5.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty 180): official standard / royal / lakeside pitches. Rentals unpublished.$$,
  amenities_raw = 'Pitch; electricity; shop; restaurant; lake access.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CHF room_only. Official price list. Do not store Sage 200.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 180 tourist pitches / Seestrasse 28a / +41 33 951 18 43. Cleared Safari Tent / 5 / 200.'
WHERE id = 11224 AND property_id = 'a2d31928-6ee1-4273-a09d-eeba7b607ebf';

-- ============================================================================
-- Cloud House Farm — official 2 yurts.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Cloud House Farm', slug = 'cloud-house-farm',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_cloud_house_farm_2026_09',
  address = 'Finca Casa Nube', city = 'Genalguacil', state = 'Andalusia',
  zip_code = '29492', country = 'Spain',
  url = 'https://www.cloudhouse.es/', phone_number = '+34 634 384 266',
  property_total_sites = 2, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'rustic', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Cloud House Farm / Finca Casa Nube, Genalguacil 29492. Official two off-grid Mongolian yurts (mountain view + orange grove), each with deck, outdoor kitchen and shower house. Sage Yurt / 3 / 150 invented.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Official from-rate unpublished. Do not store Sage 150.',
  description = $$Cloud House Farm, Finca Casa Nube, Genalguacil, 17-acre off-grid cork-oak farm in the Genal valley. Official two yurts.$$,
  activities_raw = 'On-site: forest, river pools, hammocks. Nearby: Genalguacil, Ronda, Estepona.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11200 AND property_id = 'b51ec382-cba4-42f4-aba1-1009979e9a5a';

UPDATE public.all_sage_data
SET
  site_name = 'Yurt', unit_type = 'Yurt', quantity_of_units = 2,
  unit_capacity = '2', unit_bed = 'Double',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal typical. Official two yurts. Do not store qty 3.',
  minimum_nights = NULL,
  unit_description = $$Yurt (qty 2): official mountain-view and orange-grove yurts with outdoor kitchen and shower house.$$,
  amenities_raw = 'Off-grid yurt; solar; outdoor kitchen; shower house; deck.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Official from-rate unpublished. Do not store Sage 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 2 yurts at Finca Casa Nube. Cleared qty 3 / 150.'
WHERE id = 11200 AND property_id = 'b51ec382-cba4-42f4-aba1-1009979e9a5a';

-- ============================================================================
-- Camping Geversduin — official treehouses; count unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Camping Geversduin', slug = 'camping-geversduin',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_camping_geversduin_2026_09',
  address = 'Beverwijkerstraatweg 205', city = 'Castricum', state = 'North Holland',
  zip_code = '1901 NH', country = 'Netherlands',
  url = 'https://www.campinggeversduin.nl/', phone_number = '+31 251 661 095',
  lat = NULL, lon = NULL,
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Kennemer Duincamping Geversduin, Beverwijkerstraatweg 205, 1901 NH Castricum. Phone +31 251 661 095. Sage Bezoekerscentrum De Hoep / 1901 NZ is the visitor centre, not the camp. Official Boomhuis treehouses exist — count unpublished. Tourist pitches unpublished (ANWB 232 is directory). Sage Treehouse / 20 / 150 invented.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Official booking calendar. Do not store Sage 150.',
  description = $$Camping Geversduin, Beverwijkerstraatweg 205, 1901 NH Castricum, Kennemer dunes. Official family camp with treehouses. Counts unpublished.$$,
  activities_raw = 'On-site: playgrounds, Knoest restaurant, dune forest. Nearby: Castricum beach, Kennemerduinen.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11084 AND property_id = '2ba30282-330e-493e-b57c-43c60b9a5546';

UPDATE public.all_sage_data
SET
  site_name = 'Boomhuis', unit_type = 'Treehouse', quantity_of_units = NULL,
  unit_capacity = '6', unit_bed = 'Double + bunks',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal typical. Official Boomhuis count unpublished. Pitches unpublished. Do not store qty 20.',
  minimum_nights = NULL,
  unit_description = $$Treehouse (qty unpublished): official Geversduin Boomhuis (6 persons). Tourist pitches unpublished.$$,
  amenities_raw = 'Treehouse; kitchen; ensuite; hammock; playgrounds nearby.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Official calendar. Do not store Sage 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official Beverwijkerstraatweg 205. Treehouse count unpublished. Cleared De Hoep / 20 / 150.'
WHERE id = 11084 AND property_id = '2ba30282-330e-493e-b57c-43c60b9a5546';

-- ============================================================================
-- The Quiet Site — official pods from £40. Count unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'The Quiet Site', slug = 'the-quiet-site',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_the_quiet_site_2026_09',
  address = 'Ullswater, Watermillock', city = 'Penrith', state = 'Cumbria',
  zip_code = 'CA11 0LS', country = 'United Kingdom',
  url = 'https://thequietsite.co.uk/', phone_number = '+44 1768 486337',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official The Quiet Site, Ullswater, Watermillock, Penrith CA11 0LS. Phone 01768 486337 (Sage +44 1768 486549 stale). Official camping pods from £40–75/night. Also Gingerbread Houses, Glamping Burrows, Glamping Cabins and pitches — those SKUs unpublished. Sage Pod / 25 / 150 invented.',
  rate_basis = 'room_only',
  rate_basis_notes = 'GBP. Official camping pods from £40/night (up to £75). Stored 40 as official lowest from-rate. Do not store Sage 150.',
  description = $$The Quiet Site, Ullswater, Watermillock, CA11 0LS. Official family camp and glamping park overlooking Ullswater. Pod count unpublished.$$,
  activities_raw = 'On-site: Quiet Bar, Quiet Bite, shared bathrooms, fells. Nearby: Ullswater, Penrith, Lake District.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11252 AND property_id = '7bb90acc-b40e-49d5-abfb-ba735ca1e577';

UPDATE public.all_sage_data
SET
  site_name = 'Camping Pod', unit_type = 'Pod', quantity_of_units = NULL,
  unit_capacity = '2', unit_bed = 'BYO mats',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'No',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Official pod count unpublished. Cabins / burrows / gingerbread / pitches unpublished. Do not store qty 25.',
  minimum_nights = '1',
  unit_description = $$Pod (qty unpublished): official timber camping pods with heater and deck. Other glamping SKUs unpublished.$$,
  amenities_raw = 'Camping pod; heater; power; deck; shared bathrooms; some dog-friendly.',
  rate_summer_weekday = '40', rate_summer_weekend = '40',
  rate_winter_weekday = '40', rate_winter_weekend = '40',
  rate_spring_weekday = '40', rate_spring_weekend = '40',
  rate_fall_weekday = '40', rate_fall_weekend = '40',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 40, 'weekend', 40),
      'spring', jsonb_build_object('weekday', 40, 'weekend', 40),
      'summer', jsonb_build_object('weekday', 40, 'weekend', 40),
      'fall', jsonb_build_object('weekday', 40, 'weekend', 40),
      'note', 'GBP room_only. Official pods from £40 (up to £75). Do not store Sage 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official pods from £40. Phone 01768 486337. Cleared qty 25 / 150 / stale 486549.'
WHERE id = 11252 AND property_id = '7bb90acc-b40e-49d5-abfb-ba735ca1e577';

COMMIT;
