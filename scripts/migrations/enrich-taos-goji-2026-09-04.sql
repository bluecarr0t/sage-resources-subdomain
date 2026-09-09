-- ============================================================================
-- Taos Goji (San Cristobal, NM): publish and split cabin / tipi inventory.
-- Distinct from Yurt Haven San Cristobal (Chiapas) and from D.H. Lawrence
-- Ranch Historic Site (separate public site ~15 miles away).
--
-- Sources (retrieved 2026-09-04):
--   https://www.taosgoji.com/
--   Holiday Future IBE (canonical named SKUs):
--     https://taosgoji.holidayfuture.com/all-listings
--   Booking.com (live 2-night Tue Sep 15–Thu Sep 17 2026):
--     https://www.booking.com/hotel/us/taos-goji-farm-amp-eco-lodge-retreat.html
--   Farmstay US (published rack; used only as corroboration):
--     https://farmstayus.com/farms/taos-goji-eco-lodge-and-farm
--   Google Maps address pin (18z search for 1530 Old State Road 3):
--     lat 36.5894332 / lon -105.6500053
--     (skip google_place_id — no ChIJ on the listing)
--   New Mexico Magazine: lodge opened 2010; 40-acre farm; 10 cabins then.
--
-- Operating inventory (Holiday Future named SKUs; total 12):
--   Historic Cabin qty 10 — Cabin 6 / Family Cabin (7 / 3BR), Artist’s Retreat
--     (5 / 2BR), Pond Casita (5), Frieda’s, Georgia O’Keeffe, D.H. Lawrence,
--     Dorothy Brett, Writer’s, Aldous Huxley, Poet’s View.
--   Glamping Tipi qty 2 — Anasazi (listed Anazasi) + Tewa; queen; 254 sq ft.
--   Farm Events / Family Retreats (16 guests / 14 BR) is a property buyout,
--     not an extra site. Booking.com Twin Room / over-listed cottage aliases
--     are not extra SKUs.
--   property_total_sites = 12
--
-- Rates USD, room_only. Do not set rate_avg_retail_daily_rate (trigger).
--   Booking.com 2-night fall weekday totals minus included cleaning / 2:
--     Tewa tipi $81 ($206 − $45)/2; Anasazi $89 ($253 − $75)/2;
--     Standard Bungalow $104 ($283 − $75)/2. Taxes extra. Pet stay higher.
--   Farmstay rack: Frieda $80, Artist $129, Cabin 6 $250 (stale vs IBE mix).
--   Existing Tavily/TripAdvisor park ADR 171/217/202 replaced.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Taos Goji',
  slug = 'taos-goji-farm-eco-lodge-san-cristobal-nm',
  property_type = 'Glamping',
  source = 'Sage',
  discovery_source = 'web_research_taos_goji_operator_gmaps_2026_09',
  address = '1530 Old State Road 3',
  city = 'San Cristobal',
  state = 'NM',
  zip_code = '87564',
  country = 'United States',
  lat = 36.5894332,
  lon = -105.6500053,
  url = 'https://www.taosgoji.com/',
  phone_number = '+1-575-776-3971',
  property_total_sites = 12,
  year_site_opened = 2010,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'No',
  property_laundry = 'Yes',
  property_pool = 'No',
  property_hot_tub = 'Yes',
  property_sauna = 'Yes',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  property_playground = 'Yes',
  property_general_store = 'Yes',
  property_extended_stay = 'Yes',
  property_pickball_courts = 'No',
  property_ota_platforms = ARRAY['booking.com', 'expedia']::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = '40-acre organic goji farm and eco-lodge in San Cristobal (opened as Taos Goji Farm & Eco-Lodge Retreat in 2010; vom Dorps on the Mackie homestead since the 1970s). Midscale historic cabins/casitas with kitchens plus two furnished canvas tipis; shared hot tub and sauna, trading-post lodge (~500 sq ft), barn events, farm animals. Not a full-service hotel. Contact also lists 1528 Old State Road 3.',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD. Direct book Holiday Future (taosgoji.holidayfuture.com). Check-in 3:00 PM / check-out 10:00 AM. Pets allowed (Booking.com pet stay; Farmstay/Hotala ~$25/night, 1 dog, 70-lb guideline). Cleaning fee $45–$75 per stay on Booking.com (included in displayed totals; not in ADR). Taxes extra (7.13% + 5% city). Non-smoking indoors. Cancel: 100% >14 days / 50% 7–14 days. Farm Events buyout is not ADR. Email taosgoji@gmail.com; (575) 776-3971.',
  description = $$40-acre organic goji farm and eco-lodge at 1530 Old State Road 3, San Cristobal, New Mexico (Google Maps 36.5894332, -105.6500053), in the Sangre de Cristo foothills about 11 miles north of Taos. Historic and newer cabins named for D.H. Lawrence, Frieda Lawrence, Dorothy Brett, Aldous Huxley, and Georgia O’Keeffe, plus Pond Casita and two canvas glamping tipis. Shared hot tub and sauna, trading-post lodge, barn, farm animals, and seasonal café/breakfast. Opened as a lodge brand in 2010. Distinct from D.H. Lawrence Ranch Historic Site.$$,
  activities_raw = 'On-site: farm animals (alpacas, goats, chickens), goji/orchard walks, hot tub, saunas, trading-post lodge, barn events, weddings/retreats, playground, stargazing. Nearby: hiking in Carson National Forest, Taos (~11 miles), Taos Ski Valley and Red River (~30 minutes), Rio Grande Gorge, John Dunn Bridge, Black Rock Hot Springs.',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_fishing = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_historic_sightseeing = 'Yes',
  activities_snow_sports = 'Yes',
  activities_horseback_riding = 'Yes',
  setting_farm = 'Yes',
  setting_mountainous = 'Yes',
  setting_forest = 'Yes',
  setting_field = 'Yes',
  rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11638
  AND property_id = 'ee1678f6-7a81-4e70-945e-bd24186a9996';

