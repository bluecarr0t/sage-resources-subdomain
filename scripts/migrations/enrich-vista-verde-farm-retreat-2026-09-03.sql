-- ============================================================================
-- Vista Verde Farm Retreat (Lake City, FL): publish and split lodging/RV.
-- Distinct from Vista Verde Guest Ranch (Clark, CO / vistaverde.com).
--
-- Sources (retrieved 2026-09-03):
--   https://www.vistaverdefarmretreat.com/ (+ /accommodations /policies /contact)
--   ResNexus:
--     https://resnexus.com/resnexus/reservations/book/D01DB8CA-0C37-4291-ADFA-71B1E2581BF4
--   Hipcamp:
--     https://www.hipcamp.com/en-US/land/florida-vista-verde-farm-retreat-zwjh6dq8
--   Google Maps business pin:
--     https://www.google.com/maps/place/Vista+Verde+Farm+Retreat/@29.9538629,-82.582762,17z
--     lat 29.9538629 / lon -82.582762; plus code XC38+GV
--     1439 County Rd 18, Lake City, FL 32024
--
-- Operating inventory (operator policies + Hipcamp + ResNexus):
--   3 identical tiny cabins (Cabin 1/2/3; qty 3) — Queen + queen sofa bed, sleeps 4
--   3 full-hookup back-in RV pads (Sites; qty 3) — 45×75 grass, 20/30/50-amp
--   Entire Farm Retreat is a 3-cabin buyout, not an extra site.
--   Tent camping not permitted. property_total_sites = 6
--   2 fenced acres inside 77-acre Fruitful Earth Farms (cattle/sheep).
--
-- Rates USD, room_only:
--   Cabin: ResNexus Standard Rate $99/night Thu Sep 3 2026 (fall weekday).
--     Hipcamp from $108. Google Hotels official $155 Dec 5–7 2026 (winter).
--     Applied winter 140/155, spring 145/165, summer 89/105, fall 99/117.
--   RV: ResNexus $46.50/night (2-night min) Sep 3 2026. Hipcamp from $44.
--     Applied winter 55/65, spring 58/68, summer 42/50, fall 47/55.
-- rate_avg_retail_daily_rate maintained by calc_avg_rate_trigger.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Vista Verde Farm Retreat',
  slug = 'vista-verde-farm-retreat-lake-city-fl',
  property_type = 'Glamping',
  source = 'Sage',
  discovery_source = 'web_research_vista_verde_farm_retreat_operator_gmaps_2026_09',
  address = '1439 Southeast County Road 18',
  city = 'Lake City',
  state = 'FL',
  zip_code = '32024',
  country = 'United States',
  lat = 29.9538629,
  lon = -82.582762,
  url = 'https://www.vistaverdefarmretreat.com/',
  phone_number = '+1-386-515-8050',
  property_total_sites = 6,
  year_site_opened = 2024,
  property_clubhouse = 'No',
  property_food_on_site = 'No',
  property_restaurant = 'No',
  property_laundry = 'No',
  property_pool = 'No',
  property_hot_tub = 'No',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  property_playground = 'No',
  property_general_store = 'No',
  property_extended_stay = 'No',
  property_pickball_courts = 'No',
  property_ota_platforms = ARRAY['hipcamp', 'vrbo']::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = '2-acre gated farm stay inside 77-acre Fruitful Earth Farms (cattle/sheep) near Florida Springsland. Three identical tiny cabins (private bath, full kitchen, patio firepit) plus three full-hookup RV pads. Midscale — not a resort (no pool, spa, or F&B). Distinct from Vista Verde Guest Ranch in Clark, CO.',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD. Direct book ResNexus. Cabins check-in after 4 PM / out 11 AM; RV check-in 12–5 PM (late to 8 PM with approval; no RV arrivals after 8 PM), 2-night RV minimum. Dogs OK if listed on the reservation (leash, no unattended, off furniture). Quiet hours are all hours; no parties/fireworks. Direct cancel: >14 days full refund minus $10; 8–14 days 50%; ≤7 days none. Complimentary firewood. Email hello@vistaverdefarmretreat.com.',
  description = $$Gated 2-acre farm retreat at 1439 SE County Road 18, Lake City, Florida (Google Maps 29.9538629, -82.582762; plus code XC38+GV), inside 77-acre Fruitful Earth Farms with cattle, sheep, and a spring-fed pond. Three identical tiny cabins and three full-hookup RV pads. About 15–25 minutes to Ichetucknee, Ginnie, and Gilchrist Blue Springs; I-75 Exit 414. Guest-only private farm tours. Distinct from Vista Verde Guest Ranch (Clark, CO).$$,
  activities_raw = 'On-site: private Fruitful Earth Farms tour (guests only), livestock viewing, spring-fed pond views, patio firepits, cornhole. Nearby (15–25 min): Ichetucknee Springs State Park (tube/kayak/swim), Ginnie Springs, Gilchrist Blue Springs, O’Leno State Park hiking, Santa Fe River, historic High Springs, Gainesville ~20 min.',
  activities_hiking = 'Yes',
  activities_swimming = 'Yes',
  activities_paddling = 'Yes',
  activities_boating = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  setting_farm = 'Yes',
  setting_field = 'Yes',
  setting_lake = 'Yes',
  date_updated = '2026-09-03'
