-- ============================================================================
-- Platte Canyon Glamping at Brush Creek Ranch (Saratoga, WY): publish and
-- split 3 named exclusive-use SKUs.
--
-- Sources (retrieved 2026-09-03):
--   https://www.brushcreekranch.com/platte-canyon-glamping
--   https://www.brushcreekranch.com/platte-canyon-glamping/accommodations
--     /uline-yurt /one-bar-eleven-glamping-tent /xh-glamping-tent /cuisine
--   https://www.brushcreekranch.com/blog/introducing-platte-canyon-glamping-dude-ranch-accommodations
--   Launch press: Hidden Doorways + Cowboy State Daily (Jun 2025) $4,500/night
--   Google Maps (no dedicated Platte Canyon listing — Lodge & Spa gates used):
--     https://www.google.com/maps/place/Lodge+%26+Spa+at+Brush+Creek+Ranch/@41.3321297,-106.6066217,17z
--     lat 41.3321297 / lon -106.6066217; plus code 89JV+V9; 66 Brush Creek Ranch Rd
--     Camp itself is ~25 min from these gates on the North Platte / Sanger Ranch.
--     Prior 1016 Country Road 660 / 41.2114233,-106.5167326 was a French Creek copy.
--
-- Operating inventory (exclusive buyout, up to 8 guests / 3 bedrooms; qty 1 each):
--   Uline Yurt — King + sleeper sofa + couch; std 2 / max 4; dining table for 8
--   One Bar Eleven Glamping Tent — 16×20 (320 sq ft); King; max 2; river deck
--   XH Glamping Tent — 320 sq ft; 2 Full; max 2; river deck
--   Shared bathhouse with running water; electricity; pot-belly stoves; ceiling fans
--   property_total_sites = 3
--
-- Season: May through mid-October. Launched 15 Jun 2025. 3-night minimum.
-- Rates USD, all_inclusive. Exclusive camp buyout from $4,500/night + tax/fees
--   for up to 8 guests (not per-unit; do not sum the three rows).
--   Includes private chef (3 meals), beer/wine/spirits (21+), personal host,
--   two activities/day. No published weekday/weekend split. Winter closed.
--   Replaces 2026-09-01 Tavily ~$795 ADR (misread of the $4,500 package).
-- rate_avg_retail_daily_rate maintained by calc_avg_rate_trigger.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Platte Canyon Glamping at Brush Creek Ranch',
  slug = 'platte-canyon-glamping-at-brush-creek-ranch-saratoga-wy',
  property_type = 'Glamping Resort',
  source = 'Sage',
  discovery_source = 'web_research_platte_canyon_brush_creek_operator_gmaps_2026_09',
  address = '66 Brush Creek Ranch Road',
  city = 'Saratoga',
  state = 'WY',
  zip_code = '82331',
  country = 'United States',
  lat = 41.3321297,
  lon = -106.6066217,
  url = 'https://www.brushcreekranch.com/platte-canyon-glamping',
  phone_number = '+1-307-327-5284',
  property_total_sites = 3,
  year_site_opened = 2025,
  season_open_month = 5,
  season_close_month = 10,
  property_clubhouse = 'No',
  property_food_on_site = 'Yes',
  property_restaurant = 'No',
  property_laundry = NULL,
  property_pool = 'No',
  property_hot_tub = NULL,
  property_sauna = NULL,
  property_family_friendly = 'Yes',
  property_remote_work_friendly = NULL,
  property_has_rentals = 'Yes',
  property_playground = 'No',
  property_general_store = 'No',
  property_extended_stay = 'No',
  property_pickball_courts = 'No',
  property_ota_platforms = NULL,
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Exclusive-use all-inclusive riverfront camp (max 8) in the Brush Creek Luxury Ranch Collection: 1 luxury yurt + 2 safari canvas tents, private chef, personal host, shared bathhouse, ranch activities, wine-cellar access at The Farm. Launch from $4,500/night. Distinct from Lodge & Spa (Outdoor Boutique Hotel) and French Creek.',
  rate_basis = 'all_inclusive',
  rate_basis_notes = 'USD. Exclusive buyout of the whole camp (yurt + both tents), not bookable by the tent. From $4,500/night plus taxes/fees for up to 8 guests; 3-night minimum (Cowboy State Daily / Hidden Doorways, Jun 2025). Includes three chef-prepared meals daily, beer/wine/spirits (21+), personal host, and two activities per day. Inquire at brushcreekranch.com or +1-307-327-5284; operator does not publish a live rack. Seasonal May–mid-October.',
  description = $$Exclusive all-inclusive glamping camp on the North Platte River in the Brush Creek Ranch collection near Saratoga, Wyoming — about 25 minutes from the Lodge & Spa gates (Google Maps pin 41.3321297, -106.6066217; plus code 89JV+V9; mailing 66 Brush Creek Ranch Road) on the historic Sanger Ranch. One Uline Yurt and two 16×20 river-facing safari tents sleep up to 8 with a shared bathhouse, private chef, personal host, and ranch activities. Seasonal May–mid-October; launched June 2025. Distinct from French Creek and the Lodge & Spa.$$,
  activities_raw = 'All-inclusive ranch adventures (two per day): fly fishing on private North Platte water, horseback riding, hiking, wildlife watching, stargazing with on-site telescope, riverside cocktail hour, fire-pit s’mores. Collection-wide access to 30,000 private acres, ~20 miles of private water, and The Farm wine cellar. Nearby: Saratoga (~17 miles from Lodge gates), Laramie Regional (~1 hr), DEN (~3.5 hr).',
  activities_hiking = 'Yes',
  activities_fishing = 'Yes',
  activities_stargazing = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_paddling = 'Yes',
  activities_boating = 'Yes',
  activities_swimming = NULL,
  setting_ranch = 'Yes',
  setting_mountainous = 'Yes',
  setting_forest = 'Yes',
  setting_canyon = 'Yes',
  setting_field = 'Yes',
  date_updated = '2026-09-03'
