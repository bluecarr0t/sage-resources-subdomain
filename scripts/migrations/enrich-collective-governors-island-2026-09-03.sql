-- ============================================================================
-- Collective Governors Island (New York, NY): publish and split 3 SKUs.
-- Canonical brand name on collectiveretreats.com/governors-island/.
-- Supersedes published duplicate "Collective Retreats Governors Island"
--   (property_id 54752c1b-e4ae-4f5e-9f4c-65234d4b95cd / ids 13008–13010).
-- Distinct from Collective Hill Country (TX), closed Vail / Hudson Valley /
--   Yellowstone Collective sites, and The Glamping Collective (NC/GA).
--
-- Sources (retrieved 2026-09-03):
--   https://collectiveretreats.com/governors-island/
--   https://collectiveretreats.com/governors-island/rooms/
--   https://collectiveretreats.com/governors-island/frequently-asked-questions/
--   https://collectiveretreats.com/governors-island/policies/
--   Direct book calendar:
--     https://collectiveretreats.book.pegsbe.com/
--   2025 season PR (from $249):
--     https://www.prnewswire.com/news-releases/collective-retreats-governors-island-returns-for-the-2025-season-with-a-nature-forward-escape-in-the-heart-of-nyc-302473731.html
--   Google Maps business pin:
--     https://www.google.com/maps/place/Collective+Retreats+Governors+Island/@40.6895843,-74.022651,17z
--     lat 40.6895843 / lon -74.022651; plus code MXQG+RW
--     825 Gresham Rd, New York, NY 10004
--     (skip google_place_id — CID /g/11gh_p3pgn only, not ChIJ)
--
-- Operating inventory (operator + 2025 PR: 29 retreats; Jul 2026 Sage audit):
--   Journey Tent — Safari Tent qty 15; shared spa bathhouse; King/Twin/Waterfront
--     + Journey Family compound (two adjacent kings, sleeps 4)
--   Voyager Tent — Safari Tent qty 10; ensuite; King/Twin/ADA/Waterfront
--     + Expedition / Urban Cowboy as ensuite canvas variants (not extra sites)
--   Basecamp Cabin — Cabin qty 4; ensuite soaking tub; includes ADA cabin
--     + Summit / Outlook / Observatory named suites (hard-wall; in the 4, not extra)
--   property_total_sites = 29. Full-retreat buyout is not an extra site.
--
-- Rates USD, room_only. Do not set rate_avg_retail_daily_rate (trigger).
--   PEGSBE from-rate calendar (cheapest SKU = Journey): fall weekday $284–$304
--     (Wed Sep 9 2026 $284); typical fall weekend $434 (Sep 11–12).
--     Peak Sat Oct 10 $754 / Labor Day weekend Sep 5 $674.
--   2025 PR from $249 (includes ferry, common-area Wi-Fi, breakfast, s’mores).
--   $55/night retreat fee (policies) for Wi-Fi, s’mores, Manhattan ferry for two.
--   Dinner at Three Peaks extra. Do not use old Basecamp $151–$193 (Timeout
--     Journey from-rate misapplied in Jul 2026).
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Collective Governors Island',
  slug = 'collective-governors-island-new-york-ny',
  property_type = 'Glamping Resort',
  source = 'Sage',
  discovery_source = 'web_research_collective_governors_island_operator_gmaps_2026_09',
  address = '825 Gresham Road',
  city = 'New York',
  state = 'NY',
  zip_code = '10004',
  country = 'United States',
  lat = 40.6895843,
  lon = -74.022651,
  url = 'https://collectiveretreats.com/governors-island/',
  phone_number = '+1-646-572-5341',
  property_total_sites = 29,
  year_site_opened = 2018,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'Yes',
  property_laundry = 'No',
  property_pool = 'No',
  property_hot_tub = 'No',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  property_playground = 'No',
  property_general_store = 'No',
  property_extended_stay = 'No',
  property_pickball_courts = 'No',
  property_ota_platforms = ARRAY['expedia']::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Seasonal 6-acre Collective retreat on car-free Governors Island (opened 2018; May–November). 29 canvas tents and hard-wall suites with private decks, Three Peaks Lodge restaurant, Sunset Terrace bar, Great Lawn firepits, and events for up to 250. Byredo baths, included breakfast and Manhattan ferry. Upscale urban-harbor glamping — not a wilderness camp. QC NY Spa is a short walk (not on-property). Distinct from Collective Hill Country and closed Collective Vail/Hudson Valley/Yellowstone.',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD. Direct book collectiveretreats.book.pegsbe.com. Seasonal May–November; closed December–April. Check-in 4:00 PM / check-out 11:00 AM (operator policies; Maps lists 2 PM / 10 AM). Continental breakfast included 8–10:30 AM at Three Peaks Lodge; dinner 5–9 PM extra. $55/night retreat fee (Wi-Fi, nightly s’mores, Manhattan ferry for two, programming). Reservations must be 21+; kids OK with adults. No pets (service animals only). Cancel 45+ days less $75; 31–45 days reschedule $75; ≤30 days none. Reservations +1-646-572-5341; concierge +1-646-337-0873.',
  description = $$Seasonal 6-acre glamping retreat at 825 Gresham Road on Governors Island, New York (Google Maps 40.6895843, -74.022651; plus code MXQG+RW), an eight-minute ferry from the Battery Maritime Terminal. Twenty-nine Journey and Voyager canvas tents plus Basecamp cabins and named suites, all with private decks on the Great Lawn. Three Peaks Lodge, Sunset Terrace, communal firepits, and 172 car-free island acres. Open May–November since 2018. Only overnight lodging on Governors Island.$$,
  activities_raw = 'On-site: morning yoga, Great Lawn games (bocce, croquet, cornhole, oversized Jenga, paddleball), three communal firepits and nightly s’mores, happy hour and live music on the Sunset Terrace, stargazing. Island: 172 car-free acres — biking (Blazing Saddles $28/day), walking/hiking, Fort Jay and Castle Williams, lavender fields, hammock groves, public art, harbor views of the Statue of Liberty. Nearby: QC NY Spa (10% weekday with stay; day-pass pools).',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_fishing = 'Yes',
  activities_swimming = 'Yes',
  activities_boating = 'Yes',
  activities_paddling = 'Yes',
  activities_historic_sightseeing = 'Yes',
  activities_stargazing = 'Yes',
  activities_wildlife_watching = 'Yes',
  setting_coastal = 'Yes',
  setting_field = 'Yes',
  date_updated = '2026-09-03'
