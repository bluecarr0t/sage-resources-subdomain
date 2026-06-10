-- Lake Geneva micro-market: enrich Camp Wandawega + add Preserve, Glamping Loft, Grand Geneva glamping (Phase 1).
-- discovery_source = web_research_lake_geneva_micro_market_2026_06
-- Safe to re-run (slug / site_name guards on INSERTs).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Camp Wandawega — reclassify + multi-SKU enrichment (existing property_id)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.all_glamping_properties SET
  is_glamping_property = 'Yes',
  property_type = 'Glamping Resort',
  property_name = 'Camp Wandawega',
  site_name = 'Lakeview Cabin',
  slug = 'camp-wandawega',
  url = 'https://www.wandawega.com/bookyourstay',
  phone_number = NULL,
  property_total_sites = 14,
  quantity_of_units = 1,
  unit_capacity = '8',
  minimum_nights = '2',
  operating_season_months = 'Primary season approx. May–October; Lakeview Cabin, Bunkhouse, and Hillhouse winterized for off-season bookings',
  unit_private_bathroom = 'Yes',
  unit_full_kitchen = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'No',
  unit_campfires = 'Yes',
  property_sauna = 'Yes',
  property_general_store = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'No',
  setting_lake = 'Yes',
  setting_forest = 'Yes',
  activities_swimming = 'Yes',
  activities_hiking = 'Yes',
  activities_boating = 'Yes',
  activities_canoeing_kayaking = 'Yes',
  land_operator_category = 'private_commercial',
  discovery_source = 'web_research_lake_geneva_micro_market_2026_06',
  description = $$Camp Wandawega — 25-acre historic lakeside camp (National Register of Historic Places) on Wandawega Lake, Elkhorn WI (~15 min from Lake Geneva). Vintage cabins, bunkhouse, hillhouse, and canvas clusters; primary revenue from private full-camp events with limited “surplus inventory” released on Airbnb. Zoning requires paired/multi-room cabin bookings (no single small-cabin walk-ins). “Manifesto of Low Expectations” — seasonal, no-frills, high-demand Chicago/Milwaukee drive-to escape; books out months ahead.$$,
  unit_description = $$Three-bedroom Lakeview Cabin overlooking the lake; winterized. Private entrance and balcony; among the most requested Airbnb SKUs at camp.$$,
  amenities_raw = 'Camp store, Cedar Tavern/canteen, dining hall, sauna, lake swimming, boats, trails, Sunday Mass in season. Airbnb bookings only; 2-night minimum typical.',
  notes = COALESCE(notes, '') || E'\n\nJun 2026 micro-market enrichment: unit SKUs from wandawega.com/bookyourstay + tour pages. Retail ADR bands $400–900/night (third-party listings May 2026); rates below are midpoint estimates pending Airbnb scrape.',
  date_updated = '2026-06-09',
  rate_avg_retail_daily_rate = 725,
  rate_summer_weekday = 625,
  rate_summer_weekend = 825,
  rate_spring_weekday = 525,
  rate_spring_weekend = 625,
  rate_fall_weekday = 525,
  rate_fall_weekend = 725,
  rate_winter_weekday = 475,
  rate_winter_weekend = 575,
  rate_unit_rates_by_year = '{"2026":{"airbnb_estimate":{"summer_weekend":825,"summer_weekday":625,"note":"Lakeview Cabin; operator does not publish static rate sheet"}}}'::jsonb
WHERE id = 2
  AND slug = 'camp-wandawega';

