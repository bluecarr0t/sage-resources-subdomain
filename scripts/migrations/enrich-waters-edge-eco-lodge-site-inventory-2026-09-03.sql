-- ============================================================================
-- Waters Edge Eco Lodge (Greig Lake, SK): publish and split into 23 named
-- WebRez inventory types (property 1368).
--
-- Sources (retrieved 2026-09-03):
--   https://watersedgeecolodge.ca/ (+ /the-lodge /rental-cottages /about-us /contact-us)
--   WebRez: https://secure.webrez.com/property/1368  (23 unit types)
--   Google Maps place pin:
--     https://www.google.com/maps/place/Waters+Edge+Eco+Lodge/@54.4293314,-108.7349577,17z
--     lat 54.4293314 / lon -108.7349577
--   Tourism Saskatchewan; meadowlakeNOW Tipi Village opening 2025-06-26 (10 tipis)
--   Eco Lodges Anywhere (older CAD): rooms $112–$132, cottages $220–$252
--   Existing Sage TA ADR (2026-09-01): winter 132/147, spring 150/162,
--     summer 168/186, fall 156/171 CAD
--
-- Inventory (WebRez 1368 — 23 SKUs, qty 1 each):
--   Lodge rooms 1–8 (Hotel Room; 18+; ensuite; Room 4 accessible)
--   E1-Q & E2-Dbl w/ shared bathroom (Hotel Room, sleeps 4)
--   Family Suite (Suite, sleeps 6)
--   Lakefront cottages #1–#3 (Cottage, sleeps 6, May–Sep; pets only #3)
--   Tipi peyak … mitataht (10 Cree-numbered tipis; electric; shared bath)
--   property_total_sites = 23
--
-- Existing row id 11846 (Tipi Village shell) becomes Room 1-Queen Bed.
-- Rates CAD, room_only. Lodge uses TA seasonal ADR; cottages Eco Lodges
-- $220/$252 May–Sep; tipis proxy lodge ADR in open season (no live quote —
-- WebRez search with 0 adults returned 0/23 matches).
-- rate_avg_retail_daily_rate maintained by calc_avg_rate_trigger.
-- ============================================================================

BEGIN;

-- Property-level fields on the existing shell
UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Waters Edge Eco Lodge',
  slug = 'waters-edge-eco-lodge-greig-lake-sk',
  property_type = 'Outdoor Boutique Hotel',
  source = 'Sage',
  discovery_source = 'web_research_waters_edge_eco_lodge_webrez_gmaps_2026_09',
  address = 'SE 12 63 19 W3',
  city = 'Greig Lake',
  state = 'SK',
  zip_code = 'S0M 3B0',
  country = 'Canada',
  lat = 54.4293314,
  lon = -108.7349577,
  url = 'https://watersedgeecolodge.ca/',
  phone_number = '+1-306-234-7900',
  property_total_sites = 23,
  year_site_opened = 2012,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'No',
  property_laundry = 'Yes',
  property_pool = 'No',
  property_hot_tub = 'No',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  property_waterfront = 'Yes',
  land_operator_category = 'other_public',
  glamping_service_tier = 'midscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Waterhen Lake First Nation lodge on Greig Lake (Meadow Lake Provincial Park). 8 ensuite lakefront lodge rooms (18+), Family Suite + event rooms, 3 seasonal cottages, 10 electrically equipped platform tipis (shared bath). Geothermal HVAC. ADR band lodge ~CAD $132–$186 (TA 2026-09-01); cottages Eco Lodges Anywhere $220–$252.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. No meals in the rate; shared lodge kitchen + optional home-cooked meals / breakfast at the lodge. Check-in 3 PM / check-out 11 AM (WebRez). Lodge rooms 18+. Pets only in Cottage #3 ($50 cleaning, max 2). Complimentary canoes, kayaks, paddleboards, paddle boat; winter snowshoes. Direct book WebRez property 1368. Online reservations ≥2 days in advance.',
  description = $$Waterhen Lake First Nation–operated all-season lakeside lodge on the south-west shore of Greig Lake in Meadow Lake Provincial Park (SE 12 63 19 W3; Google Maps 54.4293314, -108.7349577). Eight ensuite lakefront lodge rooms, a family suite and event rooms, three May–September cottages, and a 10-tipi village (opened June 2025) with electrically equipped platform tipis. Shared Great Room, sunroom, games area, geothermal HVAC, and complimentary watercraft. Founded by Shelly Pikowicz (Saskatchewan Parks RFP 2012); Nation-owned since May 2022.$$,
  activities_raw = 'Complimentary canoe, kayak, paddleboard, paddle boat; hiking (onsite 1–3 km + Fairy Trail; Meadow Lake Provincial Park Boreal Trail); fishing (pike, walleye, perch, whitefish); birding / wildlife; stargazing and northern lights; skating on Greig Lake; snowshoes / cross-country skiing; snowmobiling in the park; Indigenous cultural programs (plants walk, night-sky storytelling, tipi teachings).',
  activities_hiking = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_fishing = 'Yes',
  activities_canoeing_kayaking = 'Yes',
  activities_paddling = 'Yes',
  activities_boating = 'Yes',
  activities_swimming = 'Yes',
  activities_snow_sports = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_biking = 'Yes',
  setting_forest = 'Yes',
  setting_lake = 'Yes',
  date_updated = '2026-09-03'
