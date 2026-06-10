-- Priority 3: Midwest resort-adjacent / wellness comps (Jun 2026 web research).
-- Non-glamping inventory → property_type Outdoor Boutique Hotel, is_glamping_property = No.
-- Timber Ridge Outpost remains Glamping (operator-branded); rates enriched from timberridgeoutpost.com.
-- discovery_source = web_research_midwest_resort_adjacent_comps_2026_06

-- ── Sundara Inn & Spa (destination spa — not glamping) ───────────────────────
INSERT INTO public.all_glamping_properties (
  property_id, research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city, address, zip_code, lat, lon, url, phone_number,
  description, notes, date_added, date_updated, land_operator_category,
  property_total_sites, quantity_of_units, unit_capacity, minimum_nights, operating_season_months,
  property_restaurant, property_sauna, property_fitness_room, property_pool, property_food_on_site,
  setting_forest, setting_lake,
  rate_avg_retail_daily_rate, rate_summer_weekday, rate_summer_weekend,
  rate_spring_weekend, rate_fall_weekend, rate_winter_weekend
)
SELECT * FROM (VALUES
  (
    'f8a2c1d4-6e7b-4a9f-b3c2-1d8e5f6a7b90'::uuid, 'published', 'No', 'Yes',
    'Sundara Inn & Spa', 'Spa Suites', 'sundara-inn-spa-wisconsin-dells-wi',
    'Outdoor Boutique Hotel', 'Suite',
    'Sage', 'web_research_midwest_resort_adjacent_comps_2026_06', 'United States', 'WI', 'Wisconsin Dells',
    '920 Canyon Road', '53965', 43.5725::numeric, -89.8120::numeric,
    'https://www.sundaraspa.com/', '(888) 735-8181',
    $$Adults-only destination spa on 26 pine-forest acres at Wisconsin Dells (~1.5 hr from Lake Geneva). 42 spa suites, infinity/saltwater pools, bathhouse, Purifying Bath Ritual, fitness studio, Nava restaurant, $45/night resort fee. Wellness comp for sauna/gym/F&B amenity thesis — not glamping inventory.$$,
    $$26 suites (Luxury/Plush/Premier/Exclusive tiers). Published specials from ~$349; typical band $300–600/night + resort fee (Jun 2026 web research).$$,
    '2026-06-09', '2026-06-09', 'private_commercial',
    42::numeric, 26::numeric, '2', '2', 'Year-round',
    'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
    425::numeric, 400::numeric, 550::numeric, 450::numeric, 475::numeric, 425::numeric
  ),
  (
    'f8a2c1d4-6e7b-4a9f-b3c2-1d8e5f6a7b90'::uuid, 'published', 'No', 'Yes',
    'Sundara Inn & Spa', 'Villa Suite & Lifestyle Villa', 'sundara-inn-spa-wisconsin-dells-wi',
    'Outdoor Boutique Hotel', 'Villa',
    'Sage', 'web_research_midwest_resort_adjacent_comps_2026_06', 'United States', 'WI', 'Wisconsin Dells',
    '920 Canyon Road', '53965', 43.5725::numeric, -89.8120::numeric,
    'https://www.sundaraspa.com/stay/', '(888) 735-8181',
    $$Sibling row — Sundara villa inventory (1,700 sq ft lifestyle villas + villa suites); phone booking for many villa stays.$$,
    $$12 villa units cited on property marketing; online suite listings ~$529+; villa rentals $275–700+ by season (third-party reports).$$,
    '2026-06-09', '2026-06-09', 'private_commercial',
    42::numeric, 12::numeric, '8', '2', 'Year-round',
    'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
    575::numeric, 500::numeric, 700::numeric, 525::numeric, 600::numeric, 475::numeric
  ),
  (
    'f8a2c1d4-6e7b-4a9f-b3c2-1d8e5f6a7b90'::uuid, 'published', 'No', 'Yes',
    'Sundara Inn & Spa', 'Vanya & GolfSide Reserve', 'sundara-inn-spa-wisconsin-dells-wi',
    'Outdoor Boutique Hotel', 'Suite',
    'Sage', 'web_research_midwest_resort_adjacent_comps_2026_06', 'United States', 'WI', 'Wisconsin Dells',
    '920 Canyon Road', '53965', 43.5725::numeric, -89.8120::numeric,
    'https://www.sundaraspa.com/stay/reserves/', '(888) 735-8181',
    $$Woodland reserve suites with private outdoor hot soak; skywalk to main spa (Vanya) or golf-side setting (GolfSide). Sleeps 6.$$,
    $$Premium woodland SKU; retreat pricing from ~$649/weekday cited in specials (Jun 2026).$$,
    '2026-06-09', '2026-06-09', 'private_commercial',
    42::numeric, 2::numeric, '6', '2', 'Year-round',
    'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
    675::numeric, 649::numeric, 775::numeric, 625::numeric, 700::numeric, 599::numeric
  )
) AS v(
  property_id, research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city, address, zip_code, lat, lon, url, phone_number,
  description, notes, date_added, date_updated, land_operator_category,
  property_total_sites, quantity_of_units, unit_capacity, minimum_nights, operating_season_months,
  property_restaurant, property_sauna, property_fitness_room, property_pool, property_food_on_site,
  setting_forest, setting_lake,
  rate_avg_retail_daily_rate, rate_summer_weekday, rate_summer_weekend,
  rate_spring_weekend, rate_fall_weekend, rate_winter_weekend
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.all_glamping_properties e
  WHERE e.slug = 'sundara-inn-spa-wisconsin-dells-wi' AND e.site_name = v.site_name
);

