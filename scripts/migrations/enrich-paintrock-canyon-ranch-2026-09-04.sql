-- ============================================================================
-- Paintrock Canyon Ranch (Hyattville, WY / Bighorn Mountains): publish
-- Ranchlands guest-camp tents + campus lodging. Distinct from Paint Rock
-- Farm (Hot Springs, NC), Paintrock Angus Ranch, The Hideout Lodge & Guest
-- Ranch (Shell, WY), and other Ranchlands-managed stays. Do not merge those.
--
-- Sources (retrieved 2026-09-04):
--   https://ranchlands.com/pages/prcr-ranch-vacations
--     /accommodations-paintrock /paintrock-campus /paintrock-retreats
--   Cloudbeds book:
--     https://hotels.cloudbeds.com/reservation/943OgV
--     purchased 2020; opened to guests 2023; 14 safari tents
--   All Roads North (Apr 2026): third guest season; 14 tents; 80,000 acres
--   Google Maps business pin:
--     https://www.google.com/maps/place/Paintrock+Canyon+Ranch/@44.27205,-107.5193793,17z
--     lat 44.27205 / lon -107.5193793; plus code 7FCJ+R6
--     5332 County Road 49 1/2, Hyattville, WY 82428
--     google_place_id ChIJf61m4lJXSlMRETALApJ01B8
--     (same physical pin as older “Paintrock Canyon Enterprises” listing —
--     that is the prior ranch name, not a second property)
--
-- Operating inventory:
--   Glamping Tent qty 14 — operator 10 king + 4 double safari wall tents
--     at Paintrock Camp. Shared outdoor showers (2) and composting toilets (4).
--     Typically single-occupancy unless a guest shares a double tent.
--   Cabin qty 13 — Paintrock Campus residual. Operator “13 rooms across two
--     accommodation types” (treehouse rooms + creekside cabins), 26 beds,
--     shared bathhouses, Charles Rose lodge. No published treehouse vs cabin
--     split — do not invent those SKUs. Group buyout only; no published ADR.
--   property_total_sites = 27 (14+13)
--
-- Rates USD, all_inclusive. Do not set rate_avg_retail_daily_rate (trigger).
--   Ranch vacation: $4,150 pp / 5 nights = $830/night. Typically 1 guest per
--     tent — store unit ADR as $830, not ×2. Tax/gratuity extra. Closed
--     mid-October to mid-May. Islands $620 pp and stub 22/28/26 are stale.
--   Campus: quote-only group package — do not invent a nightly rate.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Paintrock Canyon Ranch',
  slug = 'paintrock-canyon-ranch-hyattville-wy',
  property_type = 'Ranch & Lodge',
  source = 'Sage',
  discovery_source = 'web_research_paintrock_canyon_ranch_operator_gmaps_2026_09',
  address = '5332 County Road 49 1/2',
  city = 'Hyattville',
  state = 'WY',
  zip_code = '82428',
  country = 'United States',
  lat = 44.27205,
  lon = -107.5193793,
  google_place_id = 'ChIJf61m4lJXSlMRETALApJ01B8',
  url = 'https://ranchlands.com/pages/prcr-ranch-vacations',
  phone_number = '+1-719-641-2089',
  property_total_sites = 27,
  year_site_opened = 2023,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'Yes',
  property_laundry = 'No',
  property_pool = 'Yes',
  property_hot_tub = 'No',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No',
  property_has_rentals = 'Yes',
  property_playground = 'No',
  property_general_store = 'No',
  property_extended_stay = 'No',
  property_pickball_courts = 'No',
  property_fitness_room = 'No',
  property_waterfront = 'Yes',
  property_alcohol_available = 'Yes',
  property_ota_platforms = ARRAY['cloudbeds']::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Ranchlands-owned 80,000-acre working cattle ranch at the west base of the Bighorns (purchased ~2020; guests 2023). Guest product is an all-inclusive 5-night ranch vacation in 14 furnished safari tents plus a privately booked Charles Rose campus (13 rooms). Shared baths at both camp and campus; private chef / Ranchlands beef. Luxury positioning despite shared facilities. Distinct from Paint Rock Farm (NC) and Paintrock Angus. stay@ranchlands.com.',
  rate_basis = 'all_inclusive',
  rate_basis_notes = 'USD. Ranch vacation $4,150 per person for 5 nights / 4 activity days (lodging, meals, riding/hiking/fishing). Tax and gratuity not included. Typically 1 guest per tent — unit ADR $830, not double occupancy. Check-in 3:00 PM / check-out 10:00 AM (Cloudbeds). Closed mid-October to mid-May. No pets. Guest horses $25/night with Coggins. Rider weight limit 230 lb. Campus group buyout is quote-only (meals included; alcohol extra). stay@ranchlands.com; +1-719-641-2089.',
  description = $$Ranchlands working cattle ranch at 5332 County Road 49 1/2, Hyattville, Wyoming (Google Maps 44.27205, -107.5193793; plus code 7FCJ+R6), on 80,000 acres at the west base of the Bighorn Mountains along Paintrock Creek. Guest lodging is 14 safari-style wall tents at Paintrock Camp plus a 13-room Charles Rose campus (treehouse rooms and creekside cabins) for private groups. All-inclusive ranch weeks with daily rides, fly fishing, hiking, and chef meals. Ranchlands purchased the ranch around 2020 and opened to guests in 2023. Distinct from Paint Rock Farm in North Carolina and from Paintrock Angus Ranch.$$,
  activities_raw = 'On-site: daily horseback rides (~5 hours) with a matched horse, fly fishing on Paintrock Creek (rainbow, brown, brook, cutthroat), hiking, wildlife viewing (elk, pronghorn, deer, moose, black bear, birds), creek swim / cold plunge, leatherwork and outdoor-skills workshops, evening campfire and stargazing. Campus add-ons: yoga, lodge game room, summer pool. Nearby: Medicine Lodge Archaeological Site petroglyphs, Cloud Peak, Hyattville, Cody (~1.5 hr), Billings (~3 hr).',
  activities_hiking = 'Yes',
  activities_horseback_riding = 'Yes',
  activities_fishing = 'Yes',
  activities_swimming = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_historic_sightseeing = 'Yes',
  setting_forest = 'Yes',
  setting_mountainous = 'Yes',
  setting_ranch = 'Yes',
  setting_canyon = 'Yes',
  setting_field = 'Yes',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13083
  AND property_id = 'c1b82baa-0cf1-48e3-b7b9-44ab0c5e46c1';

