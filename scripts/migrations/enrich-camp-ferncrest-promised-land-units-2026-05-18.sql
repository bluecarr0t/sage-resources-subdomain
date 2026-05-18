-- Camp Ferncrest - Promised Land: Cloudbeds inventory (7 room types / site SKUs).
-- Source: https://hotels.cloudbeds.com/en/reservation/oGb1qK/ (JSON-LD + rates for 2026-08-26–27, May 2026).

UPDATE public.all_glamping_properties SET
  site_name = 'King Bed Dome w/ Hot Tub',
  url = 'https://hotels.cloudbeds.com/en/reservation/oGb1qK',
  unit_capacity = '2',
  rate_avg_retail_daily_rate = 333,
  property_total_sites = 7,
  quantity_of_units = 1,
  unit_hot_tub = 'Yes',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_mini_fridge = 'Yes',
  unit_campfires = 'Yes',
  property_general_store = 'Yes',
  property_hot_tub = 'Yes',
  property_sauna = 'Yes',
  property_family_friendly = 'Yes',
  description = $$Ferncrest Promised Land — seasonal Poconos glampground at 16 Edgar Lane, Greentown PA. Cloudbeds lists seven bookable unit types: geodesic domes (king/double/family layouts, some with private wood-fired hot tubs) and Crest suite canvas tents with shared modern bathhouse, camp store, sauna/cold plunge, and game room per brand site.$$,
  unit_description = $$Climate-controlled dome tent with king bed (sleeps 2) and private wood-fired cedar hot tub; mini-fridge, microwave, Chemex, Brooklinen linens, RTIC cooler, Wi‑Fi, heat/A/C, picnic table; dog-friendly ($40/night pet fee).$$,
  notes = COALESCE(notes, '') || E'\n\nCloudbeds enrichment (May 2026): sample Standard Rate for 2026-08-26→27 (2 adults, USD) captured per SKU; verify seasonal pricing.',
  amenities_raw = 'Per Cloudbeds SKUs: domes (A/C, heat, mini-fridge, microwave/Chemex, Wi‑Fi, picnic table, dog-friendly); Crest tents (linens, cooler, charging bank, shared bathhouse); property: camp store, sauna, cold plunge, hot tub (select units).',
  date_updated = '2026-05-18'
WHERE id = 11883;

