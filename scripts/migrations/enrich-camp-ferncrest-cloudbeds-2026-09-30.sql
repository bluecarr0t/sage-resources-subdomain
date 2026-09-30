-- Ferncrest (campferncrest.com) Cloudbeds refresh, 2026-09-30.
-- Bookable grain is the Cloudbeds unit type. Named pads are not published
-- (a Chambers Creek review mentions Dome #10; no public site map).
-- Rates are Standard Rate USD, 2-night totals divided by 2, before tax.
-- Pet add-on $40/night, up to 2 dogs. Check-in 16:00, check-out 10:00.
-- rate_avg_retail_daily_rate is maintained by calc_avg_retail_daily_rate().

BEGIN;

-- Promised Land: 24 sites / 10 acres. Fall samples.
-- Weekday = 2026-11-10→12 (Tue–Thu). Weekend = 2026-11-13→15 (Fri–Sat).
-- Crest tents were not on those windows; Oct 15 2026 one-night Thursday used.

UPDATE public.all_sage_data
SET
  lat = 41.29159927,
  lon = -75.22384644,
  zip_code = '18426',
  address = '16 Edgar Lane',
  url = 'https://campferncrest.com/locations/promised-land',
  property_total_sites = 24,
  property_family_friendly = 'Yes',
  property_general_store = 'Yes',
  property_playground = 'Yes',
  property_hot_tub = 'Yes',
  setting_forest = 'Yes',
  activities_hiking = 'Yes',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD Cloudbeds Standard Rate, before tax. Weekday ADR = 2026-11-10→12 total ÷ 2. Weekend ADR = 2026-11-13→15 total ÷ 2. Crest tents: 2026-10-15 one-night Thursday (not offered on the Nov windows). Dogs $40/night, up to 2. Check-in 16:00, check-out 10:00. Operator: 24 sites on 10 acres, shared bathhouses.',
  date_updated = '2026-09-30',
  discovery_source = 'cloudbeds_web_research_2026_09_30',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-30] Cloudbeds oGb1qK + campferncrest.com/locations/promised-land. property_total_sites 7→24 (operator: 24 sites in 10 acres). One row per bookable unit type; individual pad names are not published.'
WHERE property_id = '7a0264e1-934d-407d-969c-764acd15bca4';

UPDATE public.all_sage_data SET
  rate_fall_weekday = '286.00',
  rate_unit_rates_by_year = '{"2026":{"fall":{"weekday":286,"note":"Nov 10–12 total $572 ÷ 2. Weekend window sold out for this type."}}}'::jsonb,
  unit_capacity = '2', unit_hot_tub = 'Yes', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_campfires = 'Yes', unit_picnic_table = 'Yes', unit_mini_fridge = 'Yes',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_electricity = 'Yes',
  unit_type = 'Dome'
WHERE id = 11883;

UPDATE public.all_sage_data SET
  rate_fall_weekday = '296.00', rate_fall_weekend = '421.50',
  rate_unit_rates_by_year = '{"2026":{"fall":{"weekday":296,"weekend":421.5,"note":"Nov 10–12 $592 and Nov 13–15 $843, each ÷ 2."}}}'::jsonb,
  unit_capacity = '4', unit_hot_tub = 'Yes', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_campfires = 'Yes', unit_picnic_table = 'Yes', unit_mini_fridge = 'Yes',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_electricity = 'Yes', unit_type = 'Dome'
WHERE id = 11888;

UPDATE public.all_sage_data SET
  rate_fall_weekday = '177.00',
  rate_unit_rates_by_year = '{"2026":{"fall":{"weekday":177,"note":"Oct 15 2026 one-night Thursday. Not listed on Nov 10–15 search."}}}'::jsonb,
  unit_capacity = '2', unit_hot_tub = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_campfires = 'Yes', unit_picnic_table = 'Yes', unit_mini_fridge = 'No',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_electricity = 'Yes', unit_type = 'Safari Tent'
WHERE id = 11889;

