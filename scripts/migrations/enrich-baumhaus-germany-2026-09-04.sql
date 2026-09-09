-- Three German treehouse hotels: Seemühle (10), Oberbayern (5+5), Solling (10+3).

BEGIN;

-- ============================================================================
-- Baumhaushotel Seemühle — 10 luxury treehouses. Waldhaus apts + Schäferwagen
-- exist but apartment counts unpublished — not invented.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Closed', is_glamping_property = 'Yes',
  property_name = 'Baumhaushotel Seemühle', slug = 'baumhaushotel-seemuehle-graefendorf',
  property_type = 'Outdoor Boutique Hotel', source = 'Sage',
  discovery_source = 'web_research_baumhaushotel_seemuehle_2026_09',
  address = 'Seemühle 1', city = 'Gräfendorf', state = 'Bavaria',
  zip_code = '97782', country = 'Germany',
  lat = 50.1185, lon = 9.7001,
  url = 'https://www.das-baumhaushotel.de/', phone_number = '+49-9357-9098020',
  property_total_sites = 10, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Ten themed luxury treehouses (Lodge, Cottage, Chalet, Stadl, etc.) around a 400-year mill in Naturpark Spessart. Breakfast on the balcony. No dogs. Operator notes a renovation pause after Nov/Dec 2026 capacity — still listed open. Waldhaus apartments + Schäferwagen exist; counts unpublished — not stored.',
  rate_basis = 'breakfast',
  rate_basis_notes = 'EUR. Breakfast included. No published static from-rate — stub 250 retained as unconfirmed sample. Phone +49 9357 9098020 (not stub 6068). info@das-baumhaushotel.de.',
  description = $$Luxury treehouse hotel at Seemühle 1, 97782 Gräfendorf (50.1185, 9.7001), in Naturpark Spessart. Ten luxury treehouses — not five. Breakfast included. No dogs. Opened 2016.$$,
  activities_raw = 'On-site: woodland walks, mill/valley, breakfast balcony. Nearby: Spessart trails, Gemünden, Würzburg region.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11000 AND property_id = '329da681-9864-43aa-b1e0-29ed53c45464';

UPDATE public.all_sage_data
SET
  site_name = 'Treehouse', unit_type = 'Treehouse', quantity_of_units = 10,
  unit_capacity = '2-4', unit_bed = 'Double / family (2–4)',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Ten luxury treehouses lumped. Apartments + shepherd wagon unpublished — not stored. Operator flags a post-2026 renovation pause.',
  minimum_nights = '1',
  unit_description = $$Treehouse (qty 10): Luxury themed treehouses 37–46 m² with bath, heating and balcony breakfast. Do not invent an 11th house or apartment SKUs.$$,
  amenities_raw = 'Treehouse; private bath; heating; balcony; breakfast. No dogs. Stairs only.',
  rate_winter_weekday = '250', rate_winter_weekend = '250',
  rate_spring_weekday = '250', rate_spring_weekend = '250',
  rate_summer_weekday = '250', rate_summer_weekend = '250',
  rate_fall_weekday = '250', rate_fall_weekend = '250',
  rate_unit_rates_by_year = jsonb_build_object('2026', jsonb_build_object('note', 'EUR breakfast. No operator from-rate; stub 250 unconfirmed sample.')),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published Treehouse qty 10 (not 5). Phone +49 9357 9098020. URL das-baumhaushotel.de. year 2016. rate_basis unknown → breakfast.'
WHERE id = 11000 AND property_id = '329da681-9864-43aa-b1e0-29ed53c45464';

-- ============================================================================
-- Baumhaushotel Oberbayern — 5 treehouses + 5 See-Lodges.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Baumhaushotel Oberbayern', slug = 'baumhaushotel-oberbayern-jetzendorf',
  property_type = 'Outdoor Boutique Hotel', source = 'Sage',
  discovery_source = 'web_research_baumhaushotel_oberbayern_2026_09',
  address = 'Schulstraße 26', city = 'Jetzendorf', state = 'Bavaria',
  zip_code = '85305', country = 'Germany',
  lat = 48.43415, lon = 11.40850,
  url = 'https://baumhaushotel-oberbayern.com/', phone_number = '+49-8137-9962595',
  property_total_sites = 10, year_site_opened = 2016,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Five luxury treehouses (some with terrace whirlpool / private sauna) plus five 14 m² See-Lodges over the swimming lake. Breakfast delivered. Dogs ≤20 kg. Address Schulstraße 26 — not Hauptstraße 1.',
  rate_basis = 'breakfast',
  rate_basis_notes = 'EUR including breakfast. Operator treehouse from €220 single / €270 double; See-Lodge €195 / €245. Extra person €50 on family houses. Min 2 nights on treehouses. +49 8137 9962595 (not stub 999800).',
  description = $$Treehouse hotel at Schulstraße 26, 85305 Jetzendorf (48.43415, 11.40850), at a private swimming lake ~30 min north of Munich. Five treehouses and five See-Lodges. Breakfast included. Dogs ≤20 kg.$$,
  activities_raw = 'On-site: lake swim, whirlpool/sauna (selected houses), forest climbing park nearby, breakfast terrace. Nearby: Munich, Pfaffenhofen, Dachau.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11003 AND property_id = '40279bf4-a620-4ec1-acbb-a19b0aa05b67';

