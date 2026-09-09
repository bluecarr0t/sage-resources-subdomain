-- Campotel (campground), 350 Farms (3 domes), Mosel Glamping (1 safari tent).

BEGIN;

-- ============================================================================
-- Campotel Bad Rothenfelde — tourist pitches. Not safari-tent glamping.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Campotel Bad Rothenfelde', slug = 'campotel-bad-rothenfelde',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_campotel_bad_rothenfelde_2026_09',
  address = 'Heidland 65', city = 'Bad Rothenfelde', state = 'Lower Saxony',
  zip_code = '49214', country = 'Germany',
  lat = 52.098383, lon = 8.172467,
  url = 'https://www.ueberland-camping.de/campotel', phone_number = '+49-5424-210600',
  property_total_sites = 140, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'Yes', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Überland Campotel, 14 ha, mainly permanent pitches plus tourist pitches, swimming pond, sauna. Sage Welfenallee 1 / campotel.de / +49 5424 2911 were wrong. ACSI touring pitches 140; PiNCAMP lists 323 tourist / camping.info 260 — stored ACSI 140. 12 hire units (mobile homes / camping barrels) unpublished split — not stored.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Operator 2026 Standardstellplatz €15.00 low / €16.00 high (pitch only; people/power extra). Stored 15/16. +49 5424 210600. campotel@ueberland-camping.de.',
  description = $$Überland Campotel at Heidland 65, 49214 Bad Rothenfelde (52.098383, 8.172467). Tourist pitches (ACSI 140). Swimming pond, restaurant, shop. Not safari-tent glamping. 12 rentals unpublished.$$,
  activities_raw = 'On-site: swimming pond, playground, tennis, fitness, kids club, dog meadow. Nearby: Bad Rothenfelde Gradierwerke, Teutoburger Wald, therme.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11012 AND property_id = '80a2721d-f141-4556-95d1-6ad348ba9889';

UPDATE public.all_sage_data
SET
  site_name = 'Tourist Pitch', unit_type = 'Campsite', quantity_of_units = 140,
  unit_capacity = '6', unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round 2026. 140 ACSI touring pitches. 12 rentals unpublished. Permanent pitches not in this qty.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty 140): ACSI touring pitches. Do not invent safari tents or a 12-rental SKU split.$$,
  amenities_raw = 'Pitch; electricity; shared sanitary; pond; shop; restaurant. Pets yes.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 15, 'weekend', 15),
      'spring', jsonb_build_object('weekday', 15, 'weekend', 15),
      'summer', jsonb_build_object('weekday', 16, 'weekend', 16),
      'fall', jsonb_build_object('weekday', 15, 'weekend', 15),
      'note', 'EUR room_only. Operator Standardstellplatz €15 low / €16 high (pitch only).'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Safari Tent stub. Address Heidland 65. URL ueberland-camping.de/campotel. Phone +49 5424 210600. This row is Tourist Pitch 140. is_glamping_property No.'
WHERE id = 11012 AND property_id = '80a2721d-f141-4556-95d1-6ad348ba9889';

-- ============================================================================
-- 350 Farms — 3 private geodesic domes, all-inclusive.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = '350 Farms', slug = '350-farms-cold-lake',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_350_farms_2026_09',
  address = '43101 Township Road 640', city = 'Cold Lake', state = 'AB',
  zip_code = 'T0A 2C1', country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://www.350farms.ca/', phone_number = '+1-431-777-9210',
  property_total_sites = 3, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Stay North / 350 Farms. 152-acre regenerative farm, MD of Bonnyville, ~10 min from Cold Lake. Operator: 3 private geodesic domes (Silent Sky, Wander, Reflections). Off-grid, chef farm-to-table, Nordic spa. No operator GPS published — lat/lon left empty. Contact page zip T0A 2C1 (homepage header also showed T9M 2C1).',
  rate_basis = 'all_inclusive',
  rate_basis_notes = 'CAD. Operator dual-occupancy from-rates include chef meals and beverages: Wander $495 / Reflections $525 / Silent Sky $725. Stored lumped from-rate 495. +1 431-777-9210. hello@350farms.ca.',
  description = $$All-inclusive off-grid glamping at 43101 Township Road 640, MD of Bonnyville near Cold Lake AB. Three private geodesic domes. Chef farm-to-table meals. No operator pin published.$$,
  activities_raw = 'On-site: farm tours, Nordic spa / wood-fired hot tub and sauna, campfire, farm shop. Nearby: Cold Lake, boreal forest.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'Yes', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13072 AND property_id = '91e63339-126e-40a6-b296-29de79f4d816';

