-- ============================================================================
-- Dawn Ranch (Guerneville, CA / Russian River): publish and split cabin /
-- orchard glamping inventory. Distinct from AutoCamp Russian River / AutoCamp
-- Sonoma, Highlands Resort, Johnson's Beach, boon hotel + spa, and Fern Grove.
-- Do not merge those properties.
--
-- Sources (retrieved 2026-09-04):
--   https://dawnranch.com/ (+ /stay/ /cabins/ /thegrove/ /glamping/ /faq/)
--   Mr & Mrs Smith room cards:
--     https://www.mrandmrssmith.com/luxury-hotels/dawn-ranch/rooms
--   Kayak (live Mon Sep 7–Tue Sep 8 2026):
--     https://www.kayak.com/Guerneville-Hotels-Dawn-Ranch.168367.ksp
--   Sonoma Magazine: 9 orchard glamping units, Apr–Oct
--   Google Maps business pin:
--     https://www.google.com/maps/place/Dawn+Ranch/@38.5014421,-123.0027558,17z
--     lat 38.5014421 / lon -123.0027558; plus code GX2W+HV
--     16467 CA-116, Guerneville, CA 95446
--     (skip google_place_id — CID /g/1tfnytfm only, not ChIJ)
--   AFAR: guest camping since 1905; redesigned hotel reopened 2022
--
-- Operating inventory:
--   Cabin qty 77 — residual 86 − 9. Covers roadside / redwood / sycamore /
--     grove cabins, meadow / redwood / Murphy's chalets, creekside / grove /
--     Olive's / Fern's / Spa cottages, and 2BR bungalows. Grove page says
--     19 historic cabins/cottages across River Road (subset, not extra).
--     No published cabin vs chalet vs cottage vs bungalow counts — do not
--     invent those SKUs.
--   Glamping Tent qty 9 — Sonoma Magazine orchard units (king shared-bath
--     canvas + queen private-bath tented trailers). Sleeper (design) said
--     six tents planned; use 9. Seasonal Apr–Oct.
--   property_total_sites = 86 (operator). Older CNT 81 / Kayak 49 / blog
--     82 are stale. Do not invent SKUs to close those gaps.
--
-- Rates USD, room_only. Do not set rate_avg_retail_daily_rate (trigger).
--   Kayak weeknight avg $446 / weekend $560; July avg $540; Sep 7–8 2026
--     from $145 with fees (discounter) to $595. Maps Expedia king $285
--     Sep 8–9 2026. Smith from $301.89 (next 60 days, inc. taxes/fees).
--   Cabin band updated from 2026-09-01 Kayak park ADR 475/605/562.
--   Tent: Smith Glamping King $313 Aug 2026 cash; Maps from $194 may be tent.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Dawn Ranch',
  slug = 'dawn-ranch-guerneville-ca',
  property_type = 'Ranch & Lodge',
  source = 'Sage',
  discovery_source = 'web_research_dawn_ranch_operator_gmaps_2026_09',
  address = '16467 CA-116',
  city = 'Guerneville',
  state = 'CA',
  zip_code = '95446',
  country = 'United States',
  lat = 38.5014421,
  lon = -123.0027558,
  url = 'https://dawnranch.com/',
  phone_number = '+1-707-869-0656',
  property_total_sites = 86,
  year_site_opened = 1905,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'Yes',
  property_laundry = 'No',
  property_pool = 'Yes',
  property_hot_tub = 'Yes',
  property_sauna = 'Yes',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  property_playground = 'No',
  property_general_store = 'No',
  property_extended_stay = 'Yes',
  property_pickball_courts = 'No',
  property_fitness_room = 'No',
  property_waterfront = 'Yes',
  property_alcohol_available = 'Yes',
  property_ota_platforms = ARRAY['booking.com', 'expedia', 'kayak']::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Historic 22-acre Russian River ranch hotel (guest camping since 1905; redesigned boutique reopen 2022). 86 keys: renovated cabins/chalets/cottages/bungalows plus 9 seasonal orchard glamping tents. The Lodge restaurant, spa (steam, sauna, redwood ofuro tubs), seasonal pool, private river beach. Green Key certified. Screen-free rooms (no TVs). Distinct from AutoCamp Russian River and Highlands Resort. Contact hello@dawnranch.com.',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD. Direct book dawnranch.com (Olive). Check-in 4:00 PM / check-out 11:00 AM. Meals at The Lodge extra. Dogs in select cabins only: email ahead; $150/stay first dog + $75 second; leash in public areas; no pets in dining/pool or most cottages. $1/night to Russian Riverkeeper (Kind Traveler). Green Key. hello@dawnranch.com; (707) 869-0656.',
  description = $$Historic 22-acre ranch hotel at 16467 CA-116, Guerneville, California (Google Maps 38.5014421, -123.0027558; plus code GX2W+HV), on a bend of the Russian River under redwoods, with a private beach and 120-year apple orchard. 86 accommodations: renovated cabins, chalets, cottages, and bungalows plus nine seasonal orchard glamping tents. The Lodge restaurant, spa with redwood soaking tubs, seasonal pool, The Grove enclave across River Road. Guest camping since 1905; current hotel reopen 2022. Distinct from AutoCamp Russian River.$$,
  activities_raw = 'On-site: The Lodge dining and bar, spa (massage, steam, sauna, redwood ofuro tubs), seasonal outdoor pool, Grove pool, yoga/meditation, garden and orchard, private Russian River beach, kayak/canoe/tube, complimentary bikes, fire pits, stargazing, Fender guitars, picnic blankets. Nearby: downtown Guerneville, Johnson’s Beach, Armstrong Redwoods SNR, Sonoma wine country, Jenner / Pacific.',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_fishing = 'Yes',
  activities_swimming = 'Yes',
  activities_paddling = 'Yes',
  activities_canoeing_kayaking = 'Yes',
  activities_boating = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_historic_sightseeing = 'Yes',
  setting_forest = 'Yes',
  setting_redwoods = 'Yes',
  setting_ranch = 'Yes',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11796
  AND property_id = 'e8e5f2e8-da54-42e6-8266-1155e37b5748';