UPDATE public.all_sage_data SET
  rate_fall_weekday = '202.00',
  rate_unit_rates_by_year = '{"2026":{"fall":{"weekday":202,"note":"Oct 15 2026 one-night Thursday. Not listed on Nov 10–15 search."}}}'::jsonb,
  unit_capacity = '4', unit_hot_tub = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_campfires = 'Yes', unit_picnic_table = 'Yes', unit_mini_fridge = 'No',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_electricity = 'Yes', unit_type = 'Safari Tent'
WHERE id = 11890;

UPDATE public.all_sage_data SET
  rate_fall_weekday = '227.00', rate_fall_weekend = '323.00',
  rate_unit_rates_by_year = '{"2026":{"fall":{"weekday":227,"weekend":323,"note":"Nov 10–12 $454 and Nov 13–15 $646, each ÷ 2."}}}'::jsonb,
  unit_capacity = '2', unit_hot_tub = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_campfires = 'Yes', unit_picnic_table = 'Yes', unit_mini_fridge = 'Yes',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_electricity = 'Yes', unit_type = 'Dome'
WHERE id = 11891;

UPDATE public.all_sage_data SET
  rate_fall_weekday = '243.00', rate_fall_weekend = '345.50',
  rate_unit_rates_by_year = '{"2026":{"fall":{"weekday":243,"weekend":345.5,"note":"Nov 10–12 $486 and Nov 13–15 $691, each ÷ 2."}}}'::jsonb,
  unit_capacity = '4', unit_hot_tub = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_campfires = 'Yes', unit_picnic_table = 'Yes', unit_mini_fridge = 'Yes',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_electricity = 'Yes', unit_type = 'Dome'
WHERE id = 11892;

UPDATE public.all_sage_data SET
  rate_fall_weekday = '328.00', rate_fall_weekend = '466.50',
  rate_unit_rates_by_year = '{"2026":{"fall":{"weekday":328,"weekend":466.5,"note":"Nov 10–12 $656 and Nov 13–15 $933, each ÷ 2."}}}'::jsonb,
  unit_capacity = '6', unit_hot_tub = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_campfires = 'Yes', unit_picnic_table = 'Yes', unit_mini_fridge = 'Yes',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_electricity = 'Yes', unit_type = 'Dome'
WHERE id = 11893;

-- Flint Creek: 12 sites. Same Nov windows.
UPDATE public.all_sage_data
SET
  url = 'https://campferncrest.com/locations/flint-creek',
  zip_code = '74338',
  property_total_sites = 12,
  property_family_friendly = 'Yes',
  property_general_store = 'Yes',
  property_playground = 'Yes',
  property_hot_tub = 'Yes',
  setting_forest = 'Yes',
  property_waterfront = 'Yes',
  activities_hiking = 'Yes',
  activities_swimming = 'Yes',
  activities_wildlife_watching = 'Yes',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD Cloudbeds Standard Rate, before tax. Weekday ADR = 2026-11-10→12 total ÷ 2. Weekend ADR = 2026-11-13→15 total ÷ 2. One-night searches returned no availability. Dogs $40/night. Check-in 16:00, check-out 10:00. Operator page: 12 sites on Flint Creek. Wi-Fi fee may apply.',
  date_updated = '2026-09-30',
  discovery_source = 'cloudbeds_web_research_2026_09_30',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-30] Cloudbeds EJBRv2 + campferncrest.com/locations/flint-creek. property_total_sites 7→12.'
WHERE property_id = 'd564e53c-466e-4871-80b5-a2c521b50709';

UPDATE public.all_sage_data SET rate_fall_weekday='250.00', rate_fall_weekend='313.00',
  rate_unit_rates_by_year='{"2026":{"fall":{"weekday":250,"weekend":313,"note":"Nov 10–12 $500 and Nov 13–15 $626, each ÷ 2."}}}'::jsonb,
  unit_capacity='2', unit_hot_tub='Yes', unit_air_conditioning='Yes', unit_wifi='Yes', unit_pets='Yes', unit_campfires='Yes', unit_picnic_table='Yes', unit_mini_fridge='Yes', unit_private_bathroom='No', unit_shower='No', unit_electricity='Yes', unit_type='Dome'
