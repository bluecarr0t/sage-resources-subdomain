-- ============================================================================
-- Off Map Glamping (South Haven, MI): enrich site names, inventory, and rates.
--
-- Sources (retrieved 2026-07-31):
--   Operator lodging page — https://www.stayoffmap.com/lodging
--     Safari King, Safari Twin Triple, Deluxe King Tent (ensuite), Deluxe Cabins
--     (Coming Summer 2026), Main Lodge (geodesic dome, private events)
--   Cloudbeds booking engine — https://hotels.cloudbeds.com/en/reservation/UvfzKt
--     widget_property=193130; Standard Rate samples (USD, base occupancy)
--
-- Inventory (Cloudbeds max_rooms):
--   Safari Tent - King Bed          12
--   Safari Tent - 3 Twin Beds        3
--   Deluxe Tent (ensuite bathroom)   5
--   Deluxe Cabin - 1 Bed             3
--   Deluxe Cabin - 2 Bed             2
--   Main Lodge                       1 (events only — no retail nightly rate)
--   property_total_sites            25 (excludes event lodge)
--
-- Rate anchors (Cloudbeds Standard Rate samples):
--   Safari King:   sum WD 150 / WE ~225 (Fri–Sat 210+239); fall WD 150 / WE 230
--   Safari Twin:   sum WD 186; late-sum WE ~211 (Labor Day 203+219);
--                  fall WD 170 / WE 250
--   Deluxe Tent:   sum WD 250 / WE 309 (Sun); fall WD 250 / WE 330
--   Cabin 1-Bed:   sum WD 390 / WE 400; fall WD 390 / WE 400; win 325/325
--   Cabin 2-Bed:   sum WD 525; fall WD 525 / WE 540; win 480/480
--   Tents: winter closed (unavailable on Jan 2027 samples)
--   Spring: use fall WD / summer-opening WE samples as shoulder proxies where
--           direct spring Cloudbeds quotes were not bookable yet
--
-- rate_avg_retail_daily_rate maintained by calc_avg_rate_trigger on all_sage_data.
-- ============================================================================

BEGIN;

-- Drop sparse duplicate property shell (different property_id, no inventory).
DELETE FROM public.all_sage_data WHERE id = 13145;

-- 10164: Deluxe Tent (ensuite) — rename + rates + amenities
UPDATE public.all_sage_data
SET
  site_name = 'Deluxe Tent (with ensuite bathroom)',
  unit_type = 'Safari Tent',
  quantity_of_units = 5,
  property_total_sites = 25,
  unit_capacity = '3',
  unit_bed = 'King',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_wood_burning_stove = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = '250',
  rate_spring_weekend = '309',
  rate_summer_weekday = '250',
  rate_summer_weekend = '309',
  rate_fall_weekday = '250',
  rate_fall_weekend = '330',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', null, 'weekend', null),
      'spring', jsonb_build_object('weekday', 250, 'weekend', 309),
      'summer', jsonb_build_object('weekday', 250, 'weekend', 309),
      'fall', jsonb_build_object('weekday', 250, 'weekend', 330),
      'note', 'Cloudbeds UvfzKt / widget_property=193130 Standard Rate samples Jul 2026; tents winter-closed; spring shoulder proxied from summer WD + Sun WE sample'
    )
  ),
  rate_basis = 'breakfast',
  rate_basis_notes = 'Cloudbeds Standard Rate samples (UvfzKt) 2026-07-31; complimentary continental breakfast listed on property amenities',
  ota_url_booking_com = COALESCE(ota_url_booking_com, 'https://www.booking.com/hotel/us/off-map-glamping.html'),
  notes = COALESCE(notes, '') || E'\n\n[2026-07-31] Site/rate enrichment from stayoffmap.com/lodging + Cloudbeds: Deluxe Tent ensuite; qty 5; summer WD $250 / WE $309; fall WD $250 / WE $330; winter closed.',
  date_updated = '2026-07-31'
WHERE id = 10164;

-- 10165: split former "Safari Tents" qty 15 → Safari King qty 12
UPDATE public.all_sage_data
SET
  site_name = 'Safari Tent - King Bed',
  unit_type = 'Safari Tent',
  quantity_of_units = 12,
  property_total_sites = 25,
  unit_capacity = '3',
  unit_bed = 'King',
  unit_private_bathroom = 'No',
  unit_shower = 'No',
  unit_wood_burning_stove = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = '150',
  rate_spring_weekend = '225',
  rate_summer_weekday = '150',
  rate_summer_weekend = '225',
  rate_fall_weekday = '150',
  rate_fall_weekend = '230',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', null, 'weekend', null),
      'spring', jsonb_build_object('weekday', 150, 'weekend', 225),
      'summer', jsonb_build_object('weekday', 150, 'weekend', 225),
      'fall', jsonb_build_object('weekday', 150, 'weekend', 230),
      'note', 'Cloudbeds Standard Rate: summer WD $150, WE mean Fri/Sat $210/$239; fall WD $150 WE $230; winter closed'
    )
  ),
  rate_basis = 'breakfast',
  rate_basis_notes = 'Cloudbeds Standard Rate samples (UvfzKt) 2026-07-31; complimentary continental breakfast listed on property amenities',
  ota_url_booking_com = COALESCE(ota_url_booking_com, 'https://www.booking.com/hotel/us/off-map-glamping.html'),
  notes = COALESCE(notes, '') || E'\n\n[2026-07-31] Site/rate enrichment: renamed Safari Tents → Safari Tent - King Bed; qty 15→12 (Cloudbeds max_rooms); summer WD $150 / WE $225; fall WD $150 / WE $230; shared bathhouse.',
  date_updated = '2026-07-31'