-- Existing Safari Tent stub → Glamping Tent qty 14.
UPDATE public.all_sage_data
SET
  site_name = 'Glamping Tent',
  unit_type = 'Safari Tent',
  quantity_of_units = 14,
  unit_capacity = '1',
  unit_bed = '1 King (10 tents) or 2 Full (4 double tents)',
  unit_private_bathroom = 'No',
  unit_shower = 'No',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'No',
  unit_wifi = 'No',
  unit_pets = 'No',
  unit_electricity = 'No',
  unit_water = 'No',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_mini_fridge = 'No',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = 5,
  season_close_month = 10,
  operating_season_months = 'Seasonal mid-May–mid-October (closed mid-Oct to mid-May). 10 king + 4 double safari tents. Typically single occupancy; share a double tent on request. 5-night Sunday–Friday ranch weeks.',
  minimum_nights = '5',
  unit_description = $$Safari-style wall tent (qty 14): 10 king tents and 4 double tents (two full beds) along Paintrock Creek, each with down comforter, wool blankets, dresser, chairs, battery pendulum lights, screened windows, and two Adirondack chairs outside. No in-tent power or plumbing. Shared: 2 hot-water showers, 4 composting toilets, lounge tent, bar, and outdoor chef kitchen. Typically one guest per tent. 5-night all-inclusive ranch vacation. No pets.$$,
  amenities_raw = 'Furnished safari tent; king or two fulls; solar path lights; no power/plumbing in tent. Shared showers and composting toilets. No pets. No Wi-Fi (cell ~10 min walk).',
  rate_winter_weekday = '830',
  rate_winter_weekend = '830',
  rate_spring_weekday = '830',
  rate_spring_weekend = '830',
  rate_summer_weekday = '830',
  rate_summer_weekend = '830',
  rate_fall_weekday = '830',
  rate_fall_weekend = '830',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 830, 'weekend', 830),
      'spring', jsonb_build_object('weekday', 830, 'weekend', 830),
      'summer', jsonb_build_object('weekday', 830, 'weekend', 830),
      'fall', jsonb_build_object('weekday', 830, 'weekend', 830),
      'note', 'USD all_inclusive. Operator $4,150 pp / 5 nights = $830/night. Typically single occupancy — not pp×2. Winter/early spring closed (mid-Oct–mid-May); stored as the same package rate. Replaces stub 22/28/26 and Islands $620. Tax/gratuity extra. ranchlands.com/pages/prcr-ranch-vacations.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published + split from Safari Tent stub using ranchlands.com + Cloudbeds + Google Maps @44.27205,-107.5193793 (7FCJ+R6, ChIJf61m4lJXSlMRETALApJ01B8). property_type Glamping → Ranch & Lodge; is_glamping_property Yes. This row is Glamping Tent qty 14. Replaced firecrawl $25 ADR. Distinct from Paint Rock Farm (NC) and Paintrock Angus.'
