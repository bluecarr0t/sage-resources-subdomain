-- Camp Ferncrest - Acadia: Cloudbeds inventory (7 room types / site SKUs).
-- Source: https://hotels.cloudbeds.com/en/reservation/FCa2NZ (2-night sample 2026-09-15–17, May 2026).
-- rate_avg_retail_daily_rate = Cloudbeds total ÷ 2 nights (per-night estimate).

UPDATE public.all_glamping_properties SET
  site_name = 'King Bed w/ Hot tub',
  url = 'https://hotels.cloudbeds.com/en/reservation/FCa2NZ',
  address = '232 Caterpillar Hill Road',
  lat = 44.31670761,
  lon = -68.66983032,
  unit_capacity = '2',
  rate_avg_retail_daily_rate = 359,
  property_total_sites = 7,
  quantity_of_units = 1,
  unit_hot_tub = 'Yes',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_mini_fridge = 'Yes',
  unit_campfires = 'Yes',
  property_sauna = 'Yes',
  property_family_friendly = 'Yes',
  setting_coastal = 'Yes',
  setting_forest = 'Yes',
  activities_hiking = 'Yes',
  description = $$Camp Ferncrest Acadia on the Blue Hill Peninsula (232 Caterpillar Hill Road, Sargentville ME)—coastal Maine glamping near Acadia National Park. Cloudbeds lists seven SKUs: climate-controlled domes, an off-grid Basecamp king dome, a queen cabin, and family dome suite; shared sauna and modern bathhouse per operator.$$,
  unit_description = $$King dome with private hot tub and outdoor wood-burning fire pit; king bed (sleeps 2); linens/towels; climate-controlled; dog-friendly ($40/night pet fee).$$,
  notes = COALESCE(notes, '') || E'\n\nCloudbeds enrichment (May 2026): sample Standard Rate for 2026-09-15→17 (2 nights, 2 adults, USD); nightly ADR stored as total÷2.',
  amenities_raw = 'Domes, off-grid basecamp dome, queen cabin, family suite; property sauna; coastal/forest setting; dog-friendly policy.',
  date_updated = '2026-05-18'
WHERE id = 11885;

