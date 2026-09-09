-- ============================================================================
-- Stillpoint Lodge (Halibut Cove, AK / Kachemak Bay): publish cabin inventory.
-- Distinct from Tutka Bay Lodge (Alaska Collection), Homer / Baycrest KOA,
-- Kachemak Bay Wilderness Lodge, Ridgewood, Hideaway Cove, and Odyssey Lodge.
-- Do not merge those properties.
--
-- Sources (retrieved 2026-09-04):
--   https://stillpointlodge.com/ (+ /alaska-lodge/cabins /rates /hobo-jim
--     /frequently-asked-questions /alaska-lodge/stay)
--   Google Maps business pin:
--     https://www.google.com/maps/place/Stillpoint+Lodge/@59.592538,-151.2315701,17z
--     plus code HQV9+29; 46877 Stillpoint Trail, Halibut Cove, AK 99603
--     (skip google_place_id — CID /g/1tffjhss only, not ChIJ)
--   Hobo Jim page: grand lodge + 11 cabins; built 2002 on 11 acres
--   About / Alaska Magazine: opened 2003 as creative retreat; named Stillpoint
--     2007; JT Thurston took over 2014; bathrooms added winter 2015–16
--   2026 rates: from $3,272 pp/night all-inclusive (3-night min)
--   Maps Sep 7–10 2026: official $6,544 (double occ); king $6,948
--
-- Inventory:
--   Cabin qty 11 — Hobo Jim published total. Current cabins page lists
--     1BR suites (up to 4), 2BR deluxe (up to 4), 1 king waterfront, Presidential
--     Chalet, Hermitage, The Perch, and a petite twin. "Up to" is not a firm
--     per-SKU census — do not invent those rows. Fitness yurt / meditation
--     cabin / massage cabins are amenities, not lodging SKUs.
--   property_total_sites = 11
--
-- Rates USD, all_inclusive, unit = double occupancy (pp × 2). Do not set
-- rate_avg_retail_daily_rate (trigger). Keep 2026-09-01 operator-derived band.
-- Seasonal late May–mid September (rates page); booking copy says June–September.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'No',
  property_name = 'Stillpoint Lodge',
  slug = 'stillpoint-lodge-halibut-cove-ak',
  property_type = 'Ranch & Lodge',
  source = 'Sage',
  discovery_source = 'web_research_stillpoint_lodge_operator_gmaps_2026_09',
  address = '46877 Stillpoint Trail',
  city = 'Halibut Cove',
  state = 'AK',
  zip_code = '99603',
  country = 'United States',
  lat = 59.592538,
  lon = -151.2315701,
  url = 'https://stillpointlodge.com/',
  phone_number = '+1-907-531-5764',
  property_total_sites = 11,
  year_site_opened = 2003,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'Yes',
  property_laundry = 'Yes',
  property_pool = 'No',
  property_hot_tub = 'Yes',
  property_sauna = 'Yes',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  property_playground = 'No',
  property_general_store = 'No',
  property_extended_stay = 'Yes',
  property_pickball_courts = 'No',
  property_fitness_room = 'Yes',
  property_waterfront = 'Yes',
  property_alcohol_available = 'Yes',
  property_ota_platforms = ARRAY['booking.com']::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Second-generation Thurston family all-inclusive wilderness lodge on 11 acres in Halibut Cove (boat/floatplane from Homer). 11 private log cabins + main lodge. Not a glamping camp — hard-walled cabins; fitness yurt and meditation cabin are amenities. stay@stillpointlodge.com.',
  rate_basis = 'all_inclusive',
  rate_basis_notes = 'USD. 2026 from $3,272 per person per night (3-night min); kids 6–11 reduced. Unit rates stored as double occupancy (pp × 2). Includes cabin, all meals, full bar, guided kayak/hike, one wellness session per adult, Homer boat transfer, gear cave. Extra excursions by length of stay. Check-in 2:00–5:00 PM / check-out by noon. Pets not allowed. Seasonal late May–mid September. +1-907-531-5764.',
  description = $$All-inclusive wilderness lodge at 46877 Stillpoint Trail, Halibut Cove, Alaska (Google Maps 59.592538, -151.2315701; plus code HQV9+29), on 11 acres across Kachemak Bay from Homer (boat, floatplane, or helicopter). Eleven private log cabins plus a main lodge with dining, bar, hot tub, sauna, fitness yurt, and meditation cabin. Built 2002; opened 2003 as a creative retreat; named Stillpoint Lodge in 2007. Distinct from Tutka Bay Lodge and other Halibut Cove wilderness lodges.$$,
  activities_raw = 'On-site: main lodge dining and bar, hot tub, sauna, fitness yurt / Peloton, library, lounge, labyrinth, meditation cabin, kayak and paddleboard from the dock, Native Trail hike, rowboat, SeaCycle, firepit, lawn games, axe throwing, organic garden. Included excursions by length of stay: bear viewing, saltwater fishing, glacier-lake kayaking, e-biking, wildlife cruise, cultural experiences, mountain hikes. Off-site: Halibut Cove village, oyster farm, Kachemak Bay State Park, Grewingk Glacier.',
  activities_hiking = 'Yes',
  activities_fishing = 'Yes',
  activities_paddling = 'Yes',
  activities_canoeing_kayaking = 'Yes',
  activities_boating = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'No',
  setting_forest = 'Yes',
  setting_mountainous = 'Yes',
  setting_lake = 'No',
  setting_coastal = 'Yes',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11684
  AND property_id = 'c019237f-0bda-462d-9db1-8a591e18c96a';