WHERE id=11884;
UPDATE public.all_sage_data SET rate_fall_weekday='260.00', rate_fall_weekend='326.00',
  rate_unit_rates_by_year='{"2026":{"fall":{"weekday":260,"weekend":326,"note":"Nov 10–12 $520 and Nov 13–15 $652, each ÷ 2."}}}'::jsonb,
  unit_capacity='4', unit_hot_tub='Yes', unit_air_conditioning='Yes', unit_wifi='Yes', unit_pets='Yes', unit_campfires='Yes', unit_picnic_table='Yes', unit_mini_fridge='Yes', unit_private_bathroom='No', unit_shower='No', unit_electricity='Yes', unit_type='Dome'
WHERE id=11894;
UPDATE public.all_sage_data SET rate_fall_weekday='280.00', rate_fall_weekend='350.50',
  rate_unit_rates_by_year='{"2026":{"fall":{"weekday":280,"weekend":350.5,"note":"Nov 10–12 $560 (only 1 left) and Nov 13–15 $701, each ÷ 2."}}}'::jsonb,
  unit_capacity='6', unit_hot_tub='Yes', unit_air_conditioning='Yes', unit_wifi='Yes', unit_pets='Yes', unit_campfires='Yes', unit_picnic_table='Yes', unit_mini_fridge='Yes', unit_private_bathroom='No', unit_shower='No', unit_electricity='Yes', unit_type='Dome'
WHERE id=11895;
UPDATE public.all_sage_data SET rate_fall_weekday='180.50', rate_fall_weekend='225.50',
  rate_unit_rates_by_year='{"2026":{"fall":{"weekday":180.5,"weekend":225.5,"note":"Nov 10–12 $361 and Nov 13–15 $451, each ÷ 2."}}}'::jsonb,
  unit_capacity='2', unit_hot_tub='No', unit_air_conditioning='Yes', unit_wifi='Yes', unit_pets='Yes', unit_campfires='Yes', unit_picnic_table='Yes', unit_mini_fridge='Yes', unit_private_bathroom='No', unit_shower='No', unit_electricity='Yes', unit_type='Dome'
WHERE id=11896;
UPDATE public.all_sage_data SET rate_fall_weekday='189.50', rate_fall_weekend='237.50',
  rate_unit_rates_by_year='{"2026":{"fall":{"weekday":189.5,"weekend":237.5,"note":"Nov 10–12 $379 and Nov 13–15 $475, each ÷ 2."}}}'::jsonb,
  unit_capacity='4', unit_hot_tub='No', unit_air_conditioning='Yes', unit_wifi='Yes', unit_pets='Yes', unit_campfires='Yes', unit_picnic_table='Yes', unit_mini_fridge='Yes', unit_private_bathroom='No', unit_shower='No', unit_electricity='Yes', unit_type='Dome'
WHERE id=11897;
UPDATE public.all_sage_data SET rate_fall_weekday='199.50', rate_fall_weekend='250.00',
  rate_unit_rates_by_year='{"2026":{"fall":{"weekday":199.5,"weekend":250,"note":"Nov 10–12 $399 (only 1 left) and Nov 13–15 $500, each ÷ 2."}}}'::jsonb,
  unit_capacity='4', unit_hot_tub='No', unit_air_conditioning='Yes', unit_wifi='Yes', unit_pets='Yes', unit_campfires='Yes', unit_picnic_table='Yes', unit_mini_fridge='Yes', unit_private_bathroom='No', unit_shower='No', unit_electricity='Yes', unit_ada_accessibility='Yes', unit_type='Dome'
WHERE id=11898;
UPDATE public.all_sage_data SET rate_fall_weekday='229.50', rate_fall_weekend='287.50',
  rate_unit_rates_by_year='{"2026":{"fall":{"weekday":229.5,"weekend":287.5,"note":"Nov 10–12 $459 and Nov 13–15 $575 (only 1 left), each ÷ 2."}}}'::jsonb,
  unit_capacity='6', unit_hot_tub='No', unit_air_conditioning='Yes', unit_wifi='Yes', unit_pets='Yes', unit_campfires='Yes', unit_picnic_table='Yes', unit_mini_fridge='Yes', unit_private_bathroom='No', unit_shower='No', unit_electricity='Yes', unit_type='Dome'