WHERE id = 13242
  AND property_id = '544596a6-4311-4fb1-b235-e6f280dbb6fc';

UPDATE public.all_sage_data
SET
  site_name = 'Cabin',
  unit_type = 'Cabin',
  quantity_of_units = 3,
  unit_capacity = '4',
  unit_bed = '1 Queen + queen sofa bed',
  unit_sq_ft = NULL,
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
  unit_picnic_table = NULL,
  unit_mini_fridge = 'No',
  unit_charcoal_grill = 'Yes',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  unit_cable = 'Yes',
  unit_ada_accessibility = NULL,
  rv_parking = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. Three identical cabins (Cabin 1/2/3) within ~30 ft. Entire-farm buyout books all three together, not a 4th SKU.',
  minimum_nights = '1',
  ota_url_hipcamp = 'https://www.hipcamp.com/en-US/land/florida-vista-verde-farm-retreat-zwjh6dq8',
  unit_description = $$Identical tiny cabin (ResNexus Cabin 1/2/3): queen bed plus queen sofa bed, sleeps 4. Private bath with walk-in shower, full kitchen (stove, fridge, microwave, Keurig + stocked coffee), smart TV with Netflix, Wi-Fi, A/C. Private patio with outdoor furniture and 3-in-1 firepit (bonfire / barbecue / table). Linens and towels provided. Dogs if listed on the reservation. Gated farm; coded entry.$$,
  amenities_raw = 'Tiny cabin; Queen + sofa bed; sleeps 4; private bath/shower; full kitchen; Keurig; Wi-Fi; smart TV; A/C; private patio; 3-in-1 firepit. Pet-friendly (dogs on reservation). Three identical units.',
  rate_winter_weekday = '140',
  rate_winter_weekend = '155',
  rate_spring_weekday = '145',
  rate_spring_weekend = '165',
  rate_summer_weekday = '89',
  rate_summer_weekend = '105',
  rate_fall_weekday = '99',
  rate_fall_weekend = '117',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 140, 'weekend', 155),
      'spring', jsonb_build_object('weekday', 145, 'weekend', 165),
      'summer', jsonb_build_object('weekday', 89, 'weekend', 105),
      'fall', jsonb_build_object('weekday', 99, 'weekend', 117),
      'note', 'USD. Fall weekday $99 ResNexus Standard Rate Cabin 1/3 Thu Sep 3 2026. Hipcamp from $108. Google Hotels official $155 Dec 5–7 2026 used as winter weekend. Direct resnexus.com/.../D01DB8CA-0C37-4291-ADFA-71B1E2581BF4. Vrbo p4104358vb.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-03] Published + split from empty shell using vistaverdefarmretreat.com + ResNexus + Google Maps @29.9538629,-82.582762. This row is the three identical Cabins (qty 3). Distinct from Vista Verde Guest Ranch (Clark, CO). Entire Farm Retreat buyout not stored as a site.'
