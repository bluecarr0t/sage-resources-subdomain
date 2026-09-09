-- Natura Glamping (7 named domes), Aterra (10 lumped), Foxes (4 domes + 1 RV).

BEGIN;

-- ============================================================================
-- Natura Glamping — 7 unique named domes, not 6.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Natura Glamping', slug = 'natura-glamping-alcongosta',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_natura_glamping_2026_09',
  address = 'Fórneas / Caminho da Casa do Guarda, Serra da Gardunha',
  city = 'Alcongosta', state = 'Castelo Branco',
  zip_code = '6230-040', country = 'Portugal',
  lat = 40.108979, lon = -7.483383,
  url = 'https://www.naturaglamping.com/', phone_number = '+351-275-031-786',
  property_total_sites = 7, year_site_opened = 2015,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'Yes', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'RNET 5473 Eco Glamping Gardunha Lda. Seven unique themed geodesic domes on Serra da Gardunha. Saltwater infinity pool, ALKIMYA restaurant. Sage Quinta das Tapadas / +351 275 982 456 / qty 6 were wrong. Homepage CMS leftover “AlpenHouse” is theme junk — not a Swiss ski resort.',
  rate_basis = 'unknown',
  rate_basis_notes = 'EUR. Breakfast offered; inclusion not published on operator pages. No official from-rate. Stub 200 not stored as ADR. +351 275 031 786 / +351 933 529 451.',
  description = $$Seven themed geodesic domes at Fórneas / Caminho da Casa do Guarda, 6230-040 Alcongosta (40.108979, -7.483383), Serra da Gardunha. Infinity pool and ALKIMYA restaurant. Not 6 domes. Not Quinta das Tapadas.$$,
  activities_raw = 'On-site: pool, restaurant, dome stays. Nearby: Serra da Gardunha, Fundão, Alcongosta cherry country.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11160 AND property_id = '8b27a6aa-f974-47bd-a892-d6a68efcd59c';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 7,
  unit_capacity = '2-4', unit_bed = 'Varies by theme (Suite Lux / Júnior / temas)',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Seven unique named domes lumped (Suite Lux, Cogumelo, Água, Cereja, Castanha, Mel, Júnior Natureza). Do not add Casa do Guarda.',
  minimum_nights = '1',
  unit_description = $$Dome (qty 7): Unique themed geodesic domes. Suite Lux has indoor jacuzzi. Lumped — do not invent an 8th dome.$$,
  amenities_raw = 'Dome; private bath; infinity pool; restaurant. Suite Lux jacuzzi.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object('note', 'EUR. No operator from-rate. Breakfast inclusion unknown. Cleared stub 200.')
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published Dome qty 7 from naturaglamping.com/website/alojamento/. Address/phone/coords corrected. Qty 6 stub dropped.'
WHERE id = 11160 AND property_id = '8b27a6aa-f974-47bd-a892-d6a68efcd59c';

-- ============================================================================
-- Aterra — 10 accommodations, unpublished per-SKU split.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Aterra', slug = 'aterra-sao-teotonio',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_aterra_2026_09',
  address = 'Carvalhal das Figueiras, Corgo da Casca',
  city = 'São Teotónio', state = 'Alentejo',
  zip_code = '7630-635', country = 'Portugal',
  lat = 37.5004694, lon = -8.7181194,
  url = 'https://www.aterra.pt/', phone_number = '+351-926-924-468',
  property_total_sites = 10, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'ATERRA Eco Boutique. Operator: ten accommodations — Imagination Yurts, Sunshine Tipis, Wooden Chalet, Couples Cabin, Family Cabin, Silvia Air-Stream, Bell Tent. Per-SKU counts unpublished — lumped. Seasonal April–end October. Freshwater lake / private beach, not a pool. Sage Safari Tent qty 12 is wrong.',
  rate_basis = 'unknown',
  rate_basis_notes = 'EUR. Meals sold (breakfast/lunch/dinner) — not stated as included. No operator from-rate. Do not use C&S £100–150 or stub 150.',
  description = $$Seasonal eco-glamping at Carvalhal das Figueiras, Corgo da Casca, 7630-635 São Teotónio (37.5004694, -8.7181194). Ten mixed accommodations. Lake swimming. April–October. Not 12 safari tents.$$,
  activities_raw = 'On-site: freshwater lake, private beach, playground, reception bar/meals. Nearby: Costa Vicentina, São Teotónio, Alentejo coast.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  season_open_month = 4, season_close_month = 10,
  date_updated = '2026-09-04'
WHERE id = 11142 AND property_id = '4ccd71ab-a9e9-443a-9e1c-ef5e605e5710';

