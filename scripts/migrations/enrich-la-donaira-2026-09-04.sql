-- ============================================================================
-- La Donaira (Montecorto / Serranía de Ronda, Andalusia): publish 9 spaces
-- as 7 cortijo rooms + 2 yurts. Not 9 yurts. Distinct from other Ronda
-- fincas. Relais & Châteaux eco-luxury Lusitano farm.
--
-- Sources (retrieved 2026-09-04):
--   https://www.ladonaira.com/
--   https://www.84rooms.com/hotels/finca-la-donaira
--   Relais & Châteaux: Camino de las Minas, 29430 Montecorto; 36.8492, -5.2987
--   Vozpopuli room names (Priam, Glass, Magnolia, Ana y Adrián) — not used
--     as invented SKU counts
--
-- Operating inventory:
--   Cortijo Room qty 7 — Hotel Room (2 standard + 3 non-yurt deluxe + 2
--     grand deluxe suites lumped; do not invent named-suite quantities)
--   Yurt qty 2 — deluxe yurts on a stone path
--   property_total_sites = 9
--
-- Rates EUR, all_inclusive. Do not set rate_avg_retail_daily_rate.
--   84rooms from EUR 880; travelermag from EUR 750. Stored 750 from-rate.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'La Donaira',
  slug = 'la-donaira-montecorto-andalusia',
  property_type = 'Ranch & Lodge',
  source = 'Sage',
  discovery_source = 'web_research_la_donaira_operator_relais_2026_09',
  address = 'Camino de las Minas',
  city = 'Montecorto',
  state = 'Andalusia',
  zip_code = '29430',
  country = 'Spain',
  lat = 36.8492,
  lon = -5.2987,
  url = 'https://www.ladonaira.com/',
  phone_number = '+34-952-188-882',
  property_total_sites = 9,
  year_site_opened = 2015,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'Yes',
  property_laundry = 'Yes',
  property_pool = 'Yes',
  property_hot_tub = 'No',
  property_sauna = 'Yes',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No',
  property_has_rentals = 'No',
  property_playground = 'No',
  property_general_store = 'No',
  property_extended_stay = 'No',
  property_pickball_courts = 'No',
  property_fitness_room = 'Yes',
  property_waterfront = 'No',
  property_alcohol_available = 'Yes',
  property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Relais & Châteaux biodynamic Lusitano finca (~1,700 acres) in the Serranía de Ronda. Nine unique spaces: historic cortijo rooms plus two yurts. Seed-to-plate meals included. Wellness pavilion with 21m heated pool, wood-fired sauna, hammam, plunge; outdoor spring infinity pool. Official city is Montecorto (29430), not Ronda town centre.',
  rate_basis = 'all_inclusive',
  rate_basis_notes = 'EUR. Operator/press: meals, drinks and snacks included. Riding, spa treatments and shuttles extra. Min 2 nights (3 in high season). From-rate EUR 750 (travelermag 2026); 84rooms lists from EUR 880. Peak suite samples ~EUR 1,300 not stored as ADR. Pets welcome with supplement. +34 952 188 882.',
  description = $$Eco-luxury Relais & Châteaux finca on Camino de las Minas, 29430 Montecorto, Andalusia (36.8492, -5.2987), in the Serranía de Ronda. Organic / biodynamic farm and Lusitano stud with nine guest spaces — seven cortijo rooms/suites and two yurts — plus a wellness pavilion, spring-fed outdoor pool, and seed-to-plate dining included in the stay. Not a campground and not nine yurts.$$,
  activities_raw = 'On-site: horseback riding / Lusitano stud, spa (21m pool, hammam, sauna, plunge), yoga platform, hiking, cycling, farm-to-table dining, weddings, EcoMaratón trail run. Nearby: Ronda, Sierra de Grazalema, white villages.',
  activities_hiking = 'Yes',
  activities_swimming = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  setting_ranch = 'Yes',
  setting_field = 'Yes',
  setting_mountainous = 'Yes',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11203
  AND property_id = '10a0a04e-e767-46f0-90fb-13f0916becda';

