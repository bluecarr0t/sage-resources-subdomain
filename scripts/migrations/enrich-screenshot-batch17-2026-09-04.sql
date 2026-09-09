-- Official named inventory / rates. Never write rate_avg_retail_daily_rate.

BEGIN;

-- ============================================================================
-- Cornish Tipi Holidays — official “around a dozen” tipis; exact qty unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Cornish Tipi Holidays', slug = 'cornish-tipi-holidays',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_cornish_tipi_holidays_2026_09',
  address = 'Tregildrans Quarry, Trelill, St Kew', city = 'Pendoggett', state = 'Cornwall',
  zip_code = 'PL30 3HZ', country = 'United Kingdom',
  url = 'https://www.cornishtipiholidays.co.uk/', phone_number = '+44 1208 880781',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'Yes',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Cornish Tipi Holidays, Tregildrans Quarry, Trelill, St Kew, PL30 3HZ. Office Tregeare, Pendoggett, PL30 3LW. Phone 01208 880781. Official “around a dozen” North American canvas tipis: 8 in Village Field (4 medium + 4 large), remainder on private woodland sites. Camping-directory 19 tipis / 32 meadow pitches conflict with official “around a dozen” — exact totals unpublished. Sage Tipi qty 40 / PL30 3HX / 150 invented.',
  rate_basis = 'room_only',
  rate_basis_notes = 'GBP. Official site does not publish a tipi from-rate. Camping-directory “tipi from £186 for 2 nights” is not stored. Do not store Sage 150.',
  description = $$Cornish Tipi Holidays, Tregildrans Quarry, Trelill, St Kew, Cornwall PL30 3HZ. Woodland-valley tipi and camping site around a spring-fed quarry lake. Official tipi count is “around a dozen,” not Sage 40.$$,
  activities_raw = 'On-site: lake boats, woodland walks. Nearby: Port Isaac, Polzeath, Padstow, Bodmin.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11249 AND property_id = 'e499e62c-653d-44b2-b98f-b90e578b21ff';

UPDATE public.all_sage_data
SET
  site_name = 'Tipi', unit_type = 'Tipi', quantity_of_units = NULL,
  unit_capacity = NULL, unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'No', unit_water = 'No',
  unit_campfires = 'Yes', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal. Official “around a dozen” tipis; exact qty unpublished. Village Field 8 (4 medium + 4 large) + private sites. Do not store Sage 40 or directory 19.',
  minimum_nights = '2',
  unit_description = $$Tipi (qty unpublished): official North American canvas tipis. Exact count unpublished (“around a dozen”). Meadow / campervan pitches unpublished.$$,
  amenities_raw = 'Pre-pitched tipi; shared sanitary; quarry lake; woodland sites.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'GBP room_only. No official tipi from-rate. Do not store Sage 150 or directory £186/2 nights.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official Tregildrans Quarry PL30 3HZ / 01208 880781. Tipi qty unpublished (not 40). Cleared invented 150.'
WHERE id = 11249 AND property_id = 'e499e62c-653d-44b2-b98f-b90e578b21ff';