-- Existing shell becomes the 10 hard-wall cabins / casita.
UPDATE public.all_sage_data
SET
  site_name = 'Historic Cabin',
  unit_type = 'Cabin',
  quantity_of_units = 10,
  unit_capacity = '7',
  unit_bed = '1 Queen (larger SKUs add bunks / sofa / extra bedrooms)',
  unit_sq_ft = 400,
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_picnic_table = 'Yes',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'Yes',
  unit_sauna = 'Yes',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. Historic and newer cabins plus Pond Casita; shared hot tub and sauna.',
  minimum_nights = '1',
  unit_description = $$Historic / farm cabin (qty 10): Cabin 6 Family Cabin (sleeps 7, 3BR/2BA), Artist’s Retreat (sleeps 5, 2BR), Pond Casita (sleeps 5), and 1-bedroom historic cabins — Frieda’s, Georgia O’Keeffe, D.H. Lawrence, Dorothy Brett, Writer’s, Aldous Huxley, Poet’s View (sleep 2–4). Kitchens, private baths, Wi-Fi, A/C, patio. Shared farm hot tub and sauna. Pet-friendly. Booking.com Standard Bungalow listed at 400 sq ft. Farm Events buyout is not an extra site.$$,
  amenities_raw = 'Cabin/casita; kitchen; private bath; Wi-Fi; A/C; patio; barbecue. Shared: hot tub, sauna, laundry, lodge, farm store. Pet-friendly. Non-smoking indoors.',
  rate_winter_weekday = '99',
  rate_winter_weekend = '119',
  rate_spring_weekday = '109',
  rate_spring_weekend = '129',
  rate_summer_weekday = '129',
  rate_summer_weekend = '159',
  rate_fall_weekday = '104',
  rate_fall_weekend = '125',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 99, 'weekend', 119),
      'spring', jsonb_build_object('weekday', 109, 'weekend', 129),
      'summer', jsonb_build_object('weekday', 129, 'weekend', 159),
      'fall', jsonb_build_object('weekday', 104, 'weekend', 125),
      'note', 'USD room_only. Fall weekday $104 from Booking.com Standard Bungalow Tue Sep 15–Thu Sep 17 2026: $283 pay-online total minus $75 cleaning / 2 nights. Larger SKUs higher (Farmstay Cabin 6 $250 rack). Cleaning/taxes extra. Replaces 2026-09-01 Tavily/TripAdvisor park ADR.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published + split from empty shell using taosgoji.com + Holiday Future + Booking.com + Google Maps @36.5894332,-105.6500053. This row is Historic Cabin qty 10. Farm Events buyout not stored as a site. Corrected prior lat/lon 36.363983,-105.594877 (off the valley).'
