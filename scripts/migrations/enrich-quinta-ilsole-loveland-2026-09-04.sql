-- Quinta M (4 yurts), Glamping Il Sole (6 unique stays), Loveland Farm (9 domes).

BEGIN;

-- ============================================================================
-- Quinta M — 4 named contemporary yurts. Sage qty 5 / placeholder phone were wrong.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Quinta M', slug = 'quinta-m',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_quinta_m_2026_09',
  address = 'Casal da Avó, Várzea de Baixo', city = 'Casével', state = 'Ribatejo',
  zip_code = '2000-451', country = 'Portugal',
  lat = NULL, lon = NULL,
  url = 'http://quinta-m.com/', phone_number = '+351-243-448-206',
  property_total_sites = 4, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Florence & Louis. Four named yurts (Douro, Tejo, Minho, Lima), ensuite + A/C + terrace. Pool, Lusitano horses, yoga. Sage quintam.com / EN 3 / +351 243 123 456 / qty 5 were wrong. No operator GPS published.',
  rate_basis = 'unknown',
  rate_basis_notes = 'EUR. No public nightly card stored. +351 243 448 206. contact@quinta-m.com. Open ~15 Jan–15 Dec.',
  description = $$Quinta M, Casal da Avó, Várzea de Baixo, 2000-451 Casével, Santarém. Four contemporary yurts on a Ribatejo horse farm. No operator pin published.$$,
  activities_raw = 'On-site: pool, horse riding, yoga, bikes. Nearby: Santarém, Golegã, Tejo estuary.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'Yes', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11154 AND property_id = 'da82ccee-3b78-492c-a51e-558c7963c5c0';

UPDATE public.all_sage_data
SET
  site_name = 'Yurt', unit_type = 'Yurt', quantity_of_units = 4,
  unit_capacity = '2', unit_bed = 'Double',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Typical 15 Jan–15 Dec. Four named yurts lumped (Douro, Tejo, Minho, Lima). Do not invent a 5th.',
  minimum_nights = '1',
  unit_description = $$Yurt (qty 4): Douro, Tejo, Minho, Lima. Ensuite, A/C, terrace. Do not invent a 5th yurt.$$,
  amenities_raw = 'Contemporary yurt; ensuite; A/C; terrace; pool access.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR unknown. No official public nightly card stored.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Phone +351 243 448 206. URL quinta-m.com. This row is Yurt qty 4.'
WHERE id = 11154 AND property_id = 'da82ccee-3b78-492c-a51e-558c7963c5c0';

-- ============================================================================
-- Glamping Il Sole — 6 unique stays. Not a 10-safari-tent park.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Glamping Il Sole', slug = 'glamping-il-sole',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_glamping_il_sole_2026_09',
  address = 'Podere La Patassa', city = 'Civitella Paganico', state = 'Tuscany',
  zip_code = '58045', country = 'Italy',
  lat = 42.9553, lon = 11.2863,
  url = 'https://www.glampingilsole.it/', phone_number = '+39-338-235-1002',
  property_total_sites = 6, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'No',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Stefano & Eleonora. 85 ha organic farm. Six unique stays: Casa Hobbit, Casa sull''albero, Cupola Geodetica, La Panoramica, Tepee, Casa di Hagrid. Adults-oriented; pets not admitted. Sage glampingilsole.com / Podere Il Sole / +39 0564 905038 / Safari Tent 10 were wrong. CIN IT053008B5IV2CR4EK.',
  rate_basis = 'breakfast',
  rate_basis_notes = 'EUR breakfast buffet for 2 from €290 (operator unit pages). Dinner packages €345–355. Hot tub extra €50. +39 338 2351002. info@glampingilsole.it.',
  description = $$Glamping Il Sole, Podere La Patassa, 58045 Civitella Paganico (GR). Six handmade unique stays on an 85 ha organic farm. Year-round. No pets.$$,
  activities_raw = 'On-site: hot tub, farm dinners, e-bike, 4x4 countryside. Nearby: Maremma, Grosseto.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'Yes', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11043 AND property_id = '3dc3a5e1-3379-43cb-bba0-b97b98245610';

