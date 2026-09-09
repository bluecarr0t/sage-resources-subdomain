-- ============================================================================
-- Chincoteague Bay RV Resort & Cottages (Chincoteague, VA): publish and split.
-- Distinct from Chincoteague KOA (id 12478 / koa.com/campgrounds/chincoteague/)
-- and from Jellystone Park Chincoteague Island. Do not merge those parks.
-- BluFin Bungalows & Marina / Sea Rocket are next door, not extra sites.
--
-- Sources (retrieved 2026-09-04):
--   https://chincoteaguebayrvresort.com/ (+ /stay/ /stay/rv-sites/
--     /stay/vacation-rentals/ /stay/extended-stays/ /about/ /faqs/ /contact-us/)
--   Campspot IBE (live search Tue Sep 15–Wed Sep 16 2026):
--     https://www.campspot.com/book/chincoteague-bay-rv-resort
--   Google Maps business pin:
--     https://www.google.com/maps/place/Chincoteague+Bay+RV+Resort+%26+Cottages/@37.9050875,-75.4048817,17z
--     lat 37.9050875 / lon -75.4048817; plus code WH4W+22
--     2305 Main St, Chincoteague, VA 23336
--     (skip google_place_id — CID /g/11rsbwq4t_ only, not ChIJ)
--   RVshare park dump (SKU totals):
--     https://campgrounds.rvshare.com/ (75 RV + 26 cottages + 28 glamping)
--   Good Sam / Harvest Hosts (rate bands); Arlington Magazine (opened June 2023)
--
-- Operating inventory (RVshare SKU totals; Campspot confirmed named SKUs):
--   Full-Hookup RV Site qty 75 — Standard / Deluxe / Waterview / Waterfront /
--     Deluxe Waterfront back-in FHU (20/30/50-amp). Campspot Sep 15 2026 showed
--     68 available (51 Standard + 2 Deluxe + 2 Waterview + 2 Waterfront +
--     11 Deluxe Waterfront).
--   Cottage qty 26 — Deluxe, Waterfront, Deluxe Rooftop, Waterview,
--     Waterview Rooftop (Campspot also lists an accessible Waterfront).
--   Glamping Tent qty 28 — Waterfront + Waterview safari tents (Safari Tent).
--   property_total_sites = 129 so qty-sum matches. Campspot park page says 217
--     premium sites; Good Sam 150 grass + 68 onsite rentals (~218). Do not
--     invent SKUs to close that gap.
--
-- Formerly Sun Outdoors Chincoteague Bay; Blue Water rebrand April 1, 2025.
-- Season March 27–November 29. Tents not permitted on RV sites.
--
-- Rates USD, room_only. Do not set rate_avg_retail_daily_rate (trigger).
--   Campspot Tue Sep 15 2026 (fall weekday): Standard RV $59; Deluxe RV $80.80;
--     Waterview RV $89.35; Waterfront RV $112.35; Deluxe Waterfront RV $159;
--     Deluxe Cottage $139; Deluxe Rooftop Cottage $159; Waterfront Cottage $219;
--     Waterview / Waterview Rooftop Cottage $232.60 (2-night min on request);
--     Glamping Tent Waterfront $145; Waterview $135.
--   Harvest Hosts transient band $55–$230. Good Sam: RV from $59; glamping
--     $129–$199; cottage $159–$250. $10/night resort fee extra. Do not store
--     monthly/seasonal (Standard Back-In Jun $1399–Nov $299; seasonal from
--     $7500) as ADR.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'No',
  property_name = 'Chincoteague Bay RV Resort & Cottages',
  slug = 'chincoteague-bay-rv-resort-chincoteague-va',
  property_type = 'RV Resort',
  source = 'Sage',
  discovery_source = 'web_research_chincoteague_bay_rv_resort_operator_gmaps_2026_09',
  address = '2305 Main Street',
  city = 'Chincoteague',
  state = 'VA',
  zip_code = '23336',
  country = 'United States',
  lat = 37.9050875,
  lon = -75.4048817,
  url = 'https://chincoteaguebayrvresort.com/',
  phone_number = '+1-757-336-6060',
  property_total_sites = 129,
  year_site_opened = 2023,
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'No',
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
  property_pickball_courts = 'Yes',
  property_ota_platforms = ARRAY['campspot', 'expedia', 'hotels.com']::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Blue Water / formerly Sun Outdoors Chincoteague Bay (opened June 2023; rebrand April 1, 2025). Midscale waterfront RV resort on Chincoteague Bay with full-hookup back-in pads, ensuite safari tents, and kitchen cottages; pool, pickleball, promenade, fishing pier, camp store, and food truck. Distinct from Chincoteague KOA and Jellystone Park Chincoteague Island. Contact/about also list 2272 Main St; emergency/Campspot/Maps use 2305 Main Street.',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD. Direct book Campspot (code DIRECT 20% off). RV check-in 2:00 PM / vacation rentals 3:00 PM (FAQ sometimes 4:00 PM for rentals); check-out 11:00 AM. $10/night resort fee (Wi-Fi, pool, laundry, sports court, promenade, fishing pier). Visitor $10/person; early/late $30. Quiet hours 11 PM–7 AM. No generators. Tents not permitted on RV sites (one daytime pup tent only). Occupancy RV/cottage max 6; glamping tent max 5. Pets OK on RV + cottages; no pets in glamping tents. Non-smoking. Golf carts 16+ licensed. Cottages/tents often 2-night minimum. Seasonal RV sites Mar 28–Nov 30; monthly Standard Back-In Jun $1399 / Jul $2499 / Aug $1999 / Sep $1299 / Oct $899 / Nov $299; seasonal from $7500 — do not treat as ADR. Front desk (757) 336-6060; front-desk@chincoteaguebayresort.com.',
  description = $$Waterfront RV resort and glamping stay at 2305 Main Street, Chincoteague, Virginia (Google Maps 37.9050875, -75.4048817; plus code WH4W+22), on Chincoteague Bay. Opened June 2023 as Sun Outdoors Chincoteague Bay; Blue Water rebrand April 1, 2025. Full-hookup back-in RV sites, ensuite safari glamping tents, and kitchen cottages; pool, pickleball, playground, camp store, food truck, promenade, and fishing pier. Season March 27–November 29. Distinct from Chincoteague KOA, Jellystone Park Chincoteague Island, and next-door BluFin Bungalows & Marina.$$,
  activities_raw = 'On-site: pool, pickleball, sports court, playground, promenade, fishing pier, camp store, food truck, laundry, community fire pits in the glamping area. Nearby: Chincoteague National Wildlife Refuge, Assateague Island National Seashore (wild ponies, beach, bikes), historic downtown Chincoteague, kayak/boat the bay.',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_fishing = 'Yes',
  activities_swimming = 'Yes',
  activities_boating = 'Yes',
  activities_paddling = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_historic_sightseeing = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_stargazing = 'Yes',
  setting_coastal = 'Yes',
  setting_beach = 'Yes',
  setting_wetlands = 'Yes',
  rv_parking = 'Yes',
  rv_sewer_hook_up = 'Yes',
  rv_electrical_hook_up = 'Yes',
  rv_water_hookup = 'Yes',
  rv_accommodates_slideout = 'Yes',
  rv_vehicle_length = '45',
  rv_surface_level = 'Yes',
  rv_surface_type = 'Grass',
  rv_generators_allowed = 'No',
  rv_vehicles_fifth_wheels = 'Yes',
  rv_vehicles_class_a_rvs = 'Yes',
  rv_vehicles_class_b_rvs = 'Yes',
  rv_vehicles_class_c_rvs = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11833
  AND property_id = 'db9f14a2-9b88-48e1-bc69-f08f8d4f815f';