INSERT INTO public.all_glamping_properties (
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  address, zip_code, lat, lon, url, phone_number,
  description, unit_description, notes,
  date_added, date_updated, land_operator_category,
  rate_avg_retail_daily_rate, property_total_sites, quantity_of_units, unit_capacity,
  unit_hot_tub, unit_air_conditioning, unit_wifi, unit_pets, unit_mini_fridge, unit_campfires,
  property_general_store, property_hot_tub, property_sauna, property_family_friendly,
  amenities_raw
) VALUES
(
  'in_progress', 'Yes', 'Yes',
  'Camp Ferncrest - Promised Land', 'Double Beds Dome w/ Hot Tub',
  'camp-ferncrest-promised-land-greentown-pa', 'Glamping Resort', 'Geodesic Dome',
  'Sage', 'cloudbeds_web_research_2026_05', 'United States', 'PA', 'Greentown',
  '16 Edgar Lane', '18426', 41.34, -75.26,
  'https://hotels.cloudbeds.com/en/reservation/oGb1qK', '+1-610-472-9467',
  $$Sibling SKU — Ferncrest Promised Land (Greentown PA). See anchor row id 11883 for property narrative.$$,
  $$Climate-controlled dome with two double beds (sleeps 4) and private wood-fired cedar hot tub; mini-fridge, microwave, French press, Parachute linens, picnic table, Wi‑Fi, heat/A/C; dog-friendly.$$,
  $$Cloudbeds Standard Rate sample: $395/night (2026-08-26→27, 2 adults).$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  395, 7, 1, '4',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes',
  'Dome SKU w/ private hot tub; sleeps 4.'
),
(
  'in_progress', 'Yes', 'Yes',
  'Camp Ferncrest - Promised Land', 'King Bed Crest Tent',
  'camp-ferncrest-promised-land-greentown-pa', 'Glamping Resort', 'Safari Tent',
  'Sage', 'cloudbeds_web_research_2026_05', 'United States', 'PA', 'Greentown',
  '16 Edgar Lane', '18426', 41.34, -75.26,
  'https://hotels.cloudbeds.com/en/reservation/oGb1qK', '+1-610-472-9467',
  $$Sibling SKU — Ferncrest Promised Land (Greentown PA).$$,
  $$Crest suite tent with king bed (sleeps 2); optional cot for 3rd guest (fee); Parachute linens, cooler, charging bank, fire pit, shared bathhouse access; dog-friendly.$$,
  $$Cloudbeds Standard Rate sample: $217/night (2026-08-26→27, 2 adults).$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  217, 7, 1, '2',
  'No', 'Yes', 'Yes', 'Yes', 'No', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes',
  'Crest suite canvas tent; no in-unit hot tub.'
),
(
  'in_progress', 'Yes', 'Yes',
  'Camp Ferncrest - Promised Land', 'Queen Beds Crest Tent',
  'camp-ferncrest-promised-land-greentown-pa', 'Glamping Resort', 'Safari Tent',
  'Sage', 'cloudbeds_web_research_2026_05', 'United States', 'PA', 'Greentown',
  '16 Edgar Lane', '18426', 41.34, -75.26,
  'https://hotels.cloudbeds.com/en/reservation/oGb1qK', '+1-610-472-9467',
  $$Sibling SKU — Ferncrest Promised Land (Greentown PA).$$,
  $$Crest suite tent with two queen beds (sleeps 4); linens, cooler, charging bank, fire pit, shared modern bathhouse; dog-friendly.$$,
  $$Cloudbeds Standard Rate sample: $246/night (2026-08-26→27, 2 adults).$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  246, 7, 1, '4',
  'No', 'Yes', 'Yes', 'Yes', 'No', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes',
  'Crest suite canvas tent; sleeps 4.'
),
(
  'in_progress', 'Yes', 'Yes',
  'Camp Ferncrest - Promised Land', 'King Bed Dome',
  'camp-ferncrest-promised-land-greentown-pa', 'Glamping Resort', 'Geodesic Dome',
  'Sage', 'cloudbeds_web_research_2026_05', 'United States', 'PA', 'Greentown',
  '16 Edgar Lane', '18426', 41.34, -75.26,
  'https://hotels.cloudbeds.com/en/reservation/oGb1qK', '+1-610-472-9467',
  $$Sibling SKU — Ferncrest Promised Land (Greentown PA).$$,
  $$Climate-controlled dome with king bed (sleeps 2); mini-fridge, microwave, Chemex, Brooklinen linens, RTIC cooler, electrical outlets, Wi‑Fi, heat/A/C; dog-friendly.$$,
  $$Cloudbeds Standard Rate sample: $289/night (2026-08-26→27, 2 adults).$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  289, 7, 1, '2',
  'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes',
  'Dome SKU without private hot tub.'
),
(
  'in_progress', 'Yes', 'Yes',
  'Camp Ferncrest - Promised Land', 'Double Beds Dome',
  'camp-ferncrest-promised-land-greentown-pa', 'Glamping Resort', 'Geodesic Dome',
  'Sage', 'cloudbeds_web_research_2026_05', 'United States', 'PA', 'Greentown',
  '16 Edgar Lane', '18426', 41.34, -75.26,
  'https://hotels.cloudbeds.com/en/reservation/oGb1qK', '+1-610-472-9467',
  $$Sibling SKU — Ferncrest Promised Land (Greentown PA).$$,
  $$Climate-controlled dome with two double beds (sleeps 4); mini-fridge, microwave, Chemex coffee maker, Parachute linens, picnic table, Wi‑Fi, heat/A/C; dog-friendly.$$,
  $$Cloudbeds Standard Rate sample: $304/night (2026-08-26→27, 2 adults).$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  304, 7, 1, '4',
  'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes',
  'Dome SKU without private hot tub; sleeps 4.'
),
(
  'in_progress', 'Yes', 'Yes',
  'Camp Ferncrest - Promised Land', 'Family Dome Suite',
  'camp-ferncrest-promised-land-greentown-pa', 'Glamping Resort', 'Geodesic Dome',
  'Sage', 'cloudbeds_web_research_2026_05', 'United States', 'PA', 'Greentown',
  '16 Edgar Lane', '18426', 41.34, -75.26,
  'https://hotels.cloudbeds.com/en/reservation/oGb1qK', '+1-610-472-9467',
  $$Sibling SKU — Ferncrest Promised Land (Greentown PA).$$,
  $$Climate-controlled family dome: one king bed, twin/queen bunk, and futon (sleeps 6); fridge, microwave, and standard dome conveniences; dog-friendly.$$,
  $$Cloudbeds Standard Rate sample: $429/night (2026-08-26→27, 2 adults).$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  429, 7, 1, '6',
  'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes',
  'Largest dome SKU; sleeps 6.'
);

-- Rates for sibling rows (INSERT values may be cleared by DB trigger; set explicitly).
UPDATE public.all_glamping_properties AS p
SET rate_avg_retail_daily_rate = v.rate, date_updated = '2026-05-18'
FROM (VALUES
  (11888::bigint, 395),
  (11889, 217),
  (11890, 246),
  (11891, 289),
  (11892, 304),
  (11893, 429)
) AS v(id, rate)
WHERE p.id = v.id;