WHERE id = 11846
  AND property_id = '255c4582-7105-4404-90fa-7d39774931ee';

-- Existing shell → first WebRez lodge room
UPDATE public.all_sage_data
SET
  site_name = 'Room 1-Queen Bed',
  unit_type = 'Hotel Room',
  quantity_of_units = 1,
  unit_capacity = '2',
  unit_bed = '1 Queen',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'No',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'No',
  unit_patio = 'Yes',
  unit_ada_accessibility = 'No',
  unit_mini_fridge = 'No',
  unit_charcoal_grill = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. Lodge rooms 18+.',
  minimum_nights = '1',
  unit_description = $$Room 1-Queen Bed: lakefront lodge guest room with 1 Queen, sleeps 2, private deck overlooking Greig Lake, spa-like ensuite, writing desk and armoire. 18+. Shared lodge kitchen, Great Room, sunroom, and games area. WebRez invtype 17623.$$,
  amenities_raw = 'Lodge ensuite; 1 Queen; sleeps 2; private deck; lake view; WiFi; geothermal HVAC; linens; shared full kitchen / BBQ / Great Room. 18+. No pets. Non-smoking.',
  rate_winter_weekday = '132',
  rate_winter_weekend = '147',
  rate_spring_weekday = '150',
  rate_spring_weekend = '162',
  rate_summer_weekday = '168',
  rate_summer_weekend = '186',
  rate_fall_weekday = '156',
  rate_fall_weekend = '171',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 132, 'weekend', 147),
      'spring', jsonb_build_object('weekday', 150, 'weekend', 162),
      'summer', jsonb_build_object('weekday', 168, 'weekend', 186),
      'fall', jsonb_build_object('weekday', 156, 'weekend', 171),
      'note', 'CAD. Lodge Room 1. Seasonal from existing 2026-09-01 Tavily/TripAdvisor ADR. Eco Lodges Anywhere listed rooms $112–$132 (older). WebRez 1368 invtype 17623; live quote not captured (search required adults).'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-03] Published + split generic Tipi Village into 23 WebRez SKUs from secure.webrez.com/property/1368 + watersedgeecolodge.ca + Google Maps @54.4293314,-108.7349577. This row was the shell; now Room 1-Queen Bed.'
