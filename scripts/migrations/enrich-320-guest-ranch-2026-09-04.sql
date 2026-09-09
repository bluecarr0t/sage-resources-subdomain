-- ============================================================================
-- 320 Guest Ranch (Gallatin Gateway / Big Sky, MT): publish and split cabin
-- inventory. Distinct from Rainbow Ranch Lodge (id 11668, rejected) and
-- Riverbend Glamping Getaway (ids 12944 / 13005 / 13006). Do not merge those.
-- Do not add conference rooms, McGill’s Restaurant, or The Dyrt “camping /
-- RV hookups” — operator ranch-policies: no boondocking or camping.
--
-- Sources (retrieved 2026-09-04):
--   https://320ranch.com/ (+ /accommodations/ /accommodations/ranch-policies/
--     /about-us/about-the-ranch/ /dining/mcgills-restaurant-saloon/
--     /blog/cabins/deluxe-log-cabins/ /blog/cabins/riverfront-log-cabins/
--     /blog/cabins/3-bedroom-luxury-log-homes/ /blog/cabins/mountain-chalets/
--     /cabins/historic-mcgill-cabin/)
--   2018 operator factsheet (inventory + 1898 / first guest 1905):
--     https://320ranch.com/wp-content/uploads/2018/09/FACTSHEET.pdf
--   Cvent: 87 guest rooms / 59 units (do not invent a 59th SKU)
--   Google Maps business pin:
--     https://www.google.com/maps/place/320+Guest+Ranch/@45.1023972,-111.2180836,17z
--     lat 45.1023972 / lon -111.2180836; plus code 4Q2J+XQ
--     205 Buffalo Horn Creek Rd, Gallatin Gateway, MT 59730
--     (skip google_place_id — /g/1tq6d4r5 only, not ChIJ)
--   Expedia (OTA; not ADR):
--     https://www.expedia.com/Gallatin-Gateway-Hotels-320-Guest-Ranch.h2179303.Hotel-Information
--   Hotels.com Deluxe May 14–15: $235 (matches operator Regular)
--
-- Operating inventory (factsheet 87 sleeping rooms within 58 accommodations):
--   Deluxe Cabin qty 36 — 7 king + 29 two-queen one-room duplexes
--   Riverfront Cabin qty 12 — operator “We have 12 units”
--   Luxury Log Home qty 7 — operator “a total of seven”
--   Mountain Chalet qty 2
--   Historic McGill Cabin qty 1 — 1927 Dr. Caroline McGill home
--   property_total_sites = 58. Cvent 59; do not invent a unit to close the gap.
--
-- Rates USD, breakfast. Do not set rate_avg_retail_daily_rate (trigger).
--   Operator Regular (Oct 3–Dec 14 + Mar 19–May 25) / High (Dec 15–Mar 18
--     + May 26–Sep 30). Store High as winter+summer, Regular as spring+fall.
--   Deluxe 235/315; Riverfront 425/555; McGill 400/525; Chalet 470/615;
--     Log Home 590/775. No weekday/weekend split. Maps official site $235
--     (Dec 3–4 band). Expedia $200 / Super.com $163 are OTA floors — not ADR.
--   Replaces 2026-09-01 Expedia-avg stub 381/422 (ADR 360.50).
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'No',
  property_name = '320 Guest Ranch',
  slug = '320-guest-ranch-gallatin-gateway-mt',
  property_type = 'Ranch & Lodge',
  source = 'Sage',
  discovery_source = 'web_research_320_guest_ranch_operator_gmaps_2026_09',
  address = '205 Buffalo Horn Creek Road',
  city = 'Gallatin Gateway',
  state = 'MT',
  zip_code = '59730',
  country = 'United States',
  lat = 45.1023972,
  lon = -111.2180836,
  url = 'https://320ranch.com/',
  phone_number = '+1-406-995-4283',
  property_total_sites = 58,
  year_site_opened = 1898,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'Yes',
  property_laundry = 'Yes',
  property_pool = 'No',
  property_hot_tub = 'No',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  property_playground = 'No',
  property_general_store = 'Yes',
  property_extended_stay = 'No',
  property_pickball_courts = 'No',
  property_fitness_room = 'No',
  property_tennis = 'No',
  property_waterfront = 'Yes',
  property_alcohol_available = 'Yes',
  property_ota_platforms = ARRAY['expedia', 'hotels.com']::text[],
  ota_url_booking_com = NULL,
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Historic Gallatin Canyon guest ranch (homestead 1898; first guests 1905) on two miles of the Gallatin River between Big Sky (~12 miles / 20 min) and West Yellowstone (~36 miles). Hard-sided log cabins, riverfront cabins, 3BR log homes, two mountain chalets, and the 1927 McGill cabin — not canvas. McGill’s Restaurant & Saloon (dinner seasonal; hot breakfast included). Conference / banquet space. No pool or hot tub (2026 ranch-policies). Pets $75/night, max 4. Distinct from Rainbow Ranch Lodge and Riverbend Glamping. info@320ranch.com.',
  rate_basis = 'breakfast',
  rate_basis_notes = 'USD. Hearty hot continental breakfast included (grab-and-go in shoulder: Oct 9–Nov 30 and mid-Mar–Apr 30). Not all-inclusive — trail rides, fishing, sleigh rides, and other activities book separately. McGill’s dinner seasonal (2026: from May 28, Thu–Mon). Check-in 4:00 PM / check-out 10:00 AM. 50% deposit; 72-hour cancel. Pets $75/pet/night (max 4). No TVs; Wi-Fi yes, no cell. Toll-free (800) 243-0320; dining (406) 995-3327. info@320ranch.com.',
  description = $$Historic year-round guest ranch at 205 Buffalo Horn Creek Road, Gallatin Gateway, Montana (Google Maps 45.1023972, -111.2180836; plus code 4Q2J+XQ), Highway 191 mile marker 36 in Gallatin Canyon — about 20 minutes from Big Sky and 45 minutes from West Yellowstone. Fifty-eight hard-sided log accommodations (87 sleeping rooms): deluxe one-room duplex cabins, 12 riverfront 2BR cabins, seven 3BR luxury log homes, two mountain chalets, and the 1927 Historic McGill Cabin. Homestead 1898; first guests 1905. McGill’s Restaurant & Saloon, gift shop, coin laundry, shared fire pit, private trout pond, and Gallatin River frontage. No pool or hot tub; no on-site camping. Distinct from Rainbow Ranch Lodge and Riverbend Glamping Getaway.$$,
  activities_raw = 'On-site: horseback riding (book separately), private trout pond / fly-fishing lessons, Gallatin River access for ranch guests, hiking to Gallatin National Forest trailhead past Cabin 40, wagon/sleigh rides, nightly bonfire, kids activities, gift shop, coin laundry, McGill’s dining/saloon (seasonal dinner), conference/banquet, horse boarding in summer. Nearby: Big Sky / Moonlight Basin skiing, Yellowstone (West entrance ~36 miles), whitewater on the Gallatin, snowmobiling, Bozeman ~52 miles. No pool or hot tub. Activities extra — not all-inclusive.',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_fishing = 'Yes',
  activities_swimming = 'No',
  activities_paddling = 'Yes',
  activities_whitewater_paddling = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_historic_sightseeing = 'Yes',
  activities_snow_sports = 'Yes',
  activities_horseback_riding = 'Yes',
  setting_forest = 'Yes',
  setting_ranch = 'Yes',
  setting_mountainous = 'Yes',
  setting_canyon = 'Yes',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11667
  AND property_id = 'd96fbbdd-5988-4fa5-8258-ffe6eee2940e';

