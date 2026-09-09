-- ============================================================================
-- Lanzarote Retreats / Finca de Arrieta (Arrieta / Tabayesco): publish 21
-- self-catering units as 12 yurts + 8 cottages + 1 villa. Not 17 yurts.
-- Off-finca villas (e.g. Boutique Beach Villa) are separate — not added.
--
-- Sources (retrieved 2026-09-04):
--   https://www.lanzaroteretreats.com/ + /finca-de-arrieta/
--   i-escape: 8 cottages + 12 yurts + 1 large villa
--   Google/TripAdvisor: Lugar Diseminado 34A, 35542; +34 638 97 32 28
--   Coords 29.1319688, -13.462015
--
-- Operating inventory:
--   Yurt qty 12
--   Cottage qty 8 — stone cottages / casita / barn / lodge / tower / shack
--     lumped (do not invent per-name quantities)
--   Villa qty 1 — Eco Luxury Villa / farmhouse-scale villa at the finca
--   property_total_sites = 21
--
-- Rates EUR, room_only. From ~EUR 100 (littlehotels). KAYAK from ~$77 / avg
--   $163 — stored 100 from-rate.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_name = 'Lanzarote Retreats',
  slug = 'lanzarote-retreats-finca-de-arrieta',
  property_type = 'Glamping',
  source = 'Sage',
  discovery_source = 'web_research_lanzarote_retreats_finca_2026_09',
  address = 'Lugar Diseminado 34A',
  city = 'Arrieta',
  state = 'Canary Islands',
  zip_code = '35542',
  country = 'Spain',
  lat = 29.1319688,
  lon = -13.462015,
  url = 'https://www.lanzaroteretreats.com/',
  phone_number = '+34-638-973-228',
  property_total_sites = 21,
  year_site_opened = 2007,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'No',
  property_laundry = 'Yes',
  property_pool = 'Yes',
  property_hot_tub = 'Yes',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'No',
  property_playground = 'Yes',
  property_general_store = 'Yes',
  property_extended_stay = 'Yes',
  property_pickball_courts = 'No',
  property_fitness_room = 'No',
  property_waterfront = 'No',
  property_alcohol_available = 'No',
  property_ota_platforms = ARRAY['booking.com']::text[],
  ota_url_booking_com = 'https://www.booking.com/hotel/es/eco-chico-yurt.html',
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Family-run off-grid eco village (wind + solar) 300m from Arrieta beach. Operator: 21 self-catering units. i-escape split 12 yurts + 8 cottages + 1 villa. Honesty shop, solar-heated pool, donkeys/chickens. Children 17 and under go free. Do not add off-finca Boutique Beach Villa.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Self-catering. From ~EUR 100 (littlehotels). KAYAK avg ~USD 163 is aggregator — not stored as weekend ADR. Reception 09:00–13:00. +34 638 97 32 28.',
  description = $$Off-grid eco village at Lugar Diseminado 34A, 35542 Arrieta / Tabayesco, Lanzarote (29.1319688, -13.462015). Finca de Arrieta is the core of Lanzarote Retreats: 21 self-catering units — 12 Mongolian yurts, 8 stone cottages/studios, and 1 villa — plus a solar-heated pool and honesty shop. Not 17 yurts. Off-finca villas are separate products.$$,
  activities_raw = 'On-site: solar pool, playground, donkeys/chickens, yoga, communal paella, table tennis, honesty shop. Nearby: Arrieta beach (~300m), Haría, César Manrique sites.',
  activities_hiking = 'Yes',
  activities_swimming = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  setting_ranch = 'No',
  setting_field = 'Yes',
  setting_mountainous = 'Yes',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11201
  AND property_id = 'fd0942c1-508d-4694-9423-3a1439ff9f3c';

