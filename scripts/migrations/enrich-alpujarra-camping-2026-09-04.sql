-- Camping Alpujarras (Laroles): real operator is campingalpujarras.es,
-- not alpujarracamping.com. Publish tourist pitches only.
-- PiNCAMP: 65 tourist + 9 permanent + 5 rentals (wood cabins, apt, studio,
-- summer safari/tipi, dome — per-SKU counts unpublished).
-- Sources: campingalpujarras.es; PiNCAMP camping-alpujarra.

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Alpujarra Camping',
  slug = 'camping-alpujarras-laroles',
  property_type = 'Campground',
  source = 'Sage',
  discovery_source = 'web_research_camping_alpujarras_operator_2026_09',
  address = 'Ctra. Puerto de la Ragua, km 1',
  city = 'Laroles',
  state = 'Andalusia',
  zip_code = '18494',
  country = 'Spain',
  lat = 37.0226,
  lon = -3.0589,
  url = 'https://campingalpujarras.es/',
  phone_number = '+34-665-843-975',
  property_total_sites = 65,
  year_site_opened = NULL,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'Yes',
  property_laundry = 'No',
  property_pool = 'Yes',
  property_hot_tub = 'Yes',
  property_sauna = 'Yes',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  property_playground = 'No',
  property_general_store = 'No',
  property_extended_stay = 'No',
  property_pickball_courts = 'No',
  property_fitness_room = 'No',
  property_waterfront = 'No',
  property_alcohol_available = 'Yes',
  property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Mountain campground (CM/GR/00031) at Puerto de la Ragua, Laroles, Sierra Nevada. PiNCAMP 65 tourist pitches + 5 rental units (wood cabins, rural apt/studio, summer safari/tipi, geodesic dome) without a published per-SKU split. Seasonal pool. Pets welcome. Distinct from alpujarracamping.com stub URL.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Operator pitch from €24/night. Wood cabin from €80; apt/studio from €70; safari from €80; dome from €100 (summer tipi from €50). Stored pitch from-rate 24. +34 665 84 39 75 (not stub 958 760264).',
  description = $$Camping Alpujarras at Ctra. Puerto de la Ragua km 1, 18494 Laroles (37.0226, -3.0589), on the Sierra Nevada / Cabo de Gata route. 65 tourist pitches (PiNCAMP) plus 5 unpublished-split rentals (wood houses, rural apt, dome, summer tents). Not the alpujarracamping.com stub.$$,
  activities_raw = 'On-site: pool, restaurant, hiking access. Nearby: Puerto de la Ragua, Sierra Nevada, Alpujarra villages, Cabo de Gata route.',
  activities_hiking = 'Yes',
  activities_swimming = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  setting_ranch = 'No',
  setting_field = 'No',
  setting_mountainous = 'Yes',
  rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11197
  AND property_id = '688c9e8b-8d90-4893-ab24-a1ec92048e94';

UPDATE public.all_sage_data
SET
  site_name = 'Tourist Pitch',
  unit_type = 'Campsite',
  quantity_of_units = 65,
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
  unit_campfires = 'No',
  unit_patio = 'No',
  unit_cable = 'No',
  unit_mini_fridge = 'No',
  unit_picnic_table = 'Yes',
  unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  operating_season_months = 'Year-round pitches. 65 tourist (PiNCAMP). 9 permanent not in this qty. 5 rentals unpublished split — not stored.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty 65): Grass / gravel pitches (PiNCAMP). Do not invent safari-tent qty or a 5-bungalow SKU split.$$,
  amenities_raw = 'Pitch; electricity; shared sanitary; Wi-Fi common areas; seasonal pool. Pets yes. From €24.',
  rate_winter_weekday = '24',
  rate_winter_weekend = '24',
  rate_spring_weekday = '24',
  rate_spring_weekend = '24',
  rate_summer_weekday = '24',
  rate_summer_weekend = '24',
  rate_fall_weekday = '24',
  rate_fall_weekend = '24',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Operator pitch from €24. Cleared stub 130 safari ADR.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Safari Tent stub. This row is Tourist Pitch qty 65 (PiNCAMP). URL campingalpujarras.es. Phone +34 665 84 39 75. 5 rentals unpublished. Type Glamping → Campground. rate_basis unknown → room_only.'
WHERE id = 11197
  AND property_id = '688c9e8b-8d90-4893-ab24-a1ec92048e94';

COMMIT;