UPDATE public.all_sage_data
SET
  site_name = 'Yurt',
  unit_type = 'Yurt',
  quantity_of_units = 2,
  unit_capacity = '2',
  unit_bed = '1 Double',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'No',
  unit_patio = 'Yes',
  unit_cable = 'No',
  unit_mini_fridge = 'No',
  unit_picnic_table = 'No',
  unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. Two deluxe yurts, more secluded, reached by a stone path. All-inclusive meals. Min 2 nights.',
  minimum_nights = '2',
  unit_description = $$Yurt (qty 2): Award-winning deluxe yurts among La Donaira’s nine unique spaces. Secluded on a stone path with mountain views. Meals and drinks included. Do not invent a third yurt or treat all 9 spaces as yurts.$$,
  amenities_raw = 'Yurt; private bath; antiques / handmade furnishings; mountain views; all-inclusive dining; spa and pools shared. Pets with supplement.',
  rate_winter_weekday = '750',
  rate_winter_weekend = '750',
  rate_spring_weekday = '750',
  rate_spring_weekend = '750',
  rate_summer_weekday = '750',
  rate_summer_weekend = '750',
  rate_fall_weekday = '750',
  rate_fall_weekend = '750',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 750, 'weekend', 750),
      'spring', jsonb_build_object('weekday', 750, 'weekend', 750),
      'summer', jsonb_build_object('weekday', 750, 'weekend', 750),
      'fall', jsonb_build_object('weekday', 750, 'weekend', 750),
      'note', 'EUR all_inclusive from-rate (travelermag 2026). 84rooms from EUR 880. Peak suite press ~EUR 1,300 not stored as ADR.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Yurt qty 9 stub. This row is Yurt qty 2. Cortijo rooms split out. City Ronda→Montecorto 29430. lat/lon 36.8492,-5.2987. rate_basis unknown → all_inclusive. property_type Glamping → Ranch & Lodge.'
WHERE id = 11203
  AND property_id = '10a0a04e-e767-46f0-90fb-13f0916becda';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed,
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
  property_fitness_room, property_waterfront, property_alcohol_available,
  property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_swimming, activities_wildlife_watching,
  activities_stargazing, activities_scenic_drives,
  setting_ranch, setting_field, setting_mountainous,
  rv_parking,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', 'La Donaira', v.site_name,
  'web_research_la_donaira_operator_relais_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  9, v.qty, v.unit_type, v.capacity, v.bed,
  'Yes', 'Yes', 'No', 'No',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'No', 'Yes', 'No', 'No', 'No',
  'No', 'No', 'No', 'No',
  2015::numeric, NULL::smallint, NULL::smallint,
  v.season, '2',
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_fitness_room, g.property_waterfront, g.property_alcohol_available,
  g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_swimming, g.activities_wildlife_watching,
  g.activities_stargazing, g.activities_scenic_drives,
  g.setting_ranch, g.setting_field, g.setting_mountainous,
  g.rv_parking,
  v.win_wd, v.win_we, v.spr_wd, v.spr_we, v.sum_wd, v.sum_we, v.fal_wd, v.fal_we,
  v.rates_json, g.rate_basis, g.rate_basis_notes,
  g.description, v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    (
      'Cortijo Room', 7::numeric, 'Hotel Room', '2-4', 'Varies by room',
      'Year-round. Seven cortijo rooms/suites in the historic farmhouse (2 standard + 3 non-yurt deluxe + 2 grand deluxe). Do not invent Priam/Glass/Magnolia/Ana y Adrián quantities.',
      '750', '750', '750', '750', '750', '750', '750', '750',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 750, 'weekend', 750), 'spring', jsonb_build_object('weekday', 750, 'weekend', 750), 'summer', jsonb_build_object('weekday', 750, 'weekend', 750), 'fall', jsonb_build_object('weekday', 750, 'weekend', 750), 'note', 'EUR all_inclusive from-rate. Peak named-suite press ~EUR 1,300 not stored as ADR.')),
      $$Cortijo Room (qty 7): Individually designed rooms and suites in the 111-year-old cortijo with antiques, mountain views, and private baths. Lumped (do not invent per-name SKUs). Meals included. Two further spaces are yurts, not rooms.$$,
      'Cortijo hotel room/suite; private bath; antiques; shared spa, pools, dining. Pets with supplement.',
      E'[2026-09-04] Added Cortijo Room qty 7 from ladonaira.com + 84rooms (9 spaces = 7 rooms + 2 yurts).'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed, season,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE g.id = 11203
  AND g.property_id = '10a0a04e-e767-46f0-90fb-13f0916becda'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = '10a0a04e-e767-46f0-90fb-13f0916becda'
      AND x.site_name = v.site_name
  );

COMMIT;