-- ============================================================================
-- TCS Camping Interlaken — official 90 pitches + 20 unpublished-split rentals.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'TCS Camping Interlaken', slug = 'tcs-camping-interlaken',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_tcs_camping_interlaken_2026_09',
  address = 'Brienzstrasse 24', city = 'Interlaken', state = 'Bern',
  zip_code = '3800', country = 'Switzerland',
  lat = 46.6928, lon = 7.8697,
  url = 'https://camping.tcs.ch/en/campsites/tcs-camping-interlaken/',
  phone_number = '+41 33 822 44 34',
  property_total_sites = 90, year_site_opened = NULL,
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
  glamping_service_tier_notes = 'Official TCS Camping Interlaken: 90 pitches + 20 rentals (bungalow / pod / safari tent / RiverLodge / Molo — per-SKU unpublished). Aare river, Interlaken-Ost. Sage Lindenallee 4 / +41 33 822 44 03 / Safari Tent total 5 / 150 stale or invented. Official Brienzstrasse 24, +41 33 822 44 34, GPS 46°41''34"N 7°52''11"E. PiNCAMP 22 rentals / camping.info 111 total conflict with official 90/20 — not stored.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CHF. TCS calendar only; prices subject to change without taxes. Do not store Sage 150 as pitch ADR.',
  description = $$TCS Camping Interlaken, Brienzstrasse 24, 3800 Interlaken-Ost (46.6928, 7.8697), on the Aare between Lakes Thun and Brienz. Official 90 pitches plus 20 unpublished-split rentals. Not Lindenallee 4.$$,
  activities_raw = 'On-site: Aare swimming, canoe/kayak hire, bike hire, recreation room. Nearby: Interlaken, Harderbahn, Eiger/Mönch/Jungfrau.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'No',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11220 AND property_id = '94d29d1b-f230-4922-b10b-24d88c53ed2e';

UPDATE public.all_sage_data
SET
  site_name = 'Tourist Pitch', unit_type = 'Campsite', quantity_of_units = 90,
  unit_capacity = '5', unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal TCS calendar. Official 90 pitches lumped (premium / standard / tent field). 20 rentals unpublished split — not stored. Do not invent Safari Tent qty 5.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty 90): official TCS pitches for tent / caravan / motorhome. 20 rental units unpublished.$$,
  amenities_raw = 'Pitch; electricity; shared sanitary; wifi; Aare access; playground; restaurant.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CHF room_only. TCS calendar. Do not store Sage 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 90 pitches at Brienzstrasse 24. This row is Tourist Pitch / Campsite qty 90. 20 rentals unpublished. Cleared Lindenallee 4 / Safari Tent / 150.'
WHERE id = 11220 AND property_id = '94d29d1b-f230-4922-b10b-24d88c53ed2e';

-- ============================================================================
-- Les Cabanes de Rensiwez — official 27 couple cabins.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Les Cabanes de Rensiwez', slug = 'les-cabanes-de-rensiwez',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_les_cabanes_de_rensiwez_2026_09',
  address = 'Moulin de Rensiwez 1', city = 'Houffalize', state = 'Wallonia',
  zip_code = '6663', country = 'Belgium',
  url = 'https://www.lescabanesderensiwez.be/', phone_number = '+32 61 28 90 27',
  property_total_sites = NULL, year_site_opened = 2012,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Les Cabanes de Rensiwez SPRL, Moulin de Rensiwez 1, 6663 Houffalize. TVA BE 0848814039. Phone +32 61 28 90 27 (Sage +32 61 28 92 05 stale). Groups page: 27 cabins for 2 + 5 family cabins + Maison au bord de l’eau + Moulin (6 suites + 4-bed dorm). This row stores only the official 27 couple cabins. Family / house / mill / Dolimarts unpublished. Sage Treehouse / total 23 stale.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Official from-rates are 2-night weekday packages by named cabin (suites from €298 / cabins higher). Not a nightly ADR. Do not store Sage 250 or invent a /2 split.',
  description = $$Les Cabanes de Rensiwez, Moulin de Rensiwez 1, 6663 Houffalize. Official Ardennes cabin domain on the Ourthe: 27 couple cabins plus unpublished family cabins, riverside house and mill suites.$$,
  activities_raw = 'On-site: forest walks, river, sauna / Nordic bath on selected cabins, breakfast. Nearby: Houffalize, Ourthe valley.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 10970 AND property_id = 'c65b19d3-4249-45ae-aa00-958ccb8d661d';

