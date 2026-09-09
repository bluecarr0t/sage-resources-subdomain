-- Follow-up from late operator research. Material corrections only.

BEGIN;

-- Treehouse Belgium was a ghost. Do not keep the Boomkamp silent-merge.
DELETE FROM public.all_sage_data
WHERE id = 13338
  AND property_id = '78a04039-ddd8-4307-b778-c290d74bdae3'
  AND site_name = 'Adventure Tent';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Treehouse Belgium',
  site_name = NULL,
  slug = 'treehouse-belgium-bruges-ghost',
  property_type = 'Glamping',
  discovery_source = 'web_research_treehouse_belgium_ghost_2026_09',
  address = 'Boomlaan 5',
  city = 'Bruges',
  state = 'West Flanders',
  zip_code = '8000',
  country = 'Belgium',
  lat = 51.2093,
  lon = 3.2247,
  url = 'https://treehousebelgium.be',
  phone_number = '+32 50 123 45 67',
  property_total_sites = NULL,
  quantity_of_units = NULL,
  unit_type = 'Treehouse',
  year_site_opened = NULL,
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected as ghost. treehousebelgium.be is dead; Boomlaan 5 / +32 50 123 45 67 are placeholders. Not merged into Boomkamp (Lakebossendreef 4, Oostkamp) — different brand, city, and seasonality. Boomkamp qty unpublished on current operator site.'
WHERE id = 10981
  AND property_id = '78a04039-ddd8-4307-b778-c290d74bdae3';

-- Seemühle: renovation pause / for sale. Official 10 treehouses stay; mark Closed.
UPDATE public.all_sage_data
SET
  is_open = 'Closed',
  lat = 50.130144,
  lon = 9.746585,
  year_site_opened = NULL,
  property_total_sites = 10,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 310, 'weekend', 410),
      'spring', jsonb_build_object('weekday', 310, 'weekend', 410),
      'summer', jsonb_build_object('weekday', 370, 'weekend', 470),
      'fall', jsonb_build_object('weekday', 310, 'weekend', 410),
      'note', 'EUR breakfast. Official 2025 Preise (not currently bookable): Baumhaus €310 off-season weekday / €370 high-season weekday. Weekend +€100. 3 Waldhaus apartments + 1 Schäferwagen unpublished as extra SKUs.'
    )
  ),
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04 follow-up] is_open Yes → Closed. Operator: Nov–Dec sold out, then Betriebsferien and renovation pause; Main-Post Oct 2025 listed the hotel for sale. Year 2016 cleared (Good Travel only). Coords 50.130144, 9.746585. Official from-rate €310/€370 stored. Apartments + wagon noted only.'
WHERE id = 11000
  AND property_id = '329da681-9864-43aa-b1e0-29ed53c45464';

-- Living Room: phone, farm address, postcode, coords; drop unsourced 2010.
UPDATE public.all_sage_data
SET
  address = 'Bryn Meurig Farm, Cemmaes',
  city = 'Machynlleth',
  zip_code = 'SY20 9PZ',
  lat = 52.6323,
  lon = -3.6990,
  phone_number = '+44-1650-511900',
  year_site_opened = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 200, 'weekend', 200),
      'spring', jsonb_build_object('weekday', 200, 'weekend', 200),
      'summer', jsonb_build_object('weekday', 200, 'weekend', 200),
      'fall', jsonb_build_object('weekday', 200, 'weekend', 200),
      'note', 'GBP room_only. Operator book page £399 / 2 nights couple (≈ £200/night). Family £429 / 2 nights.'
    )
  ),
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04 follow-up] Phone 511991 → 511900. Address Bryn Meurig Farm, Cemmaes SY20 9PZ (Google Hotels). Coords 52.6323,-3.6990. Year 2010 cleared. From £399/2n.'
WHERE id = 11284
  AND property_id = '1ebfd341-c24b-49dc-b230-884545fc2c77';

-- Lanrick: official from £245; phone; coords; add Keeper's Bothy.
UPDATE public.all_sage_data
SET
  property_name = 'The Treehouses at Lanrick',
  property_total_sites = 6,
  lat = 56.20383,
  lon = -4.12389,
  phone_number = '+44-7939-930841',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 245, 'weekend', 245),
      'spring', jsonb_build_object('weekday', 245, 'weekend', 245),
      'summer', jsonb_build_object('weekday', 245, 'weekend', 245),
      'fall', jsonb_build_object('weekday', 245, 'weekend', 245),
      'note', 'GBP room_only. Operator from £245/night treehouses. Child sofa-bed £50/stay.'
    )
  ),
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04 follow-up] Official plural name. Phone +44 7939 930841. Coords 56.20383,-4.12389. From £245. Keeper''s Bothy added as 6th unit.'
WHERE id = 11286
  AND property_id = 'a5593883-eb00-4c3a-8bb0-4662d38749aa';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, unit_picnic_table, unit_charcoal_grill, unit_ada_accessibility,
  year_site_opened, operating_season_months, minimum_nights,
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
  setting_ranch, setting_field, setting_mountainous, rv_parking,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes, description, notes
)
SELECT
  'published', g.is_open, g.is_glamping_property, 'Sage', g.property_name, 'Keeper''s Bothy',
  'web_research_lanrick_treehouses_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country, g.slug, g.property_type,
  6, 1::numeric, 'Cottage', '2-6', '2 adults + bunks + sofa bed',
  'Yes', 'Yes', 'Yes', 'No',
  'No', 'No', 'No', 'Yes', 'Yes',
  'No', 'Yes', 'No', 'No', 'No',
  'Yes', 'No', 'No', 'No',
  2020::numeric, 'Year-round. One bothy on the estate. Not a 6th treehouse.',
  '2',
  $$Keeper's Bothy (qty 1): Ground lodging for 2 adults + children in bunks / sofa. Operator from £210/night. Do not invent a second bothy.$$,
  'Bothy; self-cater; no dogs; no Wi-Fi.',
  g.activities_raw, g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_fitness_room, g.property_waterfront, g.property_alcohol_available,
  g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_swimming, g.activities_wildlife_watching,
  g.activities_stargazing, g.activities_scenic_drives,
  g.setting_ranch, g.setting_field, g.setting_mountainous, g.rv_parking,
  jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 210, 'weekend', 210),
      'spring', jsonb_build_object('weekday', 210, 'weekend', 210),
      'summer', jsonb_build_object('weekday', 210, 'weekend', 210),
      'fall', jsonb_build_object('weekday', 210, 'weekend', 210),
      'note', 'GBP room_only. Operator from £210/night.'
    )
  ),
  g.rate_basis, g.rate_basis_notes, g.description,
  E'[2026-09-04 follow-up] Added Keeper''s Bothy qty 1 from lanricktreehouses.co.uk.'