-- Existing Safari Tent shell becomes the glamping-tent inventory (qty 28).
UPDATE public.all_sage_data
SET
  site_name = 'Glamping Tent',
  unit_type = 'Safari Tent',
  quantity_of_units = 28,
  unit_capacity = '5',
  unit_bed = '1 Queen + twin bunks',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'No',
  unit_electricity = 'Yes',
  unit_water = 'Yes',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_picnic_table = 'Yes',
  unit_ada_accessibility = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  unit_mini_fridge = 'Yes',
  season_open_month = 3,
  season_close_month = 11,
  operating_season_months = 'March 27–November 29. Waterfront and Waterview safari tents; golf-cart access only (not personal vehicles).',
  minimum_nights = '2',
  unit_description = $$Ensuite safari glamping tent (qty 28): Waterfront and Waterview. Sleeps 5 — queen bedroom plus twin bunks. Air conditioning, kitchenette (mini-fridge, microwave, stovetop), private bathroom with shower, furnished covered porch, picnic table, Wi-Fi. Community fire pits with Adirondack chairs in the tent area. No lock on the tent. Pets not permitted. Golf-cart access only; daytime luggage assist by staff cart on request. Non-smoking. Max 5 guests.$$,
  amenities_raw = 'Ensuite safari tent; queen + twin bunks; sleeps 5; A/C; heat; kitchenette (mini-fridge, microwave, stovetop); private shower; covered porch; picnic table; Wi-Fi. Community fire pits. No pets. No lock. Golf-cart access only.',
  rate_winter_weekday = '129',
  rate_winter_weekend = '159',
  rate_spring_weekday = '149',
  rate_spring_weekend = '189',
  rate_summer_weekday = '179',
  rate_summer_weekend = '219',
  rate_fall_weekday = '135',
  rate_fall_weekend = '169',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 129, 'weekend', 159),
      'spring', jsonb_build_object('weekday', 149, 'weekend', 189),
      'summer', jsonb_build_object('weekday', 179, 'weekend', 219),
      'fall', jsonb_build_object('weekday', 135, 'weekend', 169),
      'note', 'USD room_only. Fall weekday $135 Campspot Glamping Tent - Waterview Tue Sep 15 2026 (Waterfront $145; 2-night min). Good Sam glamping $129–$199. Winter fields = late-Nov / late-Mar shoulder (park closed Dec–mid-Mar). $10 resort fee extra. campspot.com/book/chincoteague-bay-rv-resort.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published + split from Safari Tent shell using chincoteaguebayrvresort.com + Campspot + Google Maps @37.9050875,-75.4048817 (WH4W+22). This row is Glamping Tent qty 28 (RVshare). Distinct from Chincoteague KOA (id 12478). Campspot park page 217 / Good Sam ~218 not used — no SKU split for the gap.'
