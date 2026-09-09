-- ============================================================================
-- Solstice Farms (Loomis, CA): publish and split lodging inventory.
--
-- Sources (retrieved 2026-09-03):
--   https://www.farmstayca.com/ (+ /book-a-room /about-us /contact /activities)
--   Farm brand: https://www.solsticefarmsca.com/
--   Google Maps farm-stand pin:
--     https://www.google.com/maps/place/Farm+Stand+%26+Pumpkin+Patch+@+Solstice+Farms/@38.8085614,-121.1471653,17z
--     lat 38.8085614 / lon -121.1471653; plus code RV53+C4; 4250 Hansen Rd
--   Hipcamp (A-Frame + tent only):
--     https://www.hipcamp.com/en-US/land/california-solstice-farms-06yh9z61
--   Airbnb (operator Book links):
--     Airstream  https://www.airbnb.com/rooms/44593262
--     Streamline https://www.airbnb.com/rooms/48460966
--     A-Frame    https://www.airbnb.com/rooms/693510606163702053
--     Tent       https://www.airbnb.com/rooms/1158914262790393455
--
-- Operating inventory (operator /book-a-room — qty 1 each; total 4):
--   The Airstream, The Streamline, A-Frame Microcabin, Glamping Tent
--   Homepage/about still mention a converted farmworker studio; it is not
--   listed on the current book page, so it is not added as a site.
--   Park-owned “RV Glamping” N/A. Wood campfires prohibited; propane pits OK.
--
-- Rates USD, room_only (no breakfast despite B&B branding):
--   A-Frame: keep existing 2026-09-01 Tavily seasonal ADR
--     winter 110/123, spring 125/135, summer 140/155, fall 130/143
--     Hipcamp from $109 (Tue Sep 15–16 2026).
--   Airstream + Streamline: Airbnb all-in $160 (listed $177) Sep 15–16 2026.
--     Applied winter 140/155, spring 150/165, summer 175/192, fall 160/177.
--   Tent: Hipcamp from $125 same night; Airbnb all-in $183/$204.
--     Applied Hipcamp-led winter 100/110, spring 115/125, summer 135/148, fall 125/138.
-- rate_avg_retail_daily_rate maintained by calc_avg_rate_trigger.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Solstice Farms',
  slug = 'solstice-farms-loomis-ca',
  property_type = 'Glamping',
  source = 'Sage',
  discovery_source = 'web_research_solstice_farms_operator_gmaps_2026_09',
  address = '4250 Hansen Road',
  city = 'Loomis',
  state = 'CA',
  zip_code = '95650',
  country = 'United States',
  lat = 38.8085614,
  lon = -121.1471653,
  url = 'https://www.farmstayca.com/',
  phone_number = '+1-530-715-8991',
  property_total_sites = 4,
  year_site_opened = 2020,
  property_clubhouse = 'No',
  property_food_on_site = 'Yes',
  property_restaurant = 'No',
  property_laundry = 'No',
  property_pool = 'No',
  property_hot_tub = 'No',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'No',
  property_playground = 'Yes',
  property_general_store = 'Yes',
  property_extended_stay = 'No',
  property_pickball_courts = 'Yes',
  property_ota_platforms = ARRAY['airbnb', 'hipcamp']::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = '17-acre organic citrus farm stay (Magnolia Orchard; Archer & Annie since 2019). Four lodging SKUs: two renovated vintage trailers with private baths/kitchens, an A-Frame microcabin, and a bell tent. Cabin/tent share an outdoor bathhouse. Pickleball, playground, farm stand, propane fire pits (no wood fires).',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD. Operator books trailers via Airbnb and A-Frame/tent via Airbnb + Hipcamp. Quoted Airbnb figures are guest all-in (fees included) for 2 adults, 1 night Tue Sep 15–16 2026. Hipcamp “from” prices same night: A-Frame $109, tent $125. No breakfast included despite B&B branding. Pets not allowed (Hipcamp). No wood-burning fires; propane pits provided. Check dates on Airbnb/Hipcamp; operator phone +1-530-715-8991.',
  description = $$Organic citrus farm stay on 17 acres at 4250 Hansen Road, Loomis, California (Google Maps 38.8085614, -121.1471653; plus code RV53+C4), walking distance to the farm stand on Horseshoe Bar Road. Four bookable stays: a renovated vintage Airstream, a renovated Streamline trailer, an A-Frame microcabin in a eucalyptus grove by the canal, and a glamping bell tent in the orchard. Rescue goats, free-range chickens and ducks, pickleball, playground, and Folsom Lake / Placer wine trail nearby.$$,
  activities_raw = 'On-site: orchard walks, farm animals (rescue goats, chickens, ducks, alpacas per reviews), pickleball, playground, hammocks, propane fire pits, Saturday farm stand, seasonal pumpkin patch. Nearby: Folsom Lake (swim/boat), downtown Loomis restaurants, Galleria shopping, Placer wine trail, local hiking.',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_swimming = 'Yes',
  activities_boating = 'Yes',
  activities_paddling = 'Yes',
  activities_fishing = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_stargazing = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_fall_fun = 'Yes',
  setting_farm = 'Yes',
  setting_field = 'Yes',
  setting_suburban = 'Yes',
  date_updated = '2026-09-03'
