-- Algonquin Eco-Lodge (17 rooms), Poggio Rosso (tent lodges, qty unpublished), Camping Órgiva.

BEGIN;

-- ============================================================================
-- Algonquin Eco-Lodge — off-grid lodge hotel. Not 5 domes.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Algonquin Eco-Lodge', slug = 'algonquin-eco-lodge',
  property_type = 'Outdoor Boutique Hotel', source = 'Sage',
  discovery_source = 'web_research_algonquin_eco_lodge_2026_09',
  address = '3594 Elephant Lake Road', city = 'Algonquin Park', state = 'ON',
  zip_code = 'K0L 1X0', country = 'Canada',
  lat = 45.19425, lon = -78.1329,
  url = 'https://www.algonquinecolodge.com/', phone_number = '+1-905-471-9453',
  property_total_sites = 17, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Call of the Wild off-grid lodge. Official 17 private bedrooms / up to 34 guests. 2.3 km walk-in. Micro-hydro. Sage 123 Eco Lodge Road / +1 705-633-1234 / Dome qty 5 were placeholders. Parking-lot sign GPS N45 11.655 W78 07.974. Kids under 6 not accepted. Do not merge Four Corners Algonquin (Whitney).',
  rate_basis = 'full_board',
  rate_basis_notes = 'CAD per person, not per room. Operator: $215 pp/night 15 May–8 Oct with meals; $195 winter. 2-night minimum (3 on long weekends). +1 905-471-9453. EcoLodge@CallOfTheWild.ca.',
  description = $$Algonquin Eco-Lodge, 3594 Elephant Lake Road, Moffat Pond (45.19425, -78.1329). Seventeen-bedroom off-grid lodge. Meals included. Not geodesic-dome glamping.$$,
  activities_raw = 'On-site: private lake canoe, hot tub, wood sauna, hiking/ski trails. Nearby: Algonquin Park, York River.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'No',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 133 AND property_id = '0d97ddb4-fa71-413e-82d2-0505a736a368';

UPDATE public.all_sage_data
SET
  site_name = 'Lodge Bedroom', unit_type = 'Hotel Room', quantity_of_units = 17,
  unit_capacity = '2', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'Yes',
  operating_season_months = 'Year-round typical. Official 17 bedrooms. Do not invent 5 domes.',
  minimum_nights = '2',
  unit_description = $$Lodge Bedroom (qty 17): Official private bedrooms in the lodge. Shared dining. No TV/wifi/cell. Do not invent domes.$$,
  amenities_raw = 'Private bedroom; lodge meals; shared hot tub and sauna. Digital detox.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 195, 'weekend', 195),
      'spring', jsonb_build_object('weekday', 215, 'weekend', 215),
      'summer', jsonb_build_object('weekday', 215, 'weekend', 215),
      'fall', jsonb_build_object('weekday', 215, 'weekend', 215),
      'note', 'CAD full_board PER PERSON. Operator $215 summer / $195 winter. Not a room-night.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Dome stub. Address 3594 Elephant Lake Road. Phone +1 905-471-9453. is_glamping_property No. This row is Lodge Bedroom 17.'
WHERE id = 133 AND property_id = '0d97ddb4-fa71-413e-82d2-0505a736a368';

-- ============================================================================
-- Tenuta Poggio Rosso Glamping — tent lodges. Count unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Tenuta Poggio Rosso Glamping', slug = 'tenuta-poggio-rosso-glamping',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_poggio_rosso_2026_09',
  address = 'Loc. Poggio Rosso 1, Viale Etruria 1', city = 'Populonia', state = 'Tuscany',
  zip_code = '57025', country = 'Italy',
  lat = 42.994323, lon = 10.536845,
  url = 'https://www.poggiorossoglamping.it/en/glamping-in-tuscany.html',
  phone_number = '+39-0565-1970527',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Estate tent-lodges near Baratti / Populonia. Types 25 m²/2p, 35 m²/4p, 38–40 m²/5p. Ensuite, A/C, garden, one accessible 5p lodge. Sage tenutapoggiorosso.com / +39 0565 29666 / total 10 were wrong. 2017 price list is stale — not stored as 2026 rates.',
  rate_basis = 'unknown',
  rate_basis_notes = 'EUR. No current public nightly card stored (2017 list ignored). +39 0565 1970527. info@poggiorossoglamping.it.',
  description = $$Tenuta Poggio Rosso Glamping, Loc. Poggio Rosso 1, 57025 Stazione di Populonia / Piombino (42.994323, 10.536845). Tent-lodges on a wine/olive estate. Year-round. Lodge count unpublished.$$,
  activities_raw = 'On-site: estate trails, olive grove, vineyard. Nearby: Baratti beach, Populonia, Tuscan Archipelago.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11073 AND property_id = '7fd59401-de6c-4058-958f-82d655dc0fb9';

