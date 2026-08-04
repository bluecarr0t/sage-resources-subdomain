-- ============================================================================
-- Camp Kettlewood (East Troy, WI): enrich sparse discovery shell (id 13151).
--
-- Sources (retrieved 2026-07-31):
--   https://www.campkettlewood.com/ (+ /cabins /vintage-trailers /platform-tents /book)
--   Lodgify via site check-lodgify-price proxy (12 house_ids / room_ids)
--   Contact: W3524 State Rd 20, East Troy WI 53120; +1 608-386-1222
--   Census geocoder: 42.79301414, -88.47456028
--   At The Lake Magazine: seasonal Memorial Day–first weekend of October
--
-- Inventory: 12 bookable campsites (qty 1 each):
--   Trailers: Oakwood Knoll (Vintage Trailer), Last Resort (Airstream),
--             Mushroom Gulch (3-trailer Vintage Trailer group site)
--   Platform tents: The Hilton, Sunset Ridge, Crow's Nest (Cabin Tent)
--   Cabins: Briar Patch, The Highlands, Sunview, Tall Timber, Deer Run
--   The Lodge (Lodge)
--
-- Rates: Lodgify price_per_day samples Jul 2026 (ex-tax; cleaning fee separate).
--   Summer/spring flat at default; fall WD/WE from Sep–Oct 2026 calendar;
--   winter closed (seasonal) → null.
-- rate_basis = room_only (no meals; shared bathhouse except Lodge / Airstream 1/2 bath).
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  property_name = 'Camp Kettlewood',
  slug = 'camp-kettlewood',
  site_name = 'Oakwood Knoll',
  unit_type = 'Vintage Trailer',
  quantity_of_units = 1,
  property_total_sites = 12,
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_type = 'Glamping',
  address = 'W3524 State Road 20',
  city = 'East Troy',
  state = 'WI',
  zip_code = '53120',
  country = 'United States',
  lat = 42.79301414,
  lon = -88.47456028,
  url = 'https://www.campkettlewood.com/',
  phone_number = '+1 608-386-1222',
  season_open_month = 5,
  season_close_month = 10,
  operating_season_months = '6',
  unit_capacity = '2',
  unit_bed = 'Double',
  unit_private_bathroom = 'No',
  unit_shower = 'No',
  unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'Yes',
  property_hot_tub = 'No',
  property_pool = 'No',
  property_sauna = 'No',
  property_food_on_site = 'No',
  property_restaurant = 'No',
  glamping_service_tier = 'midscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Restored Girl Scout camp on 80 acres; vintage trailers, scout cabins, platform tents; shared modern bathhouse/open-air showers; unpretentious midscale glamping',
  rate_basis = 'room_only',
  rate_basis_notes = 'Lodgify price_per_day via campkettlewood.com/check-lodgify-price (2026-07-31). Ex-tax (5.5% VAT); cleaning fee separate ($39–$79). Summer/spring flat; fall WD/WE from Sep–Oct calendar. Seasonal Memorial Day–early Oct.',
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = '180',
  rate_spring_weekend = '180',
  rate_summer_weekday = '180',
  rate_summer_weekend = '180',
  rate_fall_weekday = '159',
  rate_fall_weekend = '179',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', null, 'weekend', null),
      'spring', jsonb_build_object('weekday', 180, 'weekend', 180),
      'summer', jsonb_build_object('weekday', 180, 'weekend', 180),
      'fall', jsonb_build_object('weekday', 159, 'weekend', 179),
      'note', 'Oakwood Knoll 1957 Holly trailer; Lodgify house 667317 / room 734348; cleaning $39; winter closed'
    )
  ),
  description = 'Camp Kettlewood is a restored historic Girl Scout camp on 80 wooded acres in East Troy, Wisconsin (Kettle Moraine). Twelve private campsites span renovated vintage trailers (including a 1977 Airstream), 1940s antique scout cabins, 1960s canvas platform-tent group sites, and The Lodge. Sites include beds/linens, mini-fridges, propane grills, firewood, and access to modern bathhouses with open-air showers. Seasonal roughly Memorial Day through early October.',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-31] Web research enrichment: campkettlewood.com + Lodgify rates for 12 campsites; address W3524 State Road 20, East Troy WI 53120; Census geocode 42.79301414,-88.47456028; phone +1 608-386-1222; seasonal May–Oct.',
  discovery_source = COALESCE(NULLIF(btrim(discovery_source), ''), 'web_research_camp_kettlewood_2026_07_31'),
  date_updated = '2026-07-31'
