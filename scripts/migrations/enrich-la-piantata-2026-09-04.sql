-- La Piantata: keep Treehouse qty 2; add the other published SKUs (12 total).

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'La Piantata', slug = 'la-piantata-arlena-di-castro',
  property_type = 'Outdoor Boutique Hotel', source = 'Sage',
  discovery_source = 'web_research_la_piantata_2026_09',
  address = 'Strada Provinciale n.113 Arlenese, Località La Piantata',
  city = 'Arlena di Castro', state = 'Lazio',
  zip_code = '01010', country = 'Italy',
  lat = 42.4903293, lon = 11.8264805,
  url = 'https://www.lapiantata.it/', phone_number = '+39-327-212-6916',
  property_total_sites = 12, year_site_opened = 2006,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'Yes', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'Yes',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Agriturismo La Piantata 1822 (CIN IT056002B5LNYD864N). Operator: 2 treehouses + 2 elevated glamping suites + 1 Bambù SPA suite + 4 ground rooms + 3 apartments = 12. Infinity pool, stilt spa (sauna/hammam). 2006 is the lodging dream/open year; 1822 is the historic farm. Sage zip 1010 / phone +39 0761 451255 / coords 42.4541,11.8311 were wrong.',
  rate_basis = 'breakfast',
  rate_basis_notes = 'EUR. Operator treehouse pages include breakfast in-room. Homepage from-rates: rooms €115 / apartments €150 / glamping suites €290 / treehouses €380 / Bambù €390. +39 327 212 6916. agriturismo@lapiantata.it.',
  description = $$Agriturismo at Strada Provinciale n.113 Arlenese, Località La Piantata, 01010 Arlena di Castro (42.4903293, 11.8264805). Two treehouses, two elevated glamping suites, one Bambù SPA suite, four ground rooms and three apartments. Infinity pool and lavender estate. Not a 2-treehouse-only property.$$,
  activities_raw = 'On-site: infinity pool, stilt spa, botanical trail, lavender fields, e-bikes, estate products. Nearby: Lake Bolsena, Tuscania, Tuscia.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'Yes', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11042 AND property_id = 'cf0410f3-c428-42f7-a676-f11be07d0cc1';

UPDATE public.all_sage_data
SET
  site_name = 'Treehouse', unit_type = 'Treehouse', quantity_of_units = 2,
  unit_capacity = '2', unit_bed = 'Double',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Suite Bleue + Black Cabin lumped. Pool typically 1 May–30 Sep.',
  minimum_nights = '1',
  unit_description = $$Treehouse (qty 2): Suite Bleue and Black Cabin, both ~8 m up. Lumped — do not invent a 3rd treehouse.$$,
  amenities_raw = 'Treehouse; ensuite; A/C; Wi-Fi; minibar; terrace. Breakfast included.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 380, 'weekend', 380),
      'spring', jsonb_build_object('weekday', 380, 'weekend', 380),
      'summer', jsonb_build_object('weekday', 380, 'weekend', 380),
      'fall', jsonb_build_object('weekday', 380, 'weekend', 380),
      'note', 'EUR breakfast. Homepage treehouse from €380 (Suite Bleue and Black Cabin cards). Dedicated Black Cabin page still showed €290 — not stored as the lumped from-rate.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published Treehouse qty 2. Added remaining 10 units. Zip 01010. Phone +39 327 212 6916. Coords 42.4903293, 11.8264805. Year 2006. Type → Outdoor Boutique Hotel.'