-- Existing shell → Deluxe Cabin (7 king + 29 two-queen duplex rooms).
UPDATE public.all_sage_data
SET
  site_name = 'Deluxe Cabin',
  unit_type = 'Cabin',
  quantity_of_units = 36,
  unit_capacity = '4',
  unit_bed = '1 King or 2 Queen',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'No',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'No',
  unit_patio = 'Yes',
  unit_cable = 'No',
  unit_mini_fridge = 'No',
  unit_picnic_table = 'No',
  unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. One-room duplex cabins (shared front porch). Some king rooms have a kitchenette or fireplace; two-queen rooms do not. Can combine adjoining rooms. Factsheet 7 king + 29 two-queen = 36.',
  minimum_nights = '1',
  unit_description = $$Deluxe Cabin (qty 36): one-room log duplexes walking distance to McGill’s and the front office. 1 king or 2 queens, full bath, shared porch. Some king rooms add a kitchenette or fireplace. Operator Regular $235 / High $315 including breakfast. Sleeps up to 4. No TVs; Wi-Fi yes. Pets $75/night. Shared ranch fire pit and Weber grills (BYO charcoal). Do not split king vs two-queen into extra SKUs (same published rate).$$,
  amenities_raw = 'One-room log cabin; 1 king or 2 queens; full bath; shared porch; Wi-Fi; landline. Some kings: kitchenette or fireplace. No TV. No A/C. Shared fire pit, Weber grill, breakfast, gift shop, coin laundry. Pets $75/night.',
  rate_winter_weekday = '315',
  rate_winter_weekend = '315',
  rate_spring_weekday = '235',
  rate_spring_weekend = '235',
  rate_summer_weekday = '315',
  rate_summer_weekend = '315',
  rate_fall_weekday = '235',
  rate_fall_weekend = '235',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 315, 'weekend', 315),
      'spring', jsonb_build_object('weekday', 235, 'weekend', 235),
      'summer', jsonb_build_object('weekday', 315, 'weekend', 315),
      'fall', jsonb_build_object('weekday', 235, 'weekend', 235),
      'note', 'USD breakfast. Operator Deluxe Regular $235 / High $315 (320ranch.com/blog/cabins/deluxe-log-cabins/). Maps official site $235. Hotels.com May 14–15 2026 $235 confirms Regular. Expedia $200 / Super.com $163 are OTA floors — not ADR. Replaces 2026-09-01 381/422 stub.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published + split from empty shell using 320ranch.com + factsheet 58 units + Google Maps @45.1023972,-111.2180836 (4Q2J+XQ). This row is Deluxe Cabin qty 36. Corrected stub lat/lon 45.1997,-111.2316. rate_basis unknown → breakfast. Distinct from Rainbow Ranch Lodge and Riverbend Glamping.'