UPDATE public.all_sage_data
SET
  site_name = 'Unique Stays', unit_type = 'Other Glamping', quantity_of_units = 6,
  unit_capacity = '2-3', unit_bed = 'Double',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round. Six unique units lumped. Do not invent a 7th or a safari-tent village.',
  minimum_nights = '1',
  unit_description = $$Unique Stays (qty 6): Hobbit, treehouse, geodesic dome, Panoramica, teepee, Hagrid. Lumped. Pets no.$$,
  amenities_raw = 'Unique unit; ensuite; A/C; hot tub (often extra). Breakfast in hall. No pets.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 290, 'weekend', 290),
      'spring', jsonb_build_object('weekday', 290, 'weekend', 290),
      'summer', jsonb_build_object('weekday', 290, 'weekend', 290),
      'fall', jsonb_build_object('weekday', 290, 'weekend', 290),
      'note', 'EUR breakfast for 2. Operator from €290. Not a unit-split rate.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Safari Tent stub. URL glampingilsole.it. This row is Unique Stays qty 6.'
WHERE id = 11043 AND property_id = '3dc3a5e1-3379-43cb-bba0-b97b98245610';

-- ============================================================================
-- Loveland Farm — official 9 geodesic dome pods.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Loveland Farm', slug = 'loveland-farm',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_loveland_farm_2026_09',
  address = 'Loveland Farm', city = 'Hartland', state = 'Devon',
  zip_code = 'EX39 6AT', country = 'United Kingdom',
  lat = 51.0105, lon = -4.4979,
  url = 'http://loveland.farm/', phone_number = '+44-1237-441894',
  property_total_sites = 9, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Karina & Jeff Griffin. Official homepage: 9 geodesic domes on the Hartland Peninsula. Indoor pool. Some pods dog-friendly (Hartland, Stargazer, Welcombe). Canopy & Stars lists 9 pods from £164. Sage lovelandfarmcamping.co.uk / total 6 were stale. Extra tent pitches only with a pod booking — unpublished.',
  rate_basis = 'room_only',
  rate_basis_notes = 'GBP. Canopy & Stars from-rates £164–243. Stored 164. Two-night minimum (three peak). +44 1237 441894.',
  description = $$Loveland Farm, Hartland, Devon EX39 6AT (51.0105, -4.4979). Nine geodesic dome pods. Indoor pool. North Devon UNESCO Biosphere.$$,
  activities_raw = 'On-site: indoor pool, communal fire pit, farm animals. Nearby: Hartland coast, surfing, coastal path.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'Yes', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11275 AND property_id = '201ca453-5d26-4074-abb3-bf269ba23151';

UPDATE public.all_sage_data
SET
  site_name = 'Geodesic Pod', unit_type = 'Dome', quantity_of_units = 9,
  unit_capacity = '2-7', unit_bed = 'Varies by pod',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'Yes', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Official 9 pods lumped. Do not invent a 10th.',
  minimum_nights = '2',
  unit_description = $$Geodesic Pod (qty 9): Official homepage. Some dog-friendly. Compost toilets. Do not invent a 10th pod.$$,
  amenities_raw = 'Geodesic dome; ensuite shower; kitchenette; wood burner typical. Indoor pool shared.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 164, 'weekend', 164),
      'spring', jsonb_build_object('weekday', 164, 'weekend', 164),
      'summer', jsonb_build_object('weekday', 243, 'weekend', 243),
      'fall', jsonb_build_object('weekday', 164, 'weekend', 164),
      'note', 'GBP room_only. Canopy & Stars from £164; several pods from £243.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 9 pods. URL loveland.farm. This row is Geodesic Pod qty 9.'
WHERE id = 11275 AND property_id = '201ca453-5d26-4074-abb3-bf269ba23151';

COMMIT;