INSERT INTO public.all_glamping_properties (
  property_id, research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city, address, zip_code, lat, lon, url,
  description, unit_description, notes, date_added, date_updated, land_operator_category,
  property_total_sites, quantity_of_units, unit_capacity, minimum_nights, operating_season_months,
  rate_avg_retail_daily_rate, rate_summer_weekday, rate_summer_weekend,
  rate_spring_weekday, rate_spring_weekend, rate_fall_weekday, rate_fall_weekend,
  rate_winter_weekday, rate_winter_weekend, rate_unit_rates_by_year,
  unit_private_bathroom, unit_full_kitchen, unit_wifi, unit_pets, unit_campfires,
  property_sauna, property_general_store, property_food_on_site,
  setting_lake, setting_forest, activities_swimming, activities_hiking, amenities_raw
)
SELECT * FROM (VALUES
  (
    'a6d510d3-f33a-4889-9903-c52c60409e21'::uuid, 'published', 'Yes', 'Yes',
    'Camp Wandawega', 'Hillhouse', 'camp-wandawega', 'Glamping Resort', 'Cabin',
    'Sage', 'web_research_lake_geneva_micro_market_2026_06', 'United States', 'WI', 'Elkhorn',
    'W5453 Lake View Dr', '53121', 42.7208::numeric, -88.5915::numeric, 'https://www.wandawega.com/bookyourstay',
    $$Sibling — Camp Wandawega. See anchor row id 2.$$,
    $$1930s summer cabin renovation on camp highlands; sleeps 6; winterized; modern comforts with vintage charm.$$,
  $$Airbnb SKU; est. $650–800/night peak.$$,
    '2026-06-09', '2026-06-09', 'private_commercial',
    14::numeric, 1::numeric, '6', '2', 'May–October primary; winterized',
    700::numeric, 600::numeric, 800::numeric, 500::numeric, 600::numeric, 500::numeric, 700::numeric, 450::numeric, 550::numeric,
    '{"2026":{"airbnb_estimate":{"summer_weekend":800}}}'::jsonb,
    'Yes', 'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
    'Hilltop cabin; winterized; sleeps 6.'
  ),
  (
    'a6d510d3-f33a-4889-9903-c52c60409e21'::uuid, 'published', 'Yes', 'Yes',
    'Camp Wandawega', 'Large GSA Cabin', 'camp-wandawega', 'Glamping Resort', 'Cabin',
    'Sage', 'web_research_lake_geneva_micro_market_2026_06', 'United States', 'WI', 'Elkhorn',
    'W5453 Lake View Dr', '53121', 42.7208::numeric, -88.5915::numeric, 'https://www.wandawega.com/bookyourstay',
    $$Sibling — Camp Wandawega. See anchor row id 2.$$,
    $$Historic Girl Scout log cabins relocated to camp; large GSA cabin configuration.$$,
    $$2 large GSA cabins on site; est. $500–650/night.$$,
    '2026-06-09', '2026-06-09', 'private_commercial',
    14::numeric, 2::numeric, '6', '2', 'May–October',
    575::numeric, 500::numeric, 650::numeric, 425::numeric, 525::numeric, 425::numeric, 575::numeric, NULL::numeric, NULL::numeric,
    '{"2026":{"airbnb_estimate":{"summer_weekend":650}}}'::jsonb,
    'No', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
    'Relocated GSA log cabins; paired-booking zoning.'
  ),
  (
    'a6d510d3-f33a-4889-9903-c52c60409e21'::uuid, 'published', 'Yes', 'Yes',
    'Camp Wandawega', 'Small GSA Cabin', 'camp-wandawega', 'Glamping Resort', 'Cabin',
    'Sage', 'web_research_lake_geneva_micro_market_2026_06', 'United States', 'WI', 'Elkhorn',
    'W5453 Lake View Dr', '53121', 42.7208::numeric, -88.5915::numeric, 'https://www.wandawega.com/bookyourstay',
    $$Sibling — Camp Wandawega. See anchor row id 2.$$,
    $$Small Girl Scout log cabin; must be booked per camp zoning paired-use rules.$$,
    $$2 small GSA cabins; est. $400–550/night.$$,
    '2026-06-09', '2026-06-09', 'private_commercial',
    14::numeric, 2::numeric, '4', '2', 'May–October',
    475::numeric, 425::numeric, 550::numeric, 375::numeric, 450::numeric, 375::numeric, 500::numeric, NULL::numeric, NULL::numeric,
    '{"2026":{"airbnb_estimate":{"summer_weekend":550}}}'::jsonb,
    'No', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
    'Small GSA cabin.'
  ),
  (
    'a6d510d3-f33a-4889-9903-c52c60409e21'::uuid, 'published', 'Yes', 'Yes',
    'Camp Wandawega', 'Side-by-Side Cabins (Cedar + Log)', 'camp-wandawega', 'Glamping Resort', 'Cabin',
    'Sage', 'web_research_lake_geneva_micro_market_2026_06', 'United States', 'WI', 'Elkhorn',
    'W5453 Lake View Dr', '53121', 42.7208::numeric, -88.5915::numeric, 'https://www.wandawega.com/bookyourstay',
    $$Sibling — Camp Wandawega. See anchor row id 2.$$,
    $$Paired Cedar and Log cabins rented together per township conditional-use agreement.$$,
    $$Paired booking SKU; est. $700–900/night.$$,
    '2026-06-09', '2026-06-09', 'private_commercial',
    14::numeric, 1::numeric, '8', '2', 'May–October',
    800::numeric, 700::numeric, 900::numeric, 600::numeric, 750::numeric, 600::numeric, 850::numeric, NULL::numeric, NULL::numeric,
    '{"2026":{"airbnb_estimate":{"summer_weekend":900}}}'::jsonb,
    'Yes', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
    'Cedar + Log side-by-side pair.'
  ),
  (
    'a6d510d3-f33a-4889-9903-c52c60409e21'::uuid, 'published', 'Yes', 'Yes',
    'Camp Wandawega', 'Bunkhouse Top Level', 'camp-wandawega', 'Glamping Resort', 'Lodge',
    'Sage', 'web_research_lake_geneva_micro_market_2026_06', 'United States', 'WI', 'Elkhorn',
    'W5453 Lake View Dr', '53121', 42.7208::numeric, -88.5915::numeric, 'https://www.wandawega.com/bookyourstay',
    $$Sibling — Camp Wandawega. See anchor row id 2.$$,
    $$Top floor of historic bunkhouse; multiple bedrooms; winterized.$$,
    $$Est. $600–750/night.$$,
    '2026-06-09', '2026-06-09', 'private_commercial',
    14::numeric, 1::numeric, '12', '2', 'Year-round (winterized)',
    675::numeric, 600::numeric, 750::numeric, 500::numeric, 600::numeric, 500::numeric, 700::numeric, 550::numeric, 650::numeric,
    '{"2026":{"airbnb_estimate":{"summer_weekend":750}}}'::jsonb,
    'Yes', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
    'Bunkhouse top level; winterized.'
  ),
  (
    'a6d510d3-f33a-4889-9903-c52c60409e21'::uuid, 'published', 'Yes', 'Yes',
    'Camp Wandawega', 'Bunkhouse Mid & Lower Level', 'camp-wandawega', 'Glamping Resort', 'Lodge',
    'Sage', 'web_research_lake_geneva_micro_market_2026_06', 'United States', 'WI', 'Elkhorn',
    'W5453 Lake View Dr', '53121', 42.7208::numeric, -88.5915::numeric, 'https://www.wandawega.com/bookyourstay',
    $$Sibling — Camp Wandawega. See anchor row id 2.$$,
    $$Mid and lower bunkhouse levels; large-group SKU; winterized.$$,
    $$Est. $700–850/night.$$,
    '2026-06-09', '2026-06-09', 'private_commercial',
    14::numeric, 1::numeric, '16', '2', 'Year-round (winterized)',
    775::numeric, 700::numeric, 850::numeric, 600::numeric, 725::numeric, 600::numeric, 800::numeric, 575::numeric, 700::numeric,
    '{"2026":{"airbnb_estimate":{"summer_weekend":850}}}'::jsonb,
    'Yes', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
    'Bunkhouse mid/lower; winterized.'
  ),
  (
    'a6d510d3-f33a-4889-9903-c52c60409e21'::uuid, 'published', 'Yes', 'Yes',
    'Camp Wandawega', 'Sterlingworth Cabin', 'camp-wandawega', 'Glamping Resort', 'Cabin',
    'Sage', 'web_research_lake_geneva_micro_market_2026_06', 'United States', 'WI', 'Elkhorn',
    'W5453 Lake View Dr', '53121', 42.7208::numeric, -88.5915::numeric, 'https://www.wandawega.com/bookyourstay',
    $$Sibling — Camp Wandawega. See anchor row id 2.$$,
    $$Rustic camping cluster cabin; vintage camp aesthetic.$$,
    $$Est. $400–500/night.$$,
    '2026-06-09', '2026-06-09', 'private_commercial',
    14::numeric, 1::numeric, '4', '2', 'May–October',
    450::numeric, 400::numeric, 500::numeric, 350::numeric, 425::numeric, 350::numeric, 475::numeric, NULL::numeric, NULL::numeric,
    '{"2026":{"airbnb_estimate":{"summer_weekend":500}}}'::jsonb,
    'No', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
    'Rustic cluster cabin.'
  ),
  (
    'a6d510d3-f33a-4889-9903-c52c60409e21'::uuid, 'published', 'Yes', 'Yes',
    'Camp Wandawega', 'A-Frame', 'camp-wandawega', 'Glamping Resort', 'A-Frame',
    'Sage', 'web_research_lake_geneva_micro_market_2026_06', 'United States', 'WI', 'Elkhorn',
    'W5453 Lake View Dr', '53121', 42.7208::numeric, -88.5915::numeric, 'https://www.wandawega.com/bookyourstay',
    $$Sibling — Camp Wandawega. See anchor row id 2.$$,
    $$A-frame within rustic camping cluster.$$,
    $$Est. $350–450/night.$$,
    '2026-06-09', '2026-06-09', 'private_commercial',
    14::numeric, 1::numeric, '4', '2', 'May–October',
    400::numeric, 350::numeric, 450::numeric, 325::numeric, 375::numeric, 325::numeric, 425::numeric, NULL::numeric, NULL::numeric,
    '{"2026":{"airbnb_estimate":{"summer_weekend":450}}}'::jsonb,
    'No', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
    'Rustic cluster A-frame.'
  ),
  (
    'a6d510d3-f33a-4889-9903-c52c60409e21'::uuid, 'published', 'Yes', 'Yes',
    'Camp Wandawega', 'Hickory Tent', 'camp-wandawega', 'Glamping Resort', 'Canvas Tent',
    'Sage', 'web_research_lake_geneva_micro_market_2026_06', 'United States', 'WI', 'Elkhorn',
    'W5453 Lake View Dr', '53121', 42.7208::numeric, -88.5915::numeric, 'https://www.wandawega.com/bookyourstay',
    $$Sibling — Camp Wandawega. Canvas SKU for safari-tent comp context. See anchor row id 2.$$,
    $$Platform canvas tent deep in the woods.$$,
    $$Est. $350–500/night.$$,
    '2026-06-09', '2026-06-09', 'private_commercial',
    14::numeric, 1::numeric, '2', '2', 'May–October',
    425::numeric, 375::numeric, 500::numeric, 325::numeric, 400::numeric, 325::numeric, 450::numeric, NULL::numeric, NULL::numeric,
    '{"2026":{"airbnb_estimate":{"summer_weekend":500}}}'::jsonb,
    'No', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
    'Hickory canvas tent.'
  )
) AS v(
  property_id, research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city, address, zip_code, lat, lon, url,
  description, unit_description, notes, date_added, date_updated, land_operator_category,
  property_total_sites, quantity_of_units, unit_capacity, minimum_nights, operating_season_months,
  rate_avg_retail_daily_rate, rate_summer_weekday, rate_summer_weekend,
  rate_spring_weekday, rate_spring_weekend, rate_fall_weekday, rate_fall_weekend,
  rate_winter_weekday, rate_winter_weekend, rate_unit_rates_by_year,
  unit_private_bathroom, unit_full_kitchen, unit_wifi, unit_pets, unit_campfires,
  property_sauna, property_general_store, property_food_on_site,
  setting_lake, setting_forest, activities_swimming, activities_hiking, amenities_raw
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.all_glamping_properties e
  WHERE e.property_id = v.property_id AND e.site_name = v.site_name
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. The Preserve at Williams Bay — pipeline competitor
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.all_glamping_properties (
  property_id, research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city, address, zip_code, lat, lon, url,
  description, notes, date_added, date_updated, land_operator_category,
  property_total_sites, quantity_of_units, unit_capacity, operating_season_months,
  property_restaurant, property_sauna, property_pool, property_food_on_site,
  setting_lake, setting_forest, setting_wetlands,
  rate_avg_retail_daily_rate, rate_summer_weekend, rate_spring_weekend, rate_fall_weekend
)
SELECT
  'c8f4a210-9b3e-4d1a-8f6c-2e5b9a704d31'::uuid,
  'in_progress', 'Yes', 'Proposed Development',
  'The Preserve at Williams Bay', 'Detached Cottages (1–3 BR)',
  'the-preserve-at-williams-bay-wi',
  'Glamping Resort', 'Cottage',
  'Sage', 'web_research_lake_geneva_micro_market_2026_06', 'United States', 'WI', 'Williams Bay',
  'Former George Williams College campus, N3395 Bloomers Rd', '53191', 42.5770, -88.5430,
  'https://www.thepreservewilliamsbay.com/',
  $$Topography Hospitality eco-resort on 137-acre former George Williams College campus (~15 min from Lake Geneva). 68-key plan: central lodge rooms/suites plus detached 1–3 bedroom cottages (10 condotel cottages). Two restaurants/bars, spa, pool, racquet courts, retreat center, amphitheater, and 90-acre public nature preserve with trail connections to Geneva Lake shore path. Village board approved Feb 2026; construction targeted 2026 with 2027 opening.$$,
  $$Pipeline row — cottage inventory estimated ~28 detached units within 68 total keys; rates TBD until opening. Sources: thepreservewilliamsbay.com, BizTimes, At The Lake Magazine (Jun 2026).$$,
  '2026-06-09', '2026-06-09', 'private_commercial',
  68, 28, '4', 'Year-round (projected)',
  'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes',
  450, 525, 475, 500
WHERE NOT EXISTS (
  SELECT 1 FROM public.all_glamping_properties WHERE slug = 'the-preserve-at-williams-bay-wi'
);

INSERT INTO public.all_glamping_properties (
  property_id, research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city, address, zip_code, lat, lon, url,
  description, notes, date_added, date_updated, land_operator_category,
  property_total_sites, quantity_of_units, operating_season_months,
  property_restaurant, property_sauna, property_pool
)
SELECT
  'c8f4a210-9b3e-4d1a-8f6c-2e5b9a704d31'::uuid,
  'in_progress', 'Yes', 'Proposed Development',
  'The Preserve at Williams Bay', 'Central Lodge Rooms & Suites',
  'the-preserve-at-williams-bay-wi', 'Glamping Resort', 'Lodge',
  'Sage', 'web_research_lake_geneva_micro_market_2026_06', 'United States', 'WI', 'Williams Bay',
  'Former George Williams College campus, N3395 Bloomers Rd', '53191', 42.5770, -88.5430,
  'https://www.thepreservewilliamsbay.com/',
  $$Sibling pipeline row — The Preserve at Williams Bay lodge inventory within 68-key resort.$$,
  $$Estimated ~40 lodge keys within 68 total; rates TBD.$$,
  '2026-06-09', '2026-06-09', 'private_commercial',
  68, 40, 'Year-round (projected)',
  'Yes', 'Yes', 'Yes'
WHERE NOT EXISTS (
  SELECT 1 FROM public.all_glamping_properties
  WHERE property_id = 'c8f4a210-9b3e-4d1a-8f6c-2e5b9a704d31'::uuid
    AND site_name = 'Central Lodge Rooms & Suites'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Glamping Loft Lake Geneva — operating downtown group glamping
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.all_glamping_properties (
  property_id, research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city, address, zip_code, lat, lon, url,
  description, unit_description, notes, date_added, date_updated, land_operator_category,
  property_total_sites, quantity_of_units, unit_capacity, minimum_nights, operating_season_months,
  unit_full_kitchen, unit_wifi, property_food_on_site, property_restaurant,
  setting_lake, setting_suburban,
  rate_avg_retail_daily_rate, rate_summer_weekday, rate_summer_weekend,
  rate_spring_weekend, rate_fall_weekend
)
SELECT
  'd17b62c4-5a8f-4e2b-9c1d-7f3a6e8b0d42'::uuid,
  'published', 'Yes', 'Yes',
  'Glamping Loft Lake Geneva', 'Main Street Loft (12 Tent Suites)',
  'glamping-loft-lake-geneva-wi',
  'Glamping', 'Canvas Tent',
  'Sage', 'web_research_lake_geneva_micro_market_2026_06', 'United States', 'WI', 'Lake Geneva',
  '326 Center Street, 2nd Floor', '53147', 42.5916, -88.4331,
  'https://www.genevalakesvacations.com/vrp/unit/Main_Street_Loft-95-15/',
  $$Downtown Lake Geneva group glamping loft: 12 styled tent suites configured as bedrooms within a historic second-floor loft (sleeps 12). Single-group bookings only — individual tents not rented separately. Full kitchen and bar; walkable to Geneva Lake, beach, and dining. Managed by Geneva Lakes Vacations / Main Street Hotel portfolio.$$,
  $$Five tent-suite bedrooms (queen + twin configurations) with shared living/kitchen/bar space; one flight of stairs; parking for ~4 vehicles.$$,
  $$OTA listings (VRBO/Booking.com) show dynamic pricing; est. $600–950/night whole-loft peak based on comparable group rentals (Jun 2026). Not affiliated with Grand Geneva.$$,
  '2026-06-09', '2026-06-09', 'private_commercial',
  1, 12, '12', '2', 'Year-round',
  'Yes', 'Yes', 'No', 'No',
  'Yes', 'Yes',
  725, 650, 850, 700, 750
WHERE NOT EXISTS (
  SELECT 1 FROM public.all_glamping_properties WHERE slug = 'glamping-loft-lake-geneva-wi'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Grand Geneva Resort Glamping (Phase 1) — client subject property
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.all_glamping_properties (
  property_id, research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city, address, zip_code, lat, lon, url,
  description, notes, date_added, date_updated, land_operator_category,
  property_total_sites, quantity_of_units, unit_capacity, operating_season_months,
  property_restaurant, property_sauna, property_fitness_room, property_general_store,
  property_food_on_site, property_pool, property_waterpark,
  setting_forest, setting_wetlands, setting_lake,
  activities_hiking, activities_biking, activities_swimming, activities_snow_sports,
  rate_avg_retail_daily_rate, rate_summer_weekday, rate_summer_weekend,
  rate_spring_weekend, rate_fall_weekend, rate_winter_weekend
)
SELECT
  'e29c73d5-6b9a-4f3c-ad2e-8c4b1f7e9a63'::uuid,
  'in_progress', 'Yes', 'Proposed Development',
  'Grand Geneva Resort Glamping', 'Premium Glamping Sites',
  'grand-geneva-resort-glamping-lake-geneva-wi',
  'Glamping Resort', 'Cabin',
  'Sage', 'web_research_lake_geneva_micro_market_2026_06', 'United States', 'WI', 'Lake Geneva',
  'Grand Geneva Resort campus (west of Timber Ridge Lodge), 7036 Grand Geneva Way', '53147', 42.5910, -88.4080,
  'https://www.grandgeneva.com/',
  $$Proposed Phase 1 glamping village on Grand Geneva Resort campus (Timber Ridge / golf course interface): premium wooded cabin sites, cafe/clubhouse, amenity lawn, wetland boardwalk, paved walking paths. Part of 1,300-acre AAA Four-Diamond resort with golf, ski, spa, waterpark, and F&B. Target 36 hard-walled units Phase 1 with $400–600 ADR underwriting band.$$,
  $$Client subject property — site plan + JSD topographic survey (Task 4.0, Jun 2026). ~14 premium sites per preliminary plan; not publicly announced. Rates are feasibility targets pending opening.$$,
  '2026-06-09', '2026-06-09', 'private_commercial',
  36, 14, '4', 'Year-round (projected)',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes',
  500, 450, 575, 500, 525, 475
WHERE NOT EXISTS (
  SELECT 1 FROM public.all_glamping_properties
  WHERE slug = 'grand-geneva-resort-glamping-lake-geneva-wi'
    AND site_name = 'Premium Glamping Sites'
);

INSERT INTO public.all_glamping_properties (
  property_id, research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city, address, zip_code, lat, lon, url,
  description, notes, date_added, date_updated, land_operator_category,
  property_total_sites, quantity_of_units, unit_capacity,
  rate_avg_retail_daily_rate, rate_summer_weekday, rate_summer_weekend
)
SELECT
  'e29c73d5-6b9a-4f3c-ad2e-8c4b1f7e9a63'::uuid,
  'in_progress', 'Yes', 'Proposed Development',
  'Grand Geneva Resort Glamping', 'Wooded Glamping Sites',
  'grand-geneva-resort-glamping-lake-geneva-wi',
  'Glamping Resort', 'Cabin',
  'Sage', 'web_research_lake_geneva_micro_market_2026_06', 'United States', 'WI', 'Lake Geneva',
  'Grand Geneva Resort campus (west of Timber Ridge Lodge), 7036 Grand Geneva Way', '53147', 42.5910, -88.4080,
  'https://www.grandgeneva.com/',
  $$Sibling pipeline row — wooded ridge glamping sites on future expansion interface per site plan.$$,
  $$~22 wooded sites per preliminary plan; 1–2 safari tent test units may be added separately.$$,
  '2026-06-09', '2026-06-09', 'private_commercial',
  36, 22, '4',
  475, 425, 550
WHERE NOT EXISTS (
  SELECT 1 FROM public.all_glamping_properties
  WHERE property_id = 'e29c73d5-6b9a-4f3c-ad2e-8c4b1f7e9a63'::uuid
    AND site_name = 'Wooded Glamping Sites'
);

INSERT INTO public.all_glamping_properties (
  property_id, research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city, address, zip_code, lat, lon, url,
  description, notes, date_added, date_updated, land_operator_category,
  property_total_sites, quantity_of_units, unit_capacity,
  rate_avg_retail_daily_rate, rate_summer_weekend
)
SELECT
  'e29c73d5-6b9a-4f3c-ad2e-8c4b1f7e9a63'::uuid,
  'in_progress', 'Yes', 'Proposed Development',
  'Grand Geneva Resort Glamping', 'Safari Tent Test Units (Phase 1)',
  'grand-geneva-resort-glamping-lake-geneva-wi',
  'Glamping Resort', 'Safari Tent',
  'Sage', 'web_research_lake_geneva_micro_market_2026_06', 'United States', 'WI', 'Lake Geneva',
  'Grand Geneva Resort campus (west of Timber Ridge Lodge), 7036 Grand Geneva Way', '53147', 42.5910, -88.4080,
  'https://www.grandgeneva.com/',
  $$Optional Phase 1 safari tent test units per client brief — low weight in feasibility.$$,
  $$1–2 units exploratory; rates TBD below hard-walled target band.$$,
  '2026-06-09', '2026-06-09', 'private_commercial',
  36, 2, '2',
  350, 425
WHERE NOT EXISTS (
  SELECT 1 FROM public.all_glamping_properties
  WHERE property_id = 'e29c73d5-6b9a-4f3c-ad2e-8c4b1f7e9a63'::uuid
    AND site_name = 'Safari Tent Test Units (Phase 1)'
);