WHERE id = 11667
  AND property_id = 'd96fbbdd-5988-4fa5-8258-ffe6eee2940e';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed,
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
  property_fitness_room, property_tennis, property_waterfront, property_alcohol_available,
  property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_biking, activities_fishing, activities_swimming,
  activities_paddling, activities_whitewater_paddling, activities_wildlife_watching,
  activities_stargazing, activities_scenic_drives, activities_historic_sightseeing,
  activities_snow_sports, activities_horseback_riding,
  setting_forest, setting_ranch, setting_mountainous, setting_canyon,
  rv_parking,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', 'No', 'Sage', '320 Guest Ranch', v.site_name,
  'web_research_320_guest_ranch_operator_gmaps_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  58, v.qty, v.unit_type, v.capacity, v.bed,
  'Yes', 'Yes', v.kitchenette, v.full_kitchen,
  'No', 'Yes', 'Yes', 'Yes', 'Yes',
  'No', 'Yes', 'No', 'No', 'No',
  v.fridge, 'No', 'Yes', 'No',
  1898::numeric, NULL::smallint, NULL::smallint,
  v.season, '1',
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_fitness_room, g.property_tennis, g.property_waterfront, g.property_alcohol_available,
  g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_biking, g.activities_fishing, g.activities_swimming,
  g.activities_paddling, g.activities_whitewater_paddling, g.activities_wildlife_watching,
  g.activities_stargazing, g.activities_scenic_drives, g.activities_historic_sightseeing,
  g.activities_snow_sports, g.activities_horseback_riding,
  g.setting_forest, g.setting_ranch, g.setting_mountainous, g.setting_canyon,
  g.rv_parking,
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
      'Riverfront Cabin', 12::numeric, 'Cabin', '6', '1 Queen + 2 Full',
      'Yes', 'No', 'Yes',
      'Year-round. Twelve 2BR cabins ~100 yards from the Gallatin River. Efficiency kitchen + wood-burning fireplace.',
      '555', '555', '425', '425', '555', '555', '425', '425',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 555, 'weekend', 555), 'spring', jsonb_build_object('weekday', 425, 'weekend', 425), 'summer', jsonb_build_object('weekday', 555, 'weekend', 555), 'fall', jsonb_build_object('weekday', 425, 'weekend', 425), 'note', 'USD breakfast. Operator Regular $425 / High $555. 320ranch.com/blog/cabins/riverfront-log-cabins/.')),
      $$Riverfront Cabin (qty 12): 2BR log cabins about 100 yards from the Gallatin River. Living room with wood-burning fireplace, efficiency kitchen (Keurig, wine glasses), one full bath. Queen in one bedroom; two full beds in the other. Sleeps up to 6. Operator Regular $425 / High $555 including breakfast. Pets $75/night. Do not invent extra riverfront units.$$,
      '2BR riverfront cabin; queen + 2 full; fireplace; efficiency kitchen; full bath; Wi-Fi. No TV. No A/C. Pets $75/night. Shared fire pit, Weber grill, breakfast.',
      E'[2026-09-04] Added Riverfront Cabin qty 12 from 320ranch.com/blog/cabins/riverfront-log-cabins/.'
    ),
    (
      'Luxury Log Home', 7::numeric, 'Cabin', '10', '1 King + 1 Queen + 3 Full + bunk (twin/full)',
      'No', 'Yes', 'Yes',
      'Year-round. Seven 3BR / 2.5BA luxury log homes at the base of the surrounding mountains, short walk to McGill’s.',
      '775', '775', '590', '590', '775', '775', '590', '590',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 775, 'weekend', 775), 'spring', jsonb_build_object('weekday', 590, 'weekend', 590), 'summer', jsonb_build_object('weekday', 775, 'weekend', 775), 'fall', jsonb_build_object('weekday', 590, 'weekend', 590), 'note', 'USD breakfast. Operator Regular $590 / High $775. 320ranch.com/blog/cabins/3-bedroom-luxury-log-homes/. Accommodations hub: sleep 10; detail page “at least 8”.')),
      $$Luxury Log Home (qty 7): 3BR / 2.5BA homes with living-room fireplace and full kitchen. Master king; second bedroom queen + full; third bedroom two fulls + twin/full bunk. Operator accommodations page sleeps 10. Regular $590 / High $775 including breakfast. Pets $75/night. Do not invent an 8th home.$$,
      '3BR log home; full kitchen; 2.5 baths; fireplace; Wi-Fi. No TV. No A/C. Pets $75/night. Shared fire pit, Weber grill, breakfast.',
      E'[2026-09-04] Added Luxury Log Home qty 7 from 320ranch.com accommodations + /blog/cabins/3-bedroom-luxury-log-homes/.'
    ),
    (
      'Mountain Chalet', 2::numeric, 'Cabin', '5', '2 King + 1 Twin',
      'No', 'Yes', 'Yes',
      'Year-round. Two 3BR / 2BA chalets across the pasture with glass living/dining and mountain views.',
      '615', '615', '470', '470', '615', '615', '470', '470',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 615, 'weekend', 615), 'spring', jsonb_build_object('weekday', 470, 'weekend', 470), 'summer', jsonb_build_object('weekday', 615, 'weekend', 615), 'fall', jsonb_build_object('weekday', 470, 'weekend', 470), 'note', 'USD breakfast. Operator Regular $470 / High $615. 320ranch.com/blog/cabins/mountain-chalets/.')),
      $$Mountain Chalet (qty 2): 3BR / 2BA log chalets across the pasture. Two king bedrooms + one twin; full kitchen; living room with wood stove in a rock chimney; glass living/dining with mountain views. Sleeps 5. Regular $470 / High $615 including breakfast. Pets $75/night. Do not invent a 3rd chalet.$$,
      '3BR chalet; 2 king + twin; full kitchen; 2 baths; wood stove; mountain views; Wi-Fi. No TV. No A/C. Pets $75/night.',
      E'[2026-09-04] Added Mountain Chalet qty 2 from 320ranch.com/blog/cabins/mountain-chalets/.'
    ),
    (
      'Historic McGill Cabin', 1::numeric, 'Cabin', '2', '1 King',
      'No', 'Yes', 'Yes',
      'Year-round. Single 1927 cabin that was Dr. Caroline McGill’s home. Wrap-around deck over Buffalo Horn Creek.',
      '525', '525', '400', '400', '525', '525', '400', '400',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 525, 'weekend', 525), 'spring', jsonb_build_object('weekday', 400, 'weekend', 400), 'summer', jsonb_build_object('weekday', 525, 'weekend', 525), 'fall', jsonb_build_object('weekday', 400, 'weekend', 400), 'note', 'USD breakfast. Operator Regular $400 / High $525. 320ranch.com/cabins/historic-mcgill-cabin/.')),
      $$Historic McGill Cabin (qty 1): 1927 one-bedroom home of Dr. Caroline McGill. Living room with wood-burning stove, full kitchen, one full bath, king bedroom, wrap-around deck over Buffalo Horn Creek. Sleeps 2. Regular $400 / High $525 including breakfast. Pets $75/night. Do not duplicate this cabin.$$,
      'Historic 1BR cabin; king; full kitchen; wood stove; wrap-around creek deck; Wi-Fi. No TV. No A/C. Pets $75/night.',
      E'[2026-09-04] Added Historic McGill Cabin qty 1 from 320ranch.com/cabins/historic-mcgill-cabin/.'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed,
  kitchenette, full_kitchen, fridge,
  season,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE g.id = 11667
  AND g.property_id = 'd96fbbdd-5988-4fa5-8258-ffe6eee2940e'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = 'd96fbbdd-5988-4fa5-8258-ffe6eee2940e'
      AND x.site_name = v.site_name
  );

COMMIT;
