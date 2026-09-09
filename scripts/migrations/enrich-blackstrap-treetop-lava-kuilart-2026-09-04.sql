-- Blackstrap (6 domes), Treetop Haven stub + siblings, Camping Lava pitches, De Kuilart pitches.

BEGIN;

-- ============================================================================
-- Blackstrap Glamping Resort — 6 themed luxury domes in the provincial park.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Blackstrap Glamping Resort', slug = 'blackstrap-glamping-resort',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_blackstrap_glamping_2026_09',
  address = 'Blackstrap Provincial Park', city = 'Dundurn', state = 'SK',
  zip_code = NULL, country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://blackstrapglampingresort.ca/', phone_number = '+1-306-381-4665',
  property_total_sites = 6, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Six themed domes in Blackstrap Provincial Park (~25 min south of Saskatoon off Hwy 11): Jack, Winnie, Beachcomber, Manhattan, Fallow, Raven (wheelchair accessible, new 2025). Wood-burning saunas complimentary. Park entry permit required. No operator civic pin published.',
  rate_basis = 'unknown',
  rate_basis_notes = 'CAD. Dynamic ThinkReservations booking; no static nightly card stored. +1 306-381-4665. Blackstrapglampingresort@gmail.com.',
  description = $$Blackstrap Glamping Resort, Blackstrap Provincial Park near Dundurn SK. Six luxury geodesic domes. Lake and saunas. No operator pin published.$$,
  activities_raw = 'On-site: Blackstrap Lake, wood saunas, Sherp off-road (add-on). Nearby: Saskatoon, provincial park trails.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13047 AND property_id = '92fb702c-a793-4f68-b7e1-e9c4e208546e';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 6,
  unit_capacity = '2-4', unit_bed = 'King',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'Yes', unit_hot_tub = 'No', unit_sauna = 'Yes',
  operating_season_months = 'Year-round typical. Six named domes lumped. Do not invent a 7th.',
  minimum_nights = '1',
  unit_description = $$Dome (qty 6): Jack, Winnie, Beachcomber, Manhattan, Fallow, Raven. Raven accessible. Do not invent a 7th dome.$$,
  amenities_raw = 'Geodesic dome; king bed; kitchenette; ensuite. Shared wood saunas. Raven accessible.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD unknown. Dynamic booking; no official static nightly card stored.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Phone +1 306-381-4665. This row is Dome qty 6.'
WHERE id = 13047 AND property_id = '92fb702c-a793-4f68-b7e1-e9c4e208546e';

-- ============================================================================
-- Treetop Haven — publish leftover stub 18; align siblings to official 5+2=7.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Treetop Haven', slug = 'treetop-haven',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_treetop_haven_2026_09',
  address = '1210 Mount Tryon Road', city = 'Mount Tryon', state = 'PE',
  zip_code = 'C0B 1A0', country = 'Canada',
  lat = 46.2954, lon = -63.59346,
  url = 'https://treetophaven.ca/', phone_number = '+1-902-303-2154',
  property_total_sites = 7, year_site_opened = 2017,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official: 5 TreePODS (3 seasonal May–Oct + 2 year-round) and 2 Cozy Cabins (Flora, Fauna). Inventory lives on siblings 10739 / 10740 / 10775. This stub does not add units. Sage 902-439-0792 / total 9 were stale. License 4012956.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Cozy Cabins official $245 + tax, 2-night minimum. TreePOD rates on operator/booking. +1 902-303-2154. info@treetophaven.ca.',
  description = $$Treetop Haven, 1210 Mount Tryon Road, Mount Tryon PE C0B 1A0 (46.2954, -63.59346). Five geodesic TreePODS and two cozy cabins. Private hot tubs.$$,
  activities_raw = 'On-site: woodland trails, private decks, hot tubs, BBQ. Nearby: Red Sands Shore.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 18 AND property_id = '9fb020a7-8dfa-4208-b8fa-26180e44c114';

UPDATE public.all_sage_data
SET
  site_name = 'Inventory on siblings', unit_type = 'Dome', quantity_of_units = NULL,
  unit_capacity = NULL, unit_bed = NULL,
  operating_season_months = 'Year-round property. Do not count this row. SKUs: 10739 seasonal 3, 10740 year-round 2, 10775 cabins 2.',
  minimum_nights = '2',
  unit_description = $$Do not count. Official inventory is on published siblings (5 TreePODS + 2 cabins).$$,
  amenities_raw = 'See sibling SKUs.',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published leftover screenshot stub by id 18 only. Qty null so siblings are not double-counted. Official total 7.'
WHERE id = 18 AND property_id = '9fb020a7-8dfa-4208-b8fa-26180e44c114';

