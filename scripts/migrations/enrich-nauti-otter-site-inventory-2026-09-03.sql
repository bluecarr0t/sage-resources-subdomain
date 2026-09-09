-- ============================================================================
-- Nauti Otter (Seward, AK): split sparse Yurt shell id 13209 into 22 outdoor
-- glamping SKUs (yurts, rustic cabins, vintage campers). Hostel / private inn
-- rooms are not glamping SKUs and are left out of inventory.
--
-- Sources (retrieved 2026-09-03):
--   https://www.nautiotterinn.com/ (+ /accommodations /faq /policies /about)
--   ResNexus: https://resnexus.com/resnexus/reservations/book/B4A688FD-4C55-4919-A8D9-9EFA7DE44785/?NewSearch=1
--   Google Maps — Nauti Otter Inn (canonical business pin):
--     https://www.google.com/maps/place/Nauti+Otter+Inn/@60.1753849,-149.3998763,17z
--     lat 60.1753849 / lon -149.3998763; 13609 Seward Hwy; plus code 5JG2+52
--   Google Maps — Yurt Village campus (~1 mile):
--     https://www.google.com/maps/place/33395+Winterset+Cir,+Seward,+AK+99664/@60.1793921,-149.3768503,17z
--     lat 60.1793921 / lon -149.3768503 (listed on Maps as Nauti Otter Yurt Village)
--
-- Inventory (operator accommodations page; qty 1 each; total 22):
--   Yurt Village: Funky Fox Hole, Grizzly Grotto, Halibut Hut, King Crab Cottage,
--     Moose Caboose, Octopus Sea Palace, Puffin Pad, Ravens Roost,
--     Bunk Salmon Shack, Bunk Sealion Shanty, Bunk Starfish Studio,
--     Reindeer Roadhouse (private bath), Bigfoot Bungalow (private bath)
--   Inn campus: Bald Eagle Bungaloo (yurt), Beaver Boudoir, Wolf Den Cabin,
--     Humpback Shack, Loon Saloon, Mariner's Lair Cabin, The Sourdough Cabin,
--     Lumberjack Shack (camper), Salty Sea Crab Shack (camper)
--   Excluded: Hootie Hoo Hollow, Kodiak Bunk Room, Narwhal Nook, hostel loft beds
--
-- Rates (USD, Standard Rate, breakfast included):
--   ResNexus Thu Sep 3 2026 (1 night): Puffin Pad $240.50; Bunk Starfish $240.50.
--     Cabins & campers 0 available that night. Hostel loft $91 (not stored).
--   Google Maps OTA Sep 8–9 2026: from $177; Booking.com queen $231 / double $194;
--     Expedia $225 (breakfast). Used as cabin/camper proxy.
--   Winter closed for outdoor SKUs (May–Sep operating season from review months).
--
-- rate_avg_retail_daily_rate maintained by calc_avg_rate_trigger on all_sage_data.
-- ============================================================================

BEGIN;