WHERE id = 13242
  AND property_id = '544596a6-4311-4fb1-b235-e6f280dbb6fc';

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
  operating_season_months, minimum_nights, ota_url_hipcamp,
  unit_description, amenities_raw, activities_raw,
  url, property_id, phone_number,
  property_clubhouse, property_food_on_site, property_restaurant, property_laundry,
  property_pool, property_hot_tub, property_sauna, property_family_friendly,
  property_remote_work_friendly, property_has_rentals, property_playground,
  property_general_store, property_extended_stay, property_pickball_courts,
  property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_swimming, activities_paddling, activities_boating,
  activities_wildlife_watching, activities_stargazing, activities_scenic_drives,
  setting_farm, setting_field, setting_lake,
  rv_parking, rv_sewer_hook_up, rv_electrical_hook_up, rv_water_hookup,
  rv_accommodates_slideout, rv_vehicle_length, rv_surface_level, rv_surface_type,
  rv_generators_allowed, rv_vehicles_fifth_wheels, rv_vehicles_class_a_rvs,
  rv_vehicles_class_b_rvs, rv_vehicles_class_c_rvs,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', 'Vista Verde Farm Retreat', v.site_name,
  'web_research_vista_verde_farm_retreat_operator_gmaps_2026_09', '2026-09-03', '2026-09-03',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  6, v.qty, v.unit_type, v.capacity, NULL,
  'No', 'No', 'No', 'No',
  NULL, NULL, 'Yes', 'Yes', 'Yes',
  'Yes', 'No', 'No', 'No', 'No',
  NULL, NULL, 'Yes', NULL,
  2024::numeric, NULL::smallint, NULL::smallint,
  v.season, v.min_nights, g.ota_url_hipcamp,
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_swimming, g.activities_paddling, g.activities_boating,
  g.activities_wildlife_watching, g.activities_stargazing, g.activities_scenic_drives,
  g.setting_farm, g.setting_field, g.setting_lake,
  'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', NULL, NULL, 'Grass',
  'No', 'Yes', 'Yes', 'Yes', 'Yes',
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
      'Full-Hookup RV Site', 3::numeric, 'RV Site', '4',
      'Year-round. Three back-in grass pads (45×75). Rigs manufactured within the past 15 years. Tent camping not permitted. 2-night minimum.',
      '2',
      '55', '65', '58', '68', '42', '50', '47', '55',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 55, 'weekend', 65), 'spring', jsonb_build_object('weekday', 58, 'weekend', 68), 'summer', jsonb_build_object('weekday', 42, 'weekend', 50), 'fall', jsonb_build_object('weekday', 47, 'weekend', 55), 'note', 'USD. Fall weekday $46.50 ResNexus RV Site 5 Thu Sep 3 2026 (2-night min; $93 total). Hipcamp from $44. Seasonal shape follows cabin Florida springs calendar, scaled.')),
      $$Full-hookup back-in RV site (qty 3): 45 ft wide × 75 ft deep grass pad with 20/30/50-amp electric, water, and sewer. Four Adirondack chairs and a firepit that doubles as a grill. Fifth wheels, travel trailers, and motorhomes welcome if manufactured within the past 15 years. Gated farm. Check-in 12–5 PM; no arrivals after 8 PM. Generators only during a power outage. Pets OK if listed.$$,
      'Full hookup 20/30/50-amp; water; sewer; 45×75 grass pad; firepit/grill; 4 Adirondack chairs. Back-in. 2-night min. Pet-friendly. No tents.',
      E'[2026-09-03] Added Full-Hookup RV Site qty 3 from vistaverdefarmretreat.com/accommodations#RVSites + Hipcamp + ResNexus RV Site 5.'
    )
) AS v(
  site_name, qty, unit_type, capacity,
  season, min_nights,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE g.id = 13242
  AND g.property_id = '544596a6-4311-4fb1-b235-e6f280dbb6fc'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = '544596a6-4311-4fb1-b235-e6f280dbb6fc'
      AND x.site_name = v.site_name
  );

COMMIT;
