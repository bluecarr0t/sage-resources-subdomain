-- ============================================================================
-- Collective Retreats Vail (Wolcott, CO / 4 Eagle Ranch): publish last
-- operating mix as Closed. Distinct from Collective Governors Island (NY),
-- Collective Hill Country (TX), closed Hudson Valley / Yellowstone
-- Collective sites, The Glamping Collective (NC/GA), and 4 Eagle Ranch’s
-- current own 6 safari tents (4eagleranch.com/lodging/vailvalleyglamping).
-- Do not merge 4 Eagle Ranch inventory. Do not invent Outlook Shelters
-- (2019 launch was Governors Island; no published Vail Outlook count).
-- Do not add the Outdoorsy RV-parking package as an RV Site SKU.
--
-- Sources (retrieved 2026-09-04):
--   https://collectiveretreats.com/outdoorsy/vail-experience/
--     (stale package page; /vail/ serves the same copy)
--   https://collectiveretreats.com/faqs/ — “We currently operate on
--     Governors Island” only
--   Google Maps (Permanently closed):
--     https://www.google.com/maps/place/Collective+Vail+-+a+Retreat+at+4+Eagle+Ranch/@39.7497291,-106.6715393,17z
--     lat 39.7497291 / lon -106.6715393; plus code P8XH+V9
--     4098 CO-131, Wolcott, CO 81655
--     (skip google_place_id — /g/11c483ckgq only, not ChIJ)
--   Spoke+Blossom / Yoga+Life editor notes (2025): permanently closed
--   5280 Traveler 2019 + Spoke+Blossom 2021: opened Summer 2015; 18 tents
--   Uncover Colorado / Glamping.com (historical last-operating mix)
--
-- Last operating inventory (18 tents; qty_sum was 26 because of leftover
--   unnamed Safari Tent qty 8 on id 87):
--   Summit Tent qty 12 — Safari Tent, ensuite (keep id 10115)
--   Journey Tent qty 6 — Safari Tent, shared bathhouse (id 10571; was
--     mislabeled Bell Tent)
--   id 87 unnamed qty 8 → rejected (would break the 18-tent total)
--   property_total_sites = 18
--
-- Rates USD, breakfast (last known operating). Do not set
--   rate_avg_retail_daily_rate (trigger). Winter null (seasonal May–Sep).
--   Summit keeps 425/510. Journey stores last ADR 367 flat. Glamping.com
--   “from $500” was a blended listing. Outdoorsy 15% weekday package is
--   leftover marketing, not a live ADR.
-- ============================================================================

BEGIN;

-- Property-level fields on the two kept SKUs.
UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Closed',
  is_glamping_property = 'Yes',
  property_name = 'Collective Retreats Vail',
  slug = 'collective-retreats-vail-wolcott-co',
  property_type = 'Glamping',
  source = 'Sage',
  discovery_source = 'web_research_collective_retreats_vail_operator_gmaps_2026_09',
  address = '4098 Colorado Highway 131',
  city = 'Wolcott',
  state = 'CO',
  zip_code = '81655',
  country = 'United States',
  lat = 39.7497291,
  lon = -106.6715393,
  url = 'https://collectiveretreats.com/outdoorsy/vail-experience/',
  phone_number = '+1-970-445-2033',
  property_total_sites = 18,
  year_site_opened = 2015,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'Yes',
  property_laundry = 'No',
  property_pool = 'No',
  property_hot_tub = 'No',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No',
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
  glamping_service_tier = 'luxury',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Peter Mack’s original Collective Retreats site (Summer 2015) on 1,000 acres at 4 Eagle Ranch, Wolcott — ~25 miles west of Vail Village. Luxury safari tents + Three Peaks Lodge farm-to-table dining, nightly s’mores. Permanently closed (Google Maps; Collective FAQ now lists only Governors Island; Spoke+Blossom 2025 editor note). 4 Eagle Ranch still operates its own 6 safari tents — do not merge. collectiveretreats.com/outdoorsy/vail-experience/ is leftover Outdoorsy package copy.',
  rate_basis = 'breakfast',
  rate_basis_notes = 'USD. Last operating rates: complimentary cooked-to-order breakfast at Three Peaks; dinner / lunch extra. Seasonal ~May 22–Sep 28. Retreat fee / taxes extra on the stale Outdoorsy package. Pets not allowed. Check-in 3:00 PM / check-out 11:00 AM. +1-970-445-2033. Closed — do not treat leftover Outdoorsy / Cloudbeds pages as live inventory.',
  description = $$Permanently closed luxury glamping retreat that operated at 4098 Colorado Highway 131, Wolcott, Colorado (Google Maps 39.7497291, -106.6715393; plus code P8XH+V9) on 1,000 acres at 4 Eagle Ranch. Collective Retreats’ original location (opened Summer 2015; 18 tents at peak). Last mix: 12 ensuite Summit Tents and 6 shared-bath Journey Tents, with Three Peaks Lodge dining. Google Maps lists the listing Permanently closed; the brand now operates only Collective Governors Island. Distinct from 4 Eagle Ranch’s current 6-tent lodging.$$,
  activities_raw = 'Historical on-site: Three Peaks Lodge breakfast/dinner, nightly campfire s’mores, horseback, zip line over Alkali Creek, Jeep/ATV, fly fishing, hiking, Vines at Vail tastings, 10th Mountain Distillery. 4 Eagle Ranch still offers ranch activities independently — not Collective inventory.',
  activities_hiking = 'Yes',
  activities_fishing = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_horseback_riding = 'Yes',
  activities_whitewater_paddling = 'Yes',
  setting_ranch = 'Yes',
  setting_mountainous = 'Yes',
  setting_forest = 'Yes',
  rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE property_id = '64029283-bd01-4fe0-abba-1e5c04e60e21'
  AND id IN (10115, 10571);