WHERE id = 13107
  AND property_id = 'd9895069-0a5f-4c7a-9c8d-a5ce7247cb51';

-- Existing shell is the A-Frame Microcabin (qty 1). Enrich that row; keep TA ADR.
UPDATE public.all_sage_data
SET
  site_name = 'A-Frame Microcabin',
  unit_type = 'A-Frame',
  quantity_of_units = 1,
  unit_capacity = '2',
  unit_bed = '1 Queen',
  unit_private_bathroom = 'No',
  unit_shower = 'No',
  unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'No',
  unit_electricity = 'Yes',
  unit_water = 'No',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_picnic_table = 'Yes',
  unit_mini_fridge = 'Yes',
  unit_charcoal_grill = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round (A/C and heat). Propane fire pit; no wood fires. Pit unavailable in October (Airbnb). Shared outdoor bath/shower ~120–150 ft.',
  minimum_nights = '1',
  ota_url_airbnb = 'https://www.airbnb.com/rooms/693510606163702053',
  ota_url_hipcamp = 'https://www.hipcamp.com/en-US/land/california-solstice-farms-06yh9z61',
  unit_description = $$A-Frame Microcabin tucked in a eucalyptus grove beside the canal. Memory-foam queen, A/C and heat, Wi-Fi, mini fridge/coffee, small private patio with two chairs and a propane fire pit. Shared outdoor bathroom and showers ~120–150 ft down a relatively flat path. Sleeps 2. No pets. No wood-burning fires.$$,
  amenities_raw = 'Queen bed; A/C + heat; Wi-Fi; mini fridge; coffee; private patio; propane fire pit. Shared outdoor bathhouse (hot water). No private bath. No pets. Pickleball, playground, farm animals on property.',
  rate_winter_weekday = '110',
  rate_winter_weekend = '123',
  rate_spring_weekday = '125',
  rate_spring_weekend = '135',
  rate_summer_weekday = '140',
  rate_summer_weekend = '155',
  rate_fall_weekday = '130',
  rate_fall_weekend = '143',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 110, 'weekend', 123),
      'spring', jsonb_build_object('weekday', 125, 'weekend', 135),
      'summer', jsonb_build_object('weekday', 140, 'weekend', 155),
      'fall', jsonb_build_object('weekday', 130, 'weekend', 143),
      'note', 'USD. Keep 2026-09-01 Tavily/Facebook ADR. Hipcamp from $109 Tue Sep 15–16 2026. Airbnb listing 693510606163702053.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-03] Published + split from A-Frame-only shell using farmstayca.com/book-a-room + Google Maps @38.8085614,-121.1471653. This row remains the A-Frame Microcabin. Studio mentioned on homepage/about is not on the current book page and was not added.'