WHERE id = 11042 AND property_id = 'cf0410f3-c428-42f7-a676-f11be07d0cc1';

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
  rate_unit_rates_by_year, rate_basis, rate_basis_notes, description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', 'La Piantata', v.site_name,
  'web_research_la_piantata_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country, g.slug, g.property_type,
  12, v.qty, v.unit_type, v.capacity, v.bed,
  'Yes', 'Yes', v.kitchenette, v.full_k,
  'Yes', 'Yes', 'No', 'Yes', 'Yes',
  'No', 'Yes', 'No', v.hot_tub, v.sauna,
  'Yes', 'No', 'No', 'No',
  2006::numeric, v.season, '1',
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
    ('Glamping Suite', 2::numeric, 'Eco-suite', '2-4', 'Double',
     'No', 'No', 'No', 'No',
     'Year-round typical. Papiro and Edera (Papyrus / Ivy) lumped. Elevated 4 m over the botanical walk.',
     $$Glamping Suite (qty 2): Twin elevated suites Papiro and Edera. Do not invent a 3rd glamping suite.$$,
     'Elevated glamping suite; ensuite; A/C; terrace. Breakfast included.',
     jsonb_build_object('2026', jsonb_build_object(
       'winter', jsonb_build_object('weekday', 290, 'weekend', 290),
       'spring', jsonb_build_object('weekday', 290, 'weekend', 290),
       'summer', jsonb_build_object('weekday', 290, 'weekend', 290),
       'fall', jsonb_build_object('weekday', 290, 'weekend', 290),
       'note', 'EUR breakfast. Homepage glamping suite from €290.'
     )),
     E'[2026-09-04] Added Glamping Suite qty 2 (Papiro + Edera) from lapiantata.it.'),
    ('SPA Suite Bambù', 1::numeric, 'Suite', '2-4', 'Double',
     'Yes', 'Yes', 'Yes', 'Yes',
     'Year-round typical. One Bambù SPA suite with private spa, kitchen, rooftop tree terrace.',
     $$SPA Suite Bambù (qty 1): Private spa + kitchen. Do not invent a 2nd Bambù.$$,
     'SPA suite; kitchen; private spa; terrace. Breakfast included.',
     jsonb_build_object('2026', jsonb_build_object(
       'winter', jsonb_build_object('weekday', 390, 'weekend', 390),
       'spring', jsonb_build_object('weekday', 390, 'weekend', 390),
       'summer', jsonb_build_object('weekday', 390, 'weekend', 390),
       'fall', jsonb_build_object('weekday', 390, 'weekend', 390),
       'note', 'EUR breakfast. Homepage Bambù from €390.'
     )),
     E'[2026-09-04] Added SPA Suite Bambù qty 1 from lapiantata.it.'),
    ('Ground-floor Room', 4::numeric, 'Hotel Room', '2', 'Double',
     'No', 'No', 'No', 'No',
     'Year-round typical. Four named rooms lumped (Lavender, Olive, Grape, Blackberries).',
     $$Ground-floor Room (qty 4): Provençal double rooms. Do not invent a 5th room.$$,
     'Hotel room; ensuite; A/C; pergola. Breakfast included.',
     jsonb_build_object('2026', jsonb_build_object(
       'winter', jsonb_build_object('weekday', 115, 'weekend', 115),
       'spring', jsonb_build_object('weekday', 115, 'weekend', 115),
       'summer', jsonb_build_object('weekday', 115, 'weekend', 115),
       'fall', jsonb_build_object('weekday', 115, 'weekend', 115),
       'note', 'EUR breakfast. Homepage ground-floor room from €115.'
     )),
     E'[2026-09-04] Added Ground-floor Room qty 4 from lapiantata.it.'),
    ('Apartment', 3::numeric, 'Cottage', '2-4', 'Varies by apartment',
     'Yes', 'Yes', 'No', 'No',
     'Year-round typical. Three named apartments lumped (Roses, Oak, Lemons).',
     $$Apartment (qty 3): Independent ground apartments. Do not invent a 4th apartment.$$,
     'Apartment; kitchen; ensuite; A/C. Breakfast included.',
     jsonb_build_object('2026', jsonb_build_object(
       'winter', jsonb_build_object('weekday', 150, 'weekend', 150),
       'spring', jsonb_build_object('weekday', 150, 'weekend', 150),
       'summer', jsonb_build_object('weekday', 150, 'weekend', 150),
       'fall', jsonb_build_object('weekday', 150, 'weekend', 150),
       'note', 'EUR breakfast. Homepage apartment from €150.'
     )),
     E'[2026-09-04] Added Apartment qty 3 from lapiantata.it.')
) AS v(site_name, qty, unit_type, capacity, bed, kitchenette, full_k, hot_tub, sauna, season, unit_desc, amenities, rates, note)
WHERE g.id = 11042 AND g.property_id = 'cf0410f3-c428-42f7-a676-f11be07d0cc1'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = 'cf0410f3-c428-42f7-a676-f11be07d0cc1' AND x.site_name = v.site_name
  );

COMMIT;