WHERE id = 13247
  AND property_id = '65f582dc-9a38-402b-a5b8-cb4c2914c615';

-- Existing Safari Tent shell becomes Journey Tent (qty 15, shared baths).
UPDATE public.all_sage_data
SET
  site_name = 'Journey Tent',
  unit_type = 'Safari Tent',
  quantity_of_units = 15,
  unit_capacity = '2',
  unit_bed = '1 King or twins',
  unit_sq_ft = NULL,
  unit_private_bathroom = 'No',
  unit_shower = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'No',
  unit_pets = 'No',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_picnic_table = NULL,
  unit_mini_fridge = 'No',
  unit_charcoal_grill = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  unit_cable = 'No',
  unit_ada_accessibility = 'No',
  rv_parking = 'No',
  season_open_month = 5,
  season_close_month = 11,
  operating_season_months = 'Seasonal May–November. Closed December–April. Journey King, Twin, Waterfront King, and Journey Family compound (two adjacent kings, sleeps 4) share this SKU. Shared spa bathhouses on the north side of the Great Lawn.',
  minimum_nights = '1',
  unit_description = $$Canvas Journey Tent (qty 15): king or twin beds, sleeps 2 (Family compound pairs two adjacent kings for 4). Private landscape deck with harbor/skyline views. Shared spa-style bathhouse (rain showers, full-flush toilets, Byredo). In-tent French press coffee, tea, A/C, safe, heated mattress pad in cooler months. Tents do not lock. Wi-Fi in common areas only. No pets. North-lawn cluster.$$,
  amenities_raw = 'Canvas tent; King or twins; sleeps 2; shared spa bathhouse; private deck; A/C; French press; safe; no in-tent Wi-Fi. Family compound = two adjacent tents. No pets.',
  rate_winter_weekday = '249',
  rate_winter_weekend = '315',
  rate_spring_weekday = '284',
  rate_spring_weekend = '434',
  rate_summer_weekday = '399',
  rate_summer_weekend = '554',
  rate_fall_weekday = '284',
  rate_fall_weekend = '434',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 249, 'weekend', 315),
      'spring', jsonb_build_object('weekday', 284, 'weekend', 434),
      'summer', jsonb_build_object('weekday', 399, 'weekend', 554),
      'fall', jsonb_build_object('weekday', 284, 'weekend', 434),
      'note', 'USD room_only. Closed Dec–Apr; winter fields = 2025 PR from-rate $249 / May shoulder. Fall weekday $284 PEGSBE Wed Sep 9 2026; fall weekend $434 Sep 11–12. Summer weekday interpolated; summer weekend from typical Fri $554. $55 retreat fee extra. collectiveretreats.book.pegsbe.com.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-03] Published + split from Safari Tent shell using collectiveretreats.com/governors-island + PEGSBE + Google Maps @40.6895843,-74.022651 (MXQG+RW). This row is Journey Tent qty 15. Rejected duplicate property_id 54752c1b (ids 13008–13010).'
