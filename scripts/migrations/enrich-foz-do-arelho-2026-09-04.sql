-- Orbitur Foz do Arelho: publish tourist pitches. Not safari-tent glamping.
-- PiNCAMP: 182 tourist + 80 permanent + 43 rentals (SKU split unpublished).
-- Sources: orbitur.pt; PiNCAMP orbitur-camping-foz-do-arelho.

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'No',
  property_name = 'Parque de Campismo de Foz do Arelho',
  slug = 'orbitur-foz-do-arelho',
  property_type = 'Campground',
  source = 'Sage',
  discovery_source = 'web_research_orbitur_foz_do_arelho_2026_09',
  address = 'Rua Maldonado Freitas',
  city = 'Caldas da Rainha',
  state = 'Leiria',
  zip_code = '2500-516',
  country = 'Portugal',
  lat = 39.4308,
  lon = -9.20111,
  url = 'https://www.orbitur.pt/en/destinations/region-center/orbitur-foz-do-arelho/camping',
  phone_number = '+351-262-978-683',
  property_total_sites = 182,
  year_site_opened = NULL,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'Yes',
  property_laundry = 'Yes',
  property_pool = 'Yes',
  property_hot_tub = 'No',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  property_playground = 'Yes',
  property_general_store = 'Yes',
  property_extended_stay = 'Yes',
  property_pickball_courts = 'No',
  property_fitness_room = 'No',
  property_waterfront = 'No',
  property_alcohol_available = 'Yes',
  property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Orbitur pine-forest campground 2–2.5 km from Foz do Arelho lagoon / Atlantic beach. PiNCAMP 182 tourist + 80 permanent pitches + 43 rental units without a published per-SKU split. Seasonal pool, restaurant, mini-market. Not a safari-tent park.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Dynamic Orbitur pitch pricing — no static ADR stored. Stub 120 not used as pitch ADR. +351 262 978 683 (not stub 978 010). infofozarelho@orbitur.pt.',
  description = $$Orbitur campground at Rua Maldonado Freitas, 2500-516 Foz do Arelho (39.4308, -9.20111), in pine woods 2 km from the village and ~2.5 km from the Atlantic / Óbidos lagoon. 182 tourist pitches (PiNCAMP). 43 rentals unpublished split — not stored. Open year-round. Not safari-tent glamping.$$,
  activities_raw = 'On-site: seasonal pool, playground, restaurant, shop, bike paths. Nearby: Foz do Arelho beach and lagoon, Óbidos, Caldas da Rainha.',
  activities_hiking = 'Yes',
  activities_swimming = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No',
  activities_scenic_drives = 'Yes',
  setting_ranch = 'No',
  setting_field = 'Yes',
  setting_mountainous = 'No',
  rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11167
  AND property_id = '0b467f81-63ad-43a8-9643-7cae2fa2ef80';

UPDATE public.all_sage_data
SET
  site_name = 'Tourist Pitch',
  unit_type = 'Campsite',
  quantity_of_units = 182,
  unit_capacity = '6',
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
  unit_ada_accessibility = 'Yes',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  operating_season_months = 'Year-round. 182 tourist pitches (PiNCAMP). 80 permanent pitches not in this qty. 43 rentals unpublished split — not stored.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty 182): PiNCAMP tourist pitches (tent, caravan, motorhome) on terraced pine/dune ground. Do not invent safari-tent inventory or a 43-rental SKU split.$$,
  amenities_raw = 'Pitch; electricity; shared sanitary; seasonal pool; restaurant; shop. Pets yes.',
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
      'note', 'EUR room_only. Dynamic Orbitur pricing — no static ADR. Cleared stub 120.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Safari Tent stub. This row is Tourist Pitch / Campsite qty 182 (PiNCAMP). 43 rentals unpublished. URL/phone corrected to orbitur.pt / +351 262 978 683. is_glamping_property No. rate_basis unknown → room_only.'
WHERE id = 11167
  AND property_id = '0b467f81-63ad-43a8-9643-7cae2fa2ef80';

COMMIT;
