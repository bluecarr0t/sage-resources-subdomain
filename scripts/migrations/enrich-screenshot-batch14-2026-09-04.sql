-- Official named inventory / rates. Never write rate_avg_retail_daily_rate.

BEGIN;

-- ============================================================================
-- Domaine des Constellations — 5 domes + 4 mini-chalets (BQ 9). Two sibling rows.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Domaine des Constellations', slug = 'domaine-des-constellations',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_domaine_des_constellations_2026_09',
  address = '460 Rang 1 Price', city = 'Lac-aux-Sables', state = 'QC',
  zip_code = 'G0X 1M0', country = 'Canada',
  lat = 46.8402173, lon = -72.4035931,
  url = 'https://domainedc.ca/en', phone_number = '418-806-2186',
  property_total_sites = 9, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Domaine des Constellations (Stéphanie Gagné / Élie Couture), 460 Rang 1 Price, Lac-aux-Sables G0X 1M0. 418-806-2186, info@domainedc.ca. Press/Espaces: first phase 5 four-season domes + 4 mini-chalets. Bonjour Québec establishment 313511: 9 cottage/tiny-house units. Riverside chalets Le Phoenix and Le Orion unpublished. 2026 Lac des Perséides couple mirror-domes / micro-chalets count unpublished. Operator map pin 46.8402173 / -72.4035931. Sage Mirror Dome 6 / 250 and Micro Cabin 333 invented.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Dynamic domainedc.ca calendar. Do not store Sage 250/277 or 333/368. Orion/Phoenix EUR listing-page from-rates are a different SKU — not stored on these rows.',
  description = $$Domaine des Constellations, 460 Rang 1 Price, Lac-aux-Sables QC G0X 1M0. Official first-phase 5 domes and 4 mini-chalets on the Batiscan. Riverside chalets and 2026 lake expansion unpublished.$$,
  activities_raw = 'On-site: Batiscan kayak/canoe/SUP, 5 km fat-bike trail, private spas. Nearby: Lac-aux-Sables, Mauricie.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE property_id = 'bf946b60-44d0-42fe-98a5-0989e30a08db'
  AND id IN (13020, 13021);

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 5,
  unit_capacity = '4', unit_bed = '2 Queen',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round. This row is official first-phase 5 four-season domes. 2026 couple mirror-domes unpublished. Do not store Mirror Dome qty 6.',
  minimum_nights = '1',
  unit_description = $$Dome (qty 5): official first-phase 4-season domes with two queens, full kitchen, ensuite and private spa. New Lac des Perséides couple mirror-domes unpublished.$$,
  amenities_raw = 'Four-season dome; ensuite; kitchen; private spa; river view typical.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD room_only. Calendar only. Do not store Sage 250/277 or Mirror Dome 6.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official first-phase 5 domes. This row is Dome qty 5. 2026 couple mirror-domes unpublished. Cleared invented 6 / 250.'
WHERE id = 13020 AND property_id = 'bf946b60-44d0-42fe-98a5-0989e30a08db';

UPDATE public.all_sage_data
SET
  site_name = 'Cabin', unit_type = 'Cabin', quantity_of_units = 4,
  unit_capacity = '4', unit_bed = '2 Queen',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round. This row is official 4 mini-chalets. Riverside Phoenix + Orion unpublished. Do not invent a 5th mini-chalet.',
  minimum_nights = '1',
  unit_description = $$Cabin (qty 4): official mini-chalets with two queens, kitchen, ensuite and private spa. Riverside chalets unpublished.$$,
  amenities_raw = 'Mini-chalet; ensuite; kitchen; private spa.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD room_only. Calendar only. Do not store Sage 333/368.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 4 mini-chalets. Phoenix/Orion unpublished. Cleared invented 333.'
WHERE id = 13021 AND property_id = 'bf946b60-44d0-42fe-98a5-0989e30a08db';

-- ============================================================================
-- Mojave Country Club — official 4 bell tents.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Mojave Country Club', slug = 'mojave-country-club-twentynine-palms-ca',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_mojave_country_club_2026_09',
  address = NULL, city = 'Twentynine Palms', state = 'CA',
  zip_code = '92277', country = 'United States',
  lat = 34.206361, lon = -116.01817,
  url = 'https://mojavecountryclub.com/', phone_number = NULL,
  property_total_sites = 4, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Mojave Country Club, ~5 acres near Twentynine Palms / 10 min to Joshua Tree NP north entrance. Operator: 4 furnished bell tents with private firepit gazebo and picnic table, plus free-range tenting (pitch count unpublished) and a clubhouse (full kitchen, 2 bathrooms, Wi-Fi). Dog-friendly. Street and phone unpublished on mojavecountryclub.com. Existing pin kept. Sage 41/46 invented.',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD. Hipcamp / operator calendar only. Do not store Sage 41/46.',
  description = $$Mojave Country Club, Twentynine Palms CA 92277. Official four furnished bell tents plus unpublished free-range tenting, ~10 minutes from Joshua Tree. Street unpublished.$$,
  activities_raw = 'On-site: clubhouse, hot tub, driving range, stargazing. Nearby: Joshua Tree National Park.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11575 AND property_id = 'bf60f7ad-2fc9-4ce9-bfbd-4cd25bac3fd5';