WHERE property_id = 'c57fe3f8-4876-46ee-a9c5-76f149b8e8f6'
  AND id IN (13084, 13085);

UPDATE public.all_sage_data
SET
  site_name = 'One Bar Eleven Glamping Tent',
  unit_type = 'Canvas Tent',
  quantity_of_units = 1,
  unit_capacity = '2',
  unit_bed = '1 King',
  unit_sq_ft = 320,
  unit_private_bathroom = 'No',
  unit_shower = 'No',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'No',
  unit_wifi = NULL,
  unit_pets = NULL,
  unit_electricity = 'Yes',
  unit_water = 'No',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_picnic_table = NULL,
  unit_mini_fridge = NULL,
  unit_charcoal_grill = NULL,
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  unit_wood_burning_stove = 'Yes',
  unit_cable = 'No',
  unit_ada_accessibility = NULL,
  operating_season_months = 'May through mid-October. Exclusive camp buyout with Uline Yurt + XH Tent. Shared bathhouse. 3-night minimum.',
  minimum_nights = '3',
  planned_open_date = NULL,
  ota_url_airbnb = NULL,
  unit_description = $$One Bar Eleven: 16×20 (320 sq ft) river-facing safari canvas tent on a raised deck over the North Platte. King bed, lounge seating, storage, pot-belly stove, ceiling fan, electricity. Sleeps 2 (operator max). Shared camp bathhouse with running water. Booked only as part of the 8-guest exclusive Platte Canyon buyout (private chef + host). Pets not stated.$$,
  amenities_raw = '16×20 canvas tent; 320 sq ft; King; sleeps 2; raised river deck; pot-belly stove; ceiling fan; electricity; shared bathhouse. Exclusive-use camp. No in-tent bath or kitchen.',
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = '4500',
  rate_spring_weekend = '4500',
  rate_summer_weekday = '4500',
  rate_summer_weekend = '4500',
  rate_fall_weekday = '4500',
  rate_fall_weekend = '4500',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', null, 'weekend', null),
      'spring', jsonb_build_object('weekday', 4500, 'weekend', 4500),
      'summer', jsonb_build_object('weekday', 4500, 'weekend', 4500),
      'fall', jsonb_build_object('weekday', 4500, 'weekend', 4500),
      'note', 'USD all-inclusive. $4,500 is the exclusive CAMP buyout (up to 8 guests), not a per-tent rack. Do not sum with Uline Yurt / XH. Launch press Jun 2025. Winter closed. 3-night minimum.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-03] Published + split qty-2 tent shell into named One Bar Eleven + XH from brushcreekranch.com. Replaced French Creek address/pin with Lodge & Spa Maps gates @41.3321297,-106.6066217 (camp is ~25 min further on the North Platte). Replaced $795 Tavily ADR with $4,500 all-inclusive buyout. This row is One Bar Eleven Glamping Tent.'