-- ── Pepin Forest Treehouse collection ────────────────────────────────────────
INSERT INTO public.all_glamping_properties (
  property_id, research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city, zip_code, lat, lon, url,
  description, unit_description, notes, date_added, date_updated, land_operator_category,
  property_total_sites, quantity_of_units, unit_capacity, minimum_nights, operating_season_months,
  unit_hot_tub, property_sauna, unit_full_kitchen, setting_forest,
  rate_avg_retail_daily_rate, rate_summer_weekday, rate_summer_weekend
)
SELECT * FROM (VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'published', 'Yes', 'Yes',
    'Pepin Forest Treehouse', 'Pepin Forest Treehouse', 'pepin-forest-treehouse-pepin-wi',
    'Glamping Resort', 'Treehouse',
    'Sage', 'web_research_midwest_resort_adjacent_comps_2026_06', 'United States', 'WI', 'Pepin', '54759',
    44.4420::numeric, -92.1280::numeric, 'https://www.pepinforesttreehouse.com/',
    $$480 sq ft forest treehouse on 3-acre Pepin property; hot tub, fire pit, full kitchen. Driftless Region comp ~2 hr from Twin Cities.$$,
    $$Sleeps 4 (queen, twin nook, sleeper sofa); 2-night minimum.$$,
    $$OTA from ~$207/night (Jun 2026); dynamic pricing on operator calendar.$$,
    '2026-06-09', '2026-06-09', 'private_commercial',
    3::numeric, 1::numeric, '4', '2', 'Year-round',
    'Yes', 'No', 'Yes', 'Yes',
    275::numeric, 250::numeric, 325::numeric
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'in_progress', 'Yes', 'Yes',
    'Pepin Forest Treehouse', 'Moonhaven Treehouse', 'pepin-forest-treehouse-pepin-wi',
    'Glamping Resort', 'Treehouse',
    'Sage', 'web_research_midwest_resort_adjacent_comps_2026_06', 'United States', 'WI', 'Pepin', '54759',
    44.4420::numeric, -92.1280::numeric, 'https://www.pepinforesttreehouse.com/moonhaven',
    $$Second treehouse SKU on shared property; pre-booking 2026–2027; elevated hot tub and stargazing deck.$$,
    $$Sleeps up to 4; opens Fall 2026 per operator.$$,
    $$From $569/night published (Jun 2026).$$,
    '2026-06-09', '2026-06-09', 'private_commercial',
    3::numeric, 1::numeric, '4', '2', 'Year-round',
    'Yes', 'Yes', 'Yes', 'Yes',
    569::numeric, 569::numeric, 649::numeric
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'published', 'No', 'Yes',
    'Pepin Forest Treehouse', 'The Sleeping Fox Suite', 'pepin-forest-treehouse-pepin-wi',
    'Outdoor Boutique Hotel', 'Cabin',
    'Sage', 'web_research_midwest_resort_adjacent_comps_2026_06', 'United States', 'WI', 'Pepin', '54759',
    44.4420::numeric, -92.1280::numeric, 'https://www.pepinforesttreehouse.com/sleepingfox',
    $$1,000 sq ft ground-level forest suite on same property — private sauna, soaking tub, movie room; family SKU, not treehouse.$$,
    $$Sleeps up to 6; most budget-friendly option on property.$$,
    $$Classified Outdoor Boutique Hotel (suite in main house); dynamic calendar pricing.$$,
    '2026-06-09', '2026-06-09', 'private_commercial',
    3::numeric, 1::numeric, '6', '2', 'Year-round',
    'No', 'Yes', 'Yes', 'Yes',
    225::numeric, 200::numeric, 275::numeric
  )
) AS v(
  property_id, research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city, zip_code, lat, lon, url,
  description, unit_description, notes, date_added, date_updated, land_operator_category,
  property_total_sites, quantity_of_units, unit_capacity, minimum_nights, operating_season_months,
  unit_hot_tub, property_sauna, unit_full_kitchen, setting_forest,
  rate_avg_retail_daily_rate, rate_summer_weekday, rate_summer_weekend
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.all_glamping_properties e
  WHERE e.property_id = v.property_id AND e.site_name = v.site_name
);

