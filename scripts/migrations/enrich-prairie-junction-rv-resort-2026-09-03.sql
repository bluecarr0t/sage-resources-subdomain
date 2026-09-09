-- ============================================================================
-- Prairie Junction RV Resort (Stettler, AB): publish and split inventory.
--
-- Sources (retrieved 2026-09-03):
--   https://www.pjrvresort.com/ (+ /cabins /glamping /rv-glamping)
--   Google Maps place pin:
--     https://www.google.com/maps/place/Prairie+Junction+RV+Resort+and+Campground/@52.3183761,-112.7055372,17z
--     lat 52.3183761 / lon -112.7055372; plus code 879V+9Q; 4402 50 St
--   RVshare policy dump (site numbering / hookups / cabin aliases):
--     https://campgrounds.rvshare.com/campgrounds-rv-parks/alberta/stettler/prairie-junction-rv-resort
--   Campspot park page (no live IBE inventory):
--     https://www.campspot.com/park/prairie-junction-rv-resort-stettler-ab
--   Daily Hive / operator: Prairie Haven Winter 2026 (9 themed units)
--
-- Operating inventory:
--   Premium full-hookup RV  sites 1–10 + 15–26  (qty 22)
--   Standard full-hookup RV sites 27–53         (qty 27)
--   Group / tent            sites 11–14         (qty 4)  — tenting here
--   Cabins (qty 1 each): The Lumberjack, The Bunkhouse, Ocean Breeze,
--     Bohemian Escape
--   property_total_sites = 57 (53 pads + 4 cabins)
--   Park-owned furnished “RV Glamping” sits on RV pads (not extra sites).
--
-- Prairie Haven (Winter 2026, Under Construction): 9 themed glass-dome /
-- covered-wagon stays (Aloha, Turkish Delight, Paris, Little Italy,
-- Disco Inferno, Wrangler, Royal, Outback, Jungle Glam). Homepage also
-- says “ten”; named list on /glamping is nine.
--
-- Rates CAD, room_only:
--   RV pads: existing 2026-09-01 Tavily/TripAdvisor seasonal ADR
--     winter 75/83, spring 85/92, summer 95/105, fall 88/97
--     Google Maps Booking.com from $70 (Sep 7–8 2026). RVshare from $33.
--   Winter long-term: $900/mo + 30¢/kWh (Nov 1–Mar 31, operator homepage).
--   Cabins: dynamic; aggregators Lumberjack ~$172, Ocean Breeze ~$95,
--     cabins-from ~$91. Applied 140/155 winter, 150/172 other seasons.
--   Prairie Haven: no rack yet (waitlist).
-- rate_avg_retail_daily_rate maintained by calc_avg_rate_trigger.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'No',
  property_name = 'Prairie Junction RV Resort',
  slug = 'prairie-junction-rv-resort-stettler-ab',
  property_type = 'RV Resort',
  source = 'Sage',
  discovery_source = 'web_research_prairie_junction_operator_gmaps_2026_09',
  address = '4402 50 Street',
  city = 'Stettler',
  state = 'AB',
  zip_code = 'T0C 2L0',
  country = 'Canada',
  lat = 52.3183761,
  lon = -112.7055372,
  url = 'https://www.pjrvresort.com/',
  phone_number = '+1-403-742-8855',
  property_total_sites = 57,
  year_site_opened = 2013,
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
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Year-round Stettler RV resort (est. 2013) with 53 pads, 4 themed cabins, hydrotherapy spa (cedar sauna, jetted hot tub, cold plunge), and Prairie Haven 9-unit dome/wagon expansion (Winter 2026). Cabin/glamping midscale; RV pads standard-plus (50-amp, EV Level 2).',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Site rate includes 4 occupants; extra guests $5/day. Dogs $3/day on RV/tent (not in cabins/domes/wagons). Spa $40/hr private for nightly RV/tent; included for cabin, RV-glamping, monthly, and Prairie Haven. Firewood $15/bundle. Coin showers/laundry. Winter long-term $900/mo + 30¢/kWh (Nov 1–Mar 31). Check-in 1 PM (RVshare) / Campspot lists 2 PM; check-out 11 AM. Weekend 2-night min; long weekend 3-night; high season (Jun 15–Sep 14) 2-night min.',
  description = $$Year-round RV resort at 4402 50 Street, Stettler, Alberta (Google Maps 52.3183761, -112.7055372; plus code 879V+9Q), walking distance to downtown and the Alberta Prairie Railway boardwalk. 53 RV/tent pads (15/30/50-amp; premium sites 1–10 and 15–26; standard 27–53; group/tent 11–14), four themed cabins, park-owned furnished RV glamping, and a private hydrotherapy spa. Prairie Haven — nine Travel Alberta themed glass-dome and covered-wagon stays with private heated washroom pods — opens Winter 2026.$$,
  activities_raw = 'On-site hydrotherapy spa (sauna, hot tub, cold plunge); gear rentals (e-scooters, cruiser bikes, paddleboards, wood-fired hot tubs, backyard cinema); Alberta Prairie Railway from the resort boardwalk; Buffalo Lake; golf; walking trails; playground; weddings/events (960 sq ft event centre).',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_fishing = 'Yes',
  activities_golf = 'Yes',
  activities_boating = 'Yes',
  activities_paddling = 'Yes',
  activities_historic_sightseeing = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_stargazing = 'Yes',
  setting_field = 'Yes',
  setting_suburban = 'Yes',
  rv_parking = 'Yes',
  rv_sewer_hook_up = 'Yes',
  rv_electrical_hook_up = 'Yes',
  rv_water_hookup = 'Yes',
  rv_accommodates_slideout = 'Yes',
  rv_vehicle_length = '50',
  rv_surface_level = 'Yes',
  date_updated = '2026-09-03'