-- Existing Cabin stub → hard-sided mix qty 77.
UPDATE public.all_sage_data
SET
  site_name = 'Cabin',
  unit_type = 'Cabin',
  quantity_of_units = 77,
  unit_capacity = '4',
  unit_bed = 'Queen or King (cottages/bungalows add 2nd bedroom)',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'No',
  unit_patio = 'Yes',
  unit_mini_fridge = 'Yes',
  unit_ada_accessibility = 'Yes',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. Roadside, Redwood, Sycamore, Grove cabins; Meadow / Redwood / Murphy’s chalets; cottages and 2BR bungalows. Qty 77 is residual 86 − 9 tents.',
  minimum_nights = '1',
  unit_description = $$Cabin / chalet / cottage / bungalow mix (qty 77): residual so 77 + 9 tents = operator 86. Includes Roadside, Redwood, Sycamore, and Grove cabins; Meadow, Redwood, and ADA Murphy’s chalets; Creekside, Grove, Olive’s, Fern’s, and Spa cottages; 2BR bungalows with full kitchens. Ensuite baths, A/C, Smeg mini-fridge, decks. Select cabins are dog-friendly ($150/stay). Grove’s 19 historic 1920 cabins/cottages are a subset, not extra keys. Bungalows have kitchens and TVs; most rooms are screen-free. Do not invent separate chalet/cottage/bungalow SKUs.$$,
  amenities_raw = 'Cabin/chalet/cottage; ensuite; A/C; Wi-Fi; mini-fridge; deck. Select cabins pet-friendly. ADA units. Shared: Lodge restaurant, spa, pool, river beach. Most rooms no TV.',
  rate_winter_weekday = '400',
  rate_winter_weekend = '460',
  rate_spring_weekday = '450',
  rate_spring_weekend = '520',
  rate_summer_weekday = '540',
  rate_summer_weekend = '620',
  rate_fall_weekday = '475',
  rate_fall_weekend = '560',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 400, 'weekend', 460),
      'spring', jsonb_build_object('weekday', 450, 'weekend', 520),
      'summer', jsonb_build_object('weekday', 540, 'weekend', 620),
      'fall', jsonb_build_object('weekday', 475, 'weekend', 560),
      'note', 'USD room_only. Kayak weeknight avg $446 / weekend $560; July avg $540. Maps Expedia king $285 Sep 8–9 2026 is a live floor (fees extra). Smith from $301.89 next 60 days inc. taxes/fees. Replaces 2026-09-01 Kayak park ADR 475/605/562. kayak.com/Guerneville-Hotels-Dawn-Ranch.168367.ksp.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published + split from Cabin stub using dawnranch.com + Smith + Kayak + Google Maps @38.5014421,-123.0027558 (GX2W+HV). This row is Cabin qty 77 (residual 86 − 9 tents). Distinct from AutoCamp Russian River.'