UPDATE public.all_sage_data
SET
  property_total_sites = 7,
  address = '1210 Mount Tryon Road', city = 'Mount Tryon', state = 'PE',
  zip_code = 'C0B 1A0',
  lat = 46.2954, lon = -63.59346,
  url = 'https://treetophaven.ca/', phone_number = '+1-902-303-2154',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Aligned sibling to official 5 TreePODS + 2 cabins (total 7). Update by id.'
WHERE id IN (10739, 10740, 10775)
  AND property_id = '9fb020a7-8dfa-4208-b8fa-26180e44c114';

-- ============================================================================
-- Camping Ecològic Lava — tourist pitches. Not safari-tent glamping.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Camping Ecològic Lava', slug = 'camping-ecologic-lava',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_camping_lava_2026_09',
  address = 'Ctra. Olot a Santa Pau, km 7', city = 'Santa Pau', state = 'Catalonia',
  zip_code = '17811', country = 'Spain',
  lat = 42.152344, lon = 2.546741,
  url = 'https://www.campinglava.com', phone_number = '+34-972-680-358',
  property_total_sites = 132, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Garrotxa volcanic park campground. PiNCAMP ADAC CT7600: 132 tourist pitches + 20 permanent + 19 rentals. Campings in Girona lists 151 parcels / 19 stays. Stored PiNCAMP tourist 132. Sage Safari Tent / total 10 were wrong. Open ~15 Mar–31 Dec.',
  rate_basis = 'unknown',
  rate_basis_notes = 'EUR. Dynamic / request. +34 972 680 358. reserves@campinglava.com.',
  description = $$Camping Ecològic Lava, Ctra. Olot a Santa Pau km 7, 17811 Santa Pau (42.152344, 2.546741). Tourist pitches in Garrotxa. Pool, farm. Not safari-tent glamping.$$,
  activities_raw = 'On-site: pool, playground, mini farm, horse rides. Nearby: Santa Pau, Fageda d''en Jordà, Olot volcanoes.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11185 AND property_id = 'e8d9b93c-cddc-4a67-a55a-13fe4eaa5259';

UPDATE public.all_sage_data
SET
  site_name = 'Tourist Pitch', unit_type = 'Campsite', quantity_of_units = 132,
  unit_capacity = '6', unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Typical 15 Mar–31 Dec. PiNCAMP 132 tourist. 19 rentals unpublished.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty 132): PiNCAMP. Do not invent safari tents or a 19-rental SKU split.$$,
  amenities_raw = 'Pitch; electricity; shared sanitary; pool; restaurant. Pets yes.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR unknown. No official static pitch card stored.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Safari Tent stub. is_glamping_property No. This row is Tourist Pitch 132.'
WHERE id = 11185 AND property_id = 'e8d9b93c-cddc-4a67-a55a-13fe4eaa5259';

-- ============================================================================
-- Vakantiepark De Kuilart — 5-star lake park. Not a 5-safari-tent glampingspot.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Vakantiepark De Kuilart', slug = 'vakantiepark-de-kuilart',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_de_kuilart_2026_09',
  address = 'De Kuilart 1', city = 'Koudum', state = 'Friesland',
  zip_code = '8723 CG', country = 'Netherlands',
  lat = 52.9038, lon = 5.4394,
  url = 'https://www.kuilart.nl/', phone_number = '+31-514-522221',
  property_total_sites = 328, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Ardoer / Bleckman 5-star park on Fluessen. PiNCAMP: 328 tourist pitches + 184 permanent + 65 rentals. Sage Glampingspot / Safari Tent / total 5 were wrong. Lodgetent exists on Ardoer — qty unpublished.',
  rate_basis = 'unknown',
  rate_basis_notes = 'EUR. Dynamic Ardoer booking. +31 514 522221. info@kuilart.nl.',
  description = $$Vakantiepark De Kuilart, De Kuilart 1, 8723 CG Koudum (52.9038, 5.4394). Lake campsite and holiday park. Indoor/outdoor pools. Not safari-tent glamping.$$,
  activities_raw = 'On-site: indoor/outdoor pool, marina, boat hire, playground, grand café. Nearby: Friese meren, Elfsteden.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11097 AND property_id = '870f27a4-8464-4b92-83d5-fdfd179bcd70';

UPDATE public.all_sage_data
SET
  site_name = 'Tourist Pitch', unit_type = 'Campsite', quantity_of_units = 328,
  unit_capacity = '6', unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'Yes',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal typical. PiNCAMP 328 tourist. 65 rentals / lodgetent unpublished.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty 328): PiNCAMP. Do not invent 5 safari tents or a rental SKU split.$$,
  amenities_raw = 'Pitch; electricity; comfort water/drain/TV on some. Shared sanitary. Pets typical.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR unknown. Dynamic Ardoer booking; no static pitch card stored.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Glampingspot Safari Tent stub. is_glamping_property No. This row is Tourist Pitch 328.'
WHERE id = 11097 AND property_id = '870f27a4-8464-4b92-83d5-fdfd179bcd70';

COMMIT;