UPDATE public.all_sage_data
SET
  site_name = 'Treehouse', unit_type = 'Treehouse', quantity_of_units = 5,
  unit_capacity = '2-4', unit_bed = 'Double 180x200 + optional extra',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'Yes',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'Yes',
  operating_season_months = 'Year-round. Five treehouses lumped (not all have whirlpool/sauna). See-Lodges split out.',
  minimum_nights = '2',
  unit_description = $$Treehouse (qty 5): 22 m² houses 5 m up with bath, terrace, breakfast. Selected houses have outdoor whirlpool and/or private sauna. Dogs ≤20 kg. Do not invent a 6th treehouse.$$,
  amenities_raw = 'Treehouse; bath; terrace; breakfast; Wi-Fi. Whirlpool/sauna on selected houses. Dogs ≤20 kg.',
  rate_winter_weekday = '270', rate_winter_weekend = '270',
  rate_spring_weekday = '270', rate_spring_weekend = '270',
  rate_summer_weekday = '270', rate_summer_weekend = '270',
  rate_fall_weekday = '270', rate_fall_weekend = '270',
  rate_unit_rates_by_year = jsonb_build_object('2026', jsonb_build_object('note', 'EUR breakfast. Operator double from €270 (entry treehouse). Suite/whirlpool houses from €320–370.')),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published Treehouse qty 5 from baumhaushotel-oberbayern.com. Address Schulstraße 26. See-Lodge qty 5 added. rate_basis unknown → breakfast.'
WHERE id = 11003 AND property_id = '40279bf4-a620-4ec1-acbb-a19b0aa05b67';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, unit_picnic_table, unit_charcoal_grill, unit_ada_accessibility,
  year_site_opened, operating_season_months, minimum_nights,
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
  'published', 'Yes', 'Yes', 'Sage', 'Baumhaushotel Oberbayern', 'See-Lodge',
  'web_research_baumhaushotel_oberbayern_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country, g.slug, g.property_type,
  10, 5::numeric, 'Cabin', '2', 'Double 180x200 loft',
  'Yes', 'Yes', 'Yes', 'No',
  'No', 'Yes', 'Yes', 'Yes', 'Yes',
  'No', 'Yes', 'Yes', 'No', 'No',
  'Yes', 'No', 'No', 'No',
  2016::numeric, 'Year-round. Five 14 m² lake lodges over the water.', '1',
  $$See-Lodge (qty 5): 14 m² heated lake cabins with loft double, bath and 6 m² covered terrace. Max 2. Do not invent a 6th lodge.$$,
  'See-Lodge; bath; underfloor heat; covered terrace; breakfast; Wi-Fi. Dogs ≤20 kg.',
  g.activities_raw, g.url, g.property_id, g.phone_number,
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
  '245', '245', '245', '245', '245', '245', '245', '245',
  jsonb_build_object('2026', jsonb_build_object('note', 'EUR breakfast. Operator double €245 / single €195.')),
  g.rate_basis, g.rate_basis_notes, g.description,
  E'[2026-09-04] Added See-Lodge qty 5 from baumhaushotel-oberbayern.com/die-seelodges/ + Gemeinde Jetzendorf.'
FROM public.all_sage_data g
WHERE g.id = 11003 AND g.property_id = '40279bf4-a620-4ec1-acbb-a19b0aa05b67'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = '40279bf4-a620-4ec1-acbb-a19b0aa05b67' AND x.site_name = 'See-Lodge'
  );