WHERE id = 11846
  AND property_id = '255c4582-7105-4404-90fa-7d39774931ee';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed, unit_sq_ft,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_gas_fireplace, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, unit_picnic_table, unit_charcoal_grill, unit_ada_accessibility,
  year_site_opened, season_open_month, season_close_month,
  operating_season_months, minimum_nights,
  unit_description, amenities_raw, activities_raw,
  url, property_id, phone_number,
  property_clubhouse, property_food_on_site, property_restaurant, property_laundry,
  property_pool, property_hot_tub, property_sauna, property_family_friendly,
  property_remote_work_friendly, property_has_rentals, property_waterfront, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_wildlife_watching, activities_fishing,
  activities_canoeing_kayaking, activities_paddling, activities_scenic_drives, activities_boating,
  activities_swimming, activities_snow_sports, activities_stargazing, activities_biking,
  setting_forest, setting_lake,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', 'Waters Edge Eco Lodge', v.site_name,
  'web_research_waters_edge_eco_lodge_webrez_gmaps_2026_09', '2026-09-03', '2026-09-03',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  23, 1, v.unit_type, v.capacity, v.bed, NULL::numeric,
  v.private_bath, v.shower, v.kitchenette, v.full_kitchen,
  v.ac, v.wifi, v.pets, 'Yes', v.water,
  v.campfires, v.patio, 'No', 'No', 'No', 'No',
  v.mini_fridge, 'No', v.grill, v.ada,
  v.year_opened, v.open_mo, v.close_mo,
  v.season, '1',
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_waterfront, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_wildlife_watching, g.activities_fishing,
  g.activities_canoeing_kayaking, g.activities_paddling, g.activities_scenic_drives, g.activities_boating,
  g.activities_swimming, g.activities_snow_sports, g.activities_stargazing, g.activities_biking,
  g.setting_forest, g.setting_lake,
  v.win_wd, v.win_we,
  v.spr_wd, v.spr_we,
  v.sum_wd, v.sum_we,
  v.fal_wd, v.fal_we,
  v.rates_json, g.rate_basis, g.rate_basis_notes,
  g.description, v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    -- Remaining lodge rooms (Room 1 is id 11846)
    (
      'Room 2-Queen Bed', 'Hotel Room', '2', '1 Queen',
      'Yes', 'Yes', 'No', 'No', 'Yes', 'Yes', 'No', 'Yes', 'No', 'Yes', 'No', 'No', 'No',
      2012::numeric, NULL::smallint, NULL::smallint, 'Year-round. Lodge rooms 18+.',
      '132', '147', '150', '162', '168', '186', '156', '171',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 132, 'weekend', 147), 'spring', jsonb_build_object('weekday', 150, 'weekend', 162), 'summer', jsonb_build_object('weekday', 168, 'weekend', 186), 'fall', jsonb_build_object('weekday', 156, 'weekend', 171), 'note', 'CAD. Lodge Room 2. TA ADR 2026-09-01. WebRez invtype 17624.')),
      $$Room 2-Queen Bed: lakefront lodge guest room with 1 Queen, sleeps 2, private deck overlooking Greig Lake, spa-like ensuite. 18+. WebRez invtype 17624.$$,
      'Lodge ensuite; 1 Queen; sleeps 2; private deck; lake view; WiFi; geothermal HVAC. 18+. No pets.',
      E'[2026-09-03] Added from WebRez 1368: Room 2-Queen Bed.'
    ),
    (
      'Room 3-Queen Bed', 'Hotel Room', '2', '1 Queen',
      'Yes', 'Yes', 'No', 'No', 'Yes', 'Yes', 'No', 'Yes', 'No', 'Yes', 'No', 'No', 'No',
      2012, NULL, NULL, 'Year-round. Lodge rooms 18+.',
      '132', '147', '150', '162', '168', '186', '156', '171',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 132, 'weekend', 147), 'spring', jsonb_build_object('weekday', 150, 'weekend', 162), 'summer', jsonb_build_object('weekday', 168, 'weekend', 186), 'fall', jsonb_build_object('weekday', 156, 'weekend', 171), 'note', 'CAD. Lodge Room 3. TA ADR 2026-09-01. WebRez invtype 17625.')),
      $$Room 3-Queen Bed: lakefront lodge guest room with 1 Queen, sleeps 2, private deck overlooking Greig Lake, spa-like ensuite. 18+. WebRez invtype 17625.$$,
      'Lodge ensuite; 1 Queen; sleeps 2; private deck; lake view; WiFi; geothermal HVAC. 18+. No pets.',
      E'[2026-09-03] Added from WebRez 1368: Room 3-Queen Bed.'
    ),
    (
      'Room 4-Queen and Twin Bed', 'Hotel Room', '2', '2 Twin (WebRez also labels Queen and Twin)',
      'Yes', 'Yes', 'No', 'No', 'Yes', 'Yes', 'No', 'Yes', 'No', 'Yes', 'No', 'No', 'Yes',
      2012, NULL, NULL, 'Year-round. Lodge rooms 18+. Barrier-free / wheelchair accessible.',
      '132', '147', '150', '162', '168', '186', '156', '171',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 132, 'weekend', 147), 'spring', jsonb_build_object('weekday', 150, 'weekend', 162), 'summer', jsonb_build_object('weekday', 168, 'weekend', 186), 'fall', jsonb_build_object('weekday', 156, 'weekend', 171), 'note', 'CAD. Accessible Room 4. TA ADR 2026-09-01. WebRez invtype 17626.')),
      $$Room 4-Queen and Twin Bed: barrier-free (wheelchair accessible) main-level lakefront lodge room. WebRez copy lists 2 Twin beds, walk-in shower, private balcony, lake view. Sleeps 2. 18+. Operator LinkedIn: accessible Room 4. WebRez invtype 17626.$$,
      'Accessible lodge ensuite; walk-in shower; 2 Twin (name also Queen and Twin); sleeps 2; private balcony; lake view; WiFi. 18+. No pets. Main level.',
      E'[2026-09-03] Added from WebRez 1368: Room 4 accessible lodge room.'
    ),
    (
      'Room 5-Queen Bed', 'Hotel Room', '2', '1 Queen',
      'Yes', 'Yes', 'No', 'No', 'Yes', 'Yes', 'No', 'Yes', 'No', 'Yes', 'No', 'No', 'No',
      2012, NULL, NULL, 'Year-round. Lodge rooms 18+. Stairs to 2nd storey.',
      '132', '147', '150', '162', '168', '186', '156', '171',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 132, 'weekend', 147), 'spring', jsonb_build_object('weekday', 150, 'weekend', 162), 'summer', jsonb_build_object('weekday', 168, 'weekend', 186), 'fall', jsonb_build_object('weekday', 156, 'weekend', 171), 'note', 'CAD. Lodge Room 5 (2nd storey). TA ADR 2026-09-01. WebRez invtype 17627.')),
      $$Room 5-Queen Bed: 2nd-storey lakefront lodge room with 1 Queen, sleeps 2, private deck, spa-like ensuite. Stairs required. 18+. WebRez invtype 17627.$$,
      'Lodge ensuite; 1 Queen; sleeps 2; private deck; lake view; WiFi. 2nd storey / stairs. 18+. No pets.',
      E'[2026-09-03] Added from WebRez 1368: Room 5-Queen Bed.'
    ),
    (
      'Room 6-Queen Bed', 'Hotel Room', '2', '1 Queen',
      'Yes', 'Yes', 'No', 'No', 'Yes', 'Yes', 'No', 'Yes', 'No', 'Yes', 'No', 'No', 'No',
      2012, NULL, NULL, 'Year-round. Lodge rooms 18+. Stairs to 2nd storey.',
      '132', '147', '150', '162', '168', '186', '156', '171',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 132, 'weekend', 147), 'spring', jsonb_build_object('weekday', 150, 'weekend', 162), 'summer', jsonb_build_object('weekday', 168, 'weekend', 186), 'fall', jsonb_build_object('weekday', 156, 'weekend', 171), 'note', 'CAD. Lodge Room 6 (2nd storey). TA ADR 2026-09-01. WebRez invtype 17628.')),
      $$Room 6-Queen Bed: 2nd-storey lakefront lodge room with 1 Queen, sleeps 2, private deck, spa-like ensuite. Stairs required. 18+. WebRez invtype 17628.$$,
      'Lodge ensuite; 1 Queen; sleeps 2; private deck; lake view; WiFi. 2nd storey / stairs. 18+. No pets.',
      E'[2026-09-03] Added from WebRez 1368: Room 6-Queen Bed.'
    ),
    (
      'Room 7-Queen Bed', 'Hotel Room', '2', '1 Queen',
      'Yes', 'Yes', 'No', 'No', 'Yes', 'Yes', 'No', 'Yes', 'No', 'Yes', 'No', 'No', 'No',
      2012, NULL, NULL, 'Year-round. Lodge rooms 18+. Stairs to 2nd storey.',
      '132', '147', '150', '162', '168', '186', '156', '171',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 132, 'weekend', 147), 'spring', jsonb_build_object('weekday', 150, 'weekend', 162), 'summer', jsonb_build_object('weekday', 168, 'weekend', 186), 'fall', jsonb_build_object('weekday', 156, 'weekend', 171), 'note', 'CAD. Lodge Room 7 (2nd storey). TA ADR 2026-09-01. WebRez invtype 17629.')),
      $$Room 7-Queen Bed: 2nd-storey lakefront lodge room with 1 Queen, sleeps 2, private deck, spa-like ensuite. Stairs required. 18+. WebRez invtype 17629.$$,
      'Lodge ensuite; 1 Queen; sleeps 2; private deck; lake view; WiFi. 2nd storey / stairs. 18+. No pets.',
      E'[2026-09-03] Added from WebRez 1368: Room 7-Queen Bed.'
    ),
    (
      'Room 8-2 Twin Beds', 'Hotel Room', '2', '2 Twin',
      'Yes', 'Yes', 'No', 'No', 'Yes', 'Yes', 'No', 'Yes', 'No', 'Yes', 'No', 'No', 'No',
      2012, NULL, NULL, 'Year-round. Lodge rooms 18+. Stairs to 2nd storey.',
      '132', '147', '150', '162', '168', '186', '156', '171',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 132, 'weekend', 147), 'spring', jsonb_build_object('weekday', 150, 'weekend', 162), 'summer', jsonb_build_object('weekday', 168, 'weekend', 186), 'fall', jsonb_build_object('weekday', 156, 'weekend', 171), 'note', 'CAD. Lodge Room 8 (2 twins, 2nd storey). TA ADR 2026-09-01. WebRez invtype 17630.')),
      $$Room 8-2 Twin Beds: 2nd-storey lakefront lodge room with 2 Twin beds, sleeps 2, private balcony, ensuite walk-in shower. Stairs required. 18+. WebRez invtype 17630.$$,
      'Lodge ensuite walk-in shower; 2 Twin; sleeps 2; private balcony; lake view; WiFi. 2nd storey / stairs. 18+. No pets.',
      E'[2026-09-03] Added from WebRez 1368: Room 8-2 Twin Beds.'
    ),
    (
      'E1-Q & E2-Dbl w/ shared bathroom', 'Hotel Room', '4', '1 Queen + 1 Double (shared bath)',
      'No', 'Yes', 'No', 'No', 'Yes', 'Yes', 'No', 'Yes', 'No', 'No', 'No', 'No', 'No',
      2012, NULL, NULL, 'Year-round. Stairs. Two rooms sharing a bathroom (event annex).',
      '132', '147', '150', '162', '168', '186', '156', '171',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 132, 'weekend', 147), 'spring', jsonb_build_object('weekday', 150, 'weekend', 162), 'summer', jsonb_build_object('weekday', 168, 'weekend', 186), 'fall', jsonb_build_object('weekday', 156, 'weekend', 171), 'note', 'CAD. E1 Queen + E2 Double, shared bath, sleeps 4. Proxied from lodge TA ADR (no live WebRez quote). invtype 25754.')),
      $$E1-Q & E2-Dbl w/ shared bathroom: two-room event-annex SKU (Queen + Double) sharing a bathroom, sleeps 4. Stairs. WebRez invtype 25754.$$,
      'Two rooms; Queen + Double; shared bath; sleeps 4; stairs. WiFi. No pets.',
      E'[2026-09-03] Added from WebRez 1368: E1-Q & E2-Dbl w/ shared bathroom.'
    ),
    (
      'Family Suite', 'Suite', '6', '3 beds (WebRez Family Suite)',
      'Yes', 'Yes', 'No', 'No', 'Yes', 'Yes', 'No', 'Yes', 'No', 'No', 'No', 'No', 'No',
      2012, NULL, NULL, 'Year-round. Stairs. Sleeps up to 6.',
      NULL, NULL, '220', '252', '220', '252', '220', '252',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 220, 'weekend', 252), 'summer', jsonb_build_object('weekday', 220, 'weekend', 252), 'fall', jsonb_build_object('weekday', 220, 'weekend', 252), 'note', 'CAD. Family Suite sleeps 6. Proxied from Eco Lodges Anywhere cottage band $220–$252 (no live WebRez quote). invtype 50047.')),
      $$Family Suite: lodge family SKU sleeping up to 6 (WebRez max 4 adults / 6 including children). Stairs. WebRez invtype 50047.$$,
      'Family suite; sleeps 6; stairs; WiFi. No pets.',
      E'[2026-09-03] Added from WebRez 1368: Family Suite.'
    ),
    (
      'Lakefront Rental Cottage #1', 'Cottage', '6', '1 Queen + bunks + pull-out',
      'Yes', 'Yes', 'No', 'Yes', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'No',
      2012, 5::smallint, 9::smallint, 'May–September. Limited WiFi. No pets (see Cottage #3).',
      NULL, NULL, '220', '252', '220', '252', '220', '252',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 220, 'weekend', 252), 'summer', jsonb_build_object('weekday', 220, 'weekend', 252), 'fall', jsonb_build_object('weekday', 220, 'weekend', 252), 'note', 'CAD. Cottage #1 May–Sep. Eco Lodges Anywhere cottages $220–$252. WebRez name typo “Lakefont”; invtype 21912.')),
      $$Lakefront Rental Cottage #1: queen bedroom, bunk bedroom, and pull-out couch; sleeps 6. Full kitchen, rain-head shower, screened deck, BBQ, fire pit. May–September. Pets not permitted. WebRez invtype 21912.$$,
      'Cottage; Queen + bunks + pull-out; sleeps 6; full kitchen; rain-head shower; screened deck; BBQ; fire pit; complimentary watercraft. No pets. Limited WiFi.',
      E'[2026-09-03] Added from WebRez 1368 + watersedgeecolodge.ca/rental-cottages: Cottage #1.'
    ),
    (
      'Lakefront Rental Cottage #2', 'Cottage', '6', '2 Queen + pull-out',
      'Yes', 'Yes', 'No', 'Yes', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'No',
      2012, 5, 9, 'May–September. Limited WiFi. No pets (see Cottage #3).',
      NULL, NULL, '220', '252', '220', '252', '220', '252',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 220, 'weekend', 252), 'summer', jsonb_build_object('weekday', 220, 'weekend', 252), 'fall', jsonb_build_object('weekday', 220, 'weekend', 252), 'note', 'CAD. Cottage #2 May–Sep. Eco Lodges Anywhere $220–$252. WebRez invtype 27527.')),
      $$Lakefront Rental Cottage #2: two queen bedrooms and a pull-out couch; sleeps 6. Full kitchen, rain-head shower, screened deck, BBQ, fire pit. May–September. Pets not permitted. WebRez invtype 27527.$$,
      'Cottage; 2 Queen + pull-out; sleeps 6; full kitchen; rain-head shower; screened deck; BBQ; fire pit; complimentary watercraft. No pets. Limited WiFi.',
      E'[2026-09-03] Added from WebRez 1368 + watersedgeecolodge.ca/rental-cottages: Cottage #2.'
    ),
    (
      'Lakefront Rental Cottage #3', 'Cottage', '6', '1 Queen + bunks + pull-out',
      'Yes', 'Yes', 'No', 'Yes', 'No', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'No',
      2012, 5, 9, 'May–September. Limited WiFi. Only pet-friendly cottage ($50 cleaning, max 2 pets).',
      NULL, NULL, '220', '252', '220', '252', '220', '252',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 220, 'weekend', 252), 'summer', jsonb_build_object('weekday', 220, 'weekend', 252), 'fall', jsonb_build_object('weekday', 220, 'weekend', 252), 'note', 'CAD. Cottage #3 May–Sep, pets allowed. Eco Lodges Anywhere $220–$252. WebRez invtype 27528.')),
      $$Lakefront Rental Cottage #3: queen bedroom, bunk bedroom, and pull-out couch; sleeps 6. Only pet-friendly unit (max 2 pets, $50 cleaning). Full kitchen, rain-head shower, screened deck, BBQ, fire pit. May–September. WebRez invtype 27528.$$,
      'Cottage; Queen + bunks + pull-out; sleeps 6; full kitchen; rain-head shower; screened deck; BBQ; fire pit; pets OK (max 2, $50). Limited WiFi.',
      E'[2026-09-03] Added from WebRez 1368 + watersedgeecolodge.ca/rental-cottages: Cottage #3 (pets).'
    ),
    (
      'Tipi peyak', 'Tipi', '4', '1 Queen',
      'No', 'No', 'Yes', 'No', 'No', 'No', 'No', 'Yes', 'No', 'Yes', 'Yes', 'No', 'No',
      2025, 5, 10, 'Seasonal spring–fall (Tipi Village opened June 2025). Shared bathhouse. Cree peyak = one.',
      NULL, NULL, '150', '162', '168', '186', '156', '171',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 150, 'weekend', 162), 'summer', jsonb_build_object('weekday', 168, 'weekend', 186), 'fall', jsonb_build_object('weekday', 156, 'weekend', 171), 'note', 'CAD. Tipi peyak (Queen, sleeps 4). No live WebRez quote; proxied from lodge TA ADR in open season. invtype 60429.')),
      $$Tipi peyak: electrically equipped platform tipi (Cree “one”) with 1 Queen, sleeps up to 4. Coffee maker, fan, heater. Shared bathrooms/showers a short walk. Trailside / lake view. Opened 2025. WebRez invtype 60429.$$,
      'Platform tipi; 1 Queen; sleeps 4; electricity; heat; fan; coffee maker; shared bathhouse. No ensuite. No pets.',
      E'[2026-09-03] Added from WebRez 1368: Tipi peyak (1 of 10).'
    ),
    (
      'Tipi niso', 'Tipi', '2', '1 King',
      'No', 'No', 'Yes', 'No', 'No', 'No', 'No', 'Yes', 'No', 'Yes', 'Yes', 'No', 'No',
      2025, 5, 10, 'Seasonal spring–fall. Shared bathhouse. Cree niso = two.',
      NULL, NULL, '150', '162', '168', '186', '156', '171',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 150, 'weekend', 162), 'summer', jsonb_build_object('weekday', 168, 'weekend', 186), 'fall', jsonb_build_object('weekday', 156, 'weekend', 171), 'note', 'CAD. Tipi niso (King, sleeps 2). Lodge TA ADR proxy. invtype 60430.')),
      $$Tipi niso: electrically equipped platform tipi (Cree “two”) with 1 King, sleeps 2. Shared bathhouse. Trailside / lake view. WebRez invtype 60430.$$,
      'Platform tipi; 1 King; sleeps 2; electricity; heat; fan; shared bathhouse. No ensuite. No pets.',
      E'[2026-09-03] Added from WebRez 1368: Tipi niso.'
    ),
    (
      'Tipi Nisto', 'Tipi', '2', '1 Queen',
      'No', 'No', 'Yes', 'No', 'No', 'No', 'No', 'Yes', 'No', 'Yes', 'Yes', 'No', 'No',
      2025, 5, 10, 'Seasonal spring–fall. Shared bathhouse. Cree nisto = three.',
      NULL, NULL, '150', '162', '168', '186', '156', '171',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 150, 'weekend', 162), 'summer', jsonb_build_object('weekday', 168, 'weekend', 186), 'fall', jsonb_build_object('weekday', 156, 'weekend', 171), 'note', 'CAD. Tipi Nisto (Queen, sleeps 2). Lodge TA ADR proxy. invtype 60431.')),
      $$Tipi Nisto: electrically equipped platform tipi (Cree “three”) with 1 Queen, sleeps 2. Shared bathhouse. Trailside / lake view. WebRez invtype 60431.$$,
      'Platform tipi; 1 Queen; sleeps 2; electricity; heat; fan; shared bathhouse. No ensuite. No pets.',
      E'[2026-09-03] Added from WebRez 1368: Tipi Nisto.'
    ),
    (
      'Tipi Newo', 'Tipi', '2', '1 Queen',
      'No', 'No', 'Yes', 'No', 'No', 'No', 'No', 'Yes', 'No', 'Yes', 'Yes', 'No', 'No',
      2025, 5, 10, 'Seasonal spring–fall. Shared bathhouse. Cree newo = four.',
      NULL, NULL, '150', '162', '168', '186', '156', '171',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 150, 'weekend', 162), 'summer', jsonb_build_object('weekday', 168, 'weekend', 186), 'fall', jsonb_build_object('weekday', 156, 'weekend', 171), 'note', 'CAD. Tipi Newo (Queen, sleeps 2). Lodge TA ADR proxy. invtype 60432.')),
      $$Tipi Newo: electrically equipped platform tipi (Cree “four”) with 1 Queen, sleeps 2. Shared bathhouse. Trailside / lake view. WebRez invtype 60432.$$,
      'Platform tipi; 1 Queen; sleeps 2; electricity; heat; fan; shared bathhouse. No ensuite. No pets.',
      E'[2026-09-03] Added from WebRez 1368: Tipi Newo.'
    ),
    (
      'Tipi Niyanan', 'Tipi', '2', '1 King',
      'No', 'No', 'Yes', 'No', 'No', 'No', 'No', 'Yes', 'No', 'Yes', 'Yes', 'No', 'No',
      2025, 5, 10, 'Seasonal spring–fall. Shared bathhouse. Cree niyānan = five.',
      NULL, NULL, '150', '162', '168', '186', '156', '171',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 150, 'weekend', 162), 'summer', jsonb_build_object('weekday', 168, 'weekend', 186), 'fall', jsonb_build_object('weekday', 156, 'weekend', 171), 'note', 'CAD. Tipi Niyanan (King, sleeps 2). Lodge TA ADR proxy. invtype 60433.')),
      $$Tipi Niyanan: electrically equipped platform tipi (Cree “five”) with 1 King, sleeps 2. Shared bathhouse. Trailside / lake view. WebRez invtype 60433.$$,
      'Platform tipi; 1 King; sleeps 2; electricity; heat; fan; shared bathhouse. No ensuite. No pets.',
      E'[2026-09-03] Added from WebRez 1368: Tipi Niyanan.'
    ),
    (
      'Tipi Nikotwasik', 'Tipi', '4', '1 King',
      'No', 'No', 'Yes', 'No', 'No', 'No', 'No', 'Yes', 'No', 'Yes', 'Yes', 'No', 'No',
      2025, 5, 10, 'Seasonal spring–fall. Shared bathhouse. Cree nikotwāsik = six.',
      NULL, NULL, '150', '162', '168', '186', '156', '171',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 150, 'weekend', 162), 'summer', jsonb_build_object('weekday', 168, 'weekend', 186), 'fall', jsonb_build_object('weekday', 156, 'weekend', 171), 'note', 'CAD. Tipi Nikotwasik (King, sleeps 4). Lodge TA ADR proxy. invtype 60434.')),
      $$Tipi Nikotwasik: electrically equipped platform tipi (Cree “six”) with 1 King, sleeps up to 4. Shared bathhouse. Trailside / lake view. WebRez invtype 60434.$$,
      'Platform tipi; 1 King; sleeps 4; electricity; heat; fan; shared bathhouse. No ensuite. No pets.',
      E'[2026-09-03] Added from WebRez 1368: Tipi Nikotwasik.'
    ),
    (
      'Tipi Tepakohp', 'Tipi', '4', '1 King',
      'No', 'No', 'Yes', 'No', 'No', 'No', 'No', 'Yes', 'No', 'Yes', 'Yes', 'No', 'No',
      2025, 5, 10, 'Seasonal spring–fall. Shared bathhouse. Cree tēpakohp = seven.',
      NULL, NULL, '150', '162', '168', '186', '156', '171',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 150, 'weekend', 162), 'summer', jsonb_build_object('weekday', 168, 'weekend', 186), 'fall', jsonb_build_object('weekday', 156, 'weekend', 171), 'note', 'CAD. Tipi Tepakohp (King, sleeps 4). Lodge TA ADR proxy. invtype 60438.')),
      $$Tipi Tepakohp: electrically equipped platform tipi (Cree “seven”) with 1 King, sleeps up to 4. Shared bathhouse. Trailside. WebRez invtype 60438.$$,
      'Platform tipi; 1 King; sleeps 4; electricity; heat; fan; shared bathhouse. No ensuite. No pets.',
      E'[2026-09-03] Added from WebRez 1368: Tipi Tepakohp.'
    ),
    (
      'Tipi Enanew', 'Tipi', '4', '1 Queen',
      'No', 'No', 'Yes', 'No', 'No', 'No', 'No', 'Yes', 'No', 'Yes', 'Yes', 'No', 'No',
      2025, 5, 10, 'Seasonal spring–fall. Shared bathhouse. Cree ayenānew = eight.',
      NULL, NULL, '150', '162', '168', '186', '156', '171',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 150, 'weekend', 162), 'summer', jsonb_build_object('weekday', 168, 'weekend', 186), 'fall', jsonb_build_object('weekday', 156, 'weekend', 171), 'note', 'CAD. Tipi Enanew (Queen, sleeps 4). Lodge TA ADR proxy. invtype 60435.')),
      $$Tipi Enanew: electrically equipped platform tipi (Cree “eight”) with 1 Queen, sleeps up to 4. Shared bathhouse. Trailside / lake view. WebRez invtype 60435.$$,
      'Platform tipi; 1 Queen; sleeps 4; electricity; heat; fan; shared bathhouse. No ensuite. No pets.',
      E'[2026-09-03] Added from WebRez 1368: Tipi Enanew.'
    ),
    (
      'Tipi kekach-mitataht', 'Tipi', '4', '1 King',
      'No', 'No', 'Yes', 'No', 'No', 'No', 'No', 'Yes', 'No', 'Yes', 'Yes', 'No', 'No',
      2025, 5, 10, 'Seasonal spring–fall. Shared bathhouse. Cree kēkāc-mitātaht = nine.',
      NULL, NULL, '150', '162', '168', '186', '156', '171',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 150, 'weekend', 162), 'summer', jsonb_build_object('weekday', 168, 'weekend', 186), 'fall', jsonb_build_object('weekday', 156, 'weekend', 171), 'note', 'CAD. Tipi kekach-mitataht (King, sleeps 4). Lodge TA ADR proxy. invtype 60436.')),
      $$Tipi kekach-mitataht: electrically equipped platform tipi (Cree “nine”) with 1 King, sleeps up to 4. Shared bathhouse. Trailside / lake view. WebRez invtype 60436.$$,
      'Platform tipi; 1 King; sleeps 4; electricity; heat; fan; shared bathhouse. No ensuite. No pets.',
      E'[2026-09-03] Added from WebRez 1368: Tipi kekach-mitataht.'
    ),
    (
      'Tipi mitataht', 'Tipi', '4', '1 Queen',
      'No', 'No', 'Yes', 'No', 'No', 'No', 'No', 'Yes', 'No', 'Yes', 'Yes', 'No', 'No',
      2025, 5, 10, 'Seasonal spring–fall. Shared bathhouse. Cree mitātaht = ten.',
      NULL, NULL, '150', '162', '168', '186', '156', '171',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 150, 'weekend', 162), 'summer', jsonb_build_object('weekday', 168, 'weekend', 186), 'fall', jsonb_build_object('weekday', 156, 'weekend', 171), 'note', 'CAD. Tipi mitataht (Queen, sleeps 4). Lodge TA ADR proxy. invtype 60437.')),
      $$Tipi mitataht: electrically equipped platform tipi (Cree “ten”) with 1 Queen, sleeps up to 4. Shared bathhouse. Trailside / lake view. WebRez invtype 60437.$$,
      'Platform tipi; 1 Queen; sleeps 4; electricity; heat; fan; shared bathhouse. No ensuite. No pets.',
      E'[2026-09-03] Added from WebRez 1368: Tipi mitataht.'
    )
) AS v(
  site_name, unit_type, capacity, bed,
  private_bath, shower, kitchenette, full_kitchen, ac, wifi, pets, water, campfires, patio, mini_fridge, grill, ada,
  year_opened, open_mo, close_mo, season,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE g.id = 11846
  AND g.property_id = '255c4582-7105-4404-90fa-7d39774931ee'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = '255c4582-7105-4404-90fa-7d39774931ee'
      AND x.site_name = v.site_name
  );

COMMIT;
