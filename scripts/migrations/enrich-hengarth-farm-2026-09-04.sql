-- ============================================================================
-- Hengarth Farm (Prattsville, NY / Catskills / Windham–Hunter): publish
-- bell-tent inventory. Distinct from Eastwind Hotels Windham (Lushna /
-- Lushna Suite), Hunter Mountain lodging, and other Post Road / Prattsville
-- cabins. Do not merge those. Do not add the workspace cabin, 1890s barn,
-- or Hipcamp “Mountain Property I Group Glamping” buyout as extra SKUs.
-- Do not add overflow camping / partner tents.
--
-- Sources (retrieved 2026-09-04):
--   https://www.hengarth.com/ (+ /catskillsglamping /catskillsglamping/faqs
--     /glampinginquiry /catskillscorporateoffsites)
--   Hipcamp (Jennifer M.; 4 lodging listings / 101 acres):
--     https://www.hipcamp.com/en-US/land/new-york-hengarth-farm-catskill-glamping-inn-r57h986p
--     Live Fri–Sun Sep 18–20 2026: group buyout $1,050/night; Stargazer
--     North Meadow $225; Classic East + Forest’s Edge $215 each.
--   Google Maps business pin:
--     https://www.google.com/maps/place/Hengarth+Farm/@42.341662,-74.4117109,17z
--     lat 42.341662 / lon -74.4117109; plus code 8HRQ+M8
--     290 Post Rd, Prattsville, NY 12468
--     (skip google_place_id — CID /g/11l32jvxbr only, not ChIJ)
--   Jen Manning / LinkedIn: founded Hengarth 2021
--
-- Operating inventory:
--   Glamping Tent qty 4 — operator “four spacious, fully furnished bell
--     tents”: 2 stargazer (360° clear roofs) + 2 classic. Each ~210–215+
--     sq ft, 10ft+ peak, queen + cots, private off-grid bath (composting
--     toilet + solar hot shower). Hipcamp lists 1 stargazer + 2 classic
--     individually plus a 4-tent buyout card — still 4 tents. Homepage
--     “stargazing yurts” is stale marketing. Stub Yurt qty 3 is wrong.
--   property_total_sites = 4
--
-- Rates USD, room_only. Do not set rate_avg_retail_daily_rate (trigger).
--   Hipcamp individual Sep 18–20 2026: $215–$225/night (2-night stay).
--   Store $215 weekday / $225 weekend in-season. Replaces $45 Hipcamp-
--     directory stub (40–56).
--   Operator exclusive-use weekend from $2,400 / 2 nights ($1,200/night
--     property; ~$300/tent). Hipcamp group pin $1,050/night. Corporate
--     3-day/2-night offsites from $1,100 pp include coordination — not
--     lodging ADR. Closed mid-October–late May; winter rates null.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Hengarth Farm',
  slug = 'hengarth-farm-prattsville-ny',
  property_type = 'Glamping',
  source = 'Sage',
  discovery_source = 'web_research_hengarth_farm_operator_gmaps_2026_09',
  address = '290 Post Road',
  city = 'Prattsville',
  state = 'NY',
  zip_code = '12468',
  country = 'United States',
  lat = 42.341662,
  lon = -74.4117109,
  url = 'https://www.hengarth.com/',
  phone_number = '+1-518-615-4727',
  property_total_sites = 4,
  year_site_opened = 2021,
  property_clubhouse = 'Yes',
  property_food_on_site = 'No',
  property_restaurant = 'No',
  property_laundry = 'No',
  property_pool = 'No',
  property_hot_tub = 'No',
  property_sauna = 'No',
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
  property_ota_platforms = ARRAY['hipcamp']::text[],
  ota_url_hipcamp = 'https://www.hipcamp.com/en-US/land/new-york-hengarth-farm-catskill-glamping-inn-r57h986p',
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Jen Manning’s 101-acre rare-breed sheep farm and exclusive-use glamping inn at 2,000 ft between Windham (~10–12 min) and Hunter (~25 min). Four furnished bell tents with private off-grid baths (compost toilet + solar hot shower), 600 sq ft viewing/yoga deck, BYO bar pavilion, 1890s barn. Upscale canvas inn — not rustic camping. Workspace cabin and barn are amenities. Distinct from Eastwind Windham. info@hengarth.com.',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD. BYO food/drink (coffee/tea/water included). 2-night min. Exclusive-use weekend from $2,400 / 2 nights (~$1,200/night property). Individual tents on select summer weekends (Hipcamp Sep 18–20 2026: classic $215 / stargazer $225). Corporate 3-day/2-night offsites from $1,100 pp include coordination — not lodging ADR. Season late May–mid October. No pets. info@hengarth.com; +1-518-615-4727.',
  description = $$Exclusive-use Catskills glamping inn at 290 Post Road, Prattsville, New York (Google Maps 42.341662, -74.4117109; plus code 8HRQ+M8), on 101 acres of sheep meadow, woodland, and stream at ~2,000 ft between Windham and Hunter. Four furnished bell tents (two stargazer, two classic) with private off-grid bathrooms, plus a 600 sq ft deck, BYO bar pavilion, and 1890s barn. Founded 2021 by Jen Manning. Distinct from Eastwind Hotels Windham.$$,
  activities_raw = 'On-site: sheep/llama farm, woodland trails, on-site stream, nature pond, fire pits, 600 sq ft viewing/yoga deck, BYO bar pavilion, barn reception, lawn games, stargazing. Nearby: Windham (~10–12 min) and Hunter (~25 min) ski/bike towns, Pratt Rock, Mine Kill Falls / Mine Kill State Park, Catskill Park, Tour of the Catskills cycle routes, Hudson Amtrak (~1 hr).',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_fishing = 'Yes',
  activities_swimming = 'Yes',
  activities_paddling = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_fall_fun = 'Yes',
  setting_forest = 'Yes',
  setting_farm = 'Yes',
  setting_field = 'Yes',
  setting_mountainous = 'Yes',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11586
  AND property_id = '4a4e672e-411c-4c3e-a303-d242663955f4';

