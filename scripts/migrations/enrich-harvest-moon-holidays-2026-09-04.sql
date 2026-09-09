-- Harvest Moon Holidays: 7 treehouses + 7 beach cabins + 1 cottage.
-- VisitScotland. Not 20 treehouses. Dog-free. Type → Glamping.
-- Prices are stay packages; nightly from ~£160 (Feb 2026 midweek £480 / 3n).

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Harvest Moon Holidays', slug = 'harvest-moon-holidays-tyninghame',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_harvest_moon_operator_2026_09',
  address = 'Lochhouses Farm, Tyninghame', city = 'Dunbar', state = 'East Lothian',
  zip_code = 'EH42 1XP', country = 'United Kingdom',
  lat = 56.0044, lon = -2.609,
  url = 'https://www.harvestmoonholidays.com/', phone_number = '+44-1620-810581',
  property_total_sites = 15, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'Yes',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Lochhouses Farm behind Tyninghame Beach / John Muir Country Park. 7 treehouses, 7 beach cabins, 1 cottage. En-suite WC + shower, wood stoves. Honesty shop, farm animals. Dog-free. Not a pitch campground.',
  rate_basis = 'room_only',
  rate_basis_notes = 'GBP per unit. 2026 treehouse midweek from £480 (Feb) / weekend £430; summer week £1300–£1350. Stored ~£160 weekday / £215 weekend from Feb packages. Closed winter to 12 Feb 2026. No dogs. +44 1620 810581.',
  description = $$Self-catered glamping at Lochhouses Farm, Tyninghame, Dunbar EH42 1XP (56.0044, -2.609), behind Tyninghame Beach. 15 units: 7 treehouses, 7 beach cabins and one cottage. Dog-free. Not 20 treehouses.$$,
  activities_raw = 'On-site: beach, BBQ, campfire, farm animals, honesty shop. Nearby: John Muir Country Park, North Berwick, Edinburgh ~45 min.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11263 AND property_id = '91d8006a-c6e9-4c74-8ec4-ca7b7929a8ac';

UPDATE public.all_sage_data
SET
  site_name = 'Treehouse', unit_type = 'Treehouse', quantity_of_units = 7,
  unit_capacity = '5-7', unit_bed = 'Sleeps 5 + 2 drop-down',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'Yes', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  season_open_month = 2, season_close_month = 11,
  operating_season_months = 'Seasonal (2026 from 13 Feb). Seven ridge treehouses. Dog-free. Cottage has Wi-Fi — these do not.',
  minimum_nights = '2',
  unit_description = $$Treehouse (qty 7): Ridge treehouses sleeping 5 + 2 on a drop-down (7). Wood stove, en-suite WC and hot shower. Do not invent an 8th treehouse.$$,
  amenities_raw = 'Treehouse; wood stove; en-suite; self-cater. No dogs. No Wi-Fi.',
  rate_winter_weekday = '160', rate_winter_weekend = '215',
  rate_spring_weekday = '165', rate_spring_weekend = '260',
  rate_summer_weekday = '180', rate_summer_weekend = '335',
  rate_fall_weekday = '197', rate_fall_weekend = '325',
  rate_unit_rates_by_year = jsonb_build_object('2026', jsonb_build_object('note', 'GBP room_only from harvestmoonholidays.com/prices-availability/. Stay packages converted to nightly (midweek/3n, weekend/2n). Feb midweek £480 → £160; weekend £430 → £215. Summer week £1350 → ~£193.')),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Treehouse qty 20 / total 14 stub. This row is Treehouse qty 7. Beach Cabin 7 + Cottage 1 added. Type Campground → Glamping.'
WHERE id = 11263 AND property_id = '91d8006a-c6e9-4c74-8ec4-ca7b7929a8ac';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, unit_picnic_table, unit_charcoal_grill, unit_ada_accessibility,
  season_open_month, season_close_month, operating_season_months, minimum_nights,
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
  rate_winter_weekday, rate_winter_weekend, rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend, rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes, description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', 'Harvest Moon Holidays', v.site_name,
  'web_research_harvest_moon_operator_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country, g.slug, g.property_type,
  15, v.qty, v.unit_type, v.capacity, v.bed,
  'Yes', 'Yes', v.kitchenette, v.full_k,
  'No', v.wifi, 'No', 'Yes', 'Yes',
  'Yes', 'Yes', 'No', 'No', 'No',
  'Yes', 'Yes', 'Yes', 'No',
  2::smallint, 11::smallint, v.season, '2',
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
  g.setting_ranch, g.setting_field, g.setting_mountainous, g.rv_parking,
  '160', '215', '165', '260', '180', '335', '197', '325',
  jsonb_build_object('2026', jsonb_build_object('note', 'GBP room_only. Same package table as treehouses unless cottage-only (unpublished split).')),
  g.rate_basis, g.rate_basis_notes, g.description, v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    ('Beach Cabin', 7::numeric, 'Cabin', '6-8', 'Sleeps 6 + sofa 2',
     'Yes', 'No', 'No',
     'Seasonal. Seven beach cabins under the trees by Tyninghame Beach.',
     $$Beach Cabin (qty 7): Beach-side cabins sleeping 6 + 2 on a sofa (8). Wood stove, en-suite. Dog-free. Do not invent an 8th cabin.$$,
     'Beach cabin; wood stove; en-suite; self-cater. No dogs.',
     E'[2026-09-04] Added Beach Cabin qty 7 from VisitScotland / harvestmoonholidays.com.'),
    ('Cottage', 1::numeric, 'Cottage', 'varies', 'Cottage beds',
     'No', 'Yes', 'Yes',
     'Year-round-capable cottage with Wi-Fi and wood stove. Dog-free.',
     $$Cottage (qty 1): One self-catering cottage with Wi-Fi and wood stove. Do not invent a second cottage.$$,
     'Cottage; Wi-Fi; wood stove; self-cater. No dogs.',
     E'[2026-09-04] Added Cottage qty 1 from harvestmoonholidays.com.')
) AS v(site_name, qty, unit_type, capacity, bed, kitchenette, full_k, wifi, season, unit_desc, amenities, note)
WHERE g.id = 11263 AND g.property_id = '91d8006a-c6e9-4c74-8ec4-ca7b7929a8ac'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = '91d8006a-c6e9-4c74-8ec4-ca7b7929a8ac' AND x.site_name = v.site_name
  );

COMMIT;
