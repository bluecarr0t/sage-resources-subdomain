-- Roulotte Retreat (7 named wagons) and Cabanes als Arbres (treehouses, qty unpublished).

BEGIN;

-- ============================================================================
-- Roulotte Retreat — 7 named French/Dutch roulottes. Cottage unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Roulotte Retreat', slug = 'roulotte-retreat',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_roulotte_retreat_2026_09',
  address = 'Bowden', city = 'Melrose', state = 'Scottish Borders',
  zip_code = 'TD6', country = 'United Kingdom',
  lat = 55.5783, lon = -2.7186,
  url = 'https://www.roulotteretreat.com/', phone_number = '+44-1835-823670',
  property_total_sites = 7, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'No',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Avril & Alan. Seven named wagons: Devanna, Karlotta, Gitana, Maharani, Shivanni, Zenaya, Rosa Bella. Adults only in roulottes. Horseshoe Cottage + Ruby Bowtop is a separate family SKU (qty unpublished). Studio is day-space only. Sage +44 1835 823341 was stale; official +44 1835 823670 / +44 7990 744044. avril@roulotteretreat.com.',
  rate_basis = 'room_only',
  rate_basis_notes = 'GBP. Official from £105/night (Rosa Bella from £110). 2-night minimum on roulottes. Hot tub/sauna/copper bath extra. Horseshoe Cottage 3-night minimum, book by email.',
  description = $$Roulotte Retreat, Bowden near Melrose, Scottish Borders TD6 (55.5783, -2.7186). Seven hand-built French/Dutch roulottes below the Eildon Hills. Adults only.$$,
  activities_raw = 'On-site: wildflower meadow, wildlife ponds, optional wood-fired tubs/sauna. Nearby: Melrose, River Tweed, Eildon Hills.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11300 AND property_id = 'cc2a7a04-8956-42e4-b4c4-718c96a4a921';

UPDATE public.all_sage_data
SET
  site_name = 'Roulotte', unit_type = 'Roulotte', quantity_of_units = 7,
  unit_capacity = '2-4', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'Yes',
  operating_season_months = 'Year-round typical. Seven named wagons lumped. Horseshoe Cottage unpublished. Do not invent an 8th roulotte.',
  minimum_nights = '2',
  unit_description = $$Roulotte (qty 7): Devanna, Karlotta, Gitana, Maharani, Shivanni, Zenaya, Rosa Bella. Ensuite, kitchen. Adults only. Cottage unpublished.$$,
  amenities_raw = 'Hand-built French/Dutch roulotte; ensuite; kitchen; some wood-fired bath/sauna/hot tub extra.',
  rate_summer_weekday = '105', rate_summer_weekend = '105',
  rate_winter_weekday = '105', rate_winter_weekend = '105',
  rate_spring_weekday = '105', rate_spring_weekend = '105',
  rate_fall_weekday = '105', rate_fall_weekend = '105',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 105, 'weekend', 105),
      'spring', jsonb_build_object('weekday', 105, 'weekend', 105),
      'summer', jsonb_build_object('weekday', 105, 'weekend', 105),
      'fall', jsonb_build_object('weekday', 105, 'weekend', 105),
      'note', 'GBP room_only from £105. Rosa Bella from £110. Cottage unpublished.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. This row is Roulotte qty 7 from £105. Horseshoe Cottage unpublished.'
WHERE id = 11300 AND property_id = 'cc2a7a04-8956-42e4-b4c4-718c96a4a921';

-- ============================================================================
-- Cabanes als Arbres — treehouses since 2009. Official current count unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Cabanes als Arbres', slug = 'cabanes-als-arbres',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_cabanes_als_arbres_2026_09',
  address = 'Carretera Vallclara, s/n', city = 'Sant Hilari Sacalm', state = 'Catalonia',
  zip_code = '17403', country = 'Spain',
  lat = 41.8729, lon = 2.5053,
  url = 'https://www.cabanesalsarbres.com/', phone_number = '+34-625-411-409',
  property_total_sites = NULL, year_site_opened = 2009,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'Yes', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'No',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'rustic', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'First Spanish treetop cabins (2009). No electricity or running water in cabins; dry toilet, jug basin, rechargeable lamps; showers at the masia (operator: more than seven centuries old). Kids under 10 not allowed. Named bird cabins (Merla, Tallareta, Oreneta, etc.). Older Unique Hotels listed 10 (6×2p + 4×4p); later blogs say 16. Official catalog does not publish a total — Sage 10 and blog 16 not stored. +34 625 411 409. reserves@cabanesalsarbres.com. CIF B-55295679.',
  rate_basis = 'breakfast',
  rate_basis_notes = 'EUR. Official a-la-carte from €159/night for 2 with breakfast. Packs from €239. Do not store 2011 €97–117 card as 2026.',
  description = $$Cabanes als Arbres, Carretera Vallclara s/n, 17403 Sant Hilari Sacalm (41.8729, 2.5053). Unplugged treehouses. Current official count unpublished.$$,
  activities_raw = 'On-site: forest walks, summer pool, outdoor spas, massage. Nearby: Montseny, Girona.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11175 AND property_id = 'c54b5ab4-96c9-42cd-8cb7-effac450a9f1';

UPDATE public.all_sage_data
SET
  site_name = 'Treehouse', unit_type = 'Treehouse', quantity_of_units = NULL,
  unit_capacity = '2-4', unit_bed = 'Varies',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'No', unit_water = 'No',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Official current count unpublished. Do not store Sage 10 or blog 16.',
  minimum_nights = '1',
  unit_description = $$Treehouse (qty unpublished): named bird cabins, ~30 m² + terrace. Dry toilet. Showers at masia. Kids 10+. Do not invent a count.$$,
  amenities_raw = 'Suspended treehouse; dry toilet; bioethanol fireplace; breakfast basket. Masia showers, pool, outdoor spas.',
  rate_summer_weekday = '159', rate_summer_weekend = '159',
  rate_winter_weekday = '159', rate_winter_weekend = '159',
  rate_spring_weekday = '159', rate_spring_weekend = '159',
  rate_fall_weekday = '159', rate_fall_weekend = '159',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 159, 'weekend', 159),
      'spring', jsonb_build_object('weekday', 159, 'weekend', 159),
      'summer', jsonb_build_object('weekday', 159, 'weekend', 159),
      'fall', jsonb_build_object('weekday', 159, 'weekend', 159),
      'note', 'EUR breakfast. Official a-la-carte from €159/2. Count unpublished.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Carretera Vallclara. Treehouse qty unpublished. From €159 breakfast.'
WHERE id = 11175 AND property_id = 'c54b5ab4-96c9-42cd-8cb7-effac450a9f1';

COMMIT;
