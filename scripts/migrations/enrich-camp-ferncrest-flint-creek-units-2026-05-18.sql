-- Camp Ferncrest - Flint Creek: Cloudbeds inventory (7 room types / site SKUs).
-- Source: https://hotels.cloudbeds.com/en/reservation/EJBRv2 (rates for 2026-09-22–23, May 2026).

UPDATE public.all_glamping_properties SET
  site_name = '1 King Bed w/ Hot Tub - Creekside View',
  url = 'https://hotels.cloudbeds.com/en/reservation/EJBRv2',
  lat = 36.18357468,
  lon = -94.60741425,
  phone_number = '+1-610-686-8810',
  unit_capacity = '2',
  rate_avg_retail_daily_rate = 326,
  property_total_sites = 7,
  quantity_of_units = 1,
  unit_hot_tub = 'Yes',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_mini_fridge = 'Yes',
  unit_campfires = 'Yes',
  property_general_store = 'Yes',
  property_waterfront = 'Yes',
  property_family_friendly = 'Yes',
  river_stream_or_creek = 'Yes',
  activities_swimming = 'Yes',
  setting_forest = 'Yes',
  description = $$Camp Ferncrest Flint Creek — creekside glampground on Flint Creek at 57025 County Rd 660, Colcord OK. Cloudbeds lists seven dome SKUs in two zones: Creekside View (along the creek) and Commons View (central landscaped area). Signature domes include private wood-fired hot tubs; commons domes share property amenities including camp store and creek swimming.$$,
  unit_description = $$Signature king dome on creekside: climate-controlled, king bed (sleeps 2), private wood-fired hot tub, mini-fridge, microwave, Chemex, picnic table, Wi‑Fi (fee may apply), heat/A/C; dog-friendly ($40/night pet fee).$$,
  notes = COALESCE(notes, '') || E'\n\nCloudbeds enrichment (May 2026): sample Standard Rate for 2026-09-22→23 (2 adults, USD) per SKU; contact flintcreek@campferncrest.com.',
  amenities_raw = 'Creekside vs Commons dome zones; signature units w/ private hot tubs; creek swimming; camp store; accessible commons queen dome SKU.',
  date_updated = '2026-05-18'
WHERE id = 11884;