UPDATE public.all_sage_data
SET
  site_name = 'Cabin', unit_type = 'Cabin', quantity_of_units = 27,
  unit_capacity = '2', unit_bed = 'Double',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round by cabin. This row is official 27 couple cabins. 5 family cabins, riverside house, mill suites, and Cabanes des Dolimarts unpublished. Do not store Treehouse / 23.',
  minimum_nights = '2',
  unit_description = $$Cabin (qty 27): official two-person forest cabins. Family cabins, house, mill suites unpublished.$$,
  amenities_raw = 'Cabin; private bath; terrace; selected sauna / outdoor bath; breakfast available.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Official 2-night weekday from-rates by named cabin. Do not store Sage 250 or invent a nightly split.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 27 couple cabins at Moulin de Rensiwez 1. Family / mill unpublished. Cleared Treehouse / 23 / stale +32 61 28 92 05 / invented 250.'
WHERE id = 10970 AND property_id = 'c65b19d3-4249-45ae-aa00-958ccb8d661d';

-- ============================================================================
-- The Secret Yurts — official 3 named yurts (Rowan, Oak, Birch).
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'The Secret Yurts', slug = 'the-secret-yurts',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_the_secret_yurts_2026_09',
  address = 'Pantytanhouse Fach', city = 'Dolanog', state = 'Powys',
  zip_code = 'SY21 0JU', country = 'United Kingdom',
  lat = NULL, lon = NULL,
  url = 'https://www.thesecretyurts.com/', phone_number = '+44 7976 277245',
  property_total_sites = 3, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'No',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official The Secret Yurts, Pantytanhouse Fach, Dolanog SY21 0JU. Phone 07976 277245. Adults-only woodland: 3 named yurts Rowan, Oak, Birch, each with private wet room and hot tub. Shared farmhouse kitchen. What3Words gazes.barn.campus. Sage Brynllywarch / Llanfair Caereinion SY21 0DP / +44 1938 810551 / Campground / 150 stale. Official GPS unpublished.',
  rate_basis = 'room_only',
  rate_basis_notes = 'GBP. Booking via GlampManager calendar only; no official from-rate published. Do not store Sage 150.',
  description = $$The Secret Yurts, Pantytanhouse Fach, Dolanog, Powys SY21 0JU. Adults-only woodland glamping: 3 named yurts with private wet rooms and hot tubs. Not Brynllywarch.$$,
  activities_raw = 'On-site: woodland walks, dark skies, pizza oven / BBQ. Nearby: Llanfair Caereinion, Welshpool, Snowdonia.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11294 AND property_id = '51191ab0-86a3-4577-acc1-8ca7808f4a08';

UPDATE public.all_sage_data
SET
  site_name = 'Yurt', unit_type = 'Yurt', quantity_of_units = 3,
  unit_capacity = '2', unit_bed = 'King',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Seasonal (Pitchup listed Apr–Dec). Official 3 yurts Rowan, Oak, Birch. Rowan is dog-free.',
  minimum_nights = '2',
  unit_description = $$Yurt (qty 3): official Rowan, Oak and Birch. Private wet room and hot tub each; shared farmhouse kitchen.$$,
  amenities_raw = 'Yurt; king bed; wood stove; private wet room; private hot tub; sundeck; shared kitchen.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'GBP room_only. Calendar only. Do not store Sage 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 3 yurts at Pantytanhouse Fach, Dolanog SY21 0JU. Relocated from Brynllywarch. Cleared unpublished GPS / stale 01938 phone / invented 150.'
WHERE id = 11294 AND property_id = '51191ab0-86a3-4577-acc1-8ca7808f4a08';