FROM public.all_sage_data g
WHERE g.id = 11286 AND g.property_id = 'a5593883-eb00-4c3a-8bb0-4662d38749aa'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = 'a5593883-eb00-4c3a-8bb0-4662d38749aa'
      AND x.site_name = 'Keeper''s Bothy'
  );

-- EKÖ: opened 2022; official gift-card from CAD 333.50; civic coords.
UPDATE public.all_sage_data
SET
  lat = 47.35496,
  lon = -68.66137,
  year_site_opened = 2022,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 333.5, 'weekend', 333.5),
      'spring', jsonb_build_object('weekday', 333.5, 'weekend', 333.5),
      'summer', jsonb_build_object('weekday', 333.5, 'weekend', 333.5),
      'fall', jsonb_build_object('weekday', 333.5, 'weekend', 333.5),
      'note', 'CAD room_only. Official shop gift cards tax-included: most units CAD 333.50 / 1 night. Bo-lieu 356.50. 2022 blog from $225 is stale.'
    )
  ),
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04 follow-up] Year 2021 → 2022 (first guest stay). Civic coords 47.35496,-68.66137. From CAD 333.50 (official shop).'
WHERE property_id = 'e3fca711-a1f7-4755-8c24-37652640a7e2';

-- Solling: operator from-rates (lowest 2-person house / tree tent).
UPDATE public.all_sage_data
SET
  lat = 51.706768,
  lon = 9.557934,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 165, 'weekend', 205),
      'spring', jsonb_build_object('weekday', 165, 'weekend', 205),
      'summer', jsonb_build_object('weekday', 195, 'weekend', 235),
      'fall', jsonb_build_object('weekday', 165, 'weekend', 205),
      'note', 'EUR room_only. Operator 2-person houses €195 summer / €165 winter. Weekend+holiday +€40. Comfort Aurora/Ahletal €255/€225 not stored as the from-rate.'
    )
  ),
  date_updated = '2026-09-04'
WHERE id = 11023
  AND property_id = '5e052193-7efc-4ea7-9b73-24eec2cf5774';

UPDATE public.all_sage_data
SET
  lat = 51.706768,
  lon = 9.557934,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'spring', jsonb_build_object('weekday', 90, 'weekend', 115),
      'summer', jsonb_build_object('weekday', 90, 'weekend', 115),
      'fall', jsonb_build_object('weekday', 90, 'weekend', 115),
      'note', 'EUR room_only. Operator tree tents €90 weekday / €115 weekend, Apr–Oct. Breakfast optional €19. Winter closed.'
    )
  ),
  date_updated = '2026-09-04'
WHERE site_name = 'Tree Tent'
  AND property_id = '5e052193-7efc-4ea7-9b73-24eec2cf5774';

-- Palmaïa: OSM coords + year built 2019.
UPDATE public.all_sage_data
SET
  lat = 20.59745,
  lon = -87.09623,
  year_site_opened = 2019,
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04 follow-up] Coords 20.59745,-87.09623 (OSM). Year opened 2019.'
WHERE id = 142
  AND property_id = '3fd0c119-c0b4-4ed7-a956-8979a5b2b5da';

-- Log House: drop unsourced 1980.
UPDATE public.all_sage_data
SET
  year_site_opened = NULL,
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04 follow-up] Year 1980 cleared — not on operator site.'
WHERE id = 11261
  AND property_id = 'c514a453-77b6-45f5-b8ef-d92816a68865';

-- Engadine: operator zip + OpenTable pin.
UPDATE public.all_sage_data
SET
  zip_code = 'T1W 0B9',
  lat = 50.838464,
  lon = -115.342377,
  date_updated = '2026-09-04'
WHERE property_id = '33387855-ffc9-4b5c-a51c-52c18c93b495';

-- Harvest Moon: Pitchup pin.
UPDATE public.all_sage_data
SET
  lat = 56.02707,
  lon = -2.62625,
  date_updated = '2026-09-04'
WHERE property_id = '91d8006a-c6e9-4c74-8ec4-ca7b7929a8ac';

COMMIT;