UPDATE public.all_sage_data
SET
  site_name = 'Bell Tent', unit_type = 'Bell Tent', quantity_of_units = 4,
  unit_capacity = '2-4', unit_bed = '2 Queen',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'No',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. This row is official 4 bell tents. Free-range tenting unpublished. Do not invent a 5th tent.',
  minimum_nights = '1',
  unit_description = $$Bell Tent (qty 4): official furnished 16' tents with two queens, solar lights/outlets, private firepit gazebo. Shared clubhouse bathrooms and kitchen.$$,
  amenities_raw = 'Furnished bell tent; shared clubhouse kitchen and 2 bathrooms; private firepit gazebo; picnic table.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'USD room_only. Calendar only. Do not store Sage 41/46.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 4 bell tents. Rates unpublished. Cleared invented 41/46.'
WHERE id = 11575 AND property_id = 'bf60f7ad-2fc9-4ce9-bfbd-4cd25bac3fd5';

-- ============================================================================
-- Hidden Springs — 2 guesthouse suites + 3 named seasonal canvas tents.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Hidden Springs Retreat & Guesthouse', slug = 'hidden-springs-retreat-guesthouse',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_hidden_springs_2026_09',
  address = '462046 Range Road 32', city = 'Wetaskiwin County 10', state = 'AB',
  zip_code = 'T0C 2T0', country = 'Canada',
  lat = 52.9805793, lon = -113.8701825,
  url = 'https://www.hiddensprings.ca/', phone_number = '780-898-8054',
  property_total_sites = 5, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Hidden Springs, 160 acres east of Winfield: 2 self-contained guesthouse suites (upper + lower) plus seasonal furnished canvas tents Chickadee / Star Gazer / Blue Moon = 5 lodging. 462046 Range Road 32, T0C 2T0. 780-898-8054, info@hiddensprings.ca. Finnish sauna, 5 km trails. Sage Cabin qty 8 invented (Hipcamp pitch mix, not 8 cabins).',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Official suites $185/night double occupancy. Canvas tents $100 Chickadee / $75 Star Gazer & Blue Moon May–Oct unpublished on this row. Stored 185 as official suite from-rate. Do not store Sage 185/205 weekend invent.',
  description = $$Hidden Springs Retreat & Guesthouse, 462046 Range Road 32, Wetaskiwin County 10 AB T0C 2T0. Official two guesthouse suites plus three seasonal canvas tents on 160 acres.$$,
  activities_raw = 'On-site: 5 km trails, pond, Finnish sauna, garden. Nearby: Winfield, Wetaskiwin County.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11455 AND property_id = 'd0ca520e-f493-4a06-881d-9236cacdd1bf';

UPDATE public.all_sage_data
SET
  site_name = 'Cabin', unit_type = 'Cabin', quantity_of_units = 2,
  unit_capacity = '4-6', unit_bed = 'Queen',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round guesthouse. This row is official 2 suites. 3 seasonal canvas tents unpublished. Do not store Cabin qty 8.',
  minimum_nights = '1',
  unit_description = $$Cabin (qty 2): official Upper Suite (full kitchen, wood stove, sleeps 4) and Lower Suite (kitchenette, sleeps 6). Canvas tents unpublished.$$,
  amenities_raw = 'Self-contained suite; kitchen or kitchenette; ensuite typical; shared Finnish sauna and trails.',
  rate_summer_weekday = '185', rate_summer_weekend = '185',
  rate_winter_weekday = '185', rate_winter_weekend = '185',
  rate_spring_weekday = '185', rate_spring_weekend = '185',
  rate_fall_weekday = '185', rate_fall_weekend = '185',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 185, 'weekend', 185),
      'spring', jsonb_build_object('weekday', 185, 'weekend', 185),
      'summer', jsonb_build_object('weekday', 185, 'weekend', 185),
      'fall', jsonb_build_object('weekday', 185, 'weekend', 185),
      'note', 'CAD room_only. Official suite $185 double occupancy. Tent $75–100 unpublished. Do not store Sage weekend 205 or Cabin 8.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 2 suites + 3 seasonal tents. This row is Cabin/suite qty 2 at CAD 185. Cleared invented Cabin 8.'
WHERE id = 11455 AND property_id = 'd0ca520e-f493-4a06-881d-9236cacdd1bf';