UPDATE public.all_sage_data
SET
  site_name = 'Dome', unit_type = 'Dome', quantity_of_units = 3,
  unit_capacity = '2-5', unit_bed = 'Varies by dome',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'Yes',
  operating_season_months = 'Year-round. Three named domes lumped (Silent Sky, Wander, Reflections). Do not invent a 4th dome.',
  minimum_nights = '1',
  unit_description = $$Dome (qty 3): Silent Sky, Wander, Reflections. Lumped. Pets yes. Meals included.$$,
  amenities_raw = 'Geodesic dome; private; meals included; hot tub / sauna access. Pets yes.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 495, 'weekend', 495),
      'spring', jsonb_build_object('weekday', 495, 'weekend', 495),
      'summer', jsonb_build_object('weekday', 495, 'weekend', 495),
      'fall', jsonb_build_object('weekday', 495, 'weekend', 495),
      'note', 'CAD all_inclusive dual occupancy. Operator Wander from $495; Reflections $525; Silent Sky $725. Stored 495.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published Dome qty 3 from 350farms.ca. Address 43101 Twp Rd 640. Phone +1 431-777-9210. No lat/lon. rate_basis → all_inclusive. From-rate CAD 495.'
WHERE id = 13072 AND property_id = '91e63339-126e-40a6-b296-29de79f4d816';

-- ============================================================================
-- Mosel Glamping — one safari tent. Official moselglamping.com.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Mosel Glamping', slug = 'mosel-glamping-traben-trarbach',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_mosel_glamping_2026_09',
  address = 'Dr.-Ernst-Spies-Allee 5', city = 'Traben-Trarbach', state = 'Rhineland-Palatinate',
  zip_code = '56841', country = 'Germany',
  lat = 49.952755, lon = 7.109843,
  url = 'https://www.moselglamping.com/', phone_number = '+49-176-61085452',
  property_total_sites = 1, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'No',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Single original safari tent in a private garden between two historic villas on the Moselle. Operator: you are alone — no additional tents. Sage mosel-glamping.de / Moselstraße 1 / +49 6541 123456 were wrong. Norcamp pin 49.952755, 7.109843.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. No operator from-rate on moselglamping.com pages retrieved. +49 176 61085452. info via moselglamping.com.',
  description = $$One safari tent at Dr.-Ernst-Spies-Allee 5, 56841 Traben-Trarbach (49.952755, 7.109843), in a private riverside garden. Not a campsite and not a multi-tent park.$$,
  activities_raw = 'On-site: terrace, fire bowl, Moselle view. Optional yoga / Qi Gong / pottery. Nearby: Traben-Trarbach old town, Moselle wine villages.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11014 AND property_id = '69723d76-48bc-4ad5-b007-47f671b781ee';

UPDATE public.all_sage_data
SET
  site_name = 'Safari Tent', unit_type = 'Safari Tent', quantity_of_units = 1,
  unit_capacity = '2', unit_bed = 'King',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal-leaning private garden stay. One tent only. Shared showers noted by directory guests.',
  minimum_nights = '1',
  unit_description = $$Safari Tent (qty 1): Single canvas safari tent. Do not invent a 2nd tent or Mosel Glamping II.$$,
  amenities_raw = 'Safari tent; king bed; kitchenette; terrace; Moselle view. Shared sanitary.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object('note', 'EUR room_only. No operator from-rate. Cleared stub 180.')
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published Safari Tent qty 1 from moselglamping.com. Address Dr.-Ernst-Spies-Allee 5. Phone +49 176 61085452. URL .com not .de.'
WHERE id = 11014 AND property_id = '69723d76-48bc-4ad5-b007-47f671b781ee';

COMMIT;
