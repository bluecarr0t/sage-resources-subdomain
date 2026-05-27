-- Trailborn Outdoor Collection (US): site names, unit amenities, and sample ADRs (May 2026).
-- Sources: trailborn.com/*/rooms/, property overview pages; sample rates from public packages/aggregators.
-- Safe to re-run (NOT EXISTS on inserts; idempotent UPDATEs by id).

-- ---------------------------------------------------------------------------
-- Trailborn Highlands (10 room products) — anchor id 12222
-- ---------------------------------------------------------------------------
UPDATE public.all_glamping_properties SET
  property_id = 'ac466005-2cee-4c01-be5c-66ef3f91ea6c'::uuid,
  site_name = 'King Room',
  slug = 'trailborn-highlands-nc-king-room',
  property_type = 'Glamping',
  unit_type = 'Hotel Room',
  source = 'Sage',
  discovery_source = 'web_research_trailborn_site_inventory_2026_05_26',
  research_status = 'published',
  is_glamping_property = 'Yes',
  is_open = 'Yes',
  property_total_sites = 10,
  quantity_of_units = 1,
  unit_capacity = '2',
  unit_bed = '1 King',
  unit_wifi = 'Yes',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_patio = 'No',
  unit_ada_accessibility = 'Yes',
  property_food_on_site = 'Yes',
  property_sauna = 'Yes',
  property_family_friendly = 'Yes',
  activities_hiking = 'Yes',
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  date_updated = '2026-05-26',
  url = 'https://www.trailborn.com/highlands/rooms/',
  description = $$Trailborn Highlands — Outdoor Collection boutique hotel in the Blue Ridge Mountains (Highlands, NC). Nordic outdoor spa, Highlands Supper Club, guided fly-fishing and hiking excursions, bikes, and garden/patio/balcony room categories.$$,
  unit_description = $$King Room: king bed, modern walk-in shower; tubs and fireplaces available in select rooms.$$,
  amenities_raw = 'King bed; walk-in shower; modern bathroom; mountain lodge room; Trailborn custom bedding; board games and bikes on property; Nordic outdoor spa; on-site restaurant.',
  rate_avg_retail_daily_rate = 199,
  rate_summer_weekday = 199,
  rate_summer_weekend = 249,
  rate_unit_rates_by_year = '{"2026":{"source":"kayak_aggregator_sample_may_2026","currency":"USD","notes":"Public aggregator range ~$148–$293/night; mid-tier king estimate"}}'::jsonb,
  notes = COALESCE(notes, '') || E'\n\nMay 2026: Site inventory from trailborn.com/highlands/rooms/.'
WHERE id = 12222;

INSERT INTO public.all_glamping_properties (
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  address, lat, lon, url,
  property_id, brand_id, property_total_sites, quantity_of_units,
  unit_capacity, unit_bed, unit_wifi, unit_private_bathroom, unit_shower,
  unit_gas_fireplace, unit_patio, unit_ada_accessibility,
  property_food_on_site, property_sauna, property_family_friendly, activities_hiking,
  land_operator_category, glamping_service_tier,
  unit_description, amenities_raw,
  rate_avg_retail_daily_rate, rate_summer_weekday, rate_summer_weekend,
  rate_unit_rates_by_year, date_added, date_updated, notes
)
SELECT
  'published', 'Yes', 'Yes',
  v.property_name, v.site_name, v.slug, 'Glamping', 'Hotel Room',
  'Sage', 'web_research_trailborn_site_inventory_2026_05_26',
  'United States', 'NC', 'Highlands',
  '96 Log Cabin Ln, Highlands, NC 28741', 35.053::numeric, -83.197::numeric,
  'https://www.trailborn.com/highlands/rooms/',
  'ac466005-2cee-4c01-be5c-66ef3f91ea6c'::uuid, b.id, 10, 1,
  v.capacity, v.bed, 'Yes', 'Yes', 'Yes',
  v.fireplace, v.patio, v.ada,
  'Yes', 'Yes', 'Yes', 'Yes',
  'private_commercial', 'upscale',
  v.unit_desc, v.amenities,
  v.rate::numeric, v.rate::numeric, (v.rate + 40)::numeric,
  jsonb_build_object('2026', jsonb_build_object('source', 'trailborn.com_may_2026', 'currency', 'USD', 'nightly_estimate_usd', v.rate)),
  '2026-05-26', '2026-05-26',
  'May 2026: Site row from trailborn.com/highlands/rooms/.'
FROM (VALUES
  ('Trailborn Highlands', 'King Room with Fireplace', 'trailborn-highlands-nc-king-fireplace', '2', '1 King', 'Yes', 'No', 'No', $$King bed, walk-in shower, in-room fireplace.$$ , 'King bed; fireplace; walk-in shower.', 219),
  ('Trailborn Highlands', 'Double Queen', 'trailborn-highlands-nc-double-queen', '4', '2 Queen', 'No', 'No', 'Yes', $$Two queen beds; walk-in shower; up to four guests.$$ , '2 queen beds; walk-in shower; ADA available.', 229),
  ('Trailborn Highlands', 'King Patio Room', 'trailborn-highlands-nc-king-patio', '2', '1 King', 'No', 'Yes', 'No', $$King bed, private patio with outdoor seating.$$ , 'King bed; private patio; walk-in shower.', 239),
  ('Trailborn Highlands', 'Queen Patio Room', 'trailborn-highlands-nc-queen-patio', '4', '2 Queen', 'No', 'Yes', 'No', $$Two queen beds and private patio for up to four.$$ , '2 queen beds; private patio; walk-in shower.', 249),
  ('Trailborn Highlands', 'King Garden Room', 'trailborn-highlands-nc-king-garden', '2', '1 King', 'No', 'Yes', 'Yes', $$King bed, garden patio seating.$$ , 'King bed; garden patio; ADA available.', 259),
  ('Trailborn Highlands', 'King Balcony Room', 'trailborn-highlands-nc-king-balcony', '2', '1 King', 'No', 'No', 'Yes', $$King bed and private balcony.$$ , 'King bed; private balcony; walk-in shower.', 269),
  ('Trailborn Highlands', 'Queen Balcony Room', 'trailborn-highlands-nc-queen-balcony', '4', '2 Queen', 'No', 'No', 'No', $$Two queen beds, private balcony.$$ , '2 queen beds; private balcony.', 279),
  ('Trailborn Highlands', 'The Garden Suite', 'trailborn-highlands-nc-garden-suite', '4', '1 King & 1 Trundle', 'No', 'Yes', 'No', $$King bed, couch and trundle; largest suite with private patio.$$ , 'King bed; trundle; private patio; suite.', 349)
) AS v(property_name, site_name, slug, capacity, bed, fireplace, patio, ada, unit_desc, amenities, rate)
CROSS JOIN public.glamping_brands b
WHERE b.slug = 'marriott-outdoor-collection'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_glamping_properties e WHERE e.slug = v.slug
  );

-- ---------------------------------------------------------------------------
-- Trailborn Surf & Sound (13 room products) — anchor id 12223
-- ---------------------------------------------------------------------------
UPDATE public.all_glamping_properties SET
  property_id = 'c2155e6a-bcf9-4bc4-9f4a-95ff51900a2d'::uuid,
  site_name = 'Oceanfront King',
  slug = 'trailborn-surf-sound-nc-oceanfront-king',
  property_type = 'Glamping',
  unit_type = 'Hotel Room',
  property_total_sites = 13,
  quantity_of_units = 1,
  unit_capacity = '2',
  unit_bed = '1 King',
  unit_wifi = 'Yes',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_ada_accessibility = 'Yes',
  property_food_on_site = 'Yes',
  property_pool = 'Yes',
  property_hot_tub = 'Yes',
  property_sauna = 'Yes',
  property_waterfront = 'Yes',
  property_fitness_room = 'Yes',
  activities_surfing = 'Yes',
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  date_updated = '2026-05-26',
  url = 'https://www.trailborn.com/surf-sound/rooms/',
  description = $$Trailborn Surf & Sound — Outdoor Collection beach resort on Wrightsville Beach, NC. Oceanfront and soundside rooms, pool, hot tub, sauna, La Duna Paradiso dining, surf lessons, and harbor sunsets.$$,
  unit_description = $$Oceanfront King: plush king bed, modern shower, Atlantic views.$$,
  amenities_raw = 'Oceanfront king; Atlantic views; walk-in shower; pool; hot tub; sauna; fitness center; beach access; on-site restaurant.',
  rate_avg_retail_daily_rate = 329,
  rate_summer_weekday = 329,
  rate_summer_weekend = 389,
  rate_unit_rates_by_year = '{"2026":{"source":"priceline_sample_may_2026","currency":"USD","from_price_usd":329}}'::jsonb,
  notes = COALESCE(notes, '') || E'\n\nMay 2026: Site inventory from trailborn.com/surf-sound/rooms/.'
WHERE id = 12223;

INSERT INTO public.all_glamping_properties (
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  address, lat, lon, url,
  property_id, brand_id, property_total_sites, quantity_of_units,
  unit_capacity, unit_bed, unit_wifi, unit_private_bathroom, unit_shower, unit_ada_accessibility,
  property_food_on_site, property_pool, property_hot_tub, property_sauna, property_waterfront, property_fitness_room,
  activities_surfing, land_operator_category, glamping_service_tier,
  unit_description, amenities_raw, rate_avg_retail_daily_rate, rate_summer_weekday, rate_summer_weekend,
  date_added, date_updated, notes
)
SELECT
  'published', 'Yes', 'Yes',
  v.property_name, v.site_name, v.slug, 'Glamping', 'Hotel Room',
  'Sage', 'web_research_trailborn_site_inventory_2026_05_26',
  'United States', 'NC', 'Wrightsville Beach',
  '10 Heekin Ave, Wrightsville Beach, NC 28480', 34.21::numeric, -77.796::numeric,
  'https://www.trailborn.com/surf-sound/rooms/',
  'c2155e6a-bcf9-4bc4-9f4a-95ff51900a2d'::uuid, b.id, 13, 1,
  v.capacity, v.bed, 'Yes', 'Yes', 'Yes', v.ada,
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'private_commercial', 'upscale',
  v.unit_desc, v.amenities, v.rate::numeric, v.rate::numeric, (v.rate + 60)::numeric,
  '2026-05-26', '2026-05-26', 'May 2026: Site row from trailborn.com/surf-sound/rooms/.'
FROM (VALUES
  ('Trailborn Surf & Sound', 'Oceanfront Double Queen', 'trailborn-surf-sound-nc-oceanfront-double-queen', '4', '2 Queen', 'Yes', $$Two queen beds; ocean and Great Lawn views.$$ , 'Oceanfront; 2 queen; walk-in shower.', 349),
  ('Trailborn Surf & Sound', 'Oceanfront King Junior Suite', 'trailborn-surf-sound-nc-oceanfront-king-junior-suite', '4', '1 King & 1 Sleeper Sofa', 'Yes', $$King bed, sleeper sofa, sliding doors to ocean breeze.$$ , 'Junior suite; king; sleeper sofa; oceanfront.', 379),
  ('Trailborn Surf & Sound', 'Soundside King', 'trailborn-surf-sound-nc-soundside-king', '2', '1 King', 'No', $$Harbor and sunset views; king bed.$$ , 'Soundside king; harbor views.', 279),
  ('Trailborn Surf & Sound', 'Soundside Double Queen', 'trailborn-surf-sound-nc-soundside-double-queen', '4', '2 Queen', 'Yes', $$Two queens overlooking the harbor.$$ , 'Soundside; 2 queen; ADA.', 299),
  ('Trailborn Surf & Sound', 'Soundside King Junior Suite', 'trailborn-surf-sound-nc-soundside-king-junior-suite', '4', '1 King & 1 Sleeper Sofa', 'Yes', $$King and sleeper sofa with harbor views.$$ , 'Soundside junior suite; ADA.', 319),
  ('Trailborn Surf & Sound', 'Oceanfront King with Balcony', 'trailborn-surf-sound-nc-oceanfront-king-balcony', '2', '1 King', 'No', $$Private furnished balcony; Atlantic views.$$ , 'Oceanfront king; private balcony.', 359),
  ('Trailborn Surf & Sound', 'Oceanfront Double Queen with Balcony', 'trailborn-surf-sound-nc-oceanfront-dq-balcony', '4', '2 Queen', 'No', $$Two queens with oceanfront balcony.$$ , 'Oceanfront balcony; 2 queen.', 389),
  ('Trailborn Surf & Sound', 'Oceanfront King Junior Suite with Balcony', 'trailborn-surf-sound-nc-oceanfront-king-js-balcony', '4', '1 King & 1 Sleeper Sofa', 'No', $$Junior suite with oceanfront balcony.$$ , 'Oceanfront junior suite; balcony.', 419),
  ('Trailborn Surf & Sound', 'Oceanfront King Suite with Balcony', 'trailborn-surf-sound-nc-oceanfront-king-suite-balcony', '4', '1 King & 1 Sleeper Sofa', 'No', $$Largest oceanfront suite; soaking tub; seating area.$$ , 'Oceanfront suite; soaking tub; balcony.', 459),
  ('Trailborn Surf & Sound', 'Family Beachfront Suite', 'trailborn-surf-sound-nc-family-beachfront-suite', '6', '1 King, 1 Queen, Bunk Beds', 'No', $$Three-room suite with kitchenette; Great Lawn access.$$ , 'Family suite; kitchenette; 3 beds.', 499)
) AS v(property_name, site_name, slug, capacity, bed, ada, unit_desc, amenities, rate)
CROSS JOIN public.glamping_brands b
WHERE b.slug = 'marriott-outdoor-collection'
  AND NOT EXISTS (SELECT 1 FROM public.all_glamping_properties e WHERE e.slug = v.slug);

-- ---------------------------------------------------------------------------
-- Trailborn Grand Canyon (2 room products) — anchor id 12224
-- ---------------------------------------------------------------------------
UPDATE public.all_glamping_properties SET
  property_id = 'ce5d074a-1c1c-47bd-9787-66b9a1ee6668'::uuid,
  site_name = 'Canyon King',
  slug = 'trailborn-grand-canyon-az-canyon-king',
  property_type = 'Glamping',
  unit_type = 'Hotel Room',
  property_total_sites = 2,
  quantity_of_units = 1,
  unit_capacity = '2',
  unit_bed = '1 King',
  unit_wifi = 'Yes',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  property_food_on_site = 'Yes',
  property_pool = 'Yes',
  property_hot_tub = 'Yes',
  activities_hiking = 'Yes',
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  date_updated = '2026-05-26',
  url = 'https://www.trailborn.com/grand-canyon/rooms/',
  description = $$Trailborn Grand Canyon — Outdoor Collection Route 66 lodge in Williams, AZ. Pool, hot tub, Miss Kitty''s Steakhouse, Camp Hall, and canyon excursions.$$,
  unit_description = $$Canyon King: custom velvet headboard, walk-in shower, Route 66-inspired décor.$$,
  amenities_raw = 'King bed; walk-in shower; seasonal pool; hot tub; on-site steakhouse; bocce and playground.',
  rate_avg_retail_daily_rate = 175,
  rate_summer_weekday = 175,
  rate_summer_weekend = 199,
  rate_unit_rates_by_year = '{"2026":{"source":"trailborn_package_sample_may_2026","currency":"USD","package_nightly_from_usd":166}}'::jsonb,
  notes = COALESCE(notes, '') || E'\n\nMay 2026: Site inventory from trailborn.com/grand-canyon/rooms/.'
WHERE id = 12224;

INSERT INTO public.all_glamping_properties (
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  address, lat, lon, url, property_id, brand_id,
  property_total_sites, quantity_of_units, unit_capacity, unit_bed,
  unit_wifi, unit_private_bathroom, unit_shower,
  property_food_on_site, property_pool, property_hot_tub, activities_hiking,
  land_operator_category, glamping_service_tier,
  unit_description, amenities_raw, rate_avg_retail_daily_rate, rate_summer_weekday, rate_summer_weekend,
  date_added, date_updated, notes
)
SELECT
  'published', 'Yes', 'Yes',
  'Trailborn Grand Canyon', 'Canyon Queen', 'trailborn-grand-canyon-az-canyon-queen',
  'Glamping', 'Hotel Room', 'Sage', 'web_research_trailborn_site_inventory_2026_05_26',
  'United States', 'AZ', 'Williams',
  '235 N Grand Canyon Blvd, Williams, AZ 86046', 35.249::numeric, -112.191::numeric,
  'https://www.trailborn.com/grand-canyon/rooms/',
  'ce5d074a-1c1c-47bd-9787-66b9a1ee6668'::uuid, b.id,
  2, 1, '4', '2 Queen', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes', 'private_commercial', 'upscale',
  $$Two queen beds; modern bath; ideal for families.$$,
  '2 queen beds; walk-in shower; canyon gateway lodge.',
  195::numeric, 195::numeric, 219::numeric,
  '2026-05-26', '2026-05-26', 'May 2026: Site row from trailborn.com/grand-canyon/rooms/.'
FROM public.glamping_brands b
WHERE b.slug = 'marriott-outdoor-collection'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_glamping_properties e WHERE e.slug = 'trailborn-grand-canyon-az-canyon-queen'
  );

-- ---------------------------------------------------------------------------
-- Trailborn Jackson Hole (8 room products) — anchor id 11823
-- ---------------------------------------------------------------------------
UPDATE public.all_glamping_properties SET
  property_id = '157f26c3-0ab1-4dc3-8ea5-60c779b6bb0d'::uuid,
  site_name = 'Double Queen',
  slug = 'trailborn-jackson-hole-wy-double-queen',
  property_type = 'Glamping',
  unit_type = 'Hotel Room',
  property_total_sites = 8,
  quantity_of_units = 1,
  unit_capacity = '4',
  unit_bed = '2 Queen',
  unit_wifi = 'Yes',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_ada_accessibility = 'Yes',
  property_food_on_site = 'Yes',
  property_pool = 'Yes',
  property_hot_tub = 'Yes',
  property_sauna = 'Yes',
  property_fitness_room = 'Yes',
  activities_hiking = 'Yes',
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  date_updated = '2026-05-26',
  url = 'https://www.trailborn.com/jackson-hole/rooms/',
  description = $$Trailborn Jackson Hole — Outdoor Collection ski-in/ski-out resort at Snow King. Ember Lily spa, Old Timer restaurant, pool, hot tub, and alpine excursions.$$,
  unit_description = $$Double Queen: renovated alpine room with two queen beds and en suite bath.$$,
  amenities_raw = '2 queen beds; en suite bath; ski-in/ski-out; spa; pool; hot tub; restaurant; mountain views available.',
  rate_avg_retail_daily_rate = 289,
  rate_summer_weekday = 289,
  rate_summer_weekend = 349,
  notes = COALESCE(notes, '') || E'\n\nMay 2026: Site inventory from trailborn.com/jackson-hole/rooms/.'
WHERE id = 11823;

INSERT INTO public.all_glamping_properties (
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  address, zip_code, lat, lon, url, property_id, brand_id,
  property_total_sites, quantity_of_units, unit_capacity, unit_bed,
  unit_wifi, unit_private_bathroom, unit_shower, unit_patio, unit_ada_accessibility,
  property_food_on_site, property_pool, property_hot_tub, property_sauna, property_fitness_room, activities_hiking,
  land_operator_category, glamping_service_tier,
  unit_description, amenities_raw, rate_avg_retail_daily_rate, rate_summer_weekday, rate_summer_weekend,
  date_added, date_updated, notes
)
SELECT
  'published', 'Yes', 'Yes',
  v.property_name, v.site_name, v.slug, 'Glamping', 'Hotel Room',
  'Sage', 'web_research_trailborn_site_inventory_2026_05_26',
  'United States', 'WY', 'Jackson', '400 E Snow King Ave, Jackson, WY 83001', '83001',
  43.747::numeric, -110.762::numeric, 'https://www.trailborn.com/jackson-hole/rooms/',
  '157f26c3-0ab1-4dc3-8ea5-60c779b6bb0d'::uuid, b.id,
  8, 1, v.capacity, v.bed, 'Yes', 'Yes', 'Yes', v.patio, v.ada,
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'private_commercial', 'upscale',
  v.unit_desc, v.amenities, v.rate::numeric, v.rate::numeric, (v.rate + 60)::numeric,
  '2026-05-26', '2026-05-26', 'May 2026: Site row from trailborn.com/jackson-hole/rooms/.'
FROM (VALUES
  ('Trailborn Jackson Hole', 'Double Queen with Balcony', 'trailborn-jackson-hole-wy-double-queen-balcony', '4', '2 Queen', 'Yes', 'No', $$Private balcony; two queen beds.$$ , '2 queen; private balcony.', 309),
  ('Trailborn Jackson Hole', 'Mountainview Double Queen with Balcony', 'trailborn-jackson-hole-wy-mtnview-dq-balcony', '4', '2 Queen', 'No', 'No', $$Mountain views; two queens; balcony.$$ , 'Mountain view; 2 queen; balcony.', 339),
  ('Trailborn Jackson Hole', 'King', 'trailborn-jackson-hole-wy-king', '2', '1 King', 'No', 'Yes', $$King bed; en suite bath; ADA.$$ , 'King room; alpine renovation.', 299),
  ('Trailborn Jackson Hole', 'King with Balcony', 'trailborn-jackson-hole-wy-king-balcony', '2', '1 King', 'Yes', 'No', $$King with private balcony.$$ , 'King; balcony.', 329),
  ('Trailborn Jackson Hole', 'Mountainview King with Balcony', 'trailborn-jackson-hole-wy-mtnview-king-balcony', '2', '1 King', 'No', 'No', $$Mountainview king with balcony.$$ , 'Mountain view king; balcony.', 359),
  ('Trailborn Jackson Hole', 'King Suite', 'trailborn-jackson-hole-wy-king-suite', '4', '1 King & 1 Sleeper Sofa', 'No', 'No', $$King suite with sleeper sofa.$$ , 'Suite; king; sleeper sofa.', 429),
  ('Trailborn Jackson Hole', 'Elk Bunk Room', 'trailborn-jackson-hole-wy-elk-bunk-room', '6', '2 Queen & 2 Single Bunk', 'No', 'No', $$Family bunk suite: two queens and two singles.$$ , 'Bunk room; sleeps 6; tubs on request.', 479)
) AS v(property_name, site_name, slug, capacity, bed, patio, ada, unit_desc, amenities, rate)
CROSS JOIN public.glamping_brands b
WHERE b.slug = 'marriott-outdoor-collection'
  AND NOT EXISTS (SELECT 1 FROM public.all_glamping_properties e WHERE e.slug = v.slug);

-- ---------------------------------------------------------------------------
-- Trailborn Mendocino Hillside (9 room products) — anchor id 12225
-- ---------------------------------------------------------------------------
UPDATE public.all_glamping_properties SET
  property_id = 'eeb4a6ec-4c2b-4679-92f0-39b43eaef289'::uuid,
  site_name = 'King',
  slug = 'trailborn-mendocino-hillside-ca-king',
  property_type = 'Glamping',
  unit_type = 'Hotel Room',
  property_total_sites = 9,
  quantity_of_units = 1,
  unit_capacity = '2',
  unit_bed = '1 King',
  unit_wifi = 'Yes',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_ada_accessibility = 'Yes',
  property_food_on_site = 'Yes',
  property_waterfront = 'Yes',
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  is_open = 'Under Construction',
  date_updated = '2026-05-26',
  url = 'https://www.trailborn.com/mendocino/rooms/',
  description = $$Trailborn Mendocino Hillside — Outdoor Collection coastal hillside retreat (Hill House). Farmhouse-style rooms with Pacific and ocean-view categories; verify opening on marriott.com.$$,
  unit_description = $$King: custom Trailborn king bed; en suite bath; tubs on request.$$,
  amenities_raw = 'King bed; en suite shower; coastal farmhouse room; ocean-view categories available.',
  rate_avg_retail_daily_rate = 299,
  rate_summer_weekday = 299,
  rate_summer_weekend = 359,
  notes = COALESCE(notes, '') || E'\n\nMay 2026: Site inventory from trailborn.com/mendocino/rooms/. Pre-opening — rates estimated.'
WHERE id = 12225;

INSERT INTO public.all_glamping_properties (
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  address, lat, lon, url, property_id, brand_id,
  property_total_sites, quantity_of_units, unit_capacity, unit_bed,
  unit_wifi, unit_private_bathroom, unit_shower, unit_patio, unit_ada_accessibility,
  property_food_on_site, property_waterfront, land_operator_category, glamping_service_tier,
  unit_description, amenities_raw, rate_avg_retail_daily_rate, rate_summer_weekday, rate_summer_weekend,
  date_added, date_updated, notes
)
SELECT
  'published', 'Yes', v.is_open,
  v.property_name, v.site_name, v.slug, 'Glamping', 'Hotel Room',
  'Sage', 'web_research_trailborn_site_inventory_2026_05_26',
  'United States', 'CA', 'Mendocino',
  '10701 Palette Dr, Mendocino, CA 95460', 39.307::numeric, -123.799::numeric,
  'https://www.trailborn.com/mendocino/rooms/',
  'eeb4a6ec-4c2b-4679-92f0-39b43eaef289'::uuid, b.id,
  9, 1, v.capacity, v.bed, 'Yes', 'Yes', 'Yes', v.patio, v.ada,
  'Yes', 'Yes', 'private_commercial', 'upscale',
  v.unit_desc, v.amenities, v.rate::numeric, v.rate::numeric, (v.rate + 60)::numeric,
  '2026-05-26', '2026-05-26', 'May 2026: Site row from trailborn.com/mendocino/rooms/.'
FROM (VALUES
  ('Trailborn Mendocino Hillside', 'King Ocean View', 'trailborn-mendocino-hillside-ca-king-ocean-view', 'Under Construction', '2', '1 King', 'No', 'No', $$West-facing ocean views; king bed.$$ , 'King; ocean view.', 349),
  ('Trailborn Mendocino Hillside', 'King Balcony', 'trailborn-mendocino-hillside-ca-king-balcony', 'Under Construction', '2', '1 King', 'Yes', 'No', $$Private balcony; king bed.$$ , 'King; private balcony.', 319),
  ('Trailborn Mendocino Hillside', 'King Balcony Ocean View', 'trailborn-mendocino-hillside-ca-king-balcony-ocean-view', 'Under Construction', '2', '1 King', 'Yes', 'No', $$Balcony with Pacific sunset views.$$ , 'King; balcony; ocean view.', 389),
  ('Trailborn Mendocino Hillside', 'Double Queen', 'trailborn-mendocino-hillside-ca-double-queen', 'Under Construction', '4', '2 Queen', 'No', 'Yes', $$Two Trailborn queen beds.$$ , '2 queen; ADA.', 329),
  ('Trailborn Mendocino Hillside', 'Double Queen Ocean View', 'trailborn-mendocino-hillside-ca-dq-ocean-view', 'Under Construction', '4', '2 Queen', 'No', 'No', $$Ocean-view double queen.$$ , '2 queen; ocean view.', 369),
  ('Trailborn Mendocino Hillside', 'Double Queen Balcony Ocean View', 'trailborn-mendocino-hillside-ca-dq-balcony-ocean-view', 'Under Construction', '4', '2 Queen', 'Yes', 'No', $$Balcony; ocean sunset views.$$ , '2 queen; balcony; ocean view.', 399),
  ('Trailborn Mendocino Hillside', 'King Junior Suite', 'trailborn-mendocino-hillside-ca-king-junior-suite', 'Under Construction', '4', '1 King & 1 Sleeper Sofa', 'No', 'No', $$Junior suite with sleeper sofa.$$ , 'Junior suite; king; sofa bed.', 419),
  ('Trailborn Mendocino Hillside', 'King Junior Suite Ocean View', 'trailborn-mendocino-hillside-ca-king-js-ocean-view', 'Under Construction', '4', '1 King & 1 Sleeper Sofa', 'No', 'No', $$Ocean-view junior suite.$$ , 'Junior suite; ocean view.', 459)
) AS v(property_name, site_name, slug, is_open, capacity, bed, patio, ada, unit_desc, amenities, rate)
CROSS JOIN public.glamping_brands b
WHERE b.slug = 'marriott-outdoor-collection'
  AND NOT EXISTS (SELECT 1 FROM public.all_glamping_properties e WHERE e.slug = v.slug);

-- Sync brand_id on all Trailborn rows
UPDATE public.all_glamping_properties p
SET brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'marriott-outdoor-collection'),
    updated_at = now()
WHERE p.property_name ILIKE 'Trailborn%'
  AND p.research_status = 'published'
  AND (p.brand_id IS NULL OR p.brand_id IS DISTINCT FROM (SELECT id FROM public.glamping_brands WHERE slug = 'marriott-outdoor-collection'));