WHERE id = 13083
  AND property_id = 'c1b82baa-0cf1-48e3-b7b9-44ab0c5e46c1';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  google_place_id,
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
  property_fitness_room, property_waterfront, property_alcohol_available,
  property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_horseback_riding, activities_fishing, activities_swimming,
  activities_wildlife_watching, activities_stargazing, activities_scenic_drives,
  activities_historic_sightseeing,
  setting_forest, setting_mountainous, setting_ranch, setting_canyon, setting_field,
  rv_parking,
  rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', 'Paintrock Canyon Ranch', v.site_name,
  'web_research_paintrock_canyon_ranch_operator_gmaps_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  g.google_place_id,
  27, v.qty, v.unit_type, v.capacity, v.bed,
  'No', 'No', 'No', 'No',
  'No', 'No', 'No', 'Yes', 'Yes',
  'No', 'Yes', 'No', 'No', 'No',
  'No', NULL, NULL, 'No',
  2023::numeric, 5::smallint, 10::smallint,
  v.season, NULL,
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_fitness_room, g.property_waterfront, g.property_alcohol_available,
  g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_horseback_riding, g.activities_fishing, g.activities_swimming,
  g.activities_wildlife_watching, g.activities_stargazing, g.activities_scenic_drives,
  g.activities_historic_sightseeing,
  g.setting_forest, g.setting_mountainous, g.setting_ranch, g.setting_canyon, g.setting_field,
  g.rv_parking,
  g.rate_basis, g.rate_basis_notes,
  g.description, v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    (
      'Cabin', 13::numeric, 'Cabin', '2', 'Configurable kings (26 beds across 13 rooms)',
      'Year-round group buyouts marketed; campus pool in summer. 13 rooms = treehouse rooms + creekside cabins. Shared bathhouses. No published treehouse vs cabin split.',
      $$Campus lodging (qty 13): residual covering Charles Rose treehouse rooms and creekside cabins (26 beds, configurable as kings). Each cluster shares a bathhouse (teak floors, individual showers, private wash closets). Main lodge with game room, library/fireplace, bar, and dining for ~30. Summer outdoor pool, rooftop deck. Privately booked groups only (base package: lodging for up to 13, chef meals, guided hike/fish; alcohol extra). Do not invent separate Treehouse vs Cabin SKUs. No published nightly rate — do not store a campus ADR.$$,
      'Hard-sided campus room; shared bathhouse; lodge access; summer pool. Group buyout only. No pets assumed (ranch vacation policy).',
      E'[2026-09-04] Added Cabin qty 13 (campus residual) from ranchlands.com/pages/paintrock-campus. Quote-only rates — no ADR invented.'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed,
  season, unit_desc, amenities, note
)
WHERE g.id = 13083
  AND g.property_id = 'c1b82baa-0cf1-48e3-b7b9-44ab0c5e46c1'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = 'c1b82baa-0cf1-48e3-b7b9-44ab0c5e46c1'
      AND x.site_name = v.site_name
  );

COMMIT;