-- ============================================================================
-- Rundlingsdorf Sagasfeld — wellness hotel, not yurt glamping.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Rundlingsdorf Sagasfeld', slug = 'rundlingsdorf-sagasfeld',
  property_type = 'Outdoor Boutique Hotel', source = 'Sage',
  discovery_source = 'web_research_rundlingsdorf_sagasfeld_2026_09',
  address = 'Sagasfeld 1', city = 'Göhrde', state = 'Lower Saxony',
  zip_code = '29473', country = 'Germany',
  url = 'https://www.sagasfeld.de/', phone_number = '+49 5841 1360',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'Yes', property_family_friendly = 'No',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'Yes', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Rundlingsdorf Sagasfeld GmbH wellness hotel, Sagasfeld 1, 29473 Göhrde-Metzingen. Phone +49 5841 1360 (Sage +49 5864 9870 stale). Yoga / Ayurveda hotel in a reconstructed Wendland rundling village — hotel rooms, not yurts. Official key count unpublished. Sage Yurt / 150 invented.',
  rate_basis = 'half_board',
  rate_basis_notes = 'EUR. Official Kurzaufenthalt from €160 for 2 nights in a double including breakfast and dinner — package, not a nightly room-only ADR. Do not store Sage 150 or invent €80/night.',
  description = $$Rundlingsdorf Sagasfeld, Sagasfeld 1, 29473 Göhrde-Metzingen, near Hitzacker. Official yoga/Ayurveda wellness hotel in a purpose-built Wendland rundling village. Not yurt glamping.$$,
  activities_raw = 'On-site: yoga, Ayurveda, sauna, natural swimming pond, art school. Nearby: Elberadweg, Göhrde forest, Hitzacker.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11025 AND property_id = 'a1d127ea-63be-42d1-9e5d-55b989c825d5';

UPDATE public.all_sage_data
SET
  site_name = 'Hotel Room', unit_type = 'Hotel Room', quantity_of_units = NULL,
  unit_capacity = '2', unit_bed = 'Double',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round hotel. Official room count unpublished. Do not store Yurt.',
  minimum_nights = '2',
  unit_description = $$Hotel Room (qty unpublished): official wellness-hotel doubles. Not yurts.$$,
  amenities_raw = 'Hotel room; restaurant; sauna; natural pond; yoga / Ayurveda.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR B&B package. Official from €160 / 2 nights incl. dinner. Do not store Sage 150 or invent a nightly split.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Outdoor Boutique Hotel, not glamping. Official Sagasfeld 1 / +49 5841 1360. Room count unpublished. Cleared Yurt / invented 150 / stale 05864 phone.'
WHERE id = 11025 AND property_id = 'a1d127ea-63be-42d1-9e5d-55b989c825d5';

-- ============================================================================
-- Glamping Resort Biosphäre Bliesgau — official from €109; count unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Glamping Resort Biosphäre Bliesgau', slug = 'glamping-resort-biosphare-bliesgau',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_glamping_resorts_bliesgau_2026_09',
  address = 'Zum Bergwald 6', city = 'Kleinblittersdorf', state = 'Saarland',
  zip_code = '66271', country = 'Germany',
  url = 'https://www.glamping-resorts.de/', phone_number = '+49 681 9327 1800',
  property_total_sites = NULL, year_site_opened = 2017,
  property_clubhouse = 'Yes', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Glamping Resorts / Biosphäre Glamping GmbH, Zum Bergwald 6, 66271 Kleinblittersdorf, next to Saarland Therme. Phone +49 681 9327 1800 (Sage +49 6805 6000 stale). Official URL glamping-resorts.de. Four garden categories (Woodland, Sun, Vineyard; Orchard still being created). Naturhotelzimmer with ensuite Villeroy & Boch baths. Official unit count unpublished: Villeroy & Boch 32 (2017 opening) vs Sarreguemines tourisme 21 rooms. Do not store Sage Safari Tent / total 10.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Official from €109 per Naturhotelzimmer per day for 2 people across Woodland / Sun / Vineyard. Do not store Sage 150.',
  description = $$Glamping Resort Biosphäre Bliesgau, Zum Bergwald 6, 66271 Kleinblittersdorf. Official natural-hotel-room glamping next to Saarland Therme in the UNESCO Bliesgau biosphere. Unit count unpublished (21 vs 32 conflict).$$,
  activities_raw = 'On-site: garden categories, next-door Saarland Therme, skating, adventure golf. Nearby: Saarbrücken, Bliesgau trails.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'No',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 10999 AND property_id = 'fd632374-df49-4287-b81c-33f07d9ac478';