UPDATE public.all_sage_data
SET
  site_name = 'Accommodation', unit_type = 'Other Glamping', quantity_of_units = 10,
  unit_capacity = '2-6', unit_bed = 'Varies (yurt / tipi / cabin / Airstream / bell)',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal April–end October. Ten mixed units lumped. Do not invent per-SKU quantities.',
  minimum_nights = '2',
  unit_description = $$Accommodation (qty 10): Operator total only. Types include yurts, tipis, chalet, cabins, one Airstream and a bell tent — unpublished split. Do not invent 12 safari tents.$$,
  amenities_raw = 'Mixed glamping; lake; meals available; playground. Seasonal.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object('note', 'EUR. No operator from-rate. Cleared stub 150 safari ADR.')
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Safari Tent qty 12 stub. Operator total 10 lumped. Zip 7630-635. Phone +351 926 924 468. Year 2013 cleared.'
WHERE id = 11142 AND property_id = '4ccd71ab-a9e9-443a-9e1c-ef5e605e5710';

-- ============================================================================
-- Foxes Glamping Domes — 4 Fox Dens + 1 RV. No invented lat/lon.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Foxes Glamping Domes', slug = 'foxes-glamping-domes-pouch-cove',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_foxes_glamping_domes_2026_09',
  address = '748-750 Pouch Cove Line', city = 'Pouch Cove', state = 'NL',
  zip_code = 'A0A 3L0', country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://www.foxglampingdomesinc.ca/', phone_number = '+1-709-765-5569',
  property_total_sites = 5, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Four-season geodesic Fox Den 1–4 plus one 2021 RV trailer. NL municipal plan 2023: four glamping domes + accessory building on 1.323 ha at 748–750 Pouch Cove Line. BYO tent park exists — pitch count unpublished. Pets no in/around domes; leash-only in tent area. Do not store a road-centroid as the property pin.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Operator / Lodgify nightly fee CAD $289 per Fox Den. Trailer and tent rates unpublished. +1 709-765-5569. glamping@foxglampingdomesinc.ca.',
  description = $$Four geodesic Fox Dens and one RV trailer at 748–750 Pouch Cove Line, Pouch Cove NL A0A 3L0. Private hot tubs. Tent-park pitches unpublished. No operator GPS published — lat/lon left empty.$$,
  activities_raw = 'On-site: private hot tub, firewood, playground, tent area. Nearby: Pouch Cove, East Coast Trail, St. John''s.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 13060 AND property_id = '5933b155-6074-4ef8-a40a-aa0ba3246103';

UPDATE public.all_sage_data
SET
  site_name = 'Fox Den', unit_type = 'Dome', quantity_of_units = 4,
  unit_capacity = '4', unit_bed = 'King',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Four Fox Dens. Pets no in/around domes.',
  minimum_nights = '1',
  unit_description = $$Fox Den (qty 4): Geodesic domes with private hot tub, king bed, bath, A/C, Wi-Fi. Do not invent a 5th dome.$$,
  amenities_raw = 'Dome; king; private hot tub; A/C; Wi-Fi; bath. Pets no.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 289, 'weekend', 289),
      'spring', jsonb_build_object('weekday', 289, 'weekend', 289),
      'summer', jsonb_build_object('weekday', 289, 'weekend', 289),
      'fall', jsonb_build_object('weekday', 289, 'weekend', 289),
      'note', 'CAD room_only. Operator / Lodgify $289 per Fox Den per night.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published Dome qty 4 from foxglampingdomesinc.ca + NL plan. Address 748–750 Pouch Cove Line. Phone +1 709-765-5569. No lat/lon. RV trailer added. Tent pitches unpublished.'
WHERE id = 13060 AND property_id = '5933b155-6074-4ef8-a40a-aa0ba3246103';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, unit_picnic_table, unit_charcoal_grill, unit_ada_accessibility,
  operating_season_months, minimum_nights,
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
  'published', 'Yes', 'Yes', 'Sage', 'Foxes Glamping Domes', 'RV Trailer',
  'web_research_foxes_glamping_domes_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country, g.slug, g.property_type,
  5, 1::numeric, 'RV', 'varies', '2021 RV beds',
  'Yes', 'Yes', 'No', 'Yes',
  'Yes', 'Yes', 'No', 'Yes', 'Yes',
  'Yes', 'Yes', 'No', 'No', 'No',
  'Yes', 'No', 'No', 'No',
  'Year-round typical. One fully set-up 2021 RV trailer. Children welcome. Rate unpublished.',
  '1',
  $$RV Trailer (qty 1): Operator “fully set-up 2021 RV Trailer.” Do not invent a 2nd trailer or a tent-pitch total.$$,
  'RV trailer; set-up. Rate unpublished.',
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
  jsonb_build_object('2026', jsonb_build_object('note', 'CAD. Trailer rate unpublished on operator pages retrieved.')),
  g.rate_basis, g.rate_basis_notes, g.description,
  E'[2026-09-04] Added RV Trailer qty 1 from foxglampingdomesinc.ca.'
FROM public.all_sage_data g
WHERE g.id = 13060 AND g.property_id = '5933b155-6074-4ef8-a40a-aa0ba3246103'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = '5933b155-6074-4ef8-a40a-aa0ba3246103' AND x.site_name = 'RV Trailer'
  );

COMMIT;