UPDATE public.all_sage_data
SET
  site_name = 'Cabin',
  unit_type = 'Cabin',
  quantity_of_units = 11,
  unit_capacity = '2',
  unit_bed = 'King, Queen, twins, or mix (2BR / Presidential sleep more)',
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
  unit_mini_fridge = 'Yes',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = 6,
  season_close_month = 9,
  operating_season_months = 'Seasonal late May–mid September (rates page). Booking copy says June–September. Inquire for group shoulder dates. Qty 11 from Hobo Jim “grand lodge and 11 cabins.”',
  minimum_nights = '3',
  unit_description = $$Private log cabin (qty 11): residual covering 1BR suites (up to 4), 2BR deluxe (up to 4), one king waterfront, Presidential Chalet (private hot tub/sauna), Hermitage (historic queen ensuite), The Perch (queen, cliff), and a petite twin. Salvaged spruce, covered porches, heaters, Wi-Fi, private baths (some detached). Do not invent per-SKU rows — operator “up to” counts are not a firm census. Meditation / massage cabins and the fitness yurt are not lodging.$$,
  amenities_raw = 'Log cabin; private bath (ensuite or detached heated); Wi-Fi; heater; covered porch; mini-bar on suites. Shared: lodge dining, bar, hot tub, sauna, fitness yurt. No pets. No A/C.',
  rate_winter_weekday = '5759',
  rate_winter_weekend = '6413',
  rate_spring_weekday = '6544',
  rate_spring_weekend = '7068',
  rate_summer_weekday = '7329',
  rate_summer_weekend = '8115',
  rate_fall_weekday = '6806',
  rate_fall_weekend = '7460',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 5759, 'weekend', 6413),
      'spring', jsonb_build_object('weekday', 6544, 'weekend', 7068),
      'summer', jsonb_build_object('weekday', 7329, 'weekend', 8115),
      'fall', jsonb_build_object('weekday', 6806, 'weekend', 7460),
      'note', 'USD all_inclusive, double occupancy (operator from-rate $3,272 pp × 2). Maps official $6,544 Sep 7–10 2026; king $6,948. Peak chart June 22–Aug 23; shoulder June 1–21 and Aug 24–Sep 12. Winter/early spring closed — stored as off-season placeholders. 3-night min. stillpointlodge.com/rates.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from in_progress using stillpointlodge.com + Hobo Jim 11-cabin total + Google Maps @59.592538,-151.2315701 (HQV9+29). Replaced stub lat/lon 59.197,-151.258. property_type Glamping → Ranch & Lodge; is_glamping_property No. This row is Cabin qty 11. Distinct from Tutka Bay Lodge.'
WHERE id = 11684
  AND property_id = 'c019237f-0bda-462d-9db1-8a591e18c96a';

COMMIT;