-- ============================================================================
-- Baumhaushotel Solling — 10 treehouses + 3 tree tents. Breakfast optional.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Baumhaushotel Solling', slug = 'baumhaushotel-solling-uslar',
  property_type = 'Outdoor Boutique Hotel', source = 'Sage',
  discovery_source = 'web_research_baumhaushotel_solling_2026_09',
  address = 'In der Loh / Am ErlebnisWald', city = 'Uslar', state = 'Lower Saxony',
  zip_code = '37170', country = 'Germany',
  lat = 51.707978, lon = 9.557011,
  url = 'https://www.baumhaushotel-solling.de/', phone_number = '+49-5571-919305',
  property_total_sites = 13, year_site_opened = 2008,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Niedersachsen''s first treehouse hotel (2008) in ErlebnisWald Solling, Uslar-Schönhagen. Ten unique heated treehouses (Aurora 2023 with ensuite/Wi-Fi/AC/TV; Ahletal now ensuite) plus three tree tents. Most houses share compost toilet + nearby showers. Breakfast optional €19/person delivered. Dogs in most houses except Baumtraum, Refugium, Aurora and the tents.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Breakfast optional €19/adult (child 7–12 €9). No published static treehouse from-rate — stub 200 retained as unconfirmed sample. Office Kurze Str. 2; hotel In der Loh. +49 5571 919305 (not stub 9199655).',
  description = $$Treehouse hotel at In der Loh / Am ErlebnisWald, 37170 Uslar-Schönhagen (51.707978, 9.557011). Ten heated treehouses and three tree tents — not eight houses. Breakfast optional. Natural swimming pond and 40 m tower on site.$$,
  activities_raw = 'On-site: ErlebnisWald tower, natural pond, playground, campfire, forest walks. Nearby: Solling-Vogler, Weserbergland, Uslar.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11023 AND property_id = '5e052193-7efc-4ea7-9b73-24eec2cf5774';

UPDATE public.all_sage_data
SET
  site_name = 'Treehouse', unit_type = 'Treehouse', quantity_of_units = 10,
  unit_capacity = '2-6', unit_bed = 'Varies by house (2–6)',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'No',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round. Ten unique houses lumped. Aurora/Ahletal have ensuite — majority share showers. Tree tents split out.',
  minimum_nights = '1',
  unit_description = $$Treehouse (qty 10): Unique heated houses including Aurora (2023 ensuite). Most have compost toilet and shared showers. Do not invent an 11th house.$$,
  amenities_raw = 'Treehouse; heating; balcony; kettle/coffee. Most: compost WC + shared showers. Aurora/Ahletal ensuite. Dogs most houses.',
  rate_winter_weekday = '200', rate_winter_weekend = '200',
  rate_spring_weekday = '200', rate_spring_weekend = '200',
  rate_summer_weekday = '200', rate_summer_weekend = '200',
  rate_fall_weekday = '200', rate_fall_weekend = '200',
  rate_unit_rates_by_year = jsonb_build_object('2026', jsonb_build_object('note', 'EUR room_only. Breakfast optional €19. Stub 200 unconfirmed sample.')),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published Treehouse qty 10 (not 8) at ErlebnisWald 51.707978,9.557011. Phone +49 5571 919305. Tree tents added. rate_basis unknown → room_only (breakfast optional).'
WHERE id = 11023 AND property_id = '5e052193-7efc-4ea7-9b73-24eec2cf5774';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, unit_picnic_table, unit_charcoal_grill, unit_ada_accessibility,
  year_site_opened, operating_season_months, minimum_nights,
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
  'published', 'Yes', 'Yes', 'Sage', 'Baumhaushotel Solling', 'Tree Tent',
  'web_research_baumhaushotel_solling_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country, g.slug, g.property_type,
  13, 3::numeric, 'Treehouse', '2', '2 persons',
  'No', 'No', 'No', 'No',
  'No', 'No', 'No', 'Yes', 'No',
  'Yes', 'No', 'No', 'No', 'No',
  'No', 'No', 'No', 'No',
  2008::numeric, 'Seasonal-leaning tree tents ~1.5 m up. Shared sanitary. No dogs. No linens.',
  '1',
  $$Tree Tent (qty 3): Canvas tree tents for two between the trees. Shared showers. No dogs. Do not invent a 4th tent.$$,
  'Tree tent; shared sanitary; no linens. Breakfast in conference wagon if booked.',
  g.activities_raw, g.url, g.property_id, g.phone_number,
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
  '200', '200', '200', '200', '200', '200', '200', '200',
  jsonb_build_object('2026', jsonb_build_object('note', 'EUR room_only. No tent-specific from-rate; stub 200 unconfirmed.')),
  g.rate_basis, g.rate_basis_notes, g.description,
  E'[2026-09-04] Added Tree Tent qty 3 from baumhaushotel-solling.de / Outdooractive / Stadt Uslar.'
FROM public.all_sage_data g
WHERE g.id = 11023 AND g.property_id = '5e052193-7efc-4ea7-9b73-24eec2cf5774'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = '5e052193-7efc-4ea7-9b73-24eec2cf5774' AND x.site_name = 'Tree Tent'
  );

COMMIT;
