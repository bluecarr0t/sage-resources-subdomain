-- ============================================================================
-- The Fields / The Fields of Michigan (South Haven, MI): enrich the already-
-- published Under Canvas Outdoor Collection property and reject the duplicate
-- in_progress stub named "The Fields". Distinct from Off Map Glamping
-- (stayoffmap.com). Do not merge those properties.
--
-- Sources (retrieved 2026-09-04):
--   https://www.thefieldsofmichigan.com/ (+ /accommodations/ /faq/ /offers/)
--   Press (Globe Newswire / Financial Post, 2026-02-03): 45 tents + 9 cottages
--     after adding 26 new tents for 2026.
--   Rural Innovation Exchange: opened 2019; Under Canvas acquired Apr 2025;
--     30-acre blueberry farm.
--   Google Maps business pin (matches existing published coords):
--     https://www.google.com/maps/place/The+Fields+of+Michigan/@42.430575,-86.2078939,17z
--     plus code CQJR+6R; keep google_place_id ChIJiWvzVShVF4gRAWYYidWRWyU
--   Thrifty Traveler: tents ~$250 cash / cottages ~$400; Hyatt 20k pts tents
--   Visit South Haven: $300–$400
--   Maps Sep 27–28 2026 (late season): official $219; Expedia $199; Vio $181
--
-- Inventory:
--   Fields Tent qty 45 (Canvas Tent) — id 9516. Includes 26 new 2026 tents.
--     FAQ still mentions Simple Tents (no electric / shared bath) but the
--     current accommodations page does not list them — do not invent a
--     Simple Tent SKU.
--   Fields Cottage qty 9 (Cottage) — id 9517. King or 2-queen ensuite.
--   property_total_sites = 54
--   Reject id 9623 (duplicate published "Glamping Tent" row, same property).
--   Reject property_id e718dc0e-… id 13125 ("The Fields" in_progress stub,
--     same 154 68th Street / thefieldsofmichigan.com).
--
-- Rates USD, breakfast (complimentary continental). Do not set
-- rate_avg_retail_daily_rate (trigger). Cottage band was inverted/low vs tents;
-- raise cottages toward Thrifty ~$400. Seasonal May 14–Nov 1 2026 (homepage).
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'The Fields of Michigan',
  slug = 'the-fields-of-michigan',
  property_type = 'Glamping',
  source = 'Sage',
  discovery_source = 'web_research_the_fields_operator_gmaps_2026_09',
  address = '154 68th Street',
  city = 'South Haven',
  state = 'MI',
  zip_code = '49090',
  country = 'United States',
  lat = 42.430575,
  lon = -86.2078939,
  url = 'https://www.thefieldsofmichigan.com/',
  phone_number = '+1-888-970-9905',
  property_total_sites = 54,
  year_site_opened = 2019,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'Yes',
  property_laundry = 'No',
  property_pool = 'Yes',
  property_hot_tub = 'No',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  property_playground = 'No',
  property_general_store = 'Yes',
  property_extended_stay = 'Yes',
  property_pickball_courts = 'No',
  property_fitness_room = 'No',
  property_waterfront = 'No',
  property_alcohol_available = 'Yes',
  property_ota_platforms = ARRAY['expedia', 'booking.com', 'kayak']::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Outdoor Collection by Under Canvas on a 30-acre working blueberry farm. 2026 expansion: 45 ensuite Fields Tents + 9 cottages. The Willow (breakfast, supper club, wine hour), The Outpost (bikes/gear), seasonal pool, nature-massage cabins, retail. Complimentary continental breakfast. Distinct from Off Map Glamping. info@thefieldsofmichigan.com.',
  rate_basis = 'breakfast',
  rate_basis_notes = 'USD. Complimentary continental breakfast in The Willow 7:30–10:00 AM. Dinner extra (café nightly; Supper Club Thu–Sun, OpenTable). Check-in 3:00 PM / check-out 10:00 AM. Dogs $35/pet/night; do not leave unattended. Seasonal 2026: May 14–Nov 1 (homepage; press said Apr 30). 2027: Apr 29–Nov 1. Direct book thefieldsofmichigan.com; also Hyatt / Mr & Mrs Smith. +1-888-970-9905.',
  description = $$Seasonal glamping retreat at 154 68th Street, South Haven, Michigan (Google Maps 42.430575, -86.2078939; plus code CQJR+6R), on a 30-acre working blueberry farm three miles from Lake Michigan. Outdoor Collection by Under Canvas. 54 accommodations: 45 Fields Tents and 9 cottages after the 2026 expansion (26 new tents). The Willow dining, The Outpost, seasonal pool, complimentary breakfast. Opened 2019; acquired by Under Canvas April 2025. Distinct from Off Map Glamping.$$,
  activities_raw = 'On-site: seasonal pool (Memorial Day–Labor Day, 11am–8pm, unheated), The Willow (breakfast, café, Supper Club, sunset wine hour), The Outpost (yoga mats, hiking poles, complimentary cruiser bikes), blueberry picking (Jul–Aug), lavender fields, firepits, s’mores, nature massage cabins, games. Off-site: Kal-Haven Trail to Lake Michigan (~40 min bike), South Haven beach and lighthouse, SW Michigan wineries.',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_swimming = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  setting_forest = 'Yes',
  setting_field = 'Yes',
  setting_farm = 'Yes',
  setting_lake = 'No',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE property_id = '09eb4831-15c0-484a-ace9-f9a642ce6c8a'
  AND id IN (9516, 9517);