WHERE id=11899;

-- Acadia: Cloudbeds catalog is now meadow vs forest. June 2027 is the open season
-- (Oct–Nov 2026 calendar had no availability). Weekday 2027-06-08→10, weekend 2027-06-11→13.
UPDATE public.all_sage_data
SET
  url = 'https://campferncrest.com/locations/acadia',
  zip_code = '04673',
  property_total_sites = NULL,
  property_family_friendly = 'Yes',
  property_hot_tub = 'Yes',
  setting_forest = 'Yes',
  activities_hiking = 'Yes',
  activities_wildlife_watching = 'Yes',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD Cloudbeds Standard Rate, before tax. Summer 2027 sample because Oct–Nov 2026 showed no availability. Weekday ADR = 2027-06-08→10 total ÷ 2. Weekend ADR = 2027-06-11→13 total ÷ 2. Dogs $40/night. Check-in 16:00, check-out 10:00. Location page says fewer than 20 sites (not an exact count).',
  date_updated = '2026-09-30',
  discovery_source = 'cloudbeds_web_research_2026_09_30',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-30] Cloudbeds FCa2NZ. Prior property_total_sites 7 was the old SKU count. Operator page says fewer than 20 sites. Catalog split into Meadow Side and Forest Side. Basecamp King Dome was not on the live room list.'
WHERE property_id = 'b807577b-d4c3-45bc-9ec0-6a86d2898b6d';

UPDATE public.all_sage_data SET
  site_name = 'King Bed Dome with Hot Tub - Forest Side',
  rate_summer_weekday = '319.50', rate_summer_weekend = '351.00',
  rate_unit_rates_by_year = '{"2027":{"summer":{"weekday":319.5,"weekend":351,"note":"Jun 8–10 $639 (only 1 left) and Jun 11–13 $702, each ÷ 2."}}}'::jsonb,
  unit_capacity = '2', unit_hot_tub = 'Yes', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_campfires = 'Yes', unit_picnic_table = 'Yes', unit_mini_fridge = 'No',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_electricity = 'Yes', unit_type = 'Dome',
  unit_description = $$Forest-side king dome with private hot tub. Fan, cooler, Chemex, kettle, Brooklinen linens, outdoor fire pit. Not listed with A/C on the Cloudbeds amenity set.$$
WHERE id = 11885;

UPDATE public.all_sage_data SET
  site_name = 'King Bed Dome - Meadow Side',
  rate_summer_weekday = '389.00', rate_summer_weekend = '311.00',
  rate_unit_rates_by_year = '{"2027":{"summer":{"weekday":389,"weekend":311,"note":"Jun 8–10 $778 (only 1 left) and Jun 11–13 $622, each ÷ 2. Weekday sample may be a constrained rate."}}}'::jsonb,
  unit_capacity = '2', unit_hot_tub = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_campfires = 'Yes', unit_picnic_table = 'Yes', unit_mini_fridge = 'Yes',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_electricity = 'Yes', unit_type = 'Dome'
WHERE id = 11900;

UPDATE public.all_sage_data SET
  site_name = '2 Double Beds Dome - Meadow Side',
  rate_summer_weekday = '253.00', rate_summer_weekend = '325.50',
  rate_unit_rates_by_year = '{"2027":{"summer":{"weekday":253,"weekend":325.5,"note":"Jun 8–10 $506 and Jun 11–13 $651, each ÷ 2."}}}'::jsonb,
  unit_capacity = '4', unit_hot_tub = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_campfires = 'Yes', unit_picnic_table = 'Yes', unit_mini_fridge = 'Yes',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_electricity = 'Yes', unit_type = 'Dome'
WHERE id = 11901;