UPDATE public.all_sage_data
SET
  site_name = 'Yurt',
  unit_type = 'Yurt',
  quantity_of_units = 12,
  unit_capacity = '2-8',
  unit_bed = 'Varies by yurt',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'Yes',
  unit_full_kitchen = 'Yes',
  unit_air_conditioning = 'No',
  unit_wifi = 'Yes',
  unit_pets = 'No',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'No',
  unit_patio = 'Yes',
  unit_cable = 'No',
  unit_mini_fridge = 'Yes',
  unit_picnic_table = 'Yes',
  unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = NULL,
  season_close_month = NULL,
  operating_season_months = 'Year-round. Twelve yurts (Eco Chico, Palm, Ocean cluster, Royale, Twin, etc.) lumped. Four share a communal kitchen. No A/C — double-lined yurts.',
  minimum_nights = '1',
  unit_description = $$Yurt (qty 12): Mongolian-style yurts at Finca de Arrieta sleeping 2–8 depending on SKU (Chico, Palm, Ocean, Royale, Twin, Suite, etc.). Lumped — do not invent per-name quantities. Most have private kitchens; 4 share communal. Bathrooms beside yurts. Do not store 17 yurts.$$,
  amenities_raw = 'Yurt; kitchen or shared kitchen; terrace; BBQ; Wi-Fi; no A/C; solar/wind power. Shared pool.',
  rate_winter_weekday = '100',
  rate_winter_weekend = '100',
  rate_spring_weekday = '100',
  rate_spring_weekend = '100',
  rate_summer_weekday = '100',
  rate_summer_weekend = '100',
  rate_fall_weekday = '100',
  rate_fall_weekend = '100',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 100, 'weekend', 100),
      'spring', jsonb_build_object('weekday', 100, 'weekend', 100),
      'summer', jsonb_build_object('weekday', 100, 'weekend', 100),
      'fall', jsonb_build_object('weekday', 100, 'weekend', 100),
      'note', 'EUR room_only from-rate ~100 (littlehotels). KAYAK aggregator avg not stored as ADR.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Yurt qty 17 / total 16 stub. This row is Yurt qty 12. Cottage 8 + Villa 1 added = 21.'
WHERE id = 11201
  AND property_id = 'fd0942c1-508d-4694-9423-3a1439ff9f3c';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, unit_picnic_table, unit_charcoal_grill, unit_ada_accessibility,
  year_site_opened, season_open_month, season_close_month,
  operating_season_months, minimum_nights, ota_url_booking_com,
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
  setting_ranch, setting_field, setting_mountainous,
  rv_parking,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', 'Lanzarote Retreats', v.site_name,
  'web_research_lanzarote_retreats_finca_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  21, v.qty, v.unit_type, v.capacity, v.bed,
  'Yes', 'Yes', 'No', 'Yes',
  'No', 'Yes', 'No', 'Yes', 'Yes',
  'No', 'Yes', 'No', 'No', 'No',
  'Yes', 'Yes', 'Yes', 'No',
  2007::numeric, NULL::smallint, NULL::smallint,
  v.season, '1', g.ota_url_booking_com,
  v.unit_desc, v.amenities, g.activities_raw,
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
  g.setting_ranch, g.setting_field, g.setting_mountainous,
  g.rv_parking,
  '100', '100', '100', '100', '100', '100', '100', '100',
  jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 100, 'weekend', 100), 'spring', jsonb_build_object('weekday', 100, 'weekend', 100), 'summer', jsonb_build_object('weekday', 100, 'weekend', 100), 'fall', jsonb_build_object('weekday', 100, 'weekend', 100), 'note', 'EUR room_only from-rate ~100. Off-finca Boutique Beach Villa not this row.')),
  g.rate_basis, g.rate_basis_notes,
  g.description, v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    (
      'Cottage', 8::numeric, 'Cottage', '2-6', 'Varies',
      'Year-round. Eight hard units at the finca (tower, barn, cabin, casita, garden cottage, lodge, surf shack, etc.) lumped per i-escape cottages count.',
      $$Cottage (qty 8): Stone cottages and studios at Finca de Arrieta (Eco Tower, Barn, Cabin, Casita, Garden Cottage, Lodge, Surf Shack and kin). Lumped — do not invent per-name quantities. Self-catering. Do not add off-finca villas.$$,
      'Cottage/studio; kitchen; terrace; BBQ; Wi-Fi; shared solar pool.',
      E'[2026-09-04] Added Cottage qty 8 from i-escape + lanzaroteretreats.com/finca-de-arrieta/.'
    ),
    (
      'Villa', 1::numeric, 'Villa', '6-8', 'Multiple bedrooms',
      'Year-round. One large villa / farmhouse-scale unit on the finca (Eco Luxury Villa / Farmhouse). Do not add Boutique Beach Villa.',
      $$Villa (qty 1): Large self-catering villa at Finca de Arrieta (Eco Luxury Villa / Farmhouse scale). Private outdoor space; some have a plunge pool. Off-finca Boutique Beach Villa is a different product — not stored.$$,
      'Villa; full kitchen; bedrooms for 6–8; terrace; shared or private pool.',
      E'[2026-09-04] Added Villa qty 1 from i-escape (8 cottages + 12 yurts + 1 villa = 21).'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed, season, unit_desc, amenities, note
)
WHERE g.id = 11201
  AND g.property_id = 'fd0942c1-508d-4694-9423-3a1439ff9f3c'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = 'fd0942c1-508d-4694-9423-3a1439ff9f3c'
      AND x.site_name = v.site_name
  );

COMMIT;