WHERE id = 13165
  AND property_id = '351aacb6-dc2e-46b3-9113-c3615b41103e';

-- Existing shell was mislabeled qty-9 Luxury Glass Dome (Prairie Haven, not yet open).
UPDATE public.all_sage_data
SET
  site_name = 'Premium Full-Hookup RV Site',
  unit_type = 'RV Site',
  quantity_of_units = 22,
  unit_capacity = '4',
  unit_bed = NULL,
  unit_private_bathroom = 'No',
  unit_shower = 'No',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'No',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'Yes',
  unit_patio = 'No',
  unit_picnic_table = 'Yes',
  unit_ada_accessibility = 'Yes',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round; winterized hydrants. Heated water hose required in winter.',
  minimum_nights = '1',
  unit_description = $$Premium full-hookup RV sites (lots 1–10 and 15–26): 15/30/50-amp, town water, sewer, Wi-Fi, fire pit, picnic table, EV Level 2. Extra privacy, shade, and prairie views. Big-rig friendly to ~50 ft; pull-through and back-in. Shared bathhouse/showers and laundry. Pets OK (leashed; $3/day).$$,
  amenities_raw = 'Full hookup 15/30/50-amp; sewer; water; Wi-Fi; fire pit; picnic table; EV Level 2; premium location. Shared: heated-floor bathhouse, coin showers, laundry, dump/fill, general store, spa ($40/hr nightly). Pet-friendly.',
  rate_winter_weekday = '75',
  rate_winter_weekend = '83',
  rate_spring_weekday = '85',
  rate_spring_weekend = '92',
  rate_summer_weekday = '95',
  rate_summer_weekend = '105',
  rate_fall_weekday = '88',
  rate_fall_weekend = '97',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 75, 'weekend', 83),
      'spring', jsonb_build_object('weekday', 85, 'weekend', 92),
      'summer', jsonb_build_object('weekday', 95, 'weekend', 105),
      'fall', jsonb_build_object('weekday', 88, 'weekend', 97),
      'note', 'CAD. Premium RV pads. Seasonal from 2026-09-01 Tavily/TripAdvisor park ADR. Google Maps Booking.com from $70 Sep 7–8 2026. Winter long-term $900/mo + 30¢/kWh (operator homepage). RVshare listed from $33.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-03] Published + split mislabeled Luxury Glass Dome qty 9 into operating RV/cabin inventory from pjrvresort.com + Google Maps @52.3183761,-112.7055372. This row is now Premium Full-Hookup RV (sites 1–10, 15–26). Prairie Haven is a separate Under Construction row.'