WHERE id = 13151
  AND property_id = '46c18432-6ab8-4eae-a734-0da1ebe0b2b2';

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
  'published', 'Yes', 'Yes', 'Camp Kettlewood', 'camp-kettlewood', v.site_name,
  'web_research_camp_kettlewood_2026_07_31', '2026-07-31',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  12, v.qty, v.unit_type, v.capacity, v.bed,
  v.private_bath, v.shower, v.kitchenette, v.full_kitchen,
  v.ac,
  g.url, g.property_id, g.phone_number, 'Glamping',
  5::smallint, 10::smallint, '6',
  'No', 'No', 'No', 'No', 'No',
  'midscale', 'manual',
  'Restored Girl Scout camp on 80 acres; vintage trailers, scout cabins, platform tents; shared modern bathhouse/open-air showers; unpretentious midscale glamping',
  NULL::text, NULL::text,
  v.spr_wd, v.spr_we,
  v.sum_wd, v.sum_we,
  v.fal_wd, v.fal_we,
  v.rates_json, 'room_only',
  'Lodgify price_per_day via campkettlewood.com/check-lodgify-price (2026-07-31). Ex-tax; cleaning fee separate. Winter closed (seasonal May–early Oct).',
  g.description,
  v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    (
      'Last Resort', 1, 'Airstream', '4', 'Double + 2 Twin',
      'Yes', 'No', 'Yes', 'No', 'Yes',
      '199', '199', '199', '199', '229', '249',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 199, 'weekend', 199),
          'summer', jsonb_build_object('weekday', 199, 'weekend', 199),
          'fall', jsonb_build_object('weekday', 229, 'weekend', 249),
          'note', '1977 Airstream Land Yacht; half bath; Lodgify 666634/733645; cleaning $39'
        )
      ),
      E'[2026-07-31] Added Last Resort Airstream; qty 1; Lodgify summer $199.'
    ),
    (
      'Mushroom Gulch', 1, 'Vintage Trailer', '6', '3 Double (trailer village)',
      'No', 'No', 'Yes', 'No', 'Yes',
      '249', '249', '249', '249', '269', '299',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 249, 'weekend', 249),
          'summer', jsonb_build_object('weekday', 249, 'weekend', 249),
          'fall', jsonb_build_object('weekday', 269, 'weekend', 299),
          'note', '3-trailer group site; Lodgify 667322/734353; cleaning $69'
        )
      ),
      E'[2026-07-31] Added Mushroom Gulch 3-trailer group site; qty 1 bookable site; summer $249.'
    ),
    (
      'The Hilton', 1, 'Cabin Tent', '8', '2 Queen + 4 Twin (4 platform tents)',
      'No', 'No', 'Yes', 'No', 'No',
      '449', '449', '449', '449', '399', '499',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 449, 'weekend', 449),
          'summer', jsonb_build_object('weekday', 449, 'weekend', 449),
          'fall', jsonb_build_object('weekday', 399, 'weekend', 499),
          'note', '4 sleeping + hangout platform tents; Lodgify 667326/734357; cleaning $79'
        )
      ),
      E'[2026-07-31] Added The Hilton group platform tents; qty 1; summer $449.'
    ),
    (
      'Sunset Ridge', 1, 'Cabin Tent', '6', '3 Queen',
      'No', 'No', 'Yes', 'No', 'No',
      '179', '179', '179', '179', '299', '329',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 179, 'weekend', 179),
          'summer', jsonb_build_object('weekday', 179, 'weekend', 179),
          'fall', jsonb_build_object('weekday', 299, 'weekend', 329),
          'note', '3 platform tents; Lodgify 667921/734948; cleaning $69; fall premium vs summer'
        )
      ),
      E'[2026-07-31] Added Sunset Ridge platform tents; qty 1; summer $179.'
    ),
    (
      'Crow''s Nest', 1, 'Cabin Tent', '6', '3 Queen',
      'No', 'No', 'Yes', 'No', 'No',
      '179', '179', '179', '179', '299', '329',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 179, 'weekend', 179),
          'summer', jsonb_build_object('weekday', 179, 'weekend', 179),
          'fall', jsonb_build_object('weekday', 299, 'weekend', 329),
          'note', '3 platform tents; Lodgify 667926/734953; cleaning $69'
        )
      ),
      E'[2026-07-31] Added Crow''s Nest platform tents; qty 1; summer $179.'
    ),
    (
      'Briar Patch', 1, 'Cabin', '4', 'King + 2 Twin (2 cabins)',
      'No', 'No', 'Yes', 'No', 'Yes',
      '325', '325', '325', '325', '259', '299',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 325, 'weekend', 325),
          'summer', jsonb_build_object('weekday', 325, 'weekend', 325),
          'fall', jsonb_build_object('weekday', 259, 'weekend', 299),
          'note', 'Double antique scout cabins; Lodgify 667341/734372; cleaning $59'
        )
      ),
      E'[2026-07-31] Added Briar Patch double antique cabins; qty 1; summer $325.'
    ),
    (
      'The Highlands', 1, 'Cabin', '10', '1 King + 4 Queen (3 cabins)',
      'No', 'No', 'Yes', 'No', 'Yes',
      '479', '479', '479', '479', '449', '549',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 479, 'weekend', 479),
          'summer', jsonb_build_object('weekday', 479, 'weekend', 479),
          'fall', jsonb_build_object('weekday', 449, 'weekend', 549),
          'note', '3-cabin group site; Lodgify 667334/734365; cleaning $79'
        )
      ),
      E'[2026-07-31] Added The Highlands group cabins; qty 1; summer $479.'
    ),
    (
      'Sunview', 1, 'Cabin', '2', 'King',
      'No', 'No', 'Yes', 'No', 'Yes',
      '179', '179', '179', '179', '189', '199',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 179, 'weekend', 179),
          'summer', jsonb_build_object('weekday', 179, 'weekend', 179),
          'fall', jsonb_build_object('weekday', 189, 'weekend', 199),
          'note', 'Antique cabin suite; Lodgify 667346/734377; cleaning $39'
        )
      ),
      E'[2026-07-31] Added Sunview antique cabin; qty 1; summer $179.'
    ),
    (
      'Tall Timber', 1, 'Cabin', '2', 'King',
      'No', 'No', 'Yes', 'No', 'Yes',
      '179', '179', '179', '179', '189', '199',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 179, 'weekend', 179),
          'summer', jsonb_build_object('weekday', 179, 'weekend', 179),
          'fall', jsonb_build_object('weekday', 189, 'weekend', 199),
          'note', 'Antique cabin suite; Lodgify 667343/734374; cleaning $39'
        )
      ),
      E'[2026-07-31] Added Tall Timber antique cabin; qty 1; summer $179.'
    ),
    (
      'Deer Run', 1, 'Cabin', '2', 'King',
      'No', 'No', 'Yes', 'No', 'Yes',
      '179', '179', '179', '179', '189', '199',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 179, 'weekend', 179),
          'summer', jsonb_build_object('weekday', 179, 'weekend', 179),
          'fall', jsonb_build_object('weekday', 189, 'weekend', 199),
          'note', 'Rustic antique cabin; Lodgify 667350/734381; cleaning $39'
        )
      ),
      E'[2026-07-31] Added Deer Run antique cabin; qty 1; summer $179.'
    ),
    (
      'The Lodge', 1, 'Lodge', '8', '2 Queen + Queen bunk',
      'Yes', 'Yes', 'No', 'Yes', 'Yes',
      '700', '700', '700', '700', '599', '649',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 700, 'weekend', 700),
          'summer', jsonb_build_object('weekday', 700, 'weekend', 700),
          'fall', jsonb_build_object('weekday', 599, 'weekend', 649),
          'note', 'Restored scout lodge w/ ensuite bath + full kitchen; Lodgify 667351/734382; cleaning $79'
        )
      ),
      E'[2026-07-31] Added The Lodge; qty 1; summer $700; private bath + full kitchen.'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed,
  private_bath, shower, kitchenette, full_kitchen, ac,
  spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, note
)
WHERE g.id = 13151
  AND g.property_id = '46c18432-6ab8-4eae-a734-0da1ebe0b2b2'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = g.property_id
      AND x.site_name = v.site_name
  );

UPDATE public.all_sage_data
SET
  property_total_sites = 12,
  address = COALESCE(address, 'W3524 State Road 20'),
  city = 'East Troy',
  state = 'WI',
  zip_code = COALESCE(zip_code, '53120'),
  country = 'United States',
  lat = COALESCE(lat, 42.79301414),
  lon = COALESCE(lon, -88.47456028),
  url = COALESCE(url, 'https://www.campkettlewood.com/'),
  phone_number = COALESCE(phone_number, '+1 608-386-1222'),
  property_type = 'Glamping',
  is_glamping_property = 'Yes',
  research_status = 'published',
  slug = 'camp-kettlewood',
  glamping_service_tier = COALESCE(glamping_service_tier, 'midscale'),
  glamping_service_tier_source = COALESCE(glamping_service_tier_source, 'manual'),
  date_updated = '2026-07-31'
WHERE property_id = '46c18432-6ab8-4eae-a734-0da1ebe0b2b2';

COMMIT;
