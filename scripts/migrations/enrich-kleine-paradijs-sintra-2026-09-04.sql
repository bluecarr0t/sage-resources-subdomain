-- Het Kleine Paradijs (7) + Glamping Sintra (3 cabins).

BEGIN;

-- ============================================================================
-- Het Kleine Paradijs — 2 treehouses, not 10.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Het Kleine Paradijs', slug = 'het-kleine-paradijs-easterein',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_het_kleine_paradijs_2026_09',
  address = 'Meilahuzen 9', city = 'Easterein', state = 'Friesland',
  zip_code = '8734 GA', country = 'Netherlands',
  lat = NULL, lon = NULL,
  url = 'https://www.hetkleineparadijs.nl/', phone_number = '+31-6-45455544',
  property_total_sites = 7, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'rustic', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Small Frisian yard stay. Operator 2026 hosts Fé Berger & Jorrit van Dijk. Inventory: Boomhut Kraaiennest + Uilenspiegel, Blokhut Heilig Huisje + Schrijvershut, Schuurhuisje Liefdesnest, Kerkje De Rode Kapel, plus Groepsaccommodatie Het Kabinet = 7. Not 10 treehouses. Sage Kleasterwei 3 / 8734 GS / +31 515 331456 were wrong. Shared kitchen/sanitary for the six huisjes. No operator GPS published.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Booking portal from €157 / 2 nights for the two blokhutten (€78.50/n) and €204 / 2 nights for boomhutten and kapel (€102/n). Stored per-SKU. +31 6 45455544. welkom@hetkleineparadijs.nl.',
  description = $$Unique huisjes at Meilahuzen 9, 8734 GA Easterein. Two treehouses, two log cabins, one barn cottage, one red chapel, plus group lodge Het Kabinet. Shared kitchen/sanitary for the small houses. Not 10 treehouses. No operator pin published.$$,
  activities_raw = 'On-site: sauna (reservation), fire bowl, canoeing, yard. Nearby: Sneek, Franeker, Leeuwarden, Frisian meadows.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11114 AND property_id = '4f4e99a5-3a8c-495e-8682-0a061bd25bdb';

UPDATE public.all_sage_data
SET
  site_name = 'Treehouse', unit_type = 'Treehouse', quantity_of_units = 2,
  unit_capacity = '2', unit_bed = 'Double',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'No',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Kraaiennest + Uilenspiegel. Shared kitchen and sanitary building.',
  minimum_nights = '1',
  unit_description = $$Treehouse (qty 2): Kraaiennest and Uilenspiegel. Do not invent a 3rd treehouse or treat all 7 units as treehouses.$$,
  amenities_raw = 'Treehouse; double bed; shared kitchen/sanitary; terrace.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 102, 'weekend', 102),
      'spring', jsonb_build_object('weekday', 102, 'weekend', 102),
      'summer', jsonb_build_object('weekday', 102, 'weekend', 102),
      'fall', jsonb_build_object('weekday', 102, 'weekend', 102),
      'note', 'EUR room_only. Booking portal from €204 / 2 nights.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Treehouse qty 10 stub. This row is Treehouse qty 2. Address Meilahuzen 9, 8734 GA. Phone +31 6 45455544. Remaining SKUs added. No lat/lon.'