INSERT INTO public.all_glamping_properties (
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  address, zip_code, lat, lon, url, phone_number,
  description, unit_description, notes,
  date_added, date_updated, land_operator_category,
  rate_avg_retail_daily_rate, property_total_sites, quantity_of_units, unit_capacity,
  unit_hot_tub, unit_air_conditioning, unit_wifi, unit_pets, unit_mini_fridge, unit_campfires,
  property_sauna, property_family_friendly, setting_coastal, setting_forest, activities_hiking,
  amenities_raw
) VALUES
(
  'in_progress', 'Yes', 'Yes',
  'Camp Ferncrest - Acadia', 'King Bed',
  'camp-ferncrest-acadia-sargentville-me', 'Glamping Resort', 'Geodesic Dome',
  'Sage', 'cloudbeds_web_research_2026_05', 'United States', 'ME', 'Sargentville',
  '232 Caterpillar Hill Road', '04673', 44.31670761, -68.66983032,
  'https://hotels.cloudbeds.com/en/reservation/FCa2NZ', '+1-207-367-4441',
  $$Sibling SKU — Camp Ferncrest Acadia (Sargentville ME). See anchor row id 11885.$$,
  $$King dome tent: climate-controlled, king bed (sleeps 2), mini-fridge, pour-over coffee; shared bathhouse; dog-friendly.$$,
  $$Cloudbeds sample: $638 total / 2 nights ≈ $319/night (2026-09-15→17, 2 adults).$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  319, 7, 1, '2',
  'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Standard king dome SKU.'
),
(
  'in_progress', 'Yes', 'Yes',
  'Camp Ferncrest - Acadia', '2 Double Beds',
  'camp-ferncrest-acadia-sargentville-me', 'Glamping Resort', 'Geodesic Dome',
  'Sage', 'cloudbeds_web_research_2026_05', 'United States', 'ME', 'Sargentville',
  '232 Caterpillar Hill Road', '04673', 44.31670761, -68.66983032,
  'https://hotels.cloudbeds.com/en/reservation/FCa2NZ', '+1-207-367-4441',
  $$Sibling SKU — Camp Ferncrest Acadia (Sargentville ME).$$,
  $$Double dome: two double beds (sleeps 4), climate-controlled, mini-fridge, pour-over coffee; dog-friendly.$$,
  $$Cloudbeds sample: $664 total / 2 nights ≈ $332/night (2026-09-15→17, 2 adults).$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  332, 7, 1, '4',
  'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Double-bed dome; sleeps 4.'
),
(
  'in_progress', 'Yes', 'Yes',
  'Camp Ferncrest - Acadia', '2 Queen Beds',
  'camp-ferncrest-acadia-sargentville-me', 'Glamping Resort', 'Geodesic Dome',
  'Sage', 'cloudbeds_web_research_2026_05', 'United States', 'ME', 'Sargentville',
  '232 Caterpillar Hill Road', '04673', 44.31670761, -68.66983032,
  'https://hotels.cloudbeds.com/en/reservation/FCa2NZ', '+1-207-367-4441',
  $$Sibling SKU — Camp Ferncrest Acadia (Sargentville ME).$$,
  $$Queen dome: two queen beds (sleeps 4), climate-controlled, mini-fridge, microwave, pour-over coffee; dog-friendly.$$,
  $$Cloudbeds sample: $744 total / 2 nights ≈ $372/night (2026-09-15→17, 2 adults).$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  372, 7, 1, '4',
  'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Queen-bed dome; sleeps 4.'
),
(
  'in_progress', 'Yes', 'Yes',
  'Camp Ferncrest - Acadia', 'Cabin Queen',
  'camp-ferncrest-acadia-sargentville-me', 'Glamping Resort', 'Cabin',
  'Sage', 'cloudbeds_web_research_2026_05', 'United States', 'ME', 'Sargentville',
  '232 Caterpillar Hill Road', '04673', 44.31670761, -68.66983032,
  'https://hotels.cloudbeds.com/en/reservation/FCa2NZ', '+1-207-367-4441',
  $$Sibling SKU — Camp Ferncrest Acadia (Sargentville ME).$$,
  $$Climate-controlled cabin with queen bed (sleeps 2), mini-fridge, pour-over coffee; dog-friendly.$$,
  $$Cloudbeds sample: $691 total / 2 nights ≈ $346/night (2026-09-15→17, 2 adults).$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  346, 7, 1, '2',
  'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Cabin SKU (not dome).'
),
(
  'in_progress', 'Yes', 'Yes',
  'Camp Ferncrest - Acadia', 'Family Dome Suite',
  'camp-ferncrest-acadia-sargentville-me', 'Glamping Resort', 'Geodesic Dome',
  'Sage', 'cloudbeds_web_research_2026_05', 'United States', 'ME', 'Sargentville',
  '232 Caterpillar Hill Road', '04673', 44.31670761, -68.66983032,
  'https://hotels.cloudbeds.com/en/reservation/FCa2NZ', '+1-207-367-4441',
  $$Sibling SKU — Camp Ferncrest Acadia (Sargentville ME).$$,
  $$Family dome: king bed, twin-over-full bunk, futon (sleeps up to 6), climate-controlled, full amenities; dog-friendly.$$,
  $$Cloudbeds sample: $931 total / 2 nights ≈ $466/night (2026-09-15→17, 2 adults).$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  466, 7, 1, '6',
  'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Largest dome SKU; sleeps 6.'
),
(
  'in_progress', 'Yes', 'Yes',
  'Camp Ferncrest - Acadia', 'Basecamp King Dome',
  'camp-ferncrest-acadia-sargentville-me', 'Glamping Resort', 'Geodesic Dome',
  'Sage', 'cloudbeds_web_research_2026_05', 'United States', 'ME', 'Sargentville',
  '232 Caterpillar Hill Road', '04673', 44.31670761, -68.66983032,
  'https://hotels.cloudbeds.com/en/reservation/FCa2NZ', '+1-207-367-4441',
  $$Sibling SKU — Camp Ferncrest Acadia (Sargentville ME).$$,
  $$Off-grid basecamp dome: king bed (sleeps 2), unplugged/nature-focused experience with portable power amenities per operator listing; dog-friendly.$$,
  $$Cloudbeds sample: $504 total / 2 nights ≈ $252/night (2026-09-15→17, 2 adults).$$,
  '2026-05-18', '2026-05-18', 'private_commercial',
  252, 7, 1, '2',
  'No', 'No', 'No', 'Yes', 'No', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Off-grid basecamp dome SKU.'
);

UPDATE public.all_glamping_properties AS p
SET rate_avg_retail_daily_rate = v.rate, date_updated = '2026-05-18'
FROM (VALUES
  ('King Bed', 319::numeric),
  ('2 Double Beds', 332),
  ('2 Queen Beds', 372),
  ('Cabin Queen', 346),
  ('Family Dome Suite', 466),
  ('Basecamp King Dome', 252)
) AS v(site_name, rate)
WHERE p.slug = 'camp-ferncrest-acadia-sargentville-me'
  AND p.site_name = v.site_name;