INSERT INTO public.all_glamping_properties (
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  address, zip_code, lat, lon, url, phone_number,
  description, unit_description, notes,
  date_added, date_updated, land_operator_category,
  rate_avg_retail_daily_rate, property_total_sites, quantity_of_units, unit_capacity,
  unit_hot_tub, unit_air_conditioning, unit_wifi, unit_pets, unit_mini_fridge, unit_campfires,
  unit_ada_accessibility,
  property_general_store, property_waterfront, property_family_friendly,
  river_stream_or_creek, activities_swimming, setting_forest,
  amenities_raw
) VALUES
(
  'in_progress', 'Yes', 'Yes',
  'Camp Ferncrest - Flint Creek', '2 Double Beds w/ Hot Tub - Creekside View',
  'camp-ferncrest-flint-creek-colcord-ok', 'Glamping Resort', 'Geodesic Dome',
  'Sage', 'cloudbeds_web_research_2026_05', 'United States', 'OK', 'Colcord',
  '57025 County Rd 660', '74338', 36.18357468, -94.60741425,
  'https://hotels.cloudbeds.com/en/reservation/EJBRv2', '+1-610-686-8810',
  $$Sibling SKU — Camp Ferncrest Flint Creek (Colcord OK). See anchor row id 11884.$$,
  $$Signature double dome creekside: two double beds (sleeps 4), private wood-fired hot tub, climate-controlled, standard dome amenities; dog-friendly.$$,
  $$Cloudbeds Standard Rate sample: $339/night (2026-09-22→23, 2 adults).$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  339, 7, 1, '4',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'No',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Creekside signature dome; sleeps 4.'
),
(
  'in_progress', 'Yes', 'Yes',
  'Camp Ferncrest - Flint Creek', 'Family Dome Suite w/ Hot Tub - Creekside View',
  'camp-ferncrest-flint-creek-colcord-ok', 'Glamping Resort', 'Geodesic Dome',
  'Sage', 'cloudbeds_web_research_2026_05', 'United States', 'OK', 'Colcord',
  '57025 County Rd 660', '74338', 36.18357468, -94.60741425,
  'https://hotels.cloudbeds.com/en/reservation/EJBRv2', '+1-610-686-8810',
  $$Sibling SKU — Camp Ferncrest Flint Creek (Colcord OK).$$,
  $$Family creekside dome: king bed plus two bunk sets (sleeps 6), private wood-fired hot tub, climate-controlled; dog-friendly.$$,
  $$Cloudbeds Standard Rate sample: $372/night (2026-09-22→23, 2 adults).$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  372, 7, 1, '6',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'No',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Largest creekside SKU; sleeps 6.'
),
(
  'in_progress', 'Yes', 'Yes',
  'Camp Ferncrest - Flint Creek', '1 King Bed - Commons View',
  'camp-ferncrest-flint-creek-colcord-ok', 'Glamping Resort', 'Geodesic Dome',
  'Sage', 'cloudbeds_web_research_2026_05', 'United States', 'OK', 'Colcord',
  '57025 County Rd 660', '74338', 36.18357468, -94.60741425,
  'https://hotels.cloudbeds.com/en/reservation/EJBRv2', '+1-610-686-8810',
  $$Sibling SKU — Camp Ferncrest Flint Creek (Colcord OK).$$,
  $$Commons-view king dome: climate-controlled, king bed (sleeps 2), mini-fridge, cooler, microwave, Chemex; overlooks landscaped common area; dog-friendly.$$,
  $$Cloudbeds Standard Rate sample: $226/night (2026-09-22→23, 2 adults).$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  226, 7, 1, '2',
  'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'No',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Commons view; no in-unit hot tub.'
),
(
  'in_progress', 'Yes', 'Yes',
  'Camp Ferncrest - Flint Creek', '2 Double Beds - Commons View',
  'camp-ferncrest-flint-creek-colcord-ok', 'Glamping Resort', 'Geodesic Dome',
  'Sage', 'cloudbeds_web_research_2026_05', 'United States', 'OK', 'Colcord',
  '57025 County Rd 660', '74338', 36.18357468, -94.60741425,
  'https://hotels.cloudbeds.com/en/reservation/EJBRv2', '+1-610-686-8810',
  $$Sibling SKU — Camp Ferncrest Flint Creek (Colcord OK).$$,
  $$Commons-view double dome: two double beds (sleeps 4), mini-fridge, cooler, microwave, Chemex, climate-controlled; dog-friendly.$$,
  $$Cloudbeds Standard Rate sample: $248/night (2026-09-22→23, 2 adults).$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  248, 7, 1, '4',
  'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'No',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Commons view double; sleeps 4.'
),
(
  'in_progress', 'Yes', 'Yes',
  'Camp Ferncrest - Flint Creek', '2 Queen Beds - Commons View (Accessible)',
  'camp-ferncrest-flint-creek-colcord-ok', 'Glamping Resort', 'Geodesic Dome',
  'Sage', 'cloudbeds_web_research_2026_05', 'United States', 'OK', 'Colcord',
  '57025 County Rd 660', '74338', 36.18357468, -94.60741425,
  'https://hotels.cloudbeds.com/en/reservation/EJBRv2', '+1-610-686-8810',
  $$Sibling SKU — Camp Ferncrest Flint Creek (Colcord OK).$$,
  $$Accessible commons-view queen dome: two queen beds (sleeps 4), accessibility-friendly layout, climate-controlled with A/C and heat; dog-friendly.$$,
  $$Cloudbeds Standard Rate sample: $282/night (2026-09-22→23, 2 adults).$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  282, 7, 1, '4',
  'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'ADA-accessible commons SKU; sleeps 4.'
),
(
  'in_progress', 'Yes', 'Yes',
  'Camp Ferncrest - Flint Creek', 'Family Dome Suite - Commons View',
  'camp-ferncrest-flint-creek-colcord-ok', 'Glamping Resort', 'Geodesic Dome',
  'Sage', 'cloudbeds_web_research_2026_05', 'United States', 'OK', 'Colcord',
  '57025 County Rd 660', '74338', 36.18357468, -94.60741425,
  'https://hotels.cloudbeds.com/en/reservation/EJBRv2', '+1-610-686-8810',
  $$Sibling SKU — Camp Ferncrest Flint Creek (Colcord OK).$$,
  $$Family commons-view dome: king bed plus two bunk sets (sleeps 6), climate-controlled, nature-focused commons setting; dog-friendly.$$,
  $$Cloudbeds Standard Rate sample: $318/night (2026-09-22→23, 2 adults).$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  318, 7, 1, '6',
  'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'No',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Commons family SKU; sleeps 6.'
);

-- Ensure rates on sibling rows (INSERT may not persist rate column).
UPDATE public.all_glamping_properties AS p
SET rate_avg_retail_daily_rate = v.rate, date_updated = '2026-05-18'
FROM (VALUES
  ('2 Double Beds w/ Hot Tub - Creekside View', 339::numeric),
  ('Family Dome Suite w/ Hot Tub - Creekside View', 372),
  ('1 King Bed - Commons View', 226),
  ('2 Double Beds - Commons View', 248),
  ('2 Queen Beds - Commons View (Accessible)', 282),
  ('Family Dome Suite - Commons View', 318)
) AS v(site_name, rate)
WHERE p.slug = 'camp-ferncrest-flint-creek-colcord-ok'
  AND p.site_name = v.site_name;
