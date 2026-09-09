-- ============================================================================
-- Bavarian Forest Glamping (Am Schwaimberg, Grafenau): publish as Closed.
-- Former Berliner Feriendorf was demolished; Familie Schon (Schreinerhof)
-- is planning a luxury camping / glamping resort. June 2026 council advanced
-- land-use plans. Website bavarianforestglamping.de returned 500. Do NOT
-- invent 10 operating safari tents.
-- Distinct from Bavarian Forest Holidays (Regen) — do not touch that row.
--
-- Sources (retrieved 2026-09-04):
--   PNP Grafenau: Am Schwaimberg lost-place / planned luxury camping
--   Street coords Am Schwaimberg 48.8626172, 13.3999991
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Closed',
  is_glamping_property = 'Yes',
  property_name = 'Bavarian Forest Glamping',
  slug = 'bavarian-forest-glamping-grafenau',
  property_type = 'Glamping',
  source = 'Sage',
  discovery_source = 'web_research_bavarian_forest_glamping_pnp_2026_09',
  address = 'Am Schwaimberg 1',
  city = 'Grafenau',
  state = 'Bavaria',
  zip_code = '94481',
  country = 'Germany',
  lat = 48.8626172,
  lon = 13.3999991,
  url = 'https://bavarianforestglamping.de',
  phone_number = '+49-8552-9600',
  property_total_sites = 0,
  year_site_opened = NULL,
  property_clubhouse = 'No',
  property_food_on_site = 'No',
  property_restaurant = 'No',
  property_laundry = 'No',
  property_pool = 'No',
  property_hot_tub = 'No',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No',
  property_has_rentals = 'No',
  property_playground = 'No',
  property_general_store = 'No',
  property_extended_stay = 'No',
  property_pickball_courts = 'No',
  property_fitness_room = 'No',
  property_waterfront = 'No',
  property_alcohol_available = 'No',
  property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Planned luxury camping/glamping on the demolished Berliner Feriendorf site at Am Schwaimberg, Grafenau. Familie Schon (Schreinerhof, Schönberg) received the key Feb 2024; Stadtrat advanced Flächennutzung/Bebauungsplan June 2026. Not operating. Distinct from Bavarian Forest Holidays in Regen.',
  rate_basis = 'unknown',
  rate_basis_notes = 'EUR. No operating rate — site is not open. Stub 180 ADR cleared. Phone +49 8552 9600 may be legacy Feriendorf / town, not a live booking line.',
  description = $$Planned (not operating) luxury camping / glamping resort on the former Feriendorf site at Am Schwaimberg 1, 94481 Grafenau, Bavaria (48.8626172, 13.3999991). Holiday village demolished ~2021; 2026 planning only. Do not store 10 safari tents. Not Bavarian Forest Holidays (Regen).$$,
  activities_raw = 'Planned: camping, later treehouses / bathhouse / hotel per PNP. Nearby: Bavarian Forest National Park, Lusen. Not currently bookable.',
  activities_hiking = 'Yes',
  activities_swimming = 'No',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  setting_ranch = 'No',
  setting_field = 'Yes',
  setting_mountainous = 'Yes',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11006
  AND property_id = 'a1bdac86-2b31-4e98-ab21-56cfdf975cda';

UPDATE public.all_sage_data
SET
  site_name = 'Planned Glamping (not operating)',
  unit_type = 'Safari Tent',
  quantity_of_units = 0,
  unit_capacity = NULL,
  unit_bed = NULL,
  unit_private_bathroom = 'No',
  unit_shower = 'No',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'No',
  unit_wifi = 'No',
  unit_pets = 'No',
  unit_electricity = 'No',
  unit_water = 'No',
  unit_campfires = 'No',
  unit_patio = 'No',
  unit_cable = 'No',
  unit_mini_fridge = 'No',
  unit_picnic_table = 'No',
  unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Not operating. Planning-stage resort only as of June 2026.',
  minimum_nights = NULL,
  unit_description = $$Planned Glamping (qty 0): No operating safari tents. Former Feriendorf demolished. Do not invent qty 10.$$,
  amenities_raw = 'None — site not operating.',
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = NULL,
  rate_spring_weekend = NULL,
  rate_summer_weekday = NULL,
  rate_summer_weekend = NULL,
  rate_fall_weekday = NULL,
  rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'Not operating. Cleared stub EUR 180. No ADR.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published Closed. Cleared Safari Tent qty 10 stub — Am Schwaimberg is a planned/not-open resort (PNP + Grafenau Stadtrat June 2026). Distinct from Bavarian Forest Holidays Regen.'
WHERE id = 11006
  AND property_id = 'a1bdac86-2b31-4e98-ab21-56cfdf975cda';

COMMIT;