UPDATE public.all_sage_data
SET
  site_name = 'Summit Tent',
  unit_type = 'Safari Tent',
  quantity_of_units = 12,
  unit_capacity = '4',
  unit_bed = '1 King or 2 Twin',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'No',
  unit_wifi = 'No',
  unit_pets = 'No',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'No',
  unit_patio = 'Yes',
  unit_cable = 'No',
  unit_mini_fridge = 'No',
  unit_picnic_table = 'No',
  unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = 5,
  season_close_month = 9,
  operating_season_months = 'Closed. Last operating season was roughly May 22–September 28. Ensuite Summit safari tents with private deck.',
  minimum_nights = '2',
  unit_description = $$Summit Tent (qty 12): last-operating ensuite safari tent at Collective Vail. King or two twins, high-thread-count linens, wood-burning heater, private terrace with Adirondack chairs, private bathroom. Sleeps up to 2 adults + children (rollaway). Shared nightly campfire; breakfast included historically. Permanently closed — do not treat leftover Outdoorsy “Summit Tent deck” copy as live.$$,
  amenities_raw = 'Safari tent; king or twins; ensuite bath; wood stove; private deck; electricity. No A/C. No kitchen. No pets. Historical lodge breakfast + farm-to-table dinner extra.',
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = '425',
  rate_spring_weekend = '510',
  rate_summer_weekday = '425',
  rate_summer_weekend = '510',
  rate_fall_weekday = '425',
  rate_fall_weekend = '510',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'spring', jsonb_build_object('weekday', 425, 'weekend', 510),
      'summer', jsonb_build_object('weekday', 425, 'weekend', 510),
      'fall', jsonb_build_object('weekday', 425, 'weekend', 510),
      'note', 'USD breakfast. Last stored operating band (pre-closure). Property permanently closed — not a live 2026 ADR. Glamping.com blended from $500. Winter closed.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published Closed from in_progress using Maps Permanently closed @39.7497291,-106.6715393 (P8XH+V9) + Collective FAQ (Governors Island only). This row is Summit Tent qty 12. Distinct from 4 Eagle Ranch’s current 6 tents.'
WHERE id = 10115
  AND property_id = '64029283-bd01-4fe0-abba-1e5c04e60e21';

UPDATE public.all_sage_data
SET
  site_name = 'Journey Tent',
  unit_type = 'Safari Tent',
  quantity_of_units = 6,
  unit_capacity = '2',
  unit_bed = '1 Queen or 2 Twin',
  unit_private_bathroom = 'No',
  unit_shower = 'No',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'No',
  unit_wifi = 'No',
  unit_pets = 'No',
  unit_electricity = 'Yes',
  unit_water = 'No',
  unit_campfires = 'No',
  unit_patio = 'Yes',
  unit_cable = 'No',
  unit_mini_fridge = 'No',
  unit_picnic_table = 'No',
  unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  season_open_month = 5,
  season_close_month = 9,
  operating_season_months = 'Closed. Last operating season was roughly May 22–September 28. Journey safari tents used a shared bathhouse (not ensuite).',
  minimum_nights = '2',
  unit_description = $$Journey Tent (qty 6): last-operating smaller safari tent (not a bell tent). Queen or two twins, luxury bedding, shared bathhouse a short walk away. Cloudbeds leftover copy: max 2; no rollaway — use a Summit for extra kids. Permanently closed.$$,
  amenities_raw = 'Safari tent; queen or twins; shared bathhouse; deck; electricity. No ensuite. No A/C. No kitchen. No pets.',
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = '367',
  rate_spring_weekend = '367',
  rate_summer_weekday = '367',
  rate_summer_weekend = '367',
  rate_fall_weekday = '367',
  rate_fall_weekend = '367',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'spring', jsonb_build_object('weekday', 367, 'weekend', 367),
      'summer', jsonb_build_object('weekday', 367, 'weekend', 367),
      'fall', jsonb_build_object('weekday', 367, 'weekend', 367),
      'note', 'USD breakfast. Last stored Journey ADR 367.50 flattened (no weekday/weekend split on file). Closed — not a live 2026 ADR. unit_type Bell Tent → Safari Tent.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published Closed. Journey Tents qty 6; unit_type Bell Tent → Safari Tent (Collective Journey product). site_name singular Journey Tent.'
WHERE id = 10571
  AND property_id = '64029283-bd01-4fe0-abba-1e5c04e60e21';

-- Leftover unnamed Safari Tent qty 8 would make 26 vs the 18-tent total.
UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Closed',
  is_glamping_property = 'Yes',
  property_name = 'Collective Retreats Vail',
  slug = 'collective-retreats-vail-wolcott-co',
  address = '4098 Colorado Highway 131',
  city = 'Wolcott',
  state = 'CO',
  zip_code = '81655',
  country = 'United States',
  lat = 39.7497291,
  lon = -106.6715393,
  url = 'https://collectiveretreats.com/outdoorsy/vail-experience/',
  phone_number = '+1-970-445-2033',
  property_total_sites = 18,
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected unnamed Safari Tent qty 8 shell. Last operating mix is Summit 12 + Journey 6 = 18. Do not keep this row in the published total. Property permanently closed.'
WHERE id = 87
  AND property_id = '64029283-bd01-4fe0-abba-1e5c04e60e21';

COMMIT;