UPDATE public.all_sage_data
SET
  property_name = 'Nauti Otter',
  slug = 'nauti-otter-seward-ak',
  site_name = 'Funky Fox Hole',
  unit_type = 'Yurt',
  quantity_of_units = 1,
  property_total_sites = 22,
  research_status = 'published',
  is_open = 'Yes',
  is_glamping_property = 'Yes',
  property_type = 'Glamping',
  source = 'Sage',
  discovery_source = 'web_research_nauti_otter_resnexus_gmaps_2026_09',
  address = '13609 Seward Highway',
  city = 'Seward',
  state = 'AK',
  zip_code = '99664',
  country = 'United States',
  lat = 60.1753849,
  lon = -149.3998763,
  url = 'https://www.nautiotterinn.com/',
  phone_number = '+1-907-491-2255',
  year_site_opened = 2008,
  season_open_month = 5,
  season_close_month = 9,
  operating_season_months = 'Yurts/cabins/campers typically May–Sep (review months). Inn/hostel may book outside this window — verify on ResNexus. Yurt Village check-in at 33395 Winterset Circle.',
  minimum_nights = '1',
  unit_capacity = '2',
  unit_sq_ft = NULL,
  unit_bed = '1 Queen',
  unit_private_bathroom = 'No',
  unit_shower = 'No',
  unit_kitchenette = 'No',
  unit_full_kitchen = 'No',
  unit_air_conditioning = 'No',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_electricity = 'Yes',
  unit_water = 'No',
  unit_campfires = 'Yes',
  unit_patio = 'Yes',
  unit_gas_fireplace = 'No',
  unit_cable = 'No',
  unit_hot_tub = 'No',
  unit_sauna = 'No',
  unit_mini_fridge = 'No',
  unit_ada_accessibility = NULL,
  unit_picnic_table = 'Yes',
  unit_charcoal_grill = 'Yes',
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_restaurant = 'No',
  property_laundry = 'Yes',
  property_pool = 'No',
  property_hot_tub = 'No',
  property_sauna = 'No',
  property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes',
  property_has_rentals = 'Yes',
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale',
  glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Two-campus Seward lodging: forested Yurt Village + highway Inn. Outdoor SKUs share bathhouses (except Reindeer Roadhouse / Bigfoot Bungalow). Complimentary pancake/waffle breakfast. Queen yurt ResNexus Standard Rate $240.50 (Thu Sep 3 2026). Hostel/inn rooms excluded from glamping inventory.',
  rate_basis = 'breakfast',
  rate_basis_notes = 'Complimentary self-serve pancake/waffle bar, oatmeal, and coffee. Pet fee $25/stay (cabins, yurts, campers only; not in the Inn). Check-in 3 PM / check-out 11 AM. Cancel $25 + 3% card fee after 5/28/26 (ResNexus). Book: resnexus.com/resnexus/reservations/book/B4A688FD-4C55-4919-A8D9-9EFA7DE44785. Birch Lake canoe/kayak/SUP rentals; cabin guests complimentary, others 20% off.',
  rate_winter_weekday = NULL,
  rate_winter_weekend = NULL,
  rate_spring_weekday = '240.50',
  rate_spring_weekend = '240.50',
  rate_summer_weekday = '240.50',
  rate_summer_weekend = '240.50',
  rate_fall_weekday = '240.50',
  rate_fall_weekend = '240.50',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', null, 'weekend', null),
      'spring', jsonb_build_object('weekday', 240.50, 'weekend', 240.50),
      'summer', jsonb_build_object('weekday', 240.50, 'weekend', 240.50),
      'fall', jsonb_build_object('weekday', 240.50, 'weekend', 240.50),
      'note', 'Funky Fox Hole (Queen forest yurt, Yurt Village). ResNexus Standard Rate Thu Sep 3 2026 $240.50/night (2 adults) from sibling Puffin Pad / Starfish Studio samples — no WD/WE split observed. Spring/summer proxied from Sep 3 sample. Winter closed for outdoor SKUs. Yurt Village Maps pin 60.1793921, -149.3768503.'
    )
  ),
  description = $$Two-campus alternative lodging just outside Seward, Alaska — about 4.6 miles / 15 minutes from Kenai Fjords National Park. The Nauti Otter Inn (13609 Seward Highway; Google Maps 60.1753849, -149.3998763) has rustic cabins, restored 1960s campers, one Inn-side yurt, plus hostel/inn rooms (not in Sage glamping inventory). The Yurt Village (~1 mile at 33395 Winterset Circle; Google Maps 60.1793921, -149.3768503) has themed forest yurts, a pavilion/outdoor kitchen, shower house, and two private-bath cabins. Complimentary pancake/waffle breakfast, WiFi, shared kitchens, fire pits. Owners Clint and the innkeeper (purchased ~2008 after a 2008 Alaska summer; Yurt Village built on later land). Pets $25 in cabins/yurts/campers only.$$,
  unit_description = $$Funky Fox Hole: themed forest yurt at the Yurt Village with 1 Queen, sleeps 2, skylight, electricity, heater or fan, linens, WiFi. Shared centralized shower house with hot water. Access to covered pavilion (picnic tables, BBQ) and fire pit. Pet-friendly ($25/stay). Complimentary self-serve breakfast at the Inn campus.$$,
  amenities_raw = 'Queen forest yurt; skylight; electricity; heater/fan; linens; WiFi; shared Yurt Village shower house (hot water); pavilion picnic tables & BBQ; outdoor kitchen (microwave, sink, fridge, camp stove, gas grills); fire pit; complimentary pancake/waffle breakfast. No ensuite bath. Pets $25. Food not stored in sleeping areas (wildlife).',
  activities_raw = 'Kenai Fjords NP / Exit Glacier (~15 min); Resurrection Bay glacier & wildlife cruises (10–15% guest discount via Kenai Fjords Tours / Major Marine); Birch Lake canoe/kayak/SUP rentals; hiking Kenai Peninsula; fishing; wildlife watching; Seward harbor / Alaska SeaLife Center / Mount Marathon.',
  activities_hiking = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_fishing = 'Yes',
  activities_canoeing_kayaking = 'Yes',
  activities_paddling = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_boating = 'Yes',
  setting_forest = 'Yes',
  setting_mountainous = 'Yes',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-03] Site/rate enrichment from nautiotterinn.com + ResNexus B4A688FD-4C55-4919-A8D9-9EFA7DE44785 + Google Maps Inn pin @60.1753849,-149.3998763 (Yurt Village @60.1793921,-149.3768503). Split shell into 22 outdoor SKUs (hostel/inn rooms excluded). Queen/bunk yurt Standard Rate $240.50 Thu Sep 3 2026. Country USA → United States.',
  date_updated = '2026-09-03'