WHERE id = 13084
  AND property_id = 'c57fe3f8-4876-46ee-a9c5-76f149b8e8f6';

UPDATE public.all_sage_data
SET
  site_name = 'Uline Yurt',
  unit_type = 'Yurt',
  quantity_of_units = 1,
  unit_capacity = '4',
  unit_bed = '1 King + sleeper sofa',
  unit_sq_ft = NULL,
  unit_private_bathroom = 'No',
  unit_shower = 'No',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'No',
  unit_wifi = NULL,
  unit_pets = NULL,
  unit_electricity = 'Yes',
  unit_water = 'No',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_picnic_table = NULL,
  unit_mini_fridge = NULL,
  unit_charcoal_grill = NULL,
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  unit_wood_burning_stove = 'Yes',
  unit_cable = 'No',
  unit_ada_accessibility = NULL,
  operating_season_months = 'May through mid-October. Camp dining hub (table for 8). Shared bathhouse. Exclusive buyout. 3-night minimum.',
  minimum_nights = '3',
  planned_open_date = NULL,
  ota_url_airbnb = NULL,
  unit_description = $$Uline Yurt: timber-framed luxury yurt on the North Platte (Secret Creek build; press cited a ~30-ft diameter). King bed, full sleeper sofa, second couch, dining table for 8, poker/gaming table, pot-belly stove, electricity. Standard 2 / max 4. Indoor dining for the private chef. Shared camp bathhouse. Booked only as part of the 8-guest exclusive Platte Canyon buyout.$$,
  amenities_raw = 'Luxury yurt; King + sleeper sofa; sleeps 4; dining table for 8; poker table; pot-belly stove; electricity; shared bathhouse. Camp dining hub. Exclusive-use. No ensuite bath.',
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = '4500',
  rate_spring_weekend = '4500',
  rate_summer_weekday = '4500',
  rate_summer_weekend = '4500',
  rate_fall_weekday = '4500',
  rate_fall_weekend = '4500',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', null, 'weekend', null),
      'spring', jsonb_build_object('weekday', 4500, 'weekend', 4500),
      'summer', jsonb_build_object('weekday', 4500, 'weekend', 4500),
      'fall', jsonb_build_object('weekday', 4500, 'weekend', 4500),
      'note', 'USD all-inclusive. $4,500 is the exclusive CAMP buyout (up to 8 guests), not a yurt-only rack. Do not sum with the two tents. Launch press Jun 2025. Winter closed. 3-night minimum.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-03] Published + renamed generic Yurt to Uline Yurt from brushcreekranch.com/platte-canyon-glamping/accommodations/uline-yurt. Same $4,500 camp buyout as sibling tents.'