-- ============================================================================
-- Inside Out Camping — official 6 yurts at Seatoller Farm (not Hollows).
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Inside Out Camping', slug = 'inside-out-camping',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_inside_out_camping_2026_09',
  address = 'Seatoller Farm', city = 'Seatoller', state = 'Cumbria',
  zip_code = 'CA12 5XN', country = 'United Kingdom',
  lat = NULL, lon = NULL,
  url = 'https://insideoutcamping.co.uk/', phone_number = '+44-7791-184271',
  property_total_sites = 6, year_site_opened = NULL,
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
  glamping_service_tier_notes = 'Official Inside Out Camping: 6 × 16ft yurts on Seatoller Farm campsite, Borrowdale, CA12 5XN (Keswick.org / operator useful-info). Shared farm toilets/showers; no campsite electricity. Sage Hollows Farm Grange CA12 5UQ / +44 17687 77216 / Safari Tent is the old listing, not current. Listing phone 07791 184271 / simon@insideoutcamping.co.uk. Hollows GPS cleared.',
  rate_basis = 'room_only',
  rate_basis_notes = 'GBP. Calendar / enquiry only. Do not store Sage 150.',
  description = $$Inside Out Camping, Seatoller Farm, CA12 5XN, Borrowdale. Official six 16ft yurts on a working hill-farm campsite. Not Hollows Farm. No operator pin published.$$,
  activities_raw = 'On-site: Borrowdale walks. Nearby: Keswick, Derwent Water, Honister, Scafell.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11255 AND property_id = '9c2af0e9-48ee-40b0-b0a4-6b2c5bc4fad1';

UPDATE public.all_sage_data
SET
  site_name = 'Yurt', unit_type = 'Yurt', quantity_of_units = 6,
  unit_capacity = '5', unit_bed = 'Futons',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'Yes', unit_electricity = 'No', unit_water = 'No',
  unit_campfires = 'Yes', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal typical. This row is official 6 yurts. Farm tent pitches unpublished (farm-run). Do not store Safari Tent.',
  minimum_nights = '1',
  unit_description = $$Yurt (qty 6): official 16ft yurts with wood stove, double + two single futons (5th on airbed). Shared farm toilets and showers. No electricity.$$,
  amenities_raw = '16ft yurt; wood stove; futons; lockable door; shared toilets/showers across the road at the farm.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'GBP room_only. Enquiry/calendar. Do not store Sage 150 or Safari Tent.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Relocated from Hollows Farm stub to Seatoller Farm. Official Yurt qty 6. Cleared invented Safari Tent / 150 / Hollows GPS.'
WHERE id = 11255 AND property_id = '9c2af0e9-48ee-40b0-b0a4-6b2c5bc4fad1';

-- ============================================================================
-- Secret Sanctuary — 1 tiny cabin + 3 named glamping tents. Not 12 cabins.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'The Secret Sanctuary', slug = 'the-secret-sanctuary',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_secret_sanctuary_2026_09',
  address = '463049 Range Road 22', city = 'Westerose', state = 'AB',
  zip_code = 'T0C 2V0', country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://www.secretsanctuary.ca/', phone_number = '519-330-8477',
  property_total_sites = 4, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'rustic', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Secret Sanctuary Retreat, 463049 Range Road 22, Westerose AB T0C 2V0 (80-acre homestead near Battle/Pigeon Lake). Operator: Tiny Home Cabin + Birch + Aspen couple tents + Wild Rose family tent = 4 lodging. BYO tent/RV unpublished. Official contact 519-330-8477, relax@secretsanctuary.ca. Travel Alberta listing. Sage Cabin 12 / Wetaskiwin pin / 95 invented. Existing city Wetaskiwin corrected to Westerose.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Calendar only. Edify “from $85” is an older article — not stored. Do not store Sage 95/105.',
  description = $$The Secret Sanctuary, 463049 Range Road 22, Westerose AB T0C 2V0. Official one tiny-home cabin and three named glamping tents on an 80-acre homestead. Not 12 cabins. No operator pin published.$$,
  activities_raw = 'On-site: forest trails, homestead, playground, fire pits. Nearby: Battle Lake, Pigeon Lake, Wetaskiwin.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'Yes', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11453 AND property_id = '7bc3e819-a3b9-4c02-8d49-9a370e47667d';

UPDATE public.all_sage_data
SET
  site_name = 'Cabin', unit_type = 'Cabin', quantity_of_units = 1,
  unit_capacity = '6', unit_bed = 'Double + loft',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'Yes', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Tiny home year-round typical; tents seasonal. This row is official 1 Tiny Home Cabin. Birch, Aspen and Wild Rose unpublished. Do not store Cabin qty 12.',
  minimum_nights = '1',
  unit_description = $$Cabin (qty 1): official one-room tiny home with double, futon and two loft singles, kitchenette, private fire pit and composting outhouse. Three named tents unpublished.$$,
  amenities_raw = 'Tiny cabin; kitchenette; TV; private fire pit; BBQ; composting toilet; playground nearby.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD room_only. Calendar only. Do not store Sage 95/105 or Cabin 12.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 4 lodging units. This row is Cabin qty 1. Tents unpublished. Cleared invented Cabin 12 / 95. Relocated city to Westerose.'
WHERE id = 11453 AND property_id = '7bc3e819-a3b9-4c02-8d49-9a370e47667d';

COMMIT;