WHERE id = 13247
  AND property_id = '65f582dc-9a38-402b-a5b8-cb4c2914c615';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed, unit_sq_ft,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, unit_picnic_table, unit_charcoal_grill, unit_ada_accessibility,
  year_site_opened, season_open_month, season_close_month,
  operating_season_months, minimum_nights,
  unit_description, amenities_raw, activities_raw,
  url, property_id, phone_number,
  property_clubhouse, property_food_on_site, property_restaurant, property_laundry,
  property_pool, property_hot_tub, property_sauna, property_family_friendly,
  property_remote_work_friendly, property_has_rentals, property_playground,
  property_general_store, property_extended_stay, property_pickball_courts,
  property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_biking, activities_fishing, activities_swimming,
  activities_boating, activities_paddling, activities_historic_sightseeing,
  activities_stargazing, activities_wildlife_watching,
  setting_coastal, setting_field,
  rv_parking,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', 'Collective Governors Island', v.site_name,
  'web_research_collective_governors_island_operator_gmaps_2026_09', '2026-09-03', '2026-09-03',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  29, v.qty, v.unit_type, v.capacity, v.bed, NULL::numeric,
  v.ensuite, 'Yes', 'No', 'No',
  'Yes', v.wifi, 'No', 'Yes', 'Yes',
  'Yes', 'Yes', 'No', 'No', 'No',
  v.mini_fridge, NULL, 'No', v.ada,
  2018::numeric, 5::smallint, 11::smallint,
  v.season, '1',
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_biking, g.activities_fishing, g.activities_swimming,
  g.activities_boating, g.activities_paddling, g.activities_historic_sightseeing,
  g.activities_stargazing, g.activities_wildlife_watching,
  g.setting_coastal, g.setting_field,
  'No',
  v.win_wd, v.win_we,
  v.spr_wd, v.spr_we,
  v.sum_wd, v.sum_we,
  v.fal_wd, v.fal_we,
  v.rates_json, g.rate_basis, g.rate_basis_notes,
  g.description, v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    (
      'Voyager Tent', 10::numeric, 'Safari Tent', '2', '1 King or twins',
      'Yes', 'No', 'No', 'Yes',
      'Seasonal May–November. Voyager King, Twin, Twin ADA (ramp + roll-in shower), and Waterfront King. Expedition Tent and Urban Cowboy Tent (clawfoot tub) are ensuite canvas variants in this class, not extra sites.',
      '399', '499', '454', '554', '554', '674', '454', '554',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 399, 'weekend', 499), 'spring', jsonb_build_object('weekday', 454, 'weekend', 554), 'summer', jsonb_build_object('weekday', 554, 'weekend', 674), 'fall', jsonb_build_object('weekday', 454, 'weekend', 554), 'note', 'USD room_only. PEGSBE from-rate jumps to $454 on several Sep 2026 Mondays when the Journey from-rate ($284–$304) is not showing — used as Voyager fall weekday. Fall weekend $554 (typical Fri). Summer weekend $674 Labor Day Sat Sep 5 2026. $55 retreat fee extra.')),
      $$Ensuite canvas Voyager Tent (qty 10): king or twins, sleeps 2. Spa-style en-suite (walk-in rain shower; Twin ADA has ramp + roll-in shower). Shaded private deck, A/C, French press, Byredo. South side of the Great Lawn. Expedition (enhanced insulation) and Urban Cowboy (clawfoot tub, waterfront) book as named variants inside this count. No pets. Wi-Fi in common areas.$$,
      'Ensuite canvas tent; King or twins; sleeps 2; rain shower; private deck; A/C; French press. ADA twin available. Expedition / Urban Cowboy variants. No pets.',
      E'[2026-09-03] Added Voyager Tent qty 10 from collectiveretreats.com/governors-island/rooms + 2025 PR + Jul 2026 unit-mix audit.'
    ),
    (
      'Basecamp Cabin', 4::numeric, 'Cabin', '2', '1 King',
      'Yes', 'Yes', 'Yes', 'Yes',
      'Seasonal May–November. Four hard-wall units: Basecamp Cabin (sleeps 2–3) + ADA cabin, plus named Summit / Outlook (Dvele) / Observatory glass suites. Combined qty 4 — do not add suites as extra sites.',
      '499', '599', '554', '674', '674', '754', '554', '674',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 499, 'weekend', 599), 'spring', jsonb_build_object('weekday', 554, 'weekend', 674), 'summer', jsonb_build_object('weekday', 674, 'weekend', 754), 'fall', jsonb_build_object('weekday', 554, 'weekend', 674), 'note', 'USD room_only. No dated Basecamp-only PEGSBE scrape. Scaled above Voyager; peak Sat Oct 10 2026 from-rate $754 used as summer/fall weekend top. Replaces Jul 2026 $151–$193 (misapplied Timeout Journey from-rate). $55 retreat fee extra.')),
      $$Hard-wall Basecamp Cabin / suite (qty 4): king bed, climate control, spa bath with soaking tub and handheld shower, mini-fridge, two private terraces facing the harbor and Statue of Liberty. Named Summit Suite (Tenthouse / folding glass, rainforest shower, private fire pit), Outlook Suite (Dvele modular), and Observatory Suite (glass) sit in this hard-wall count. ADA cabin available. No pets.$$,
      'Hard-wall cabin/suite; King; ensuite soaking tub; mini-fridge; two terraces; A/C; Wi-Fi in suite. Includes Summit/Outlook/Observatory. ADA available. No pets.',
      E'[2026-09-03] Added Basecamp Cabin qty 4 from rooms pages + 2025 PR. Suites folded into this count so property_total_sites stays 29.'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed,
  ensuite, wifi, mini_fridge, ada,
  season,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE g.id = 13247
  AND g.property_id = '65f582dc-9a38-402b-a5b8-cb4c2914c615'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = '65f582dc-9a38-402b-a5b8-cb4c2914c615'
      AND x.site_name = v.site_name
  );

-- Same physical retreat under the older "Collective Retreats Governors Island" name.
UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  date_updated = '2026-09-03',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-03] Rejected as duplicate of published Collective Governors Island (property_id 65f582dc-9a38-402b-a5b8-cb4c2914c615). Same 29-unit Governors Island retreat; superseded by current operator brand URL collectiveretreats.com/governors-island/.'
WHERE property_id = '54752c1b-e4ae-4f5e-9f4c-65234d4b95cd'
  AND research_status = 'published';

COMMIT;