UPDATE public.all_sage_data
SET
  site_name = 'Bell Tent',
  unit_type = 'Bell Tent',
  quantity_of_units = 4,
  unit_capacity = '5',
  unit_bed = '1 Queen + up to 3 single cots',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'No',
  unit_wifi = 'No',
  unit_pets = 'No',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_mini_fridge = 'No',
  unit_picnic_table = 'Yes',
  unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = 5,
  season_close_month = 10,
  operating_season_months = 'Seasonal late May–mid October. Exclusive-use buyout is the default; individual tents on select summer weekends. 2-night minimum. Closed mid-October–late May.',
  minimum_nights = '2',
  unit_description = $$Bell tent (qty 4): operator two stargazer bells (360° clear roofs) plus two classic bells, each 210–215+ sq ft with 10ft+ peak. Queen 10-inch mattress, hotel linens, table/seating, solar lighting and charging, cookware, cooler, picnic/prep tables, charcoal grill, two-burner stove, fire pit. Private nearby off-grid bathroom (composting toilet, hand pump, solar hot shower) — not ensuite inside the canvas. Sleeps 2–5 (cots). Do not invent yurts (homepage “stargazing yurts” is stale). Do not add the workspace cabin or barn as lodging.$$,
  amenities_raw = 'Furnished bell tent; queen + cots; solar power/charging; outdoor kitchen (grill + stove); fire pit; picnic table; private compost bath + solar hot shower. Shared: deck, BYO bar, barn. No pets. No A/C.',
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = '215',
  rate_spring_weekend = '225',
  rate_summer_weekday = '215',
  rate_summer_weekend = '225',
  rate_fall_weekday = '215',
  rate_fall_weekend = '225',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'spring', jsonb_build_object('weekday', 215, 'weekend', 225),
      'summer', jsonb_build_object('weekday', 215, 'weekend', 225),
      'fall', jsonb_build_object('weekday', 215, 'weekend', 225),
      'note', 'USD room_only. Hipcamp Fri–Sun Sep 18–20 2026: Classic $215 / Stargazer $225. Store 215/225 in-season. Exclusive weekend from $2,400 / 2 nights (~$300/tent); Hipcamp group $1,050/night. Replaces 2026-09-01 $45 directory stub (40–56). Closed Oct–May. hengarth.com/catskillsglamping.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from in_progress using hengarth.com + Hipcamp + Google Maps @42.341662,-74.4117109 (8HRQ+M8). unit_type Yurt qty 3 → Bell Tent qty 4; rate_basis unknown → room_only. Replaced stub lat/lon 42.34466,-74.409942. Distinct from Eastwind Windham.'
WHERE id = 11586
  AND property_id = '4a4e672e-411c-4c3e-a303-d242663955f4';

COMMIT;