WHERE id = 13107
  AND property_id = 'd9895069-0a5f-4c7a-9c8d-a5ce7247cb51';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_gas_fireplace, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, unit_picnic_table, unit_charcoal_grill, unit_ada_accessibility,
  year_site_opened, season_open_month, season_close_month,
  operating_season_months, minimum_nights,
  ota_url_airbnb, ota_url_hipcamp,
  unit_description, amenities_raw, activities_raw,
  url, property_id, phone_number,
  property_clubhouse, property_food_on_site, property_restaurant, property_laundry,
  property_pool, property_hot_tub, property_sauna, property_family_friendly,
  property_remote_work_friendly, property_has_rentals, property_playground,
  property_general_store, property_extended_stay, property_pickball_courts,
  property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_biking, activities_swimming, activities_boating,
  activities_paddling, activities_fishing, activities_scenic_drives,
  activities_stargazing, activities_wildlife_watching, activities_fall_fun,
  setting_farm, setting_field, setting_suburban,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', 'Solstice Farms', v.site_name,
  'web_research_solstice_farms_operator_gmaps_2026_09', '2026-09-03', '2026-09-03',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  4, 1::numeric, v.unit_type, v.capacity, v.bed,
  v.private_bath, v.shower, v.kitchenette, v.full_kitchen,
  v.ac, 'Yes', 'No', v.electric, v.water,
  'Yes', 'Yes', 'No', v.tv, 'No', 'No',
  v.mini_fridge, 'Yes', v.grill, 'No',
  v.year_opened, NULL::smallint, NULL::smallint,
  v.season, '1',
  v.airbnb, v.hipcamp,
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_biking, g.activities_swimming, g.activities_boating,
  g.activities_paddling, g.activities_fishing, g.activities_scenic_drives,
  g.activities_stargazing, g.activities_wildlife_watching, g.activities_fall_fun,
  g.setting_farm, g.setting_field, g.setting_suburban,
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
      'The Airstream', 'Airstream', '3', '1 Queen + 1 Twin',
      'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
      2020::numeric, 'Year-round. Private bath and kitchen in trailer. Propane fire pit and deck BBQ; no wood fires.',
      'https://www.airbnb.com/rooms/44593262', NULL::text,
      '140', '155', '150', '165', '175', '192', '160', '177',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 140, 'weekend', 155), 'spring', jsonb_build_object('weekday', 150, 'weekend', 165), 'summer', jsonb_build_object('weekday', 175, 'weekend', 192), 'fall', jsonb_build_object('weekday', 160, 'weekend', 177), 'note', 'USD. Airbnb 44593262 guest all-in $160 (listed $177) Tue Sep 15–16 2026, 2 adults. Fall weekday = observed $160; weekend uses listed $177; other seasons scaled.')),
      $$The Airstream (Magnolia Orchard Airstream): fully renovated vintage Airstream on the organic citrus farm. Sleeps 3 (queen + twin). Private bath, kitchen, A/C, Wi-Fi, TV, private deck with grill and picnic table, propane fire pit overlooking the orchard. No pets. No wood-burning fires.$$,
      'Renovated Airstream; Queen + Twin; sleeps 3; private bath; full kitchen; A/C; Wi-Fi; TV; private deck; BBQ; picnic table; propane fire pit. No pets.',
      E'[2026-09-03] Added from farmstayca.com/book-a-room + Airbnb 44593262.'
    ),
    (
      'The Streamline', 'Vintage Trailer', '3', '2 beds',
      'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
      2020::numeric, 'Year-round. Private bath and kitchen in trailer. Propane fire pit and deck BBQ; no wood fires.',
      'https://www.airbnb.com/rooms/48460966', NULL::text,
      '140', '155', '150', '165', '175', '192', '160', '177',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 140, 'weekend', 155), 'spring', jsonb_build_object('weekday', 150, 'weekend', 165), 'summer', jsonb_build_object('weekday', 175, 'weekend', 192), 'fall', jsonb_build_object('weekday', 160, 'weekend', 177), 'note', 'USD. Airbnb 48460966 guest all-in $160 (listed $177) Tue Sep 15–16 2026, 2 adults — same observed night as The Airstream. Fall weekday = observed $160; weekend uses listed $177.')),
      $$The Streamline: stylish fully renovated vintage Streamline trailer on the organic citrus farm. Sleeps 3 (2 beds). Private bath, kitchen, A/C, Wi-Fi, TV, private deck with grill and picnic table, propane fire pit overlooking the orchard. No pets. No wood-burning fires.$$,
      'Renovated Streamline; 2 beds; sleeps 3; private bath; full kitchen; A/C; Wi-Fi; TV; private deck; BBQ; picnic table; propane fire pit. No pets.',
      E'[2026-09-03] Added from farmstayca.com/book-a-room + Airbnb 48460966.'
    ),
    (
      'Glamping Tent', 'Bell Tent', '4', '2 Full',
      'No', 'No', 'No', 'No', 'No', 'Yes', 'No', 'No', 'No', 'No',
      2024::numeric, 'Seasonal-feel canvas tent (fans, no A/C or heat). Shared outdoor bath/shower ~150 ft. Propane fire pit; no wood fires. Dress warm in cool weather.',
      'https://www.airbnb.com/rooms/1158914262790393455', 'https://www.hipcamp.com/en-US/land/california-solstice-farms-06yh9z61',
      '100', '110', '115', '125', '135', '148', '125', '138',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 100, 'weekend', 110), 'spring', jsonb_build_object('weekday', 115, 'weekend', 125), 'summer', jsonb_build_object('weekday', 135, 'weekend', 148), 'fall', jsonb_build_object('weekday', 125, 'weekend', 138), 'note', 'USD. Hipcamp from $125 Tue Sep 15–16 2026 used as fall weekday. Airbnb 1158914262790393455 all-in $183 (listed $204) same night — fees inflate vs Hipcamp; not used as rack.')),
      $$Glamping tent (Hipcamp: bell tent) in the organic citrus orchard. Two full beds, sleeps 4. High-powered fans and a couple of outlets; no A/C or heat. Private deck, hammock, picnic table, propane fire pit with stump seating. Shared outdoor bathroom and showers ~150 ft. Limited power. No pets. No wood-burning fires.$$,
      'Bell tent; 2 Full beds; sleeps 4; fans (no A/C/heat); limited power; private deck; hammock; picnic table; propane fire pit. Shared outdoor bathhouse. No pets.',
      E'[2026-09-03] Added from farmstayca.com/book-a-room + Hipcamp + Airbnb 1158914262790393455.'
    )
) AS v(
  site_name, unit_type, capacity, bed,
  private_bath, shower, kitchenette, full_kitchen, ac, electric, water, tv, mini_fridge, grill,
  year_opened, season,
  airbnb, hipcamp,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE g.id = 13107
  AND g.property_id = 'd9895069-0a5f-4c7a-9c8d-a5ce7247cb51'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = 'd9895069-0a5f-4c7a-9c8d-a5ce7247cb51'
      AND x.site_name = v.site_name
  );

COMMIT;