WHERE id = 11796
  AND property_id = 'e8e5f2e8-da54-42e6-8266-1155e37b5748';

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
  property_fitness_room, property_waterfront, property_alcohol_available,
  property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_biking, activities_fishing, activities_swimming,
  activities_paddling, activities_canoeing_kayaking, activities_boating,
  activities_wildlife_watching, activities_stargazing, activities_scenic_drives,
  activities_historic_sightseeing,
  setting_forest, setting_redwoods, setting_ranch,
  rv_parking,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', 'Dawn Ranch', v.site_name,
  'web_research_dawn_ranch_operator_gmaps_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  86, v.qty, v.unit_type, v.capacity, v.bed,
  v.ensuite, v.shower, 'No', 'No',
  v.ac, 'Yes', 'No', 'Yes', 'Yes',
  'Yes', 'Yes', 'No', 'No', 'No',
  'Yes', NULL, NULL, 'No',
  1905::numeric, 4::smallint, 10::smallint,
  v.season, '1',
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_fitness_room, g.property_waterfront, g.property_alcohol_available,
  g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_biking, g.activities_fishing, g.activities_swimming,
  g.activities_paddling, g.activities_canoeing_kayaking, g.activities_boating,
  g.activities_wildlife_watching, g.activities_stargazing, g.activities_scenic_drives,
  g.activities_historic_sightseeing,
  g.setting_forest, g.setting_redwoods, g.setting_ranch,
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
      'Glamping Tent', 9::numeric, 'Safari Tent', '2', '1 King or 1 Queen',
      'No', 'No', 'No',
      'Seasonal April–October in the historic orchard (Sonoma Magazine). King canvas tents share a bathhouse; queen tented trailers have private bath and A/C.',
      '250', '280', '275', '320', '313', '360', '275', '320',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 250, 'weekend', 280), 'spring', jsonb_build_object('weekday', 275, 'weekend', 320), 'summer', jsonb_build_object('weekday', 313, 'weekend', 360), 'fall', jsonb_build_object('weekday', 275, 'weekend', 320), 'note', 'USD room_only. Smith Glamping King $313 Aug 2026 cash. Maps from $194 Sep 8–9 2026 may be tent/discounter. Seasonal Apr–Oct. Sleeper said six tents planned; Sonoma Magazine 9 — use 9.')),
      $$Orchard glamping (qty 9): king canvas safari tents (~225 sf) with shared luxury bathhouse, plus queen tented trailers (~170 sf) with private bath, A/C, and climate control. Private deck and fire pit in the 120-year apple orchard. Smeg mini-fridge, Le Labo, Wi-Fi. No pets. Full access to The Lodge, spa, pool, and river. Seasonal April–October.$$,
      'Safari tent / tented trailer; deck; fire pit; mini-fridge; Wi-Fi. King units shared bath; queen units ensuite + A/C. No pets. Seasonal Apr–Oct.',
      E'[2026-09-04] Added Glamping Tent qty 9 (Safari Tent) from Sonoma Magazine + Smith orchard SKUs.'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed,
  ensuite, shower, ac,
  season,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE g.id = 11796
  AND g.property_id = 'e8e5f2e8-da54-42e6-8266-1155e37b5748'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = 'e8e5f2e8-da54-42e6-8266-1155e37b5748'
      AND x.site_name = v.site_name
  );

COMMIT;