UPDATE public.all_sage_data SET
  site_name = '2 Queen Beds Dome - Meadow Side',
  rate_summer_weekday = '270.50', rate_summer_weekend = '348.00',
  rate_unit_rates_by_year = '{"2027":{"summer":{"weekday":270.5,"weekend":348,"note":"Jun 8–10 $541 and Jun 11–13 $696, each ÷ 2."}}}'::jsonb,
  unit_capacity = '4', unit_hot_tub = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_campfires = 'Yes', unit_picnic_table = 'Yes', unit_mini_fridge = 'Yes',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_electricity = 'Yes', unit_type = 'Dome'
WHERE id = 11902;

UPDATE public.all_sage_data SET
  rate_summer_weekday = '217.50', rate_summer_weekend = '281.50',
  rate_unit_rates_by_year = '{"2027":{"summer":{"weekday":217.5,"weekend":281.5,"note":"Jun 8–10 $435 and Jun 11–13 $563, each ÷ 2."}}}'::jsonb,
  unit_capacity = '2', unit_hot_tub = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_campfires = 'Yes', unit_picnic_table = 'Yes', unit_mini_fridge = 'Yes',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_electricity = 'Yes', unit_type = 'Cabin'
WHERE id = 11903;

UPDATE public.all_sage_data SET
  site_name = 'Family Dome Suite - Meadow Side',
  rate_summer_weekday = '332.50', rate_summer_weekend = '430.50',
  rate_unit_rates_by_year = '{"2027":{"summer":{"weekday":332.5,"weekend":430.5,"note":"Jun 8–10 $665 and Jun 11–13 $861, each ÷ 2."}}}'::jsonb,
  unit_capacity = '6', unit_hot_tub = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_campfires = 'Yes', unit_picnic_table = 'Yes', unit_mini_fridge = 'Yes',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_electricity = 'Yes', unit_type = 'Dome'
WHERE id = 11904;

UPDATE public.all_sage_data SET
  notes = COALESCE(notes, '') || E'\n\n[2026-09-30] Not on the live Cloudbeds FCa2NZ room list (meadow/forest catalog). Left in place; do not treat the May 2026 rate as current.'
WHERE id = 11905;

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity,
  unit_private_bathroom, unit_shower, unit_air_conditioning, unit_wifi, unit_pets,
  unit_electricity, unit_campfires, unit_picnic_table, unit_mini_fridge, unit_hot_tub,
  unit_description, url, property_id, phone_number, brand_id,
  property_family_friendly, property_hot_tub, land_operator_category,
  glamping_service_tier, glamping_service_tier_source,
  setting_forest, activities_hiking, activities_wildlife_watching,
  rate_summer_weekday, rate_summer_weekend, rate_unit_rates_by_year,
  rate_basis, rate_basis_notes, description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', g.property_name, v.site_name,
  'cloudbeds_web_research_2026_09_30', '2026-09-30', '2026-09-30',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, 'United States', g.slug, g.property_type,
  NULL, NULL, 'Dome', v.capacity,
  'No', 'No', 'No', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'No', 'No',
  v.unit_desc, g.url, g.property_id, g.phone_number, g.brand_id,
  'Yes', 'Yes', 'private_commercial',
  'midscale', 'manual',
  'Yes', 'Yes', 'Yes',
  v.wd, v.we, v.rates,
  g.rate_basis, g.rate_basis_notes,
  'Sibling unit type — Ferncrest Acadia. See other rows for the property.',
  v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    (
      'King Bed Dome - Forest Side', '2',
      '218.50', '281.00',
      '{"2027":{"summer":{"weekday":218.5,"weekend":281,"note":"Jun 8–10 $437 and Jun 11–13 $562, each ÷ 2."}}}'::jsonb,
      $$Forest-side king dome aimed at an unplugged stay: cooler, charcoal grill, fire pit, coffee, kettle. Cloudbeds amenity set does not list A/C.$$,
      $$New row 2026-09-30. Cloudbeds FCa2NZ. Physical unit count not published.$$
    ),
    (
      '2 Double Beds Dome - Forest Side', '4',
      '235.50', '303.00',
      '{"2027":{"summer":{"weekday":235.5,"weekend":303,"note":"Jun 8–10 $471 and Jun 11–13 $606, each ÷ 2."}}}'::jsonb,
      $$Forest-side double dome: cooler, charcoal grill, fire pit, fan, coffee. Cloudbeds amenity set does not list A/C.$$,
      $$New row 2026-09-30. Cloudbeds FCa2NZ. Physical unit count not published.$$
    )
) AS v(site_name, capacity, wd, we, rates, unit_desc, note)
WHERE g.id = 11885
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = g.property_id AND x.site_name = v.site_name
  );