UPDATE public.all_sage_data
SET
  site_name = 'Naturhotelzimmer', unit_type = 'Cabin', quantity_of_units = NULL,
  unit_capacity = '2-3', unit_bed = 'Double or twin',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'Yes',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round. Official count unpublished (21 vs 32). Orchard category still being created. Do not store Safari Tent / 10.',
  minimum_nights = '1',
  unit_description = $$Cabin / Naturhotelzimmer (qty unpublished): official ensuite modules for 2, some woodland units for 3. Not safari tents.$$,
  amenities_raw = 'Ensuite shower/WC; climate control; SAT-TV; kettle/toaster/fridge; terrace.',
  rate_summer_weekday = '109', rate_summer_weekend = '109',
  rate_winter_weekday = '109', rate_winter_weekend = '109',
  rate_spring_weekday = '109', rate_spring_weekend = '109',
  rate_fall_weekday = '109', rate_fall_weekend = '109',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 109, 'weekend', 109),
      'spring', jsonb_build_object('weekday', 109, 'weekend', 109),
      'summer', jsonb_build_object('weekday', 109, 'weekend', 109),
      'fall', jsonb_build_object('weekday', 109, 'weekend', 109),
      'note', 'EUR room_only. Official from €109 / day / 2 people. Do not store Sage 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official from €109 at Zum Bergwald 6 / +49 681 9327 1800. Qty unpublished (21 vs 32). Cleared Safari Tent / 10 / 150 / stale 06805 phone.'
WHERE id = 10999 AND property_id = 'fd632374-df49-4287-b81c-33f07d9ac478';

-- ============================================================================
-- Het Bos Roept — relocate Bakkeveen stub to official Slootdorp campground.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Het Bos Roept', slug = 'het-bos-roept',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_het_bos_roept_2026_09',
  address = 'Den Oeverseweg 12', city = 'Slootdorp', state = 'North Holland',
  zip_code = '1774 NB', country = 'Netherlands',
  lat = NULL, lon = NULL,
  url = 'https://hetbosroept.nl/', phone_number = '+31 227 745 726',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'Yes',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official natuurkampeerterrein Het Bos Roept, Den Oeverseweg 12, 1774 NB Slootdorp (Robbenoordbos). Phone +31 227 745 726. Sage Bakkeveen / Mjumsterwei 16 / +31 6 12345678 / Treehouse / total 10 / 150 was a misplaced invented stub of the same named operator. Official 5 eco cabins (Forest Cabin, Warthog variants, La Serre). Trekkershutten Ninja & Anne, tipi tents Roos & Suus, and touring pitches unpublished. Official GPS unpublished.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Official site does not publish a cabin from-rate on the pages reviewed. Do not store Sage 150.',
  description = $$Het Bos Roept, Den Oeverseweg 12, 1774 NB Slootdorp, Noord-Holland. Official nature campsite in Robbenoordbos with 5 eco cabins plus unpublished hiker huts, tipis and pitches. Relocated from invented Bakkeveen pin.$$,
  activities_raw = 'On-site: forest, fire pits, boat moorings. Nearby: Den Oever, Waddenzee.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11129 AND property_id = '0f1f3b31-8dec-4a4f-bdc0-5874e5423c74';

UPDATE public.all_sage_data
SET
  site_name = 'Eco Cabin', unit_type = 'Cabin', quantity_of_units = 5,
  unit_capacity = '1-6', unit_bed = 'Varies',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round campsite; some rentals seasonal. This row is official 5 eco cabins. Trekkershutten, tipis and pitches unpublished. Do not store Treehouse / 10.',
  minimum_nights = '1',
  unit_description = $$Cabin (qty 5): official eco cabins designed on site (Forest Cabin, Warthog variants, La Serre). Not treehouses. Hiker huts and tipis unpublished.$$,
  amenities_raw = 'Eco cabin; wood stove; kitchenette; some private WC / hot tub; shared bathhouse otherwise.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. No official from-rate stored. Do not store Sage 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published and relocated from Bakkeveen to Slootdorp. Official 5 eco cabins. Cleared Treehouse / 10 / invented +31 6 12345678 / unpublished GPS / 150.'