WHERE id = 13165
  AND property_id = '351aacb6-dc2e-46b3-9113-c3615b41103e';

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
  operating_season_months, minimum_nights, planned_open_date,
  unit_description, amenities_raw, activities_raw,
  url, property_id, phone_number,
  property_clubhouse, property_food_on_site, property_restaurant, property_laundry,
  property_pool, property_hot_tub, property_sauna, property_family_friendly,
  property_remote_work_friendly, property_has_rentals, property_playground,
  property_general_store, property_extended_stay, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_biking, activities_fishing, activities_golf,
  activities_boating, activities_paddling, activities_historic_sightseeing,
  activities_scenic_drives, activities_stargazing,
  setting_field, setting_suburban,
  rv_parking, rv_sewer_hook_up, rv_electrical_hook_up, rv_water_hookup,
  rv_accommodates_slideout, rv_vehicle_length, rv_surface_level,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', v.is_open, 'No', 'Sage', 'Prairie Junction RV Resort', v.site_name,
  'web_research_prairie_junction_operator_gmaps_2026_09', '2026-09-03', '2026-09-03',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  57, v.qty, v.unit_type, v.capacity, v.bed,
  v.private_bath, v.shower, v.kitchenette, v.full_kitchen,
  v.ac, 'Yes', v.pets, v.electric, v.water,
  'Yes', v.patio, 'No', 'No', v.hot_tub, v.sauna,
  v.mini_fridge, 'Yes', 'No', v.ada,
  v.year_opened, NULL::smallint, NULL::smallint,
  v.season, v.min_nights, v.planned_open,
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_biking, g.activities_fishing, g.activities_golf,
  g.activities_boating, g.activities_paddling, g.activities_historic_sightseeing,
  g.activities_scenic_drives, g.activities_stargazing,
  g.setting_field, g.setting_suburban,
  v.rv_park, v.sewer, v.rv_elec, v.rv_h2o,
  v.slideout, v.rv_len, v.level,
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
      'Yes', 'Standard Full-Hookup RV Site', 27::numeric, 'RV Site', '4', NULL,
      'No', 'No', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes',
      'No', 'No', 'No', 'No', 'No',
      2013::numeric, 'Year-round; winterized hydrants. Heated water hose required in winter.', '1', NULL::date,
      'Yes', 'Yes', 'Yes', 'Yes', 'Yes', '50', 'Yes',
      '75', '83', '85', '92', '95', '105', '88', '97',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 75, 'weekend', 83), 'spring', jsonb_build_object('weekday', 85, 'weekend', 92), 'summer', jsonb_build_object('weekday', 95, 'weekend', 105), 'fall', jsonb_build_object('weekday', 88, 'weekend', 97), 'note', 'CAD. Standard RV pads 27–53. Same TA park ADR as premium. Winter long-term $900/mo + 30¢/kWh.')),
      $$Standard full-hookup RV sites (lots 27–53): 15/30/50-amp, town water, sewer, Wi-Fi, fire pit, picnic table, EV Level 2. More communal layout. Big-rig friendly; pull-through and back-in. Shared bathhouse and laundry. Pets OK.$$,
      'Full hookup 15/30/50-amp; sewer; water; Wi-Fi; fire pit; picnic table; EV Level 2; standard location. Shared bathhouse, laundry, spa ($40/hr nightly). Pet-friendly.',
      E'[2026-09-03] Added from RVshare site map + pjrvresort.com: Standard RV sites 27–53.'
    ),
    (
      'Yes', 'Group / Tent Sites 11–14', 4::numeric, 'Tent Site', '4', NULL,
      'No', 'No', 'No', 'No', 'No', 'Yes', 'Yes', 'No',
      'No', 'No', 'No', 'No', 'No',
      2013::numeric, 'Year-round. Tenting only in this grassy group area unless management approves otherwise. No long-term in group area.', '1', NULL::date,
      'Yes', 'No', 'Yes', 'No', 'Yes', '50', 'No',
      '75', '83', '85', '92', '95', '105', '88', '97',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 75, 'weekend', 83), 'spring', jsonb_build_object('weekday', 85, 'weekend', 92), 'summer', jsonb_build_object('weekday', 95, 'weekend', 105), 'fall', jsonb_build_object('weekday', 88, 'weekend', 97), 'note', 'CAD. Group/tent lots 11–14. 11–12 full hookup; 13–14 electric only (water/sewer nearby). TA park ADR proxy. RVshare from $33.')),
      $$Group / tent sites 11–14 in the grassy event-centre area (up to 10 units when booked as a group). Sites 11–12 full hookup; 13–14 15/30/50-amp only. Shared fire pit and picnic tables. Tenting is designated here. Event centre (960 sq ft) rentable with the group area.$$,
      'Group/tent pads; 11–12 full hookup; 13–14 electric only; shared fire pit; event centre. Tenting permitted. Pets OK.',
      E'[2026-09-03] Added from RVshare policies: group/tent sites 11–14.'
    ),
    (
      'Yes', 'The Lumberjack', 1::numeric, 'Cabin', '4', '1 Queen + bunk/futon',
      'No', 'No', 'Yes', 'No', 'Yes', 'No', 'Yes', 'Yes',
      'Yes', 'No', 'No', 'Yes', 'No',
      2013::numeric, 'Year-round. Heated. Shared cabin-only bath/shower (scan card). No pets, no indoor food prep, no smoking.', '1', NULL::date,
      'No', 'No', 'No', 'No', 'No', NULL, NULL,
      '140', '155', '150', '172', '150', '172', '150', '172',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 140, 'weekend', 155), 'spring', jsonb_build_object('weekday', 150, 'weekend', 172), 'summer', jsonb_build_object('weekday', 150, 'weekend', 172), 'fall', jsonb_build_object('weekday', 150, 'weekend', 172), 'note', 'CAD. The Lumberjack cabin. Dynamic Campspot rates; Smartours ~$172; Google cabin comps $91–$95. One complimentary private spa hour per night.')),
      $$The Lumberjack: rustic logging-themed cabin with queen + bunk/futon, sleeps 4. AC, electric fireplace, mini fridge, Keurig, TV, private patio/fire pit. Shared cabin bathroom (heated floors) plus main bathhouse. Hillbilly wood-fired hot tubs shared among cabins. Spa hour included. No pets.$$,
      'Themed cabin; Queen + bunk/futon; sleeps 4; AC; electric fireplace; mini fridge; Keurig; patio; fire pit; picnic table. Shared cabin bath. Spa hour included. No pets. No indoor kitchen.',
      E'[2026-09-03] Added from pjrvresort.com/cabins: The Lumberjack.'
    ),
    (
      'Yes', 'The Bunkhouse', 1::numeric, 'Cabin', '4', '1 Queen + 2 Twin',
      'No', 'No', 'Yes', 'No', 'Yes', 'No', 'Yes', 'Yes',
      'Yes', 'No', 'No', 'Yes', 'No',
      2013::numeric, 'Year-round. Heated. Shared cabin-only bath/shower. No pets. RVshare alias: The Ranchhouse.', '1', NULL::date,
      'No', 'No', 'No', 'No', 'No', NULL, NULL,
      '140', '155', '150', '172', '150', '172', '150', '172',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 140, 'weekend', 155), 'spring', jsonb_build_object('weekday', 150, 'weekend', 172), 'summer', jsonb_build_object('weekday', 150, 'weekend', 172), 'fall', jsonb_build_object('weekday', 150, 'weekend', 172), 'note', 'CAD. The Bunkhouse (cowboy theme). Same cabin aggregator band as Lumberjack. Spa hour included.')),
      $$The Bunkhouse: cowboy-themed cabin with queen + two twins, sleeps 4. AC, electric fireplace, mini fridge, Keurig, private patio/fire pit. Shared cabin bathroom. Spa hour included. No pets. Older RVshare copy called this The Ranchhouse.$$,
      'Themed cabin; Queen + 2 Twin; sleeps 4; AC; electric fireplace; mini fridge; patio; fire pit. Shared cabin bath. Spa hour included. No pets.',
      E'[2026-09-03] Added from pjrvresort.com/cabins: The Bunkhouse.'
    ),
    (
      'Yes', 'Ocean Breeze', 1::numeric, 'Cabin', '4', '1 Queen + 2 Twin',
      'No', 'No', 'Yes', 'No', 'Yes', 'No', 'Yes', 'Yes',
      'Yes', 'No', 'No', 'Yes', 'No',
      2013::numeric, 'Year-round. Heated. Shared cabin-only bath/shower. No pets. RVshare alias: The SeaFarer.', '1', NULL::date,
      'No', 'No', 'No', 'No', 'No', NULL, NULL,
      '140', '155', '150', '172', '150', '172', '150', '172',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 140, 'weekend', 155), 'spring', jsonb_build_object('weekday', 150, 'weekend', 172), 'summer', jsonb_build_object('weekday', 150, 'weekend', 172), 'fall', jsonb_build_object('weekday', 150, 'weekend', 172), 'note', 'CAD. Ocean Breeze cabin. Google Maps nearby listing ~$95. Spa hour included.')),
      $$Ocean Breeze: coastal-themed cabin with queen + two twins, sleeps 4. AC, electric fireplace, mini fridge, Keurig, private patio/fire pit. Shared cabin bathroom. Spa hour included. No pets. Older RVshare copy called this The SeaFarer.$$,
      'Themed cabin; Queen + 2 Twin; sleeps 4; AC; electric fireplace; mini fridge; patio; fire pit. Shared cabin bath. Spa hour included. No pets.',
      E'[2026-09-03] Added from pjrvresort.com/cabins: Ocean Breeze.'
    ),
    (
      'Yes', 'Bohemian Escape', 1::numeric, 'Cabin', '2', '1 Queen',
      'No', 'No', 'Yes', 'No', 'Yes', 'No', 'Yes', 'Yes',
      'Yes', 'No', 'No', 'Yes', 'No',
      2013::numeric, 'Year-round. Heated. Couples cabin. Shared cabin-only bath/shower. No pets.', '1', NULL::date,
      'No', 'No', 'No', 'No', 'No', NULL, NULL,
      '140', '155', '150', '172', '150', '172', '150', '172',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 140, 'weekend', 155), 'spring', jsonb_build_object('weekday', 150, 'weekend', 172), 'summer', jsonb_build_object('weekday', 150, 'weekend', 172), 'fall', jsonb_build_object('weekday', 150, 'weekend', 172), 'note', 'CAD. Bohemian Escape (sleeps 2). Same cabin aggregator band. Spa hour included.')),
      $$Bohemian Escape: couples cabin with 1 Queen, sleeps 2. Boho décor, AC, electric fireplace, mini fridge, Keurig, private patio/fire pit. Shared cabin bathroom. Spa hour included. No pets.$$,
      'Themed cabin; 1 Queen; sleeps 2; AC; electric fireplace; mini fridge; patio; fire pit. Shared cabin bath. Spa hour included. No pets.',
      E'[2026-09-03] Added from pjrvresort.com/cabins: Bohemian Escape.'
    ),
    (
      'Under Construction', 'Prairie Haven', 9::numeric, 'Dome', '2', NULL,
      'Yes', 'Yes', 'No', 'No', 'Yes', 'No', 'Yes', 'Yes',
      'Yes', 'No', 'No', 'No', 'No',
      2026::numeric, 'Planned year-round (heated/insulated). Opens Winter 2026. Waitlist on pjrvresort.com/glamping.', '1', '2026-12-01'::date,
      'No', 'No', 'No', 'No', 'No', NULL, NULL,
      NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', null, 'weekend', null), 'summer', jsonb_build_object('weekday', null, 'weekend', null), 'fall', jsonb_build_object('weekday', null, 'weekend', null), 'note', 'CAD. Prairie Haven not yet bookable. No launch rack. Site prep underway as of Aug 2026. Mix of glass domes and covered wagons; private heated washroom pods; spa included.')),
      $$Prairie Haven (Winter 2026): nine Travel Alberta themed glamping stays — The Aloha, The Turkish Delight, The Paris, The Little Italy, The Disco Inferno, The Wrangler (luxe covered wagon), The Royal, The Outback, and The Jungle Glam. Mix of luxury glass domes and covered wagons, each with a private heated washroom pod. Operator homepage also says “ten”; the named /glamping list is nine. Site preparation underway August 2026. Not in the 57-site operating total until public booking opens.$$,
      'Planned themed dome/wagon; private heated washroom pod; real beds; heat; fire pit; spa included. No pets. Not yet open.',
      E'[2026-09-03] Added Prairie Haven Under Construction from pjrvresort.com/glamping + Daily Hive (Winter 2026). Qty 9 named units; not added to property_total_sites=57.'
    )
) AS v(
  is_open, site_name, qty, unit_type, capacity, bed,
  private_bath, shower, kitchenette, full_kitchen, ac, pets, electric, water,
  patio, hot_tub, sauna, mini_fridge, ada,
  year_opened, season, min_nights, planned_open,
  rv_park, sewer, rv_elec, rv_h2o, slideout, rv_len, level,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE g.id = 13165
  AND g.property_id = '351aacb6-dc2e-46b3-9113-c3615b41103e'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = '351aacb6-dc2e-46b3-9113-c3615b41103e'
      AND x.site_name = v.site_name
  );

COMMIT;
