-- ============================================================================
-- Shortgrass Resort (Spearfish, SD): enrich sparse discovery shell (id 13144).
--
-- Sources (retrieved 2026-07-31):
--   https://shortgrassresort.com/ + /accommodations-2/ + /contact/
--   https://605magazine.com/2024/08/29/shortgrass-resort/
--   OSM/Photon: Shortgrass Resort @ 19343 Shortgrass Lane → 44.5960145, -103.9012526
--
-- Inventory:
--   8 identical De Waard (NL) canvas-sided bungalow tents on elevated platforms
--   Named after native plants (Blue Aster, Goat's Beard, Little Bluestem, Prairie Clover,
--   Prairie Coneflower, Scarlet Globemallow, White Sage, Wild Indigo) — same SKU
--   350 sq ft interior + 225 sq ft private deck; king bed; ensuite bath
--
-- Rates (published flat, all-inclusive):
--   2026 season $1,150/bungalow/night — 1 May thru 4 October
--   2027 season $1,300/bungalow/night — noted in rate_basis_notes only
--     (do not put 2027 in rate_unit_rates_by_year yet — sync_season_rates_from_latest_year
--      would overwrite rate_* columns with the later year)
--   Includes Meander restaurant meals + $20 beverage credit/bungalow/day
--   Winter closed (seasonal May–early Oct)
--
-- rate_avg_retail_daily_rate maintained by calc_avg_rate_trigger on all_sage_data.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  property_name = 'Shortgrass Resort',
  slug = 'shortgrass-resort',
  site_name = 'Private Bungalow',
  unit_type = 'Canvas Cabin',
  quantity_of_units = 8,
  property_total_sites = 8,
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_type = 'Glamping',
  address = '19343 Shortgrass Lane',
  city = 'Spearfish',
  state = 'SD',
  zip_code = '57783',
  country = 'United States',
  lat = 44.5960145,
  lon = -103.9012526,
  url = 'https://shortgrassresort.com/',
  phone_number = '+1 605-340-5797',
  year_site_opened = '2024',
  season_open_month = '5',
  season_close_month = '10',
  operating_season_months = '5',
  unit_capacity = '2',
  unit_sq_ft = '350',
  unit_bed = 'King',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_air_conditioning = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  property_hot_tub = 'Yes',
  property_pool = 'Yes',
  property_sauna = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'Yes',
  glamping_service_tier = 'luxury',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Adults-only all-inclusive De Waard bungalows; published ADR $1,150 (2026) with meals at Meander',
  rate_basis = 'all_inclusive',
  rate_basis_notes = '2026 published $1,150/bungalow/night all-inclusive (meals at Meander + $20 beverage credit/day). 2027 published $1,300/night (same inclusions). Source: shortgrassresort.com/accommodations-2, Jul 2026.',
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = '1150',
  rate_spring_weekend = '1150',
  rate_summer_weekday = '1150',
  rate_summer_weekend = '1150',
  rate_fall_weekday = '1150',
  rate_fall_weekend = '1150',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', null, 'weekend', null),
      'spring', jsonb_build_object('weekday', 1150, 'weekend', 1150),
      'summer', jsonb_build_object('weekday', 1150, 'weekend', 1150),
      'fall', jsonb_build_object('weekday', 1150, 'weekend', 1150),
      'note', 'Flat published all-inclusive rate $1,150/night for 2026 season (1 May–4 Oct). Winter closed. 2027 $1,300 noted in rate_basis_notes.'
    )
  ),
  description = 'Adults-only (18+), all-inclusive luxury glamping resort on 52 private acres along the Redwater River just north of Spearfish in the Black Hills. Eight De Waard European canvas bungalows (native-plant names) with ensuite baths, king beds, heated floors, and private decks. Meals at on-site farm-to-table Meander restaurant; heated pool & hot tub; infrared sauna/wellness studio. No pets. Seasonal May–early October.',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-31] Web research enrichment: shortgrassresort.com + 605 Magazine. 8 Private Bungalows (Canvas Cabin / De Waard); qty 8; address 19343 Shortgrass Lane, Spearfish SD 57783; geocoded OSM 44.5960145,-103.9012526; 2026 all-inclusive $1,150 flat (May–Oct); winter closed; unit names Blue Aster, Goat''s Beard, Little Bluestem, Prairie Clover, Prairie Coneflower, Scarlet Globemallow, White Sage, Wild Indigo.',
  discovery_source = COALESCE(NULLIF(btrim(discovery_source), ''), 'web_research_shortgrass_2026_07_31'),
  date_updated = '2026-07-31'
WHERE id = 13144
  AND property_id = 'ea7213c5-b25d-4bf4-8eba-03835dc49884';

COMMIT;
