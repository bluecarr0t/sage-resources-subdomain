-- ============================================================================
-- Point of View Lake Resort (Phelps, WI): enrich sparse discovery shell (id 13150).
--
-- Sources (retrieved 2026-07-31):
--   https://povresort.com/resort-map/ — cabin + glamping inventory
--   https://povresort.com/cabin-rates/ — 2026 cabin seasons + published rates (incl. Phelps room tax)
--   https://povresort.com/glamping-rates/ — 2026 glamping rate tiers (amenities-bundled)
--   Schema.org / chamber: 3932 Point of View Trail, Phelps WI 54554; +1 715-204-4111
--   Photon OSM: Point of View Trail, Phelps → 46.035151, -89.1510415
--
-- Inventory (14 cabins + 11 furnished glamping + 4 BYOTent = 29):
--   Forest View 2BR Cabin ×8 | Lakeview 2BR ×2 | Lakeview Studio ×2
--   Lakeview 3BR 1 bath (Bigfoot) ×1 | Lakeview 3BR 2 bath (Loon) ×1
--   Vintage Trailer group ×2 (Lighthouse, Jim Dandy+tent)
--   Vintage Trailer standard ×2 (Pathfinder, Holiday Rambler)
--   Vintage Trailer couples ×1 (Wolfe) | Airstream ×1
--   Cabin Tent group ×1 (Capone) | Cabin Tent standard ×2 (Dillinger, Boundary Waters)
--   Yurt ×1 (Hawaiian) | Cabin Tent couples ×1 (French Winery)
--   BYOTent Campsite (Tent Site) ×4 (#5, #6, #9, #11)
--
-- Cabin seasons: Low = F/W/S (after Labor Day–before Memorial);
--   Mid = Early/Late Summer; High Summer = weekly only → nightly = weekly/7.
-- Glamping: seasonal Early May–early Oct; winter closed.
-- Group glamping summer WD published as "$1196" on live page — treated as $196
--   (consistent +$7 lift from Feb 2026 Wayback $189; WE $206 / spr-fall $180).
--
-- rate_basis = room_only (amenities bundled; meals not included despite
--   operator "all-inclusive amenities" marketing).
-- rate_avg_retail_daily_rate maintained by calc_avg_rate_trigger on all_sage_data.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Shell → Forest View 2-Bedroom Cabin (largest SKU)
-- ---------------------------------------------------------------------------
UPDATE public.all_sage_data
SET
  property_name = 'Point of View Lake Resort',
  slug = 'point-of-view-lake-resort',
  site_name = 'Forest View 2-Bedroom Cabin',
  unit_type = 'Cabin',
  quantity_of_units = 8,
  property_total_sites = 29,
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_type = 'Glamping',
  address = '3932 Point of View Trail',
  city = 'Phelps',
  state = 'WI',
  zip_code = '54554',
  country = 'United States',
  lat = 46.035151,
  lon = -89.1510415,
  url = 'https://povresort.com/',
  phone_number = '+1 715-204-4111',
  season_open_month = 1,
  season_close_month = 12,
  operating_season_months = '12',
  unit_capacity = '6',
  unit_bed = 'Queen + 4 Twin bunks',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes',
  unit_air_conditioning = 'No',
  property_hot_tub = 'No',
  property_pool = 'No',
  property_sauna = 'No',
  property_food_on_site = 'No',
  property_restaurant = 'No',
  glamping_service_tier = 'midscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Family Northwoods lake resort: renovated cabins + vintage camper/luxury-tent glamping; bathhouse for glamping; amenities-bundled rates, not meal AI',
  rate_basis = 'room_only',
  rate_basis_notes = 'Cabin rates from povresort.com/cabin-rates (2026 seasons; incl. Phelps room tax). Low=F/W/S; Mid=Early/Late Summer; High Summer weekly→nightly weekly/7. Glamping rates from povresort.com/glamping-rates (amenities-bundled; group summer WD corrected $1196→$196). Meals not included.',
  rate_winter_weekday = '201',
  rate_winter_weekend = '217',
  rate_spring_weekday = '224',
  rate_spring_weekend = '241',
  rate_summer_weekday = '274',
  rate_summer_weekend = '274',
  rate_fall_weekday = '224',
  rate_fall_weekend = '241',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 201, 'weekend', 217),
      'spring', jsonb_build_object('weekday', 224, 'weekend', 241),
      'summer', jsonb_build_object('weekday', 274, 'weekend', 274),
      'fall', jsonb_build_object('weekday', 224, 'weekend', 241),
      'note', 'Forest View 2BR: Low $201/$217; Mid $224/$241; High Summer weekly $1,920 → $274/night. Units 1–8.'
    )
  ),
  description = 'Coady''s Point of View Lake Resort & Glamping Campground on North Twin Lake in Phelps, WI (Eagle River / Nicolet National Forest). Fourteen renovated Northwoods cabins plus a living-history glamping campground of vintage campers, A-frame luxury tents, a Hawaiian yurt-style tent, and BYOTent sites. Amenities-bundled stays include sandy beach, complimentary non-motorized boats, game room, trails, and bathhouse access for glamping. Cabins year-round; glamping roughly early May–early October.',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-31] Web research enrichment: povresort.com resort-map + cabin-rates + glamping-rates. 14 cabins + 11 furnished glamping + 4 BYOTent = 29 sites; address 3932 Point of View Trail, Phelps WI 54554; Photon street geocode 46.035151,-89.1510415; cabin Low/Mid + High Summer weekly/7; glamping seasonal May–Oct.',
  discovery_source = COALESCE(NULLIF(btrim(discovery_source), ''), 'web_research_pov_resort_2026_07_31'),
  date_updated = '2026-07-31'
