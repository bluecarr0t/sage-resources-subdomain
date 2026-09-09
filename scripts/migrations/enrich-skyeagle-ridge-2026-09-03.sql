-- ============================================================================
-- SkyEagle Ridge (Conway, AR): publish and split 3 lodging SKUs.
--
-- Sources (retrieved 2026-09-03):
--   https://skyeagleridge.com/ (+ /en/ood-mirror-house-at-skyeagle-ridge
--     /en/aviator-geodome-arkansas /en/coming-soon-the-golden-house
--     /en/faq /en/contact /en/which-stay-is-right-for-you
--     /en/aviation-themed-cabin-glamping-dome)
--   Lodgify direct (Mirror House):
--     https://checkout.lodgify.com/en/skyeagleridge/598348/reservation?currency=USD
--   Google Maps business pin:
--     https://www.google.com/maps/place/SkyEagle+Ridge/@35.1037808,-92.3223639,17z
--     lat 35.1037808 / lon -92.3223639; plus code 4M3H+G3; Roden Mill Rd
--     (replaces 2026-07-13 street geocode 35.1049594, -92.3143764)
--   Aviator Geodome Airbnb exclusive:
--     https://www.airbnb.com/rooms/1581961108990836667
--     https://airbnb.com/h/aviatordome
--
-- Operating inventory (operator site — qty 1 each; property_total_sites = 2):
--   ÖÖD Mirror House (Lodgify; couples; Queen; private jetsetter hot tub,
--     mirror sauna, Caldera cold plunge)
--   Aviator Geodome (Airbnb exclusive; 30-ft / ~700 sq ft; sleeps 4;
--     2 Queen; Hot Spring Envoy hot tub)
--   The Golden House — Coming Soon / waitlist; hoped ready by end of 2026.
--     is_open = Under Construction; planned_open_date 2026-12-01.
--     Not counted in operating property_total_sites.
--
-- Rates USD, room_only. Do not set rate_avg_retail_daily_rate (trigger).
--   Mirror House: keep existing seasonal ADR
--     winter 230/256, spring 261/282, summer 292/324, fall 271/298
--     (2026-09-01 Tavily/Google Hotels avg $261)
--   Aviator Geodome: Airbnb 1-night Tue Sep 15–16 2026 displayed $405
--     (calendar “Prices include all fees”). Hichee from-rate $379.
--     $405 used as fall weekday; other seasons scaled from Mirror ratios.
--   Golden House: not yet bookable — null rack.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'SkyEagle Ridge',
  slug = 'skyeagle-ridge-conway-ar',
  property_type = 'Glamping',
  source = 'Sage',
  discovery_source = 'web_research_skyeagle_ridge_operator_gmaps_2026_09',
  address = '44 Roden Mill Road',
  city = 'Conway',
  state = 'AR',
  zip_code = '72032',
  country = 'United States',
  lat = 35.1037808,
  lon = -92.3223639,
  url = 'https://skyeagleridge.com',
  phone_number = '+1-501-908-1911',
  property_total_sites = 2,
  year_site_opened = 2024,
  property_clubhouse = 'No',
  property_food_on_site = 'No',
  property_restaurant = 'No',
  property_laundry = 'Yes',
  property_pool = 'No',
  property_hot_tub = 'Yes',
  property_sauna = 'Yes',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  property_playground = 'No',
  property_general_store = 'No',
  property_extended_stay = 'No',
  property_pickball_courts = 'No',
  property_ota_platforms = ARRAY['airbnb']::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Private-ridge glamping outside Conway, AR. Arkansas’s first ÖÖD Mirror House (private Hot Springs Jetsetter LX, mirror sauna, Caldera cold plunge, heated floors) plus 30-ft aviation-themed geodesic dome (Airbnb exclusive; private Envoy hot tub, laundry). Limited-edition Golden House on waitlist for late 2026. Fiber Wi-Fi. No pets. No pool.',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD. Mirror House books direct via Lodgify (checkout.lodgify.com/en/skyeagleridge/598348). Aviator Geodome is Airbnb-exclusive. Check-in 3:00 PM / check-out 10:00 AM. Pets not allowed; no smoking; not wheelchair accessible; registered guests only; no events/parties; quiet hours 9 PM–8 AM. Faulkner County is dry. Lodgify: 50% due at booking, remainder 7 days before arrival; paid prepayments non-refundable. Host email skyeagleridge@gmail.com.',
  description = $$Private-ridge glamping at 44 Roden Mill Road, Conway, Arkansas (Google Maps 35.1037808, -92.3223639; plus code 4M3H+G3), about 15 minutes from Conway and 40 minutes from Little Rock, with views toward Pinnacle Mountain. Two operating stays: Arkansas’s first ÖÖD Mirror House (couples wellness cabin with private hot tub, mirror sauna, and cold plunge) and the Aviator Geodome (30-ft aviation-themed dome, Airbnb exclusive). A limited-edition Golden Mirror House is on a waitlist for late 2026.$$,
  activities_raw = 'On-site: private hot tubs, sauna (Mirror House + operator FAQ for all rentals), cold plunge (Mirror House), outdoor fireplace / fire table, Pit Boss pellet grill, stargazing from private decks, wildlife watching. Nearby: Conway restaurants and shops (~15 min), Pinnacle Mountain State Park, Little Rock (~40 min / ~35 miles).',
  activities_hiking = 'Yes',
  activities_stargazing = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_historic_sightseeing = 'Yes',
  setting_mountainous = 'Yes',
  setting_forest = 'Yes',
  date_updated = '2026-09-03'