WHERE id = 11129 AND property_id = '0f1f3b31-8dec-4a4f-bdc0-5874e5423c74';

-- ============================================================================
-- The Wildings — relocate Naunton stub to Bourton-on-the-Water farm.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'The Wildings', slug = 'the-wildings',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_the_wildings_2026_09',
  address = 'Lankett Lane, Bourton Hill', city = 'Bourton-on-the-Water', state = 'Gloucestershire',
  zip_code = 'GL54 2LF', country = 'United Kingdom',
  lat = NULL, lon = NULL,
  url = 'https://wildingsholidays.co.uk/', phone_number = NULL,
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official The Wildings / wildingsholidays.co.uk, Lankett Lane, Bourton Hill, Bourton-on-the-Water GL54 2LF (Companies House THE WILDINGS CAMPSITE LTD). Sage Naunton GL54 3AY / +44 1451 850707 / Safari Tent total 5 / 200 was the wrong village. Official glamping: bell tents, pods, yurts and one cabin (Hyssop Hut). Homepage “four lovely glamping spots” vs pod cluster of five — per-SKU unpublished. Pitch count unpublished (Cool Places 27 not stored). Official phone is a web form; Cool Places 01451 518 869 not stored. Official GPS unpublished.',
  rate_basis = 'room_only',
  rate_basis_notes = 'GBP. Official site does not publish a from-rate. Do not store Sage 200.',
  description = $$The Wildings, Lankett Lane, Bourton Hill, Bourton-on-the-Water, Gloucestershire GL54 2LF. Official farm campsite and glamping less than a mile from the village. Relocated from invented Naunton pin. SKU split unpublished.$$,
  activities_raw = 'On-site: play areas, cookhouse, bar, coffee shop. Nearby: Bourton-on-the-Water, Lower Slaughter, Cheltenham.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'Yes', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11260 AND property_id = '8ab815cf-07c3-4df9-bd0d-75e595eded60';

UPDATE public.all_sage_data
SET
  site_name = 'Glamping Unit', unit_type = NULL, quantity_of_units = NULL,
  unit_capacity = NULL, unit_bed = 'Double',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'Yes', unit_electricity = 'No', unit_water = 'No',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal. Official mix: bell tents, pods, yurts, one cabin. Per-SKU unpublished. Pitches and cottages unpublished. Do not store Safari Tent / 5.',
  minimum_nights = NULL,
  unit_description = $$Glamping Unit (qty unpublished): official bell tents, pods, yurts and Hyssop Hut cabin. SKU split unpublished. Camping pitches unpublished.$$,
  amenities_raw = 'Ready-erected glamping; fire pit; shared showers; cookhouse; on-site bar.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'GBP room_only. No official from-rate. Do not store Sage 200.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published and relocated from Naunton to Bourton-on-the-Water. SKU split unpublished. Cleared Safari Tent / 5 / 200 / Naunton GPS / 01451 850707.'
WHERE id = 11260 AND property_id = '8ab815cf-07c3-4df9-bd0d-75e595eded60';

-- ============================================================================
-- Glamping Alcantara — official park-side tents; count unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Glamping Alcantara', slug = 'glamping-alcantara',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_glamping_alcantara_2026_09',
  address = 'Via Nazionale 5', city = 'Motta Camastra', state = 'Sicily',
  zip_code = '98030', country = 'Italy',
  url = 'https://www.glampingalcantara.com/', phone_number = '+39 0942 985010',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Glamping Alcantara inside Parco Botanico e Geologico Gole Alcantara. Via Nazionale 5, 98030 Motta Camastra / Graniti ME. Phone +39 0942 985010 (also +39 0942 985129). Sage Contrada Sciara Soprana and total 10 / 180 are not official. Official tent count unpublished (OTA 6 vs 8 — not stored).',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Official site does not publish a from-rate. Do not store Sage 180.',
  description = $$Glamping Alcantara, Via Nazionale 5, 98030 Motta Camastra, Sicily, inside the Alcantara Gorges botanical and geological park. Official luxury-tent glamping; tent count unpublished.$$,
  activities_raw = 'On-site: park access. Nearby: Gole Alcantara, Francavilla di Sicilia, Taormina.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'No',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11067 AND property_id = 'a8a0ad13-f66b-4712-a7f2-524afd26f542';