UPDATE public.all_sage_data
SET
  site_name = 'Tent Lodge', unit_type = 'Safari Tent', quantity_of_units = NULL,
  unit_capacity = '2-5', unit_bed = 'Varies by size',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'Yes', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round. 2/4/5-person lodge types. Count unpublished. Do not invent qty 10.',
  minimum_nights = '1',
  unit_description = $$Tent Lodge: 25/35/38–40 m² types lumped. Qty unpublished. One accessible 5p lodge.$$,
  amenities_raw = 'Tent lodge; ensuite; A/C; garden; minibar; Smart TV; wifi.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR unknown. 2017 list not stored as current rates.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. URL poggiorossoglamping.it. Phone +39 0565 1970527. Qty unpublished.'
WHERE id = 11073 AND property_id = '7fd59401-de6c-4058-958f-82d655dc0fb9';

-- ============================================================================
-- Camping Órgiva — 31 pitches + 11 bungalows. Not safari-tent glamping.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Camping Órgiva', slug = 'camping-orgiva',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_camping_orgiva_2026_09',
  address = 'Ctra. A-348, Km 18.9, Cortijo del Cura', city = 'Órgiva', state = 'Andalusia',
  zip_code = '18400', country = 'Spain',
  lat = 36.8894, lon = -3.4224,
  url = 'https://www.campingorgiva.com/', phone_number = '+34-958-784307',
  property_total_sites = 42, year_site_opened = 1996,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Alpujarra campground since 1996. Operator reservation copy: 31 parcelas + 11 bungalows. Tree cabin (Cabaña del Árbol) exists with shared bath — unpublished extra. Sage Safari Tent / total 10 were wrong.',
  rate_basis = 'unknown',
  rate_basis_notes = 'EUR. Request / booking. +34 958 784307. Pets extra (~€7).',
  description = $$Camping Órgiva, Ctra. A-348 Km 18.9, 18400 Órgiva (36.8894, -3.4224). 31 pitches and 11 bungalows. Restaurant, pool. Not safari-tent glamping.$$,
  activities_raw = 'On-site: pool, restaurant, playground. Nearby: Alpujarra, Sierra Nevada, Órgiva.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11195 AND property_id = 'ebd9f6b8-dab4-44ed-85fe-e96dbaeb4651';

UPDATE public.all_sage_data
SET
  site_name = 'Camping Pitch', unit_type = 'Campsite', quantity_of_units = 31,
  unit_capacity = '6', unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Operator 31 parcelas. Tree cabin unpublished.',
  minimum_nights = '1',
  unit_description = $$Camping Pitch (qty 31): Operator. Do not invent safari tents.$$,
  amenities_raw = 'Pitch ~60 m²; electricity; water nearby; shared sanitary. Pets yes.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR unknown. No official static pitch card stored.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Safari Tent stub. is_glamping_property No. This row is Pitch 31. Bungalow inserted.'
WHERE id = 11195 AND property_id = 'ebd9f6b8-dab4-44ed-85fe-e96dbaeb4651';

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
  'published', 'Yes', 'No', 'Sage', 'Camping Órgiva', 'Bungalow',
  'web_research_camping_orgiva_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country, g.slug, g.property_type,
  42, 11, 'Cabin', '2-6', 'Varies',
  'Yes', 'Yes', 'No', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'No', 'Yes', 'No', 'No', 'No',
  'Yes', 'No', 'Yes', 'No',
  1996, 'Year-round typical. Operator 11 bungalows 2/4/6 pax. Tree cabin unpublished.', '1',
  'Bungalow (qty 11): Operator. Kitchen and ensuite typical. Do not invent a 12th.',
  'Bungalow; kitchen; ensuite; some hydromassage bath; garden/BBQ typical. Pets extra.',
  g.activities_raw,
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
  g.setting_ranch, g.setting_field, g.setting_mountainous, g.rv_parking,
  jsonb_build_object('2026', jsonb_build_object(
    'note', 'EUR unknown. No official static bungalow card stored.'
  )),
  g.rate_basis, g.rate_basis_notes, g.description,
  E'[2026-09-04] Added Bungalow qty 11 from campingorgiva.com reservation copy.'
FROM public.all_sage_data g
WHERE g.id = 11195 AND g.property_id = 'ebd9f6b8-dab4-44ed-85fe-e96dbaeb4651'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = 'ebd9f6b8-dab4-44ed-85fe-e96dbaeb4651' AND x.site_name = 'Bungalow'
  );

COMMIT;