WHERE id = 13096
  AND property_id = 'e5db8283-f017-404f-a2e4-641cf6cd1f7f';

UPDATE public.all_sage_data
SET
  site_name = 'ÖÖD Mirror House',
  unit_type = 'Mirror Cabin',
  quantity_of_units = 1,
  unit_capacity = '2',
  unit_bed = '1 Queen',
  unit_sq_ft = NULL,
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'No',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_picnic_table = 'No',
  unit_mini_fridge = 'Yes',
  unit_charcoal_grill = 'Yes',
  unit_hot_tub = 'Yes',
  unit_sauna = 'Yes',
  unit_hot_tub_or_sauna = 'Yes',
  unit_cable = 'Yes',
  unit_ada_accessibility = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. Climate-controlled ÖÖD with heated floors. Private mirror sauna and Caldera cold plunge.',
  minimum_nights = '1',
  planned_open_date = NULL,
  ota_url_airbnb = NULL,
  unit_description = $$ÖÖD Mirror House: Arkansas’s first ÖÖD mirrored cabin on a private ridge near Conway. Queen luxury hybrid mattress, sleeps 2, private bath with walk-in shower, heated floors, A/C, fiber Wi-Fi, kitchenette (coffee, microwave, mini fridge, hotplate). Private Hot Springs Jetsetter LX hot tub, dedicated mirror sauna, Caldera cold plunge, outdoor fireplace, and Pit Boss pellet grill. Couples wellness stay. Pets not allowed.$$,
  amenities_raw = 'ÖÖD mirror cabin; Queen; sleeps 2; private bath/walk-in shower; heated floors; A/C; fiber Wi-Fi; kitchenette; mini fridge; TV; Bluetooth; private hot tub; mirror sauna; cold plunge; outdoor fireplace; pellet grill. No pets. Not ADA.',
  rate_winter_weekday = '230',
  rate_winter_weekend = '256',
  rate_spring_weekday = '261',
  rate_spring_weekend = '282',
  rate_summer_weekday = '292',
  rate_summer_weekend = '324',
  rate_fall_weekday = '271',
  rate_fall_weekend = '298',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 230, 'weekend', 256),
      'spring', jsonb_build_object('weekday', 261, 'weekend', 282),
      'summer', jsonb_build_object('weekday', 292, 'weekend', 324),
      'fall', jsonb_build_object('weekday', 271, 'weekend', 298),
      'note', 'USD. Keep existing seasonal ADR (2026-09-01 Tavily/Google Hotels avg $261). Lodgify overview showed from ~€262–€267/night. Direct book checkout.lodgify.com/en/skyeagleridge/598348.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-03] Published + split into 3 SKUs from skyeagleridge.com + Google Maps @35.1037808,-92.3223639. This row is ÖÖD Mirror House (Lodgify). Lat/lon replaced street geocode with Maps business pin.'