WHERE id = 11638
  AND property_id = 'ee1678f6-7a81-4e70-945e-bd24186a9996';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed, unit_sq_ft,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, unit_picnic_table, unit_charcoal_grill, unit_ada_accessibility,
  year_site_opened, season_open_month, season_close_month,
  operating_season_months, minimum_nights,
  unit_description, amenities_raw, activities_raw,
  url, property_id, phone_number,
  property_clubhouse, property_food_on_site, property_restaurant, property_laundry,
  property_pool, property_hot_tub, property_sauna, property_family_friendly,
  property_remote_work_friendly, property_has_rentals, property_playground,
  property_general_store, property_extended_stay, property_pickball_courts,
  property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_biking, activities_fishing, activities_wildlife_watching,
  activities_stargazing, activities_scenic_drives, activities_historic_sightseeing,
  activities_snow_sports, activities_horseback_riding,
  setting_farm, setting_mountainous, setting_forest, setting_field,
  rv_parking,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', 'Taos Goji', v.site_name,
  'web_research_taos_goji_operator_gmaps_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  12, v.qty, v.unit_type, v.capacity, v.bed, v.sqft,
  'No', 'No', 'No', 'No',
  NULL, 'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'No', 'Yes', 'Yes',
  NULL, NULL, 'Yes', 'No',
  2010::numeric, NULL::smallint, NULL::smallint,
  v.season, '1',
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_biking, g.activities_fishing, g.activities_wildlife_watching,
  g.activities_stargazing, g.activities_scenic_drives, g.activities_historic_sightseeing,
  g.activities_snow_sports, g.activities_horseback_riding,
  g.setting_farm, g.setting_mountainous, g.setting_forest, g.setting_field,
  g.rv_parking,
  v.win_wd, v.win_we,
  v.spr_wd, v.spr_we,
  v.sum_wd, v.sum_we,
  v.fal_wd, v.fal_we,
  v.rates_json, g.rate_basis, g.rate_basis_notes,
  g.description, v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    (
      'Glamping Tipi', 2::numeric, 'Tipi', '2', '1 Queen', 254::numeric,
      'Year-round. Anasazi (listed Anazasi) and Tewa canvas tipis. Shared farm bathhouse / detached bath (Expedia Anasazi). Shared hot tub and sauna.',
      '75', '95', '81', '99', '99', '125', '81', '99',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 75, 'weekend', 95), 'spring', jsonb_build_object('weekday', 81, 'weekend', 99), 'summer', jsonb_build_object('weekday', 99, 'weekend', 125), 'fall', jsonb_build_object('weekday', 81, 'weekend', 99), 'note', 'USD room_only. Fall weekday $81 from Booking.com Tewa Glamping Tepee Tue Sep 15–Thu Sep 17 2026: $206 pay-online total minus $45 cleaning / 2 nights. Anasazi $89 ($253 − $75)/2. Kayak from $116–$125 blended. Cleaning/taxes extra.')),
      $$Canvas glamping tipi (qty 2): Anasazi and Tewa. Queen bed, down quilt, ~254 sq ft, patio, mountain view. Shared farm hot tub, sauna, and laundry; bath is shared/detached (not a private ensuite). Pets allowed. Non-smoking. Holiday Future listings 290965 and 290970.$$,
      'Canvas tipi; queen; sleeps 2; ~254 sq ft; patio; Wi-Fi. Shared bathhouse, hot tub, sauna, laundry. Pet-friendly.',
      E'[2026-09-04] Added Glamping Tipi qty 2 from Holiday Future Anazasi/Tewa listings + Booking.com tepees.'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed, sqft,
  season,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE g.id = 11638
  AND g.property_id = 'ee1678f6-7a81-4e70-945e-bd24186a9996'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = 'ee1678f6-7a81-4e70-945e-bd24186a9996'
      AND x.site_name = v.site_name
  );

COMMIT;