WHERE id = 13085
  AND property_id = 'c57fe3f8-4876-46ee-a9c5-76f149b8e8f6';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed, unit_sq_ft,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_wood_burning_stove, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, unit_picnic_table, unit_charcoal_grill, unit_ada_accessibility,
  year_site_opened, season_open_month, season_close_month,
  operating_season_months, minimum_nights, planned_open_date, ota_url_airbnb,
  unit_description, amenities_raw, activities_raw,
  url, property_id, phone_number,
  property_clubhouse, property_food_on_site, property_restaurant, property_laundry,
  property_pool, property_hot_tub, property_sauna, property_family_friendly,
  property_remote_work_friendly, property_has_rentals, property_playground,
  property_general_store, property_extended_stay, property_pickball_courts,
  property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_fishing, activities_stargazing, activities_wildlife_watching,
  activities_scenic_drives, activities_paddling, activities_boating,
  setting_ranch, setting_mountainous, setting_forest, setting_canyon, setting_field,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', 'Platte Canyon Glamping at Brush Creek Ranch', v.site_name,
  'web_research_platte_canyon_brush_creek_operator_gmaps_2026_09', '2026-09-03', '2026-09-03',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  3, 1::numeric, v.unit_type, v.capacity, v.bed, v.sq_ft,
  'No', 'No', 'No', 'No',
  'No', NULL::text, NULL::text, 'Yes', 'No',
  'Yes', 'Yes', 'Yes', 'No', 'No', 'No',
  NULL::text, NULL::text, NULL::text, NULL::text,
  2025::numeric, 5::smallint, 10::smallint,
  v.season, '3', NULL::date, NULL::text,
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_fishing, g.activities_stargazing, g.activities_wildlife_watching,
  g.activities_scenic_drives, g.activities_paddling, g.activities_boating,
  g.setting_ranch, g.setting_mountainous, g.setting_forest, g.setting_canyon, g.setting_field,
  NULL, NULL,
  '4500', '4500',
  '4500', '4500',
  '4500', '4500',
  v.rates_json, g.rate_basis, g.rate_basis_notes,
  g.description, v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    (
      'XH Glamping Tent', 'Canvas Tent', '2', '2 Full', 320::numeric,
      'May through mid-October. Exclusive camp buyout with Uline Yurt + One Bar Eleven. Shared bathhouse. 3-night minimum.',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 4500, 'weekend', 4500), 'summer', jsonb_build_object('weekday', 4500, 'weekend', 4500), 'fall', jsonb_build_object('weekday', 4500, 'weekend', 4500), 'note', 'USD all-inclusive. $4,500 is the exclusive CAMP buyout (up to 8 guests), not a per-tent rack. Do not sum with Uline Yurt / One Bar Eleven. Launch press Jun 2025. Winter closed. 3-night minimum.')),
      $$XH Glamping Tent: 320 sq ft river-facing safari canvas tent with two full beds, lounge seating, storage, pot-belly stove, ceiling fan, electricity, and an expansive deck over the North Platte. Operator max 2 guests. Shared camp bathhouse. Booked only as part of the 8-guest exclusive Platte Canyon buyout (private chef + host).$$,
      '320 sq ft canvas tent; 2 Full; sleeps 2; river deck; pot-belly stove; ceiling fan; electricity; shared bathhouse. Exclusive-use camp. No in-tent bath or kitchen.',
      E'[2026-09-03] Added XH Glamping Tent from brushcreekranch.com/platte-canyon-glamping/accommodations/xh-glamping-tent.'
    )
) AS v(
  site_name, unit_type, capacity, bed, sq_ft,
  season, rates_json, unit_desc, amenities, note
)
WHERE g.id = 13084
  AND g.property_id = 'c57fe3f8-4876-46ee-a9c5-76f149b8e8f6'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = 'c57fe3f8-4876-46ee-a9c5-76f149b8e8f6'
      AND x.site_name = v.site_name
  );

COMMIT;