UPDATE public.all_sage_data
SET
  site_name = 'Safari Tent', unit_type = 'Safari Tent', quantity_of_units = NULL,
  unit_capacity = NULL, unit_bed = NULL,
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal. Official tent count unpublished (OTA 6 vs 8). Do not store total 10.',
  minimum_nights = NULL,
  unit_description = $$Safari Tent (qty unpublished): official hotel-comfort tents in the Alcantara park. Exact count unpublished.$$,
  amenities_raw = 'Furnished tent; park setting.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. No official from-rate. Do not store Sage 180.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official Via Nazionale 5 / +39 0942 985010. Tent count unpublished. Cleared Contrada Sciara Soprana / total 10 / invented 180.'
WHERE id = 11067 AND property_id = 'a8a0ad13-f66b-4712-a7f2-524afd26f542';

-- ============================================================================
-- Glamping Pian delle Ginestre — relocate Scansano stub to Sassetta.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Glamping Pian delle Ginestre', slug = 'glamping-pian-delle-ginestre',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_pian_delle_ginestre_2026_09',
  address = 'Via del Corsoio 6', city = 'Sassetta', state = 'Tuscany',
  zip_code = '57020', country = 'Italy',
  lat = NULL, lon = NULL,
  url = 'https://www.piandelleginestre.it/', phone_number = '+39 350 032 3794',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'No',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Glamping Pian delle Ginestre, Via del Corsoio 6, 57020 Sassetta (LI), VAT IT02497750469. Sage Scansano / SP 159 / +39 0564 507227 / total 10 / 150 was the wrong comune. Visit Tuscany lists 6 couple tents; official homepage adds a new Easy tent and does not publish a current count — qty unpublished. Phone from Visit Tuscany listing of the official property. Official GPS unpublished. Do not merge Il Giardino di San Giorgio (Scansano, 2 tents) or Tenuta San Lodovico.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Official site does not publish a from-rate on the homepage. Do not store Sage 150.',
  description = $$Glamping Pian delle Ginestre, Via del Corsoio 6, 57020 Sassetta, Tuscany, in oak/cork woods near Terme della Cerreta and the Etruscan Coast. Relocated from invented Scansano pin. Tent count unpublished.$$,
  activities_raw = 'On-site: woodland, whirlpool, small restaurant, yoga. Nearby: Sassetta, Terme della Cerreta, Etruscan Coast.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11078 AND property_id = 'cb932d3a-5586-44e7-9b00-1e0a7161ab8b';

UPDATE public.all_sage_data
SET
  site_name = 'Safari Tent', unit_type = 'Safari Tent', quantity_of_units = NULL,
  unit_capacity = '2', unit_bed = 'Double',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'April–October. Official tent count unpublished (Visit Tuscany 6 + new Easy tent). Do not store total 10.',
  minimum_nights = NULL,
  unit_description = $$Safari Tent (qty unpublished): official couple glamps in Sassetta woods. Exact current count unpublished.$$,
  amenities_raw = 'Couple tent; restaurant; whirlpool; woodland.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. No official from-rate. Do not store Sage 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published and relocated from Scansano to Sassetta. Tent count unpublished. Cleared SP 159 / 10 / 150 / Scansano GPS / 0564 phone.'
WHERE id = 11078 AND property_id = 'cb932d3a-5586-44e7-9b00-1e0a7161ab8b';

COMMIT;