-- Chambers Creek: replace the two coarse rows with the four Cloudbeds types.
UPDATE public.all_sage_data
SET
  lat = 32.26004028,
  lon = -97.24997711,
  zip_code = '76050',
  address = '6305 FM 916',
  url = 'https://campferncrest.com/locations/chambers-creek',
  phone_number = '+1-682-907-1002',
  property_family_friendly = 'Yes',
  property_general_store = 'Yes',
  property_hot_tub = 'Yes',
  property_sauna = 'Yes',
  setting_field = 'Yes',
  activities_hiking = 'Yes',
  land_operator_category = 'private_commercial',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD Cloudbeds Standard Rate, before tax. Weekday ADR = 2026-11-10→12 total ÷ 2. Weekend ADR = 2026-11-13→15 total ÷ 2 (family suites were not available that weekend). Dogs $40/night. Communal sauna and cold plunge. Check-in 16:00, check-out 10:00. Exact site count not published; a guest review names Dome #10.',
  date_updated = '2026-09-30',
  discovery_source = 'cloudbeds_web_research_2026_09_30',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-30] Cloudbeds 3IPkgj. Split coarse rows into four bookable dome types. Individual site names are not in the booking engine.'
WHERE property_id = '53743d4e-7fde-4755-935f-576416fd0bc2';

UPDATE public.all_sage_data SET
  site_name = 'King Bed w/ Hot Tub',
  unit_type = 'Dome',
  quantity_of_units = NULL,
  rate_fall_weekday = '201.50',
  rate_fall_weekend = '244.50',
  rate_unit_rates_by_year = '{"2026":{"fall":{"weekday":201.5,"weekend":244.5,"note":"Nov 10–12 $403 and Nov 13–15 $489, each ÷ 2."}}}'::jsonb,
  unit_capacity = '2', unit_hot_tub = 'Yes', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_campfires = 'Yes', unit_picnic_table = 'Yes', unit_mini_fridge = 'Yes',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_electricity = 'Yes',
  unit_description = $$Climate-controlled king dome with private wood-fired cedar hot tub, mini-fridge, microwave, Chemex, indoor fireplace, fire pit. Shared bathhouse. Dogs $40/night.$$
WHERE id = 11815;

UPDATE public.all_sage_data SET
  site_name = 'King Bed',
  unit_type = 'Dome',
  quantity_of_units = NULL,
  rate_fall_weekday = '181.50',
  rate_fall_weekend = '220.00',
  rate_unit_rates_by_year = '{"2026":{"fall":{"weekday":181.5,"weekend":220,"note":"Nov 10–12 $363 and Nov 13–15 $440, each ÷ 2."}}}'::jsonb,
  unit_capacity = '2', unit_hot_tub = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_campfires = 'Yes', unit_picnic_table = 'Yes', unit_mini_fridge = 'Yes',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_electricity = 'Yes',
  unit_description = $$Climate-controlled king dome, mini-fridge, microwave, Chemex, indoor fireplace, fire pit. Shared bathhouse.$$