-- ── Lakewood Farms (wedding venue lodging — not glamping) ───────────────────
INSERT INTO public.all_glamping_properties (
  property_id, research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city, address, zip_code, lat, lon, url,
  description, notes, date_added, date_updated, land_operator_category,
  property_total_sites, quantity_of_units, unit_capacity, operating_season_months,
  property_pool, property_restaurant, property_food_on_site,
  setting_lake, setting_farm,
  rate_avg_retail_daily_rate, rate_summer_weekend
)
SELECT * FROM (VALUES
  (
    'b2c3d4e5-f6a7-8901-bcde-f23456789012'::uuid, 'published', 'No', 'Yes',
    'Lakewood Farms', 'Luxury Log Cabin', 'lakewood-farms-mukwonago-wi',
    'Outdoor Boutique Hotel', 'Cabin',
    'Sage', 'web_research_midwest_resort_adjacent_comps_2026_06', 'United States', 'WI', 'Mukwonago',
    'W1470 County Road J', '53149', 42.8420::numeric, -88.2850::numeric, 'https://lakewoodfarmswi.com/',
    $$Southeast WI wedding barn venue (~45 min from Lake Geneva) with onsite luxury log cabin honeymoon suite; bundled in weekend packages, not a standalone glamping resort.$$,
    $$Barn + log cabin weekend from $7,595 (May/Oct) / $7,895 (Jun–Sep) per pricing page — lodging component not sold as nightly retail.$$,
    '2026-06-09', '2026-06-09', 'private_commercial',
    3::numeric, 1::numeric, '8', 'May–October event season',
    'Yes', 'No', 'Yes', 'Yes', 'Yes',
    NULL::numeric, NULL::numeric
  ),
  (
    'b2c3d4e5-f6a7-8901-bcde-f23456789012'::uuid, 'published', 'No', 'Yes',
    'Lakewood Farms', 'Lake House', 'lakewood-farms-mukwonago-wi',
    'Outdoor Boutique Hotel', 'Cottage',
    'Sage', 'web_research_midwest_resort_adjacent_comps_2026_06', 'United States', 'WI', 'Mukwonago',
    'W1470 County Road J', '53149', 42.8420::numeric, -88.2850::numeric, 'https://lakewoodfarmswi.com/lake-house',
    $$6,500 sq ft mid-century lake house (sleeps 22) + guest house on private 26-acre lake; event/wedding block or separate vacation rental per operator.$$,
    $$Full package with barn from $13,995–$15,495 weekend; also marketed separately — pricing on request.$$,
    '2026-06-09', '2026-06-09', 'private_commercial',
    3::numeric, 1::numeric, '22', 'May–October',
    'Yes', 'No', 'Yes', 'Yes', 'Yes',
    NULL::numeric, NULL::numeric
  ),
  (
    'b2c3d4e5-f6a7-8901-bcde-f23456789012'::uuid, 'published', 'No', 'Yes',
    'Lakewood Farms', 'Guest House', 'lakewood-farms-mukwonago-wi',
    'Outdoor Boutique Hotel', 'Cottage',
    'Sage', 'web_research_midwest_resort_adjacent_comps_2026_06', 'United States', 'WI', 'Mukwonago',
    'W1470 County Road J', '53149', 42.8420::numeric, -88.2850::numeric, 'https://lakewoodfarmswi.com/lake-house',
    $$Three-bedroom guest house adjacent to Lake House; sleeps 12–14 in full-package weddings.$$,
    $$Bundled with Lake House hill package; not glamping.$$,
    '2026-06-09', '2026-06-09', 'private_commercial',
    3::numeric, 1::numeric, '14', 'May–October',
    'Yes', 'No', 'Yes', 'Yes', 'Yes',
    NULL::numeric, NULL::numeric
  )
) AS v(
  property_id, research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city, address, zip_code, lat, lon, url,
  description, notes, date_added, date_updated, land_operator_category,
  property_total_sites, quantity_of_units, unit_capacity, operating_season_months,
  property_pool, property_restaurant, property_food_on_site,
  setting_lake, setting_farm,
  rate_avg_retail_daily_rate, rate_summer_weekend
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.all_glamping_properties e
  WHERE e.property_id = v.property_id AND e.site_name = v.site_name
);