WHERE id = 10165;

-- Insert remaining SKUs cloned from 10164 geo/property shell
INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, property_name, site_name, discovery_source, date_updated,
  address, city, state, zip_code, lat, lon, country,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed,
  unit_private_bathroom, unit_shower, unit_wood_burning_stove, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning,
  url, property_id,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  ota_url_booking_com, notes
)
SELECT
  'published', 'Yes', COALESCE(g.is_glamping_property, 'Yes'), 'Off Map Glamping', v.site_name, 'web_research_off_map_2026_07_31', '2026-07-31',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, COALESCE(g.country, 'United States'),
  25, v.qty, v.unit_type, v.capacity, v.bed,
  v.private_bath, v.shower, v.stove, v.kitchenette, v.full_kitchen,
  v.ac,
  g.url, g.property_id,
  v.win_wd, v.win_we,
  v.spr_wd, v.spr_we,
  v.sum_wd, v.sum_we,
  v.fal_wd, v.fal_we,
  v.rates_json, 'breakfast',
  'Cloudbeds Standard Rate samples (UvfzKt) 2026-07-31; complimentary continental breakfast listed on property amenities',
  'https://www.booking.com/hotel/us/off-map-glamping.html',
  v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    (
      'Safari Tent - 3 Twin Beds', 3, 'Safari Tent', '3', '3 Twin',
      'No', 'No', 'Yes', 'No', 'No', 'No',
      NULL::text, NULL::text,
      '170', '211',
      '186', '211',
      '170', '250',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', null, 'weekend', null),
          'spring', jsonb_build_object('weekday', 170, 'weekend', 211),
          'summer', jsonb_build_object('weekday', 186, 'weekend', 211),
          'fall', jsonb_build_object('weekday', 170, 'weekend', 250),
          'note', 'Cloudbeds: summer WD $186; late-summer WE Labor Day $203/$219; fall WD $170 WE $250; winter closed'
        )
      ),
      E'[2026-07-31] Added from Cloudbeds/stayoffmap lodging mix: Safari Twin Triple; qty 3; shared bathhouse.'
    ),
    (
      'Deluxe Cabin - 1 Bed', 3, 'Cabin', '4', 'Queen',
      'Yes', 'Yes', 'Yes', 'Yes', 'No', 'Yes',
      '325', '325',
      '390', '400',
      '390', '400',
      '390', '400',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', 325, 'weekend', 325),
          'spring', jsonb_build_object('weekday', 390, 'weekend', 400),
          'summer', jsonb_build_object('weekday', 390, 'weekend', 400),
          'fall', jsonb_build_object('weekday', 390, 'weekend', 400),
          'note', 'Cloudbeds Deluxe Cabin - 1 Bed Standard Rate samples; year-round (tents closed in winter)'
        )
      ),
      E'[2026-07-31] Added from Cloudbeds/stayoffmap: Deluxe Cabin 1-Bed (Coming Summer 2026 on operator site; bookable on Cloudbeds); qty 3; kitchenette + AC.'
    ),
    (
      'Deluxe Cabin - 2 Bed', 2, 'Cabin', '5', 'Queen + 2 Twin',
      'Yes', 'Yes', 'Yes', 'Yes', 'No', 'Yes',
      '480', '480',
      '525', '540',
      '525', '540',
      '525', '540',
      jsonb_build_object(
        '2026', jsonb_build_object(
          'winter', jsonb_build_object('weekday', 480, 'weekend', 480),
          'spring', jsonb_build_object('weekday', 525, 'weekend', 540),
          'summer', jsonb_build_object('weekday', 525, 'weekend', 540),
          'fall', jsonb_build_object('weekday', 525, 'weekend', 540),
          'note', 'Cloudbeds Deluxe Cabin - 2 Bed; summer WE proxied from fall WE $540 sample (summer WE sold out on sampled dates)'
        )
      ),
      E'[2026-07-31] Added from Cloudbeds/stayoffmap: Deluxe Cabin 2-Bed; qty 2; kitchenette + AC; summer WE from fall WE sample.'
    ),
    (
      'Main Lodge', 1, 'Lodge', '6', 'King + 2 Twin rooms',
      'Yes', 'Yes', 'Yes', 'No', 'Yes', 'No',
      NULL, NULL,
      NULL, NULL,
      NULL, NULL,
      NULL, NULL,
      jsonb_build_object(
        '2026', jsonb_build_object(
          'note', 'Geodesic dome Main Lodge — reserved for private events (not retail nightly). Day rate mentioned on Cloudbeds schema (~$700+ tax / 8 hours, up to 40 guests).'
        )
      ),
      E'[2026-07-31] Added from stayoffmap.com/lodging + Cloudbeds: Main Lodge geodesic dome; private events only; qty 1; no retail nightly ADR.'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed,
  private_bath, shower, stove, kitchenette, full_kitchen, ac,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, note
)
WHERE g.id = 10164
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = g.property_id AND x.site_name = v.site_name
  );

-- Keep property_total_sites aligned on all Off Map Glamping siblings
UPDATE public.all_sage_data
SET property_total_sites = 25, date_updated = '2026-07-31'
WHERE property_id = 'ae850e9d-38db-4cea-93b4-711f855b4c44';

COMMIT;