-- Fields Tent qty 45 (keep id 9516; Canvas Tent).
UPDATE public.all_sage_data
SET
  site_name = 'Fields Tent',
  unit_type = 'Canvas Tent',
  quantity_of_units = 45,
  unit_capacity = '2',
  unit_bed = 'King (heated mattress pad)',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'No',
  unit_pets = 'Yes',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_mini_fridge = 'No',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = 5,
  season_close_month = 11,
  operating_season_months = 'Seasonal. 2026 homepage: May 14–Nov 1. 2027: Apr 29–Nov 1. Press release used Apr 30 2026. Qty 45 includes 26 new 2026 tents (Globe Newswire).',
  minimum_nights = '1',
  unit_description = $$Fields Tent (qty 45, Canvas Tent): ensuite king tent with heated mattress pad, electric fireplace, evaporative cooling / A/C, rainfall shower, private deck, firepit, vintage cooler. Wi-Fi in The Willow only. Dogs $35/night. FAQ still mentions Simple Tents (no electric, shared bath) but they are not on the current accommodations page — do not invent a Simple Tent SKU. 26 of these 45 are the 2026 expansion tents.$$,
  amenities_raw = 'Canvas tent; ensuite rain shower; electric fireplace; evaporative cooling; king bed; deck; firepit; cooler. No in-tent Wi-Fi or fridge. Pets OK ($35/night).',
  rate_winter_weekday = '200',
  rate_winter_weekend = '230',
  rate_spring_weekday = '230',
  rate_spring_weekend = '280',
  rate_summer_weekday = '275',
  rate_summer_weekend = '325',
  rate_fall_weekday = '220',
  rate_fall_weekend = '270',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 200, 'weekend', 230),
      'spring', jsonb_build_object('weekday', 230, 'weekend', 280),
      'summer', jsonb_build_object('weekday', 275, 'weekend', 325),
      'fall', jsonb_build_object('weekday', 220, 'weekend', 270),
      'note', 'USD breakfast. Property closed in winter; winter band is a closed-season placeholder. Thrifty Traveler tents ~$250 cash. Maps official $219 Sep 27–28 2026 (late season); Expedia $199; Vio $181. Visit South Haven $300–$400 park range. Replaces prior tent 250–325 fall-heavy band.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Enriched + kept published using thefieldsofmichigan.com + Globe Newswire 45 tents / 9 cottages + Google Maps @42.430575,-86.2078939 (CQJR+6R). This row is Fields Tent qty 45. Duplicate Glamping Tent row 9623 rejected. Distinct from Off Map Glamping.'
WHERE id = 9516
  AND property_id = '09eb4831-15c0-484a-ace9-f9a642ce6c8a';

-- Fields Cottage qty 9. unit_type Cabin → Cottage.
UPDATE public.all_sage_data
SET
  site_name = 'Fields Cottage',
  unit_type = 'Cottage',
  quantity_of_units = 9,
  unit_capacity = '4',
  unit_bed = 'King or 2 Queens',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'No',
  unit_pets = 'Yes',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_mini_fridge = 'No',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = 5,
  season_close_month = 11,
  operating_season_months = 'Seasonal with Fields Tents. Qty 9 from Globe Newswire / Rural Innovation / Modern Campground 2026 expansion coverage.',
  minimum_nights = '1',
  unit_description = $$Fields Cottage (qty 9): hard-sided ensuite cottages — king (2 guests) or two queens (up to 4). Temperature control, rain shower, in-room coffee, desk, private firepit, forest views. Wi-Fi in The Willow only. Dogs $35/night. Do not invent king vs two-queen SKU counts.$$,
  amenities_raw = 'Cottage; ensuite rain shower; A/C + heat; in-room coffee; desk; firepit; forest view. No in-cottage Wi-Fi. Pets OK ($35/night).',
  rate_winter_weekday = '320',
  rate_winter_weekend = '380',
  rate_spring_weekday = '350',
  rate_spring_weekend = '410',
  rate_summer_weekday = '400',
  rate_summer_weekend = '470',
  rate_fall_weekday = '360',
  rate_fall_weekend = '420',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 320, 'weekend', 380),
      'spring', jsonb_build_object('weekday', 350, 'weekend', 410),
      'summer', jsonb_build_object('weekday', 400, 'weekend', 470),
      'fall', jsonb_build_object('weekday', 360, 'weekend', 420),
      'note', 'USD breakfast. Replaces inverted/low 175–275 cottage band. Thrifty Traveler cottages ~$400 cash (Hyatt 35k–45k pts). Visit South Haven $300–$400. Winter closed-season placeholder.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Enriched + remapped unit_type Cabin → Cottage. This row is Fields Cottage qty 9. Raised cottage ADR above tents.'
WHERE id = 9517
  AND property_id = '09eb4831-15c0-484a-ace9-f9a642ce6c8a';

-- Duplicate published tent row on the same property.
UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected as duplicate site row of Fields Tent id 9516 on the same The Fields of Michigan property. Inventory lives on 9516 (qty 45) + 9517 (qty 9).'
WHERE id = 9623
  AND property_id = '09eb4831-15c0-484a-ace9-f9a642ce6c8a';

-- In-progress stub named "The Fields" — same physical resort / URL / address.
UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected as duplicate of published The Fields of Michigan (property_id 09eb4831-15c0-484a-ace9-f9a642ce6c8a). Same 154 68th Street South Haven blueberry-farm resort and thefieldsofmichigan.com. Stub Safari Tent qty 10 / $100 Hour Detroit ADR was stale.'
WHERE id = 13125
  AND property_id = 'e718dc0e-3562-4e2e-9e2a-8f6f9bcc06c7';

COMMIT;