WHERE id = 9540;

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity,
  unit_private_bathroom, unit_shower, unit_air_conditioning, unit_wifi, unit_pets,
  unit_electricity, unit_campfires, unit_picnic_table, unit_mini_fridge, unit_hot_tub,
  unit_ada_accessibility, unit_description,
  url, property_id, phone_number, brand_id,
  property_family_friendly, property_general_store, property_hot_tub, property_sauna,
  land_operator_category, glamping_service_tier, glamping_service_tier_source,
  setting_field, activities_hiking,
  rate_fall_weekday, rate_unit_rates_by_year,
  rate_basis, rate_basis_notes, description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', g.property_name, v.site_name,
  'cloudbeds_web_research_2026_09_30', '2026-09-30', '2026-09-30',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, 'United States', g.slug, g.property_type,
  g.property_total_sites, NULL, 'Dome', '6',
  'No', 'No', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes', 'No',
  v.ada,
  $$Family dome: 1 queen, twin-over-queen bunk, and futon (sleeps 6). Climate control, microwave, coffee, mini-fridge, fire pit. Shared bathhouse.$$,
  g.url, g.property_id, g.phone_number, g.brand_id,
  g.property_family_friendly, g.property_general_store, g.property_hot_tub, g.property_sauna,
  g.land_operator_category, g.glamping_service_tier, 'manual',
  'Yes', 'Yes',
  '242.50',
  '{"2026":{"fall":{"weekday":242.5,"note":"Nov 10–12 $485 ÷ 2. Only 1 left that window. Not available Nov 13–15."}}}'::jsonb,
  g.rate_basis, g.rate_basis_notes,
  'Sibling unit type — Ferncrest Chambers Creek.',
  v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    ('Family Dome Suite', 'No', $$New row 2026-09-30. Cloudbeds 3IPkgj.$$),
    ('Family Dome Suite (Accessible Friendly)', 'Yes', $$New row 2026-09-30. Cloudbeds 3IPkgj. Accessible-friendly layout.$$)
) AS v(site_name, ada, note)
WHERE g.id = 11815
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = g.property_id AND x.site_name = v.site_name
  );

-- Elkhorn River is live on Cloudbeds (was a placeholder). Ten domes on the brand homepage.
UPDATE public.all_sage_data
SET
  is_open = 'Yes',
  address = '84814 Airport Rd',
  city = 'Neligh',
  state = 'NE',
  zip_code = '68756',
  lat = 42.10528946,
  lon = -98.03526306,
  url = 'https://campferncrest.com/locations/elkhorn-river',
  phone_number = '+1-402-887-2123',
  property_total_sites = 10,
  planned_open_date = NULL,
  property_family_friendly = 'Yes',
  property_hot_tub = 'Yes',
  property_waterfront = 'Yes',
  setting_forest = 'Yes',
  activities_hiking = 'Yes',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD Cloudbeds Standard Rate, before tax. Winter weekday ADR = 2026-12-08→10 (Tue–Thu) total ÷ 2. Nov 13–15 weekend search had no availability, so no weekend rate is stored. Dogs $40/night. Check-in 16:00, check-out 10:00. Brand homepage: ten domes on the Elkhorn River.',
  date_updated = '2026-09-30',
  discovery_source = 'cloudbeds_web_research_2026_09_30',
  description = $$Ferncrest Elkhorn River, 84814 Airport Rd, Neligh, Nebraska. Ten climate-controlled geodesic domes among cottonwoods on the Elkhorn River, about a mile from the Cowboy Trail. Bookable on Cloudbeds as of September 2026.$$,
  notes = COALESCE(notes, '') || E'\n\n[2026-09-30] Open on Cloudbeds 3x6NzX. Replaced placeholder unit names and $200–$400 estimates with live room types. property_total_sites 12→10 (brand homepage: ten domes).'
WHERE property_id = '4bb9fd64-26b2-4a3e-b39a-378a4d7ed542';

UPDATE public.all_sage_data SET
  site_name = 'King Dome w/ Hot Tub',
  unit_type = 'Dome',
  quantity_of_units = NULL,
  rate_winter_weekday = '359.00',
  rate_winter_weekend = NULL,
  rate_summer_weekday = NULL,
  rate_summer_weekend = NULL,
  rate_unit_rates_by_year = '{"2026":{"winter":{"weekday":359,"note":"Dec 8–10 $718 ÷ 2."}}}'::jsonb,
  unit_capacity = '2', unit_hot_tub = 'Yes', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_campfires = 'Yes', unit_mini_fridge = 'Yes',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_electricity = 'Yes',
  unit_description = $$Climate-controlled king dome with private wood-fired cedar hot tub. Mini-fridge, cooler, microwave.$$