WHERE id = 11833
  AND property_id = 'db9f14a2-9b88-48e1-bc69-f08f8d4f815f';

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
  operating_season_months, minimum_nights,
  unit_description, amenities_raw, activities_raw,
  url, property_id, phone_number,
  property_clubhouse, property_food_on_site, property_restaurant, property_laundry,
  property_pool, property_hot_tub, property_sauna, property_family_friendly,
  property_remote_work_friendly, property_has_rentals, property_playground,
  property_general_store, property_extended_stay, property_pickball_courts,
  property_ota_platforms, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_biking, activities_fishing, activities_swimming,
  activities_boating, activities_paddling, activities_wildlife_watching,
  activities_historic_sightseeing, activities_scenic_drives, activities_stargazing,
  setting_coastal, setting_beach, setting_wetlands,
  rv_parking, rv_sewer_hook_up, rv_electrical_hook_up, rv_water_hookup,
  rv_accommodates_slideout, rv_vehicle_length, rv_surface_level, rv_surface_type,
  rv_generators_allowed, rv_vehicles_fifth_wheels, rv_vehicles_class_a_rvs,
  rv_vehicles_class_b_rvs, rv_vehicles_class_c_rvs,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', 'No', 'Sage', 'Chincoteague Bay RV Resort & Cottages', v.site_name,
  'web_research_chincoteague_bay_rv_resort_operator_gmaps_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country,
  g.slug, g.property_type,
  129, v.qty, v.unit_type, v.capacity, v.bed,
  v.ensuite, v.shower, v.kitchenette, v.full_kitchen,
  v.ac, 'Yes', v.pets, 'Yes', 'Yes',
  'Yes', v.patio, 'No', 'No', 'No',
  v.mini_fridge, 'Yes', 'No', v.ada,
  2023::numeric, 3::smallint, 11::smallint,
  v.season, v.min_nights,
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.property_playground,
  g.property_general_store, g.property_extended_stay, g.property_pickball_courts,
  g.property_ota_platforms, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_biking, g.activities_fishing, g.activities_swimming,
  g.activities_boating, g.activities_paddling, g.activities_wildlife_watching,
  g.activities_historic_sightseeing, g.activities_scenic_drives, g.activities_stargazing,
  g.setting_coastal, g.setting_beach, g.setting_wetlands,
  g.rv_parking, g.rv_sewer_hook_up, g.rv_electrical_hook_up, g.rv_water_hookup,
  g.rv_accommodates_slideout, g.rv_vehicle_length, g.rv_surface_level, g.rv_surface_type,
  g.rv_generators_allowed, g.rv_vehicles_fifth_wheels, g.rv_vehicles_class_a_rvs,
  g.rv_vehicles_class_b_rvs, g.rv_vehicles_class_c_rvs,
  v.win_wd, v.win_we,
  v.spr_wd, v.spr_we,
  v.sum_wd, v.sum_we,
  v.fal_wd, v.fal_we,
  v.rates_json, g.rate_basis, g.rate_basis_notes,
  g.description, v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    (
      'Cottage', 26::numeric, 'Cottage', '6', '1 Queen + bunks / sleeper sofa',
      'Yes', 'Yes', 'No', 'Yes',
      'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
      'March 27–November 29. Deluxe, Waterfront, Deluxe Rooftop, Waterview, and Waterview Rooftop (plus accessible Waterfront). Do not split qty without a live Campspot type count.',
      '2',
      '129', '169', '159', '199', '199', '249', '139', '175',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 129, 'weekend', 169), 'spring', jsonb_build_object('weekday', 159, 'weekend', 199), 'summer', jsonb_build_object('weekday', 199, 'weekend', 249), 'fall', jsonb_build_object('weekday', 139, 'weekend', 175), 'note', 'USD room_only. Fall weekday $139 Campspot Deluxe Cottage Tue Sep 15 2026 (Deluxe Rooftop $159; Waterfront $219; Waterview / Waterview Rooftop $232.60 with 2-night min). Good Sam cottage $159–$250. Winter fields = late-Nov / late-Mar shoulder. $10 resort fee extra.')),
      $$Kitchen cottage (qty 26): Deluxe, Waterfront, Deluxe Rooftop, Waterview, and Waterview Rooftop. Sleeps 4–6 — queen bedroom plus bunks and/or sleeper sofa. Private bath/shower, patio, fire pit, picnic table, Wi-Fi, A/C. Rooftop SKUs add a sun deck and screened porch with a full kitchen (stovetop). Pet-friendly. Accessible Waterfront / Waterview options. Non-smoking. Often 2-night minimum.$$,
      'Cottage; queen + bunks/sleeper; sleeps 4–6; private bath/shower; kitchen or kitchenette; patio; fire pit; picnic table; Wi-Fi; A/C. Rooftop deck on rooftop SKUs. Pet-friendly. ADA Waterfront/Waterview available.',
      E'[2026-09-04] Added Cottage qty 26 from chincoteaguebayrvresort.com/stay/vacation-rentals + Campspot + RVshare.'
    ),
    (
      'Full-Hookup RV Site', 75::numeric, 'RV Site', '6', NULL,
      'No', 'No', 'No', 'No',
      'No', 'Yes', 'No', 'No', 'No',
      'March 27–November 29. Standard / Deluxe / Waterview / Waterfront / Deluxe Waterfront back-in FHU. Seasonal sites Mar 28–Nov 30. Tents not permitted on RV pads.',
      '1',
      '55', '70', '65', '85', '89', '119', '59', '75',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', 55, 'weekend', 70), 'spring', jsonb_build_object('weekday', 65, 'weekend', 85), 'summer', jsonb_build_object('weekday', 89, 'weekend', 119), 'fall', jsonb_build_object('weekday', 59, 'weekend', 75), 'note', 'USD room_only. Fall weekday $59 Campspot Standard Back In FHU Tue Sep 15 2026 (Deluxe $80.80; Waterview $89.35; Waterfront $112.35; Deluxe Waterfront $159). Harvest Hosts from $55. Good Sam RV from $59. 68 pads available that night (51 Standard). Winter fields = late-Nov / late-Mar shoulder. Do not store monthly/seasonal as ADR. $10 resort fee extra.')),
      $$Full-hookup back-in RV site (qty 75): Standard, Deluxe, Waterview, Waterfront, and Deluxe Waterfront. 20/30/50-amp electric, water, sewer, Wi-Fi, picnic table, fire ring. Deluxe / Deluxe Waterfront add a private patio with poly dining furniture. Fits vehicles up to ~38 ft on waterfront deluxe and ~45 ft on Standard / Deluxe / Waterview. Pet-friendly. Shared bathhouses. No generators. Tents not permitted on the pad (one daytime pup tent only). Max 6 guests.$$,
      'Full hookup 20/30/50-amp; water; sewer; Wi-Fi; picnic table; fire ring; back-in. Patio on Deluxe / Deluxe Waterfront. Pet-friendly. No generators. Shared bathhouse.',
      E'[2026-09-04] Added Full-Hookup RV Site qty 75 from Campspot SKUs + RVshare total (68 available Sep 15 2026).'
    )
) AS v(
  site_name, qty, unit_type, capacity, bed,
  ensuite, shower, kitchenette, full_kitchen,
  ac, pets, patio, mini_fridge, ada,
  season, min_nights,
  win_wd, win_we, spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE g.id = 11833
  AND g.property_id = 'db9f14a2-9b88-48e1-bc69-f08f8d4f815f'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = 'db9f14a2-9b88-48e1-bc69-f08f8d4f815f'
      AND x.site_name = v.site_name
  );

COMMIT;