WHERE id = 11114 AND property_id = '4f4e99a5-3a8c-495e-8682-0a061bd25bdb';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_bed,
  unit_private_bathroom, unit_shower, unit_kitchenette, unit_full_kitchen,
  unit_air_conditioning, unit_wifi, unit_pets, unit_electricity, unit_water,
  unit_campfires, unit_patio, unit_cable, unit_hot_tub, unit_sauna,
  unit_mini_fridge, unit_picnic_table, unit_charcoal_grill, unit_ada_accessibility,
  operating_season_months, minimum_nights,
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
  rate_unit_rates_by_year, rate_basis, rate_basis_notes, description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', 'Het Kleine Paradijs', v.site_name,
  'web_research_het_kleine_paradijs_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country, g.slug, g.property_type,
  7, v.qty, v.unit_type, v.capacity, v.bed,
  v.bath, v.shower, v.kitchenette, v.full_k,
  'No', 'No', 'No', 'Yes', v.water,
  'Yes', 'Yes', 'No', 'No', 'No',
  'No', 'No', 'No', 'No',
  v.season, '1',
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
  v.rates, g.rate_basis, g.rate_basis_notes, g.description, v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    ('Cabin', 2::numeric, 'Cabin', '2', 'Double',
     'No', 'No', 'Yes', 'No', 'No',
     'Year-round typical. Heilig Huisje + Schrijvershut. Shared kitchen/sanitary.',
     $$Cabin (qty 2): Blokhutten Heilig Huisje and Schrijvershut. Do not invent a 3rd blokhut.$$,
     'Log cabin; wood stove; shared kitchen/sanitary.',
     jsonb_build_object('2026', jsonb_build_object(
       'winter', jsonb_build_object('weekday', 78.5, 'weekend', 78.5),
       'spring', jsonb_build_object('weekday', 78.5, 'weekend', 78.5),
       'summer', jsonb_build_object('weekday', 78.5, 'weekend', 78.5),
       'fall', jsonb_build_object('weekday', 78.5, 'weekend', 78.5),
       'note', 'EUR room_only. Booking portal from €157 / 2 nights.'
     )),
     E'[2026-09-04] Added Cabin qty 2 from hetkleineparadijs.nl.'),
    ('Liefdesnest', 1::numeric, 'Cottage', '2', 'Double',
     'No', 'No', 'Yes', 'No', 'No',
     'Year-round typical. One schuurhuisje. Shared kitchen/sanitary.',
     $$Liefdesnest (qty 1): Schuurhuisje. Do not invent a 2nd barn cottage.$$,
     'Barn cottage; shared kitchen/sanitary.',
     jsonb_build_object('2026', jsonb_build_object(
       'winter', jsonb_build_object('weekday', 102, 'weekend', 102),
       'spring', jsonb_build_object('weekday', 102, 'weekend', 102),
       'summer', jsonb_build_object('weekday', 102, 'weekend', 102),
       'fall', jsonb_build_object('weekday', 102, 'weekend', 102),
       'note', 'EUR room_only. Booking portal from €204 / 2 nights for the non-blokhut huisjes.'
     )),
     E'[2026-09-04] Added Liefdesnest qty 1 from hetkleineparadijs.nl.'),
    ('De Rode Kapel', 1::numeric, 'Cottage', '2', 'Box bed',
     'No', 'No', 'Yes', 'No', 'No',
     'Year-round typical. One red chapel. Shared kitchen/sanitary.',
     $$De Rode Kapel (qty 1): Red chapel with box bed. Do not invent a 2nd chapel.$$,
     'Chapel cottage; box bed; shared kitchen/sanitary.',
     jsonb_build_object('2026', jsonb_build_object(
       'winter', jsonb_build_object('weekday', 102, 'weekend', 102),
       'spring', jsonb_build_object('weekday', 102, 'weekend', 102),
       'summer', jsonb_build_object('weekday', 102, 'weekend', 102),
       'fall', jsonb_build_object('weekday', 102, 'weekend', 102),
       'note', 'EUR room_only. Booking portal from €204 / 2 nights.'
     )),
     E'[2026-09-04] Added De Rode Kapel qty 1 from hetkleineparadijs.nl.'),
    ('Het Kabinet', 1::numeric, 'Lodge', '6-10', 'Group beds',
     'Yes', 'Yes', 'No', 'Yes', 'Yes',
     'Year-round typical. One group lodge with own kitchen and sanitary. 6–10 guests.',
     $$Het Kabinet (qty 1): Group lodge. Do not invent a 2nd group building.$$,
     'Group lodge; private kitchen and bath.',
     jsonb_build_object('2026', jsonb_build_object(
       'winter', jsonb_build_object('weekday', 364, 'weekend', 364),
       'spring', jsonb_build_object('weekday', 364, 'weekend', 364),
       'summer', jsonb_build_object('weekday', 364, 'weekend', 364),
       'fall', jsonb_build_object('weekday', 364, 'weekend', 364),
       'note', 'EUR room_only. Booking portal from €728 / 2 nights.'
     )),
     E'[2026-09-04] Added Het Kabinet qty 1 from hetkleineparadijs.nl.')
) AS v(site_name, qty, unit_type, capacity, bed, bath, shower, kitchenette, full_k, water, season, unit_desc, amenities, rates, note)
WHERE g.id = 11114 AND g.property_id = '4f4e99a5-3a8c-495e-8682-0a061bd25bdb'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = '4f4e99a5-3a8c-495e-8682-0a061bd25bdb' AND x.site_name = v.site_name
  );

-- ============================================================================
-- Glamping Sintra — 3 wooden cabins.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Glamping Sintra', slug = 'glamping-sintra',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_glamping_sintra_2026_09',
  address = 'Rua dos Carvalhais 148', city = 'Sintra', state = 'Lisbon',
  zip_code = '2710-453', country = 'Portugal',
  lat = NULL, lon = NULL,
  url = 'https://glampingsintra.com/', phone_number = '+351-964-066-425',
  property_total_sites = 3, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'No',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Three Geo House wooden cabins (~12 m², 2 guests) at Rua dos Carvalhais 148, Lourel. NiT + guest reviews: only 3 cabins. Sage Estrada da Lagoa Azul / 2714-511 / +351 219 123 456 were wrong. No operator GPS or from-rate on glampingsintra.com. Licence 374/2014 on directory pages.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. No operator from-rate. +351 964 066 425. geral@glampingsintra.com.',
  description = $$Three wooden cabins at Rua dos Carvalhais 148, 2710-453 Sintra (Lourel), with views toward Sintra. Not safari tents. No operator pin published.$$,
  activities_raw = 'On-site: cabin porch / star views. Nearby: Sintra historic centre, Pena, Monserrate, Sintra-Cascais Natural Park.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11153 AND property_id = '5daf8a96-504c-45fa-ae3f-28bef099362c';

UPDATE public.all_sage_data
SET
  site_name = 'Cabin', unit_type = 'Cabin', quantity_of_units = 3,
  unit_capacity = '2', unit_bed = 'Double',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Three Geo House cabins. Do not invent a 4th cabin.',
  minimum_nights = '1',
  unit_description = $$Cabin (qty 3): Wooden Geo House cabins with bath and kitchenette. Do not invent safari tents.$$,
  amenities_raw = 'Wooden cabin; ensuite; kitchenette; porch. Pets yes per directory.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object('note', 'EUR room_only. No operator from-rate. Cleared stub 160 safari ADR.')
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Safari Tent stub. Cabin qty 3. Address Rua dos Carvalhais 148, 2710-453. Phone +351 964 066 425. No lat/lon.'
WHERE id = 11153 AND property_id = '5daf8a96-504c-45fa-ae3f-28bef099362c';

COMMIT;