WHERE id = 11849;

UPDATE public.all_sage_data SET
  site_name = 'King Bed Dome',
  unit_type = 'Dome',
  quantity_of_units = NULL,
  rate_winter_weekday = '319.00',
  rate_winter_weekend = NULL,
  rate_summer_weekday = NULL,
  rate_summer_weekend = NULL,
  rate_unit_rates_by_year = '{"2026":{"winter":{"weekday":319,"note":"Dec 8–10 $638 ÷ 2."}}}'::jsonb,
  unit_capacity = '2', unit_hot_tub = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_campfires = 'Yes', unit_mini_fridge = 'Yes',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_electricity = 'Yes',
  unit_description = $$Climate-controlled king dome, sleeps 2. Mini-fridge, cooler, microwave.$$
WHERE id = 11856;

UPDATE public.all_sage_data SET
  site_name = 'Family Dome Suite',
  unit_type = 'Dome',
  quantity_of_units = NULL,
  rate_winter_weekday = '389.00',
  rate_winter_weekend = NULL,
  rate_summer_weekday = NULL,
  rate_summer_weekend = NULL,
  rate_unit_rates_by_year = '{"2026":{"winter":{"weekday":389,"note":"Dec 8–10 $778 ÷ 2. Same total on Nov 10–12."}}}'::jsonb,
  unit_capacity = '6', unit_hot_tub = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_campfires = 'Yes', unit_mini_fridge = 'Yes',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_electricity = 'Yes',
  unit_description = $$Family dome: king, twin/queen bunk, and futon (sleeps 6). Climate control.$$
WHERE id = 11857;

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity,
  unit_private_bathroom, unit_shower, unit_air_conditioning, unit_wifi, unit_pets,
  unit_electricity, unit_campfires, unit_mini_fridge, unit_hot_tub, unit_ada_accessibility,
  unit_description, url, property_id, phone_number, brand_id,
  property_family_friendly, property_hot_tub, land_operator_category,
  glamping_service_tier, glamping_service_tier_source,
  property_waterfront, setting_forest, activities_hiking,
  rate_winter_weekday, rate_unit_rates_by_year,
  rate_basis, rate_basis_notes, description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', g.property_name, v.site_name,
  'cloudbeds_web_research_2026_09_30', '2026-09-30', '2026-09-30',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, 'United States', g.slug, g.property_type,
  10, NULL, 'Dome', '4',
  'No', 'No', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'No', v.ada,
  v.unit_desc, g.url, g.property_id, g.phone_number, g.brand_id,
  'Yes', 'Yes', 'private_commercial',
  'midscale', 'manual',
  'Yes', 'Yes', 'Yes',
  '349.00',
  '{"2026":{"winter":{"weekday":349,"note":"Dec 8–10 $698 ÷ 2. Same total on Nov 10–12. Only 1 left on those searches."}}}'::jsonb,
  g.rate_basis, g.rate_basis_notes,
  'Sibling unit type — Ferncrest Elkhorn River.',
  v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    ('2 Queen Beds Dome', 'No', $$Climate-controlled two-queen dome, sleeps 4.$$, $$New row 2026-09-30. Cloudbeds 3x6NzX.$$),
    ('2 Queen Beds Dome Accessible', 'Yes', $$Accessible-friendly climate-controlled two-queen dome, sleeps 4.$$, $$New row 2026-09-30. Cloudbeds 3x6NzX.$$)
) AS v(site_name, ada, unit_desc, note)
WHERE g.id = 11856
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = g.property_id AND x.site_name = v.site_name
  );

-- sync_season_rates_trigger clears seasons not present in the JSON after
-- calc_avg_rate_trigger has already averaged the previous season values.
-- Touch fall rates so the average is recomputed from the synced columns.
UPDATE public.all_sage_data
SET rate_fall_weekday = rate_fall_weekday
WHERE property_id = '53743d4e-7fde-4755-935f-576416fd0bc2'
  AND site_name IN ('King Bed', 'King Bed w/ Hot Tub');

COMMIT;