WHERE id = 13096
  AND property_id = 'e5db8283-f017-404f-a2e4-641cf6cd1f7f';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed, unit_sq_ft,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_gas_fireplace, unit_cable, unit_hot_tub, unit_sauna,
  unit_hot_tub_or_sauna, unit_mini_fridge, unit_picnic_table, unit_charcoal_grill,
  unit_ada_accessibility,
  year_site_opened, season_open_month, season_close_month,
  operating_season_months, minimum_nights, planned_open_date, ota_url_airbnb,
  unit_description, amenities_raw, activities_raw,
  url, property_id, phone_number,
  property_clubhouse, property_food_on_site, property_restaurant, property_laundry,
  property_pool, property_hot_tub, property_sauna, property_family_friendly,
  property_remote_work_friendly, property_has_rentals, property_playground,
  property_general_store, property_extended_stay, property_pickball_courts,
  property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_stargazing, activities_wildlife_watching,
  activities_scenic_drives, activities_historic_sightseeing,
  setting_mountainous, setting_forest,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', v.is_open, 'Yes', 'Sage', 'SkyEagle Ridge', v.site_name,
  'web_research_skyeagle_ridge_operator_gmaps_2026_09', '2026-09-03', '2026-09-03',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  2, 1::numeric, v.unit_type, v.capacity, v.bed, v.sq_ft,
  'Yes', 'Yes', v.kitchenette, 'No',
  'Yes', 'Yes', 'No', 'Yes', 'Yes',
  'Yes', 'Yes', v.gas_fp, 'Yes', v.hot_tub, v.sauna,
  'Yes', 'Yes', 'No', 'Yes',
  'No',
  v.year_opened, NULL::smallint, NULL::smallint,
  v.season, '1', v.planned_open, v.airbnb,
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_stargazing, g.activities_wildlife_watching,
  g.activities_scenic_drives, g.activities_historic_sightseeing,
  g.setting_mountainous, g.setting_forest,
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
      'Yes', 'Aviator Geodome', 'Dome', '4', '2 Queen', 700::numeric,
      'Yes', 'No', 'Yes', 'Yes',
      2024::numeric,
      'Year-round. Climate-controlled 30-ft geodesic dome; temps can fluctuate vs a house. Skylight permanently covered. Airbnb exclusive.',
      NULL::date,
      'https://www.airbnb.com/rooms/1581961108990836667',
      '344', '383', '390', '421', '436', '484', '405', '445',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 344, 'weekend', 383), 'spring', jsonb_build_object('weekday', 390, 'weekend', 421), 'summer', jsonb_build_object('weekday', 436, 'weekend', 484), 'fall', jsonb_build_object('weekday', 405, 'weekend', 445), 'note', 'USD. Fall weekday $405 from Airbnb 1-night Tue Sep 15–16 2026 (displayed all-in for 1 night). Other seasons scaled from Mirror House ADR ratios. Hichee listed from $379. Airbnb-exclusive: airbnb.com/rooms/1581961108990836667 and airbnb.com/h/aviatordome.')),
      $$Aviator Geodome: 30-foot / ~700 sq ft aviation-themed geodesic dome on the same private ridge. Sleeps 4 in two bedrooms (custom round bed in a genuine Boeing 747-200 engine cowling + a quieter back Queen). Private 500 sq ft deck with Hot Spring Envoy hot tub (fits 5), propane fire table, and Pit Boss pellet grill. Kitchenette with larger fridge, tabletop convection oven, dishwasher, hotplate, microwave; all-in-one washer/dryer; fiber Wi-Fi. Climate-controlled (three HVAC units); skylight covered. Pets not allowed. Book on Airbnb only.$$,
      '30-ft geodesic dome; ~700 sq ft; 2 Queen; sleeps 4; 1 bath; kitchenette; dishwasher; washer/dryer; Wi-Fi; A/C; 500 sq ft deck; Envoy hot tub; fire table; pellet grill. Airbnb exclusive. No pets.',
      E'[2026-09-03] Added Aviator Geodome from skyeagleridge.com/en/aviator-geodome-arkansas + Airbnb 1581961108990836667 ($405 Tue Sep 15 2026).'
    ),
    (
      'Under Construction', 'The Golden House', 'Mirror Cabin', '2', '1 Queen', NULL::numeric,
      'Yes', 'No', 'Yes', 'Yes',
      2026::numeric,
      'Planned year-round. Operator hopes to have ready for rent by end of 2026. Waitlist via Google Form on skyeagleridge.com/en/coming-soon-the-golden-house.',
      '2026-12-01'::date,
      NULL,
      NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', null, 'weekend', null), 'summer', jsonb_build_object('weekday', null, 'weekend', null), 'fall', jsonb_build_object('weekday', null, 'weekend', null), 'note', 'USD. The Golden House is not yet bookable. Limited-edition gold-toned ÖÖD; AI mockup only as of 2026-09-03. Waitlist on operator site. No launch rack.')),
      $$The Golden House (Coming Soon): limited-edition gold-toned ÖÖD Mirror House on the SkyEagle Ridge waitlist. Operator hopes to have it ready for rent by the end of 2026. Same private-ridge setting as the operating ÖÖD Mirror House and Aviator Geodome. Not in the operating site total until public booking opens.$$,
      'Planned gold ÖÖD mirror cabin; expected Queen / couples stay; private bath and wellness amenities TBD at opening. Waitlist only. Not yet open.',
      E'[2026-09-03] Added The Golden House Under Construction from skyeagleridge.com/en/coming-soon-the-golden-house (end of 2026). Not in property_total_sites=2.'
    )
) AS v(
  is_open, site_name, unit_type, capacity, bed, sq_ft,
  kitchenette, gas_fp, hot_tub, sauna,
  year_opened, season, planned_open, airbnb,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE g.id = 13096
  AND g.property_id = 'e5db8283-f017-404f-a2e4-641cf6cd1f7f'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = 'e5db8283-f017-404f-a2e4-641cf6cd1f7f'
      AND x.site_name = v.site_name
  );

COMMIT;