-- ── Timber Ridge Outpost & Cabins — enrich (stays Glamping) ─────────────────
UPDATE public.all_glamping_properties SET
  property_type = 'Glamping Resort',
  city = 'Karbers Ridge',
  state = 'IL',
  zip_code = '62955',
  address = COALESCE(NULLIF(address, ''), '9000 N Forest Rd'),
  url = 'https://timberridgeoutpost.com/',
  property_total_sites = 6,
  minimum_nights = '2',
  operating_season_months = 'Year-round; 2-night minimum (3-night holiday minimums)',
  discovery_source = 'web_research_midwest_resort_adjacent_comps_2026_06',
  description = $$Shawnee National Forest glamping at Garden of the Gods gateway: two treehouses (White Oak, Maple Oak) and four antique/amish log cabins. Operator-branded glamping; check-in at Garden of the Gods Outpost. Midwest treehouse + cabin comp (~4 hr from Chicago).$$,
  notes = COALESCE(notes, '') || E'\n\nJun 2026 comp enrichment: rates from timberridgeoutpost.com (+$33 cleaning fee). is_glamping_property remains Yes.',
  date_updated = '2026-06-09'
WHERE property_id = 'cb6f4800-814f-457c-93d0-ce9b64e5c984';

UPDATE public.all_glamping_properties SET
  site_name = 'White Oak Treehouse',
  quantity_of_units = 1,
  unit_capacity = '6',
  rate_avg_retail_daily_rate = 219,
  rate_summer_weekday = 209,
  rate_summer_weekend = 229,
  rate_spring_weekday = 209, rate_spring_weekend = 229,
  rate_fall_weekday = 209, rate_fall_weekend = 229,
  rate_winter_weekday = 209, rate_winter_weekend = 229
WHERE property_id = 'cb6f4800-814f-457c-93d0-ce9b64e5c984'
  AND site_name IN ('White Oak Treehouse', 'Treehouse');

UPDATE public.all_glamping_properties SET
  site_name = 'Maple Oak Treehouse',
  quantity_of_units = 1,
  unit_capacity = '4',
  rate_avg_retail_daily_rate = 189,
  rate_summer_weekday = 179,
  rate_summer_weekend = 199
WHERE property_id = 'cb6f4800-814f-457c-93d0-ce9b64e5c984'
  AND site_name = 'Maple Oak Treehouse';

UPDATE public.all_glamping_properties SET
  quantity_of_units = 1,
  unit_capacity = '6',
  rate_avg_retail_daily_rate = 174,
  rate_summer_weekday = 169,
  rate_summer_weekend = 179
WHERE property_id = 'cb6f4800-814f-457c-93d0-ce9b64e5c984'
  AND site_name = 'Twin Oaks Log Cabin';

UPDATE public.all_glamping_properties SET
  quantity_of_units = 1,
  unit_capacity = '4',
  rate_avg_retail_daily_rate = 134,
  rate_summer_weekday = 129,
  rate_summer_weekend = 139
WHERE property_id = 'cb6f4800-814f-457c-93d0-ce9b64e5c984'
  AND site_name = 'Cottonwood Log Cabin';

UPDATE public.all_glamping_properties SET
  quantity_of_units = 1,
  unit_capacity = '8',
  rate_avg_retail_daily_rate = 164,
  rate_summer_weekday = 159,
  rate_summer_weekend = 169
WHERE property_id = 'cb6f4800-814f-457c-93d0-ce9b64e5c984'
  AND site_name = 'Sassafras Ridge Log Cabin';

UPDATE public.all_glamping_properties SET
  quantity_of_units = 1,
  unit_capacity = '4',
  rate_avg_retail_daily_rate = 134,
  rate_summer_weekday = 129,
  rate_summer_weekend = 139
WHERE property_id = 'cb6f4800-814f-457c-93d0-ce9b64e5c984'
  AND site_name = 'Hickory Hollow Log Cabin';

-- Retire ambiguous duplicate Log Cabin row if it duplicates Twin Oaks
UPDATE public.all_glamping_properties SET
  research_status = 'rejected',
  notes = COALESCE(notes, '') || E'\n\nJun 2026: rejected duplicate — merged into named cabin SKUs (Twin Oaks).',
  date_updated = '2026-06-09'
WHERE property_id = 'cb6f4800-814f-457c-93d0-ce9b64e5c984'
  AND site_name = 'Log Cabin';