WHERE id = 13209
  AND property_id = 'e7db45f2-9ae4-409b-8819-e4c32d67792c';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed, unit_sq_ft,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_gas_fireplace, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, unit_picnic_table, unit_charcoal_grill,
  year_site_opened, season_open_month, season_close_month,
  operating_season_months, minimum_nights,
  unit_description, amenities_raw, activities_raw,
  url, property_id, phone_number,
  property_clubhouse, property_food_on_site, property_restaurant, property_laundry,
  property_pool, property_hot_tub, property_sauna, property_family_friendly,
  property_remote_work_friendly, property_has_rentals, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes,
  activities_hiking, activities_wildlife_watching, activities_fishing,
  activities_canoeing_kayaking, activities_paddling, activities_scenic_drives, activities_boating,
  setting_mountainous, setting_forest,
  rate_winter_weekday, rate_winter_weekend,
  rate_spring_weekday, rate_spring_weekend,
  rate_summer_weekday, rate_summer_weekend,
  rate_fall_weekday, rate_fall_weekend,
  rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  description, notes
)
SELECT
  'published', 'Yes', COALESCE(g.is_glamping_property, 'Yes'), 'Sage', 'Nauti Otter', v.site_name,
  'web_research_nauti_otter_resnexus_gmaps_2026_09', '2026-09-03', '2026-09-03',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, COALESCE(g.country, 'United States'),
  g.slug, g.property_type,
  22, 1, v.unit_type, v.capacity, v.bed, NULL::numeric,
  v.private_bath, v.shower, v.kitchenette, v.full_kitchen,
  'No', 'Yes', 'Yes', 'Yes', v.water,
  'Yes', 'Yes', 'No', 'No', 'No', 'No',
  'No', 'Yes', 'Yes',
  g.year_site_opened, 5::smallint, 9::smallint,
  g.operating_season_months, '1',
  v.unit_desc, v.amenities, g.activities_raw,
  g.url, g.property_id, g.phone_number,
  g.property_clubhouse, g.property_food_on_site, g.property_restaurant, g.property_laundry,
  g.property_pool, g.property_hot_tub, g.property_sauna, g.property_family_friendly,
  g.property_remote_work_friendly, g.property_has_rentals, g.land_operator_category,
  g.glamping_service_tier, g.glamping_service_tier_source, g.glamping_service_tier_notes,
  g.activities_hiking, g.activities_wildlife_watching, g.activities_fishing,
  g.activities_canoeing_kayaking, g.activities_paddling, g.activities_scenic_drives, g.activities_boating,
  g.setting_mountainous, g.setting_forest,
  NULL::text, NULL::text,
  v.spr_wd, v.spr_we,
  v.sum_wd, v.sum_we,
  v.fal_wd, v.fal_we,
  v.rates_json, 'breakfast', g.rate_basis_notes,
  g.description, v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    -- Remaining Queen forest yurts (Yurt Village, shared shower house)
    (
      'Grizzly Grotto', 'Yurt', '2', '1 Queen',
      'No', 'No', 'No', 'No', 'No',
      '240.50', '240.50', '240.50', '240.50', '240.50', '240.50',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'summer', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'fall', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'note', 'Queen forest yurt, Yurt Village. ResNexus Standard Rate proxied from Puffin Pad $240.50 Thu Sep 3 2026.')),
      $$Grizzly Grotto: themed forest yurt at the Yurt Village with 1 Queen, sleeps 2, skylight, electricity, heater or fan. Shared shower house; pavilion, BBQ, and fire pit.$$,
      'Queen forest yurt; skylight; electricity; heater/fan; linens; WiFi; shared shower house; pavilion & BBQ; outdoor kitchen; fire pit; breakfast included. Pets $25.',
      E'[2026-09-03] Added from nautiotterinn.com/accommodations: Grizzly Grotto queen yurt.'
    ),
    (
      'Halibut Hut', 'Yurt', '2', '1 Queen',
      'No', 'No', 'No', 'No', 'No',
      '240.50', '240.50', '240.50', '240.50', '240.50', '240.50',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'summer', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'fall', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'note', 'Queen forest yurt, Yurt Village. ResNexus $240.50 Thu Sep 3 2026 proxy.')),
      $$Halibut Hut: glamping-style forest yurt at the Yurt Village with 1 Queen, sleeps 2, skylight, electricity, heater or fan. Shared shower house; pavilion, BBQ, and fire pit.$$,
      'Queen forest yurt; skylight; electricity; heater/fan; linens; WiFi; shared shower house; pavilion & BBQ; outdoor kitchen; fire pit; breakfast included. Pets $25.',
      E'[2026-09-03] Added from nautiotterinn.com/accommodations: Halibut Hut queen yurt.'
    ),
    (
      'Octopus Sea Palace', 'Yurt', '2', '1 Queen',
      'No', 'No', 'No', 'No', 'No',
      '240.50', '240.50', '240.50', '240.50', '240.50', '240.50',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'summer', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'fall', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'note', 'Queen forest yurt, Yurt Village. ResNexus $240.50 Thu Sep 3 2026 proxy.')),
      $$Octopus Sea Palace: themed forest yurt at the Yurt Village with 1 Queen, sleeps 2, skylight, electricity, heater or fan. Shared shower house; pavilion, BBQ, and fire pit.$$,
      'Queen forest yurt; skylight; electricity; heater/fan; linens; WiFi; shared shower house; pavilion & BBQ; outdoor kitchen; fire pit; breakfast included. Pets $25.',
      E'[2026-09-03] Added from nautiotterinn.com/accommodations: Octopus Sea Palace queen yurt.'
    ),
    (
      'Puffin Pad', 'Yurt', '2', '1 Queen',
      'No', 'No', 'No', 'No', 'No',
      '240.50', '240.50', '240.50', '240.50', '240.50', '240.50',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'summer', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'fall', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'note', 'Queen forest yurt, Yurt Village. ResNexus Standard Rate Thu Sep 3 2026 $240.50/night (live sample).')),
      $$Puffin Pad: cozy forest yurt at the Yurt Village with 1 Queen, sleeps 2, skylight, electricity, heater or fan. Shared shower house; pavilion, BBQ, and fire pit.$$,
      'Queen forest yurt; skylight; electricity; heater/fan; linens; WiFi; shared shower house; pavilion & BBQ; outdoor kitchen; fire pit; breakfast included. Pets $25.',
      E'[2026-09-03] Added from ResNexus live sample: Puffin Pad $240.50 Standard Rate Thu Sep 3 2026.'
    ),
    (
      'Ravens Roost', 'Yurt', '2', '1 Queen',
      'No', 'No', 'No', 'No', 'No',
      '240.50', '240.50', '240.50', '240.50', '240.50', '240.50',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'summer', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'fall', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'note', 'Queen forest yurt, Yurt Village. ResNexus $240.50 Thu Sep 3 2026 proxy.')),
      $$Ravens Roost: forest yurt at the Yurt Village with 1 Queen, sleeps 2, skylight, electricity, heater or fan. Shared shower house; pavilion, BBQ, and fire pit.$$,
      'Queen forest yurt; skylight; electricity; heater/fan; linens; WiFi; shared shower house; pavilion & BBQ; outdoor kitchen; fire pit; breakfast included. Pets $25.',
      E'[2026-09-03] Added from nautiotterinn.com/accommodations: Ravens Roost queen yurt.'
    ),
    (
      'King Crab Cottage', 'Yurt', '3', '1 Queen, 1 Twin',
      'No', 'No', 'No', 'No', 'No',
      '240.50', '240.50', '240.50', '240.50', '240.50', '240.50',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'summer', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'fall', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'note', 'Queen+Twin forest yurt, Yurt Village, sleeps 3. Rate proxied from Puffin Pad $240.50 (2-adult sample).')),
      $$King Crab Cottage: forest yurt at the Yurt Village with 1 Queen + 1 Twin, sleeps 3, skylight, electricity, heater or fan. Shared shower house; pavilion, BBQ, and fire pit.$$,
      'Forest yurt; 1 Queen + 1 Twin; sleeps 3; skylight; electricity; heater/fan; linens; WiFi; shared shower house; pavilion & BBQ; outdoor kitchen; fire pit; breakfast included. Pets $25.',
      E'[2026-09-03] Added from nautiotterinn.com/accommodations: King Crab Cottage (queen+twin).'
    ),
    (
      'Moose Caboose', 'Yurt', '2', '2 Twin',
      'No', 'No', 'No', 'No', 'No',
      '240.50', '240.50', '240.50', '240.50', '240.50', '240.50',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'summer', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'fall', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'note', 'Two-twin forest yurt, Yurt Village. Rate proxied from Puffin Pad $240.50.')),
      $$Moose Caboose: forest yurt at the Yurt Village with 2 Twin beds, sleeps 2, skylight, electricity, heater or fan. Shared shower house; pavilion, BBQ, and fire pit.$$,
      'Forest yurt; 2 Twin; sleeps 2; skylight; electricity; heater/fan; linens; WiFi; shared shower house; pavilion & BBQ; outdoor kitchen; fire pit; breakfast included. Pets $25.',
      E'[2026-09-03] Added from nautiotterinn.com/accommodations: Moose Caboose.'
    ),
    (
      'Bunk Salmon Shack', 'Yurt', '4', '4 Twin',
      'No', 'No', 'No', 'No', 'No',
      '240.50', '240.50', '240.50', '240.50', '240.50', '240.50',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'summer', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'fall', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'note', 'Family bunk yurt, Yurt Village, sleeps 4. ResNexus sibling Starfish Studio $240.50 Thu Sep 3 2026 (2-adult sample).')),
      $$Bunk Salmon Shack: family yurt at the Yurt Village with 4 Twin beds on two levels, sleeps 4, skylight, electricity, heater or fan. Shared shower house; pavilion, BBQ, and fire pit.$$,
      'Bunk forest yurt; 4 Twin on two levels; sleeps 4; skylight; electricity; heater/fan; linens; WiFi; shared shower house; pavilion & BBQ; outdoor kitchen; fire pit; breakfast included. Pets $25.',
      E'[2026-09-03] Added from nautiotterinn.com/accommodations: Bunk Salmon Shack.'
    ),
    (
      'Bunk Sealion Shanty', 'Yurt', '4', '4 Twin',
      'No', 'No', 'No', 'No', 'No',
      '240.50', '240.50', '240.50', '240.50', '240.50', '240.50',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'summer', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'fall', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'note', 'Group bunk yurt, Yurt Village. Rate from Starfish Studio $240.50 Thu Sep 3 2026.')),
      $$Bunk Sealion Shanty: group yurt at the Yurt Village with 4 Twin beds across two levels (bunk on lower level), sleeps 4, skylight, electricity, heater or fan. Shared shower house; pavilion, BBQ, and fire pit.$$,
      'Bunk forest yurt; 4 Twin on two levels; sleeps 4; skylight; electricity; heater/fan; linens; WiFi; shared shower house; pavilion & BBQ; outdoor kitchen; fire pit; breakfast included. Pets $25.',
      E'[2026-09-03] Added from nautiotterinn.com/accommodations: Bunk Sealion Shanty.'
    ),
    (
      'Bunk Starfish Studio', 'Yurt', '4', '4 Twin',
      'No', 'No', 'No', 'No', 'No',
      '240.50', '240.50', '240.50', '240.50', '240.50', '240.50',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'summer', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'fall', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'note', 'Bunk yurt, Yurt Village. ResNexus Standard Rate Thu Sep 3 2026 $240.50/night (live sample, 2 adults).')),
      $$Bunk Starfish Studio: yurt at the Yurt Village with 4 Twin beds on two levels, sleeps 4, skylight, electricity, heater or fan. Shared shower house; pavilion, BBQ, and fire pit.$$,
      'Bunk forest yurt; 4 Twin on two levels; sleeps 4; skylight; electricity; heater/fan; linens; WiFi; shared shower house; pavilion & BBQ; outdoor kitchen; fire pit; breakfast included. Pets $25.',
      E'[2026-09-03] Added from ResNexus live sample: Bunk Starfish Studio $240.50 Standard Rate Thu Sep 3 2026.'
    ),
    (
      'Bald Eagle Bungaloo', 'Yurt', '2', '1 Queen',
      'No', 'No', 'No', 'No', 'No',
      '240.50', '240.50', '240.50', '240.50', '240.50', '240.50',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'summer', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'fall', jsonb_build_object('weekday', 240.50, 'weekend', 240.50), 'note', 'Inn-campus yurt (not Yurt Village). Rate proxied from Puffin Pad $240.50. Shared Inn outhouse / showers.')),
      $$Bald Eagle Bungaloo: Alaskan yurt-style stay at the Inn campus (not the Yurt Village) with 1 Queen, sleeps 2, electricity, heat, linens. Shared flushable outhouse; showers in the Inn and outdoor shower house. Access to two equipped kitchens, WiFi living room, fire pit, and self-serve breakfast.$$,
      'Inn-campus yurt; 1 Queen; sleeps 2; electricity; heat; linens; WiFi in Inn; shared flushable outhouse; Inn + outdoor showers; two kitchens; fire pit; breakfast included. Pets $25.',
      E'[2026-09-03] Added from nautiotterinn.com/accommodations: Bald Eagle Bungaloo (Inn campus yurt).'
    ),
    (
      'Reindeer Roadhouse', 'Cabin', '4', '4 Twin',
      'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
      '225', '240.50', '225', '240.50', '225', '240.50',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 225, 'weekend', 240.50), 'summer', jsonb_build_object('weekday', 225, 'weekend', 240.50), 'fall', jsonb_build_object('weekday', 225, 'weekend', 240.50), 'note', 'Private-bath cabin at Yurt Village. Sold out ResNexus Thu Sep 3. Weekday = Google Maps Expedia $225 Sep 8–9 2026; weekend = yurt Standard Rate $240.50.')),
      $$Reindeer Roadhouse: private cabin at the Yurt Village with kitchen and private bathroom (hot water), 4 Twin beds upstairs plus a downstairs couch, sleeps 4. Linens, towels, firewood, own fire pit, plus pavilion and shower house access.$$,
      'Private-bath cabin at Yurt Village; kitchen; private hot-water bath; 4 Twin + couch; sleeps 4; linens/towels; firewood; private fire pit; pavilion access. Breakfast included. Pets $25.',
      E'[2026-09-03] Added from nautiotterinn.com/accommodations: Reindeer Roadhouse (private bath, Yurt Village).'
    ),
    (
      'Bigfoot Bungalow', 'Cabin', '2', '1 Queen',
      'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
      '225', '240.50', '225', '240.50', '225', '240.50',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 225, 'weekend', 240.50), 'summer', jsonb_build_object('weekday', 225, 'weekend', 240.50), 'fall', jsonb_build_object('weekday', 225, 'weekend', 240.50), 'note', 'Private-bath cottage at Yurt Village. Sold out ResNexus Thu Sep 3. Weekday = Expedia $225; weekend = yurt $240.50.')),
      $$Bigfoot Bungalow: private cottage at the Yurt Village with 1 Queen, sleeps 2, fully equipped kitchen, private bathroom with hot shower, and a patio. Shares the Yurt Village with Reindeer Roadhouse and most yurts.$$,
      'Private-bath cottage at Yurt Village; 1 Queen; sleeps 2; full kitchen; private hot shower; patio; outdoor grilling. Breakfast included. Pets $25.',
      E'[2026-09-03] Added from nautiotterinn.com/accommodations: Bigfoot Bungalow (private bath, Yurt Village).'
    ),
    (
      'Beaver Boudoir', 'Cabin', '1', '1 Single',
      'No', 'No', 'No', 'No', 'No',
      '194', '225', '194', '225', '194', '225',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 194, 'weekend', 225), 'summer', jsonb_build_object('weekday', 194, 'weekend', 225), 'fall', jsonb_build_object('weekday', 194, 'weekend', 225), 'note', 'Solo Inn-campus cabin. Sold out ResNexus Thu Sep 3. Proxy: Google Maps Booking.com double $194 / Expedia $225 Sep 8–9 2026.')),
      $$Beaver Boudoir: rustic solo cabin at the Inn with 1 Single, sleeps 1, shared front porch, electricity, WiFi in the Inn. Flushable outhouse nearby; showers in the Inn or outdoor shower house. Self-serve breakfast included.$$,
      'Solo rustic cabin at Inn; 1 Single; sleeps 1; electricity; shared porch; flushable outhouse; Inn + outdoor showers; WiFi in Inn; fire pit; breakfast included. Pets $25.',
      E'[2026-09-03] Added from nautiotterinn.com/accommodations: Beaver Boudoir (solo cabin, Inn).'
    ),
    (
      'Loon Saloon', 'Cabin', '1', '1 Single',
      'No', 'No', 'No', 'No', 'No',
      '194', '225', '194', '225', '194', '225',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 194, 'weekend', 225), 'summer', jsonb_build_object('weekday', 194, 'weekend', 225), 'fall', jsonb_build_object('weekday', 194, 'weekend', 225), 'note', 'Solo Inn-campus cabin. Rate proxy Booking.com $194 / Expedia $225 Sep 8–9 2026.')),
      $$Loon Saloon: private solo cabin at the Inn with 1 Single, sleeps 1, shared front porch, electricity, WiFi in the Inn. Flushable outhouse nearby; showers in the Inn or outdoor shower house.$$,
      'Solo rustic cabin at Inn; 1 Single; sleeps 1; electricity; shared porch; flushable outhouse; Inn + outdoor showers; WiFi in Inn; fire pit; breakfast included. Pets $25.',
      E'[2026-09-03] Added from nautiotterinn.com/accommodations: Loon Saloon.'
    ),
    (
      'Mariner''s Lair Cabin', 'Cabin', '1', '1 Twin',
      'No', 'No', 'No', 'No', 'No',
      '194', '225', '194', '225', '194', '225',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 194, 'weekend', 225), 'summer', jsonb_build_object('weekday', 194, 'weekend', 225), 'fall', jsonb_build_object('weekday', 194, 'weekend', 225), 'note', 'Solo Inn-campus cabin. Rate proxy Booking.com $194 / Expedia $225 Sep 8–9 2026.')),
      $$Mariner's Lair Cabin: cozy solo cabin at the Inn with 1 Twin, sleeps 1, electricity, WiFi in the Inn. Flushable outhouse a short walk away; showers in the Inn. Fire pit and self-serve breakfast.$$,
      'Solo rustic cabin at Inn; 1 Twin; sleeps 1; electricity; flushable outhouse; Inn showers; WiFi in Inn; fire pit; breakfast included. Pets $25.',
      E'[2026-09-03] Added from nautiotterinn.com/accommodations: Mariner''s Lair Cabin.'
    ),
    (
      'Wolf Den Cabin', 'Cabin', '3', '1 Queen, 1 Bunk',
      'No', 'No', 'No', 'No', 'No',
      '194', '225', '194', '225', '194', '225',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 194, 'weekend', 225), 'summer', jsonb_build_object('weekday', 194, 'weekend', 225), 'fall', jsonb_build_object('weekday', 194, 'weekend', 225), 'note', 'Inn-campus cabin sleeps 3. Sold out ResNexus Thu Sep 3. Proxy Booking.com $194 / Expedia $225.')),
      $$Wolf Den Cabin: remodeled cabin at the Inn with 1 Queen + 1 single bunk, sleeps 3. Electricity; WiFi in the Inn; flushable outhouse nearby; showers in the Inn. Self-serve breakfast included.$$,
      'Rustic cabin at Inn; 1 Queen + 1 bunk; sleeps 3; electricity; flushable outhouse; Inn showers; WiFi in Inn; fire pit; breakfast included. Pets $25.',
      E'[2026-09-03] Added from nautiotterinn.com/accommodations: Wolf Den Cabin.'
    ),
    (
      'Humpback Shack', 'Cabin', '4', '2 Full',
      'No', 'No', 'No', 'No', 'No',
      '194', '225', '194', '225', '194', '225',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 194, 'weekend', 225), 'summer', jsonb_build_object('weekday', 194, 'weekend', 225), 'fall', jsonb_build_object('weekday', 194, 'weekend', 225), 'note', 'Inn-campus cabin sleeps 4. Rate proxy Booking.com $194 / Expedia $225 Sep 8–9 2026.')),
      $$Humpback Shack: cabin at the Inn with 2 Full beds, sleeps 4, electricity. WiFi in the Inn; shared flushable outhouse; showers in the Inn or outdoor shower house. Self-serve breakfast included.$$,
      'Rustic cabin at Inn; 2 Full; sleeps 4; electricity; flushable outhouse; Inn + outdoor showers; WiFi in Inn; fire pit; breakfast included. Pets $25.',
      E'[2026-09-03] Added from nautiotterinn.com/accommodations: Humpback Shack.'
    ),
    (
      'The Sourdough Cabin', 'Cabin', '3', '1 Double',
      'No', 'No', 'No', 'No', 'No',
      '194', '225', '194', '225', '194', '225',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 194, 'weekend', 225), 'summer', jsonb_build_object('weekday', 194, 'weekend', 225), 'fall', jsonb_build_object('weekday', 194, 'weekend', 225), 'note', 'Inn-campus cabin. Google Maps Booking.com listed 1 double bed $194 Sep 8–9 2026; weekend Expedia $225.')),
      $$The Sourdough Cabin: rustic cabin at the Inn for two–three with 1 Double bed, electricity, WiFi in the Inn. Flushable outhouse a short walk away; showers in the Inn. Shared amenities and self-serve breakfast.$$,
      'Rustic cabin at Inn; 1 Double; sleeps 3; electricity; flushable outhouse; Inn showers; WiFi in Inn; fire pit; breakfast included. Pets $25.',
      E'[2026-09-03] Added from nautiotterinn.com/accommodations: The Sourdough Cabin.'
    ),
    (
      'Lumberjack Shack', 'Camper', '2', '2 Twin',
      'No', 'No', 'No', 'No', 'No',
      '194', '225', '194', '225', '194', '225',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 194, 'weekend', 225), 'summer', jsonb_build_object('weekday', 194, 'weekend', 225), 'fall', jsonb_build_object('weekday', 194, 'weekend', 225), 'note', 'Restored 1960s camper at Inn. Sold out ResNexus Thu Sep 3. Proxy Booking.com $194 / Expedia $225.')),
      $$Lumberjack Shack: restored vintage 1960s camper at the Inn with 2 Twin beds, sleeps 2, electricity. WiFi in the Inn; flushable outhouse nearby; showers in the Inn. Full access to Nauti Otter amenities and self-serve breakfast.$$,
      'Vintage camper at Inn; 2 Twin; sleeps 2; electricity; flushable outhouse; Inn showers; WiFi in Inn; fire pit; breakfast included. Pets $25.',
      E'[2026-09-03] Added from nautiotterinn.com/accommodations: Lumberjack Shack (vintage camper).'
    ),
    (
      'Salty Sea Crab Shack', 'Camper', '2', '1 Full',
      'No', 'No', 'No', 'No', 'No',
      '194', '225', '194', '225', '194', '225',
      jsonb_build_object('2026', jsonb_build_object('winter', jsonb_build_object('weekday', null, 'weekend', null), 'spring', jsonb_build_object('weekday', 194, 'weekend', 225), 'summer', jsonb_build_object('weekday', 194, 'weekend', 225), 'fall', jsonb_build_object('weekday', 194, 'weekend', 225), 'note', 'Restored vintage camper at Inn. Rate proxy Booking.com $194 / Expedia $225 Sep 8–9 2026.')),
      $$Salty Sea Crab Shack: restored vintage camper at the Inn for two with 1 Full bed, electricity. WiFi in the Inn; flushable outhouse nearby; showers in the Inn. Shared amenities and self-serve breakfast.$$,
      'Vintage camper at Inn; 1 Full; sleeps 2; electricity; flushable outhouse; Inn showers; WiFi in Inn; fire pit; breakfast included. Pets $25.',
      E'[2026-09-03] Added from nautiotterinn.com/accommodations: Salty Sea Crab Shack (vintage camper).'
    )
) AS v(
  site_name, unit_type, capacity, bed,
  private_bath, shower, kitchenette, full_kitchen, water,
  spr_wd, spr_we, sum_wd, sum_we, fal_wd, fal_we,
  rates_json, unit_desc, amenities, note
)
WHERE g.id = 13209
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = g.property_id AND x.site_name = v.site_name
  );

UPDATE public.all_sage_data
SET property_total_sites = 22, date_updated = '2026-09-03'
WHERE property_id = 'e7db45f2-9ae4-409b-8819-e4c32d67792c';

COMMIT;