WHERE id = 13150
  AND property_id = '7a90bd94-7636-414e-8a5c-2bb1b271ac98';

-- ---------------------------------------------------------------------------
-- Remaining SKUs cloned from shell geo / property_id
-- ---------------------------------------------------------------------------
INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, property_name, slug, site_name,
  discovery_source, date_updated,
  address, city, state, zip_code, lat, lon, country,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning,
  url, property_id, phone_number, property_type,
  season_open_month, season_close_month, operating_season_months,
  property_hot_tub, property_pool, property_sauna, property_food_on_site, property_restaurant,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Point of View Lake Resort', 'point-of-view-lake-resort', v.site_name,
  'web_research_pov_resort_2026_07_31', '2026-07-31',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  29, v.qty, v.unit_type, v.capacity, v.bed,
  v.private_bath, v.shower, v.kitchenette, v.full_kitchen,
  v.ac,
  g.url, g.property_id, g.phone_number, 'Glamping',
  v.season_open, v.season_close, v.op_months,
  'No', 'No', 'No', 'No', 'No',
  'midscale', 'manual',
  'Family Northwoods lake resort: renovated cabins + vintage camper/luxury-tent glamping; bathhouse for glamping; amenities-bundled rates, not meal AI',
  v.win_wd, v.win_we,
  v.spr_wd, v.spr_we,
  v.sum_wd, v.sum_we,
  v.fal_wd, v.fal_we,
  v.rates_json, 'room_only',
  'Cabin rates from povresort.com/cabin-rates (2026). Glamping rates from povresort.com/glamping-rates (amenities-bundled; group summer WD $196 corrected from published $1196 typo). Meals not included.',
  g.description,
  v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    -- Cabins
    (
      'Lakeview 2-Bedroom Cabin', 2, 'Cabin', '6', 'Queen + 4 Twin bunks',
      'Yes', 'Yes', 'No', 'Yes', 'No',
      1::smallint, 12::smallint, '12',
      '214'::text, '230'::text,
      '236', '254',
      '287', '287',
      '236', '254',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', 214, 'weekend', 230),
          'spring', jsonb_build_object('weekday', 236, 'weekend', 254),
          'summer', jsonb_build_object('weekday', 287, 'weekend', 287),
          'fall', jsonb_build_object('weekday', 236, 'weekend', 254),
          'note', 'Lakeview 2BR: Low $214/$230; Mid $236/$254; High Summer weekly $2,012 → $287/night. Firefly + Turtle''s Hideaway.'
        )
      ),
      E'[2026-07-31] Added from povresort.com cabin-rates/resort-map: Lakeview 2BR Cabins; qty 2.'
    ),
    (
      'Lakeview Studio Cabin', 2, 'Cabin', '4', 'Queen + Futon',
      'Yes', 'Yes', 'No', 'Yes', 'No',
      1::smallint, 12::smallint, '12',
      '171', '188',
      '183', '201',
      '219', '219',
      '183', '201',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', 171, 'weekend', 188),
          'spring', jsonb_build_object('weekday', 183, 'weekend', 201),
          'summer', jsonb_build_object('weekday', 219, 'weekend', 219),
          'fall', jsonb_build_object('weekday', 183, 'weekend', 201),
          'note', 'Lakeview Studio: Low $171/$188; Mid $183/$201; High Summer weekly $1,536 → $219/night. Rabbit''s Burrow + Fox''s Hole. Page still labels 2025 rates.'
        )
      ),
      E'[2026-07-31] Added from povresort.com cabin-rates/resort-map: Lakeview Studio Cabins; qty 2.'
    ),
    (
      'Lakeview 3-Bedroom Cabin (1 Bath)', 1, 'Cabin', '8', '2 Queen + 4 Twin bunks',
      'Yes', 'Yes', 'No', 'Yes', 'No',
      1::smallint, 12::smallint, '12',
      '234', '252',
      '275', '293',
      '345', '345',
      '275', '293',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', 234, 'weekend', 252),
          'spring', jsonb_build_object('weekday', 275, 'weekend', 293),
          'summer', jsonb_build_object('weekday', 345, 'weekend', 345),
          'fall', jsonb_build_object('weekday', 275, 'weekend', 293),
          'note', 'Bigfoot''s Sanctuary: Low $234/$252; Mid $275/$293; High Summer weekly $2,413 → $345/night.'
        )
      ),
      E'[2026-07-31] Added from povresort.com: Bigfoot''s Sanctuary (Unit 13) Lakeview 3BR 1 bath; qty 1.'
    ),
    (
      'Lakeview 3-Bedroom Cabin (2 Bath)', 1, 'Cabin', '12', '2 Queen + 4 Twin bunks + 2 Futons',
      'Yes', 'Yes', 'No', 'Yes', 'No',
      1::smallint, 12::smallint, '12',
      '466', '492',
      '518', '543',
      '595', '595',
      '518', '543',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', 466, 'weekend', 492),
          'spring', jsonb_build_object('weekday', 518, 'weekend', 543),
          'summer', jsonb_build_object('weekday', 595, 'weekend', 595),
          'fall', jsonb_build_object('weekday', 518, 'weekend', 543),
          'note', 'Loon''s Landing: Low $466/$492 (page typo labeled 2nd Low as Weekday); Mid $518/$543; High Summer weekly $4,166 → $595/night. Map sleeps 12.'
        )
      ),
      E'[2026-07-31] Added from povresort.com: Loon''s Landing (Unit 14) Lakeview 3BR 2 bath; qty 1.'
    ),
    -- Glamping (winter closed)
    (
      'Airstream', 1, 'Airstream', '4', 'Full + 2 Single',
      'No', 'No', 'Yes', 'No', 'No',
      5::smallint, 10::smallint, '6',
      NULL::text, NULL::text,
      '180', '180',
      '196', '206',
      '180', '180',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 180, 'weekend', 180),
          'summer', jsonb_build_object('weekday', 196, 'weekend', 206),
          'fall', jsonb_build_object('weekday', 180, 'weekend', 180),
          'note', 'Campsite 13 1965 Airstream; group tier; only full-electric glamping site. Summer WD $196 (corrected from live $1196 typo).'
        )
      ),
      E'[2026-07-31] Added from povresort.com glamping-rates/resort-map: 1965 Airstream; qty 1; group tier.'
    ),
    (
      'Vintage Trailer (Group)', 2, 'Vintage Trailer', '6', 'Varies (queen/full + futon/cots)',
      'No', 'No', 'Yes', 'No', 'No',
      5::smallint, 10::smallint, '6',
      NULL, NULL,
      '180', '180',
      '196', '206',
      '180', '180',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 180, 'weekend', 180),
          'summer', jsonb_build_object('weekday', 196, 'weekend', 206),
          'fall', jsonb_build_object('weekday', 180, 'weekend', 180),
          'note', 'Lighthouse (#4) + Jim Dandy+luxury tent (#8); group tier $196/$206 / spr-fall $180.'
        )
      ),
      E'[2026-07-31] Added: Vintage Trailer group SKU (Lighthouse + Jim Dandy combo); qty 2.'
    ),
    (
      'Vintage Trailer (Standard)', 2, 'Vintage Trailer', '4', 'Queen + Futon',
      'No', 'No', 'Yes', 'No', 'No',
      5::smallint, 10::smallint, '6',
      NULL, NULL,
      '159', '159',
      '181', '191',
      '159', '159',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 159, 'weekend', 159),
          'summer', jsonb_build_object('weekday', 181, 'weekend', 191),
          'fall', jsonb_build_object('weekday', 159, 'weekend', 159),
          'note', 'Pathfinder (#1) + Holiday Rambler (#3); up-to-4 tier $181/$191 / spr-fall $159.'
        )
      ),
      E'[2026-07-31] Added: Vintage Trailer standard SKU (Pathfinder + Holiday Rambler); qty 2.'
    ),
    (
      'Vintage Trailer (Couples)', 1, 'Vintage Trailer', '2', 'Queen',
      'No', 'No', 'Yes', 'No', 'No',
      5::smallint, 10::smallint, '6',
      NULL, NULL,
      '139', '139',
      '155', '166',
      '139', '139',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 139, 'weekend', 139),
          'summer', jsonb_build_object('weekday', 155, 'weekend', 166),
          'fall', jsonb_build_object('weekday', 139, 'weekend', 139),
          'note', 'Wolfe Fiesta & Siesta (#7); couples tier $155/$166 / spr-fall $139.'
        )
      ),
      E'[2026-07-31] Added: Vintage Trailer couples (Wolfe); qty 1.'
    ),
    (
      'Cabin Tent (Group)', 1, 'Cabin Tent', '6', 'Queen + Futon',
      'No', 'No', 'No', 'No', 'No',
      5::smallint, 10::smallint, '6',
      NULL, NULL,
      '180', '180',
      '196', '206',
      '180', '180',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 180, 'weekend', 180),
          'summer', jsonb_build_object('weekday', 196, 'weekend', 206),
          'fall', jsonb_build_object('weekday', 180, 'weekend', 180),
          'note', 'Al Capone A-frame luxury tent (#10); group tier.'
        )
      ),
      E'[2026-07-31] Added: Capone A-frame Cabin Tent; qty 1; group tier.'
    ),
    (
      'Cabin Tent (Standard)', 2, 'Cabin Tent', '4', 'Queen + Futon',
      'No', 'No', 'No', 'No', 'No',
      5::smallint, 10::smallint, '6',
      NULL, NULL,
      '159', '159',
      '181', '191',
      '159', '159',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 159, 'weekend', 159),
          'summer', jsonb_build_object('weekday', 181, 'weekend', 191),
          'fall', jsonb_build_object('weekday', 159, 'weekend', 159),
          'note', 'Dillinger (#12) + Boundary Waters (#14) Prohibition/Canadian A-frame luxury tents; up-to-4 tier.'
        )
      ),
      E'[2026-07-31] Added: Cabin Tent standard (Dillinger + Boundary Waters); qty 2.'
    ),
    (
      'Hawaiian Yurt Luxury Tent', 1, 'Yurt', '6', 'Queen + Futon + 2 Cots',
      'No', 'No', 'No', 'No', 'No',
      5::smallint, 10::smallint, '6',
      NULL, NULL,
      '180', '180',
      '196', '206',
      '180', '180',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 180, 'weekend', 180),
          'summer', jsonb_build_object('weekday', 196, 'weekend', 206),
          'fall', jsonb_build_object('weekday', 180, 'weekend', 180),
          'note', 'Campsite 2 Hawaiian yurt-style luxury tent; now on group rate tier (map: Yurt).'
        )
      ),
      E'[2026-07-31] Added: Hawaiian Yurt Luxury Tent (#2); qty 1; group tier.'
    ),
    (
      'Cabin Tent (Couples)', 1, 'Cabin Tent', '2', 'Full',
      'No', 'No', 'No', 'No', 'No',
      5::smallint, 10::smallint, '6',
      NULL, NULL,
      '139', '139',
      '155', '166',
      '139', '139',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 139, 'weekend', 139),
          'summer', jsonb_build_object('weekday', 155, 'weekend', 166),
          'fall', jsonb_build_object('weekday', 139, 'weekend', 139),
          'note', 'French Winery luxury tent (#15); couples tier.'
        )
      ),
      E'[2026-07-31] Added: French Winery Cabin Tent; qty 1; couples tier.'
    ),
    (
      'BYOTent Campsite', 4, 'Tent Site', '6', 'BYO',
      'No', 'No', 'No', 'No', 'No',
      5::smallint, 10::smallint, '6',
      NULL, NULL,
      '40', '40',
      '51', '61',
      '40', '40',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 40, 'weekend', 40),
          'summer', jsonb_build_object('weekday', 51, 'weekend', 61),
          'fall', jsonb_build_object('weekday', 40, 'weekend', 40),
          'note', 'BYOTent campsites #5, #6, #9, #11; guest brings tent; picnic table/grill/fire ring; resort amenities included.'
        )
      ),
      E'[2026-07-31] Added: BYOTent Campsites; qty 4; Tent Site.'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed,
  private_bath, shower, kitchenette, full_kitchen, ac,
  season_open, season_close, op_months,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, note
)
WHERE g.id = 13150
  AND g.property_id = '7a90bd94-7636-414e-8a5c-2bb1b271ac98'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = g.property_id
      AND x.site_name = v.site_name
  );

-- Align property_total_sites on all sibling rows
UPDATE public.all_sage_data
SET
  property_total_sites = 29,
  address = COALESCE(address, '3932 Point of View Trail'),
  city = 'Phelps',
  state = 'WI',
  zip_code = COALESCE(zip_code, '54554'),
  country = 'United States',
  lat = COALESCE(lat, 46.035151),
  lon = COALESCE(lon, -89.1510415),
  url = COALESCE(url, 'https://povresort.com/'),
  phone_number = COALESCE(phone_number, '+1 715-204-4111'),
  property_type = 'Glamping',
  is_glamping_property = 'Yes',
  research_status = 'published',
  slug = 'point-of-view-lake-resort',
  glamping_service_tier = COALESCE(glamping_service_tier, 'midscale'),
  glamping_service_tier_source = COALESCE(glamping_service_tier_source, 'manual'),
  date_updated = '2026-07-31'
WHERE property_id = '7a90bd94-7636-414e-8a5c-2bb1b271ac98';

COMMIT;
