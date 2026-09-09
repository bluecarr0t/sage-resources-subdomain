-- Yurtcamp Devon (22 yurts), Cabanes Dosrius (5+2), Kustpark Nieuwpoort, Finca Les Coves (8).

BEGIN;

-- ============================================================================
-- Yurtcamp Devon — 22 contemporary yurts. Shared sanitary.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Yurtcamp Devon', slug = 'yurtcamp-devon',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_yurtcamp_devon_2026_09',
  address = 'Staplehill Road, Liverton', city = 'Newton Abbot', state = 'Devon',
  zip_code = 'TQ12 6FU', country = 'United Kingdom',
  lat = 50.5747, lon = -3.6791,
  url = 'https://www.yurtcamp.co.uk/', phone_number = '+44-1626-824666',
  property_total_sites = 22, year_site_opened = 2010,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = '40-acre woodland, Liverton / Dartmoor edge. Operator and listings: 22 contemporary yurts in two sizes (small couples / large up to 6). Village, woodland, secluded siting. Shared toilet/shower block. Woodland Cafe and Pancake House. No dogs. Sage site_name Stone Cottages was wrong. Small vs large qty split unpublished. Opened ~2010.',
  rate_basis = 'unknown',
  rate_basis_notes = 'GBP. No official 2026 card on yurtcamp.co.uk (enquire). +44 1626 824666. enquiries@yurtcamp.co.uk.',
  description = $$Yurtcamp Devon, Staplehill Road, Liverton, Newton Abbot TQ12 6FU (50.5747, -3.6791). Twenty-two woodland yurts. Shared sanitary. Licensed cafe/bar. No dogs.$$,
  activities_raw = 'On-site: woodland assault course, zip wire, playground, cafe/bar, events/weddings. Nearby: Dartmoor, English Riviera.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11277 AND property_id = '5d7acb5d-20d3-46ee-a472-8982cadd1972';

UPDATE public.all_sage_data
SET
  site_name = 'Yurt', unit_type = 'Yurt', quantity_of_units = 22,
  unit_capacity = '2-6', unit_bed = 'Double or king + singles',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'No', unit_water = 'No',
  unit_campfires = 'Yes', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'Yes', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Typical March–October. 22 yurts lumped (small + large). Do not invent a 23rd.',
  minimum_nights = '2',
  unit_description = $$Yurt (qty 22): Official two sizes lumped. Log burner, camp kitchen, fire pit. Shared sanitary. No dogs.$$,
  amenities_raw = 'Yurt; log burner; camping stove; cool box; fire pit; shared showers. No dogs.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'GBP unknown. No official public nightly card stored.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Fixed Stone Cottages stub. This row is Yurt qty 22. Small/large split unpublished.'
WHERE id = 11277 AND property_id = '5d7acb5d-20d3-46ee-a472-8982cadd1972';

-- ============================================================================
-- Cabanes Dosrius — 5 family treehouses + 2 couple suites.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Cabanes Dosrius', slug = 'cabanes-dosrius',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_cabanes_dosrius_2026_09',
  address = 'Veïnat Rimbles, s/n', city = 'Dosrius', state = 'Catalonia',
  zip_code = '08318', country = 'Spain',
  lat = 41.6062, lon = 2.4213,
  url = 'https://www.cabanesdosrius.com/en/cabanes/', phone_number = '+34-611-250-720',
  property_total_sites = 7, year_site_opened = 2012,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Eco treehouse hotel, Parc del Corredor. Official 7 octagonal cabins: Lang, Mushroom, Molleric, Vine, Pinatell (family 2+2) + Carlet, Nightingale (couple suites). No electricity/running water in cabins; private showers at reception. Breakfast basket included. Sage Can Canyamars / 08319 / +34 608 608 636 corrected to Veïnat Rimbles / 08318 / +34 611 250 720.',
  rate_basis = 'breakfast',
  rate_basis_notes = 'EUR breakfast included (basket delivered). Official from: family cabins €170 / Carlet €190 / Nightingale €200. Stored family 170. +34 611 250 720. info@cabanesdosrius.com.',
  description = $$Cabanes Dosrius, Veïnat Rimbles s/n, 08318 Dosrius-Canyamars (41.6062, 2.4213). Seven treehouse nests. Breakfast included. Showers at reception.$$,
  activities_raw = 'On-site: forest walks, Espai Crea wellness, reception lounge. Nearby: Dosrius village pool, Maresme, Barcelona ~40 min.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11184 AND property_id = '60152075-095f-4130-a285-3719914d5f5a';

UPDATE public.all_sage_data
SET
  site_name = 'Family Treehouse', unit_type = 'Treehouse', quantity_of_units = 5,
  unit_capacity = '2-4', unit_bed = '1.50m double + sofa',
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'No', unit_electricity = 'No', unit_water = 'No',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round. Five family cabins lumped (Lang, Mushroom, Molleric, Vine, Pinatell).',
  minimum_nights = '1',
  unit_description = $$Family Treehouse (qty 5): 2 adults + 2 children. Breakfast included. Shared/private showers at reception. Do not invent a 6th family cabin.$$,
  amenities_raw = 'Octagonal treehouse 25 m²; bioethanol stove; sink bottle; terrace. Breakfast basket. No in-cabin electricity.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 170, 'weekend', 170),
      'spring', jsonb_build_object('weekday', 170, 'weekend', 170),
      'summer', jsonb_build_object('weekday', 170, 'weekend', 170),
      'fall', jsonb_build_object('weekday', 170, 'weekend', 170),
      'note', 'EUR breakfast. Official family cabin from €170.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. This row is Family Treehouse qty 5. Suite Treehouse inserted separately.'
WHERE id = 11184 AND property_id = '60152075-095f-4130-a285-3719914d5f5a';

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
  'published', 'Yes', 'Yes', 'Sage', 'Cabanes Dosrius', 'Suite Treehouse',
  'web_research_cabanes_dosrius_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country, g.slug, g.property_type,
  7, 2, 'Treehouse', '2', '1.50m double',
  'No', 'No', 'No', 'No',
  'No', 'No', 'No', 'No', 'No',
  'No', 'Yes', 'No', 'No', 'No',
  'No', 'No', 'No', 'No',
  2012, 'Year-round. Carlet + Nightingale lumped. From €190 / €200.', '1',
  'Suite Treehouse (qty 2): Carlet and Nightingale for 2 adults. Do not invent a 3rd suite.',
  'Couple suite treehouse; breakfast included; showers at reception.',
  g.activities_raw,
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
  jsonb_build_object('2026', jsonb_build_object(
    'winter', jsonb_build_object('weekday', 190, 'weekend', 190),
    'spring', jsonb_build_object('weekday', 190, 'weekend', 190),
    'summer', jsonb_build_object('weekday', 190, 'weekend', 190),
    'fall', jsonb_build_object('weekday', 190, 'weekend', 190),
    'note', 'EUR breakfast. Carlet from €190 / Nightingale from €200. Stored 190.'
  )),
  g.rate_basis, g.rate_basis_notes, g.description,
  E'[2026-09-04] Added Suite Treehouse qty 2 (Carlet + Nightingale) from cabanesdosrius.com.'
FROM public.all_sage_data g
WHERE g.id = 11184 AND g.property_id = '60152075-095f-4130-a285-3719914d5f5a'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = '60152075-095f-4130-a285-3719914d5f5a' AND x.site_name = 'Suite Treehouse'
  );

-- ============================================================================
-- Kustpark Nieuwpoort — luxury mobile homes on Kompas Camping. Not glamping.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Kustpark Nieuwpoort', slug = 'kustpark-nieuwpoort',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_kustpark_nieuwpoort_2026_09',
  address = 'Brugsesteenweg 49b', city = 'Nieuwpoort', state = 'West Flanders',
  zip_code = '8620', country = 'Belgium',
  lat = 51.1281, lon = 2.7381,
  url = 'https://www.kustparknieuwpoort.com/', phone_number = '+32-50-58-04-86',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Rental park on Kompas Camping Nieuwpoort / IJzer. 2026 rental offer is Maldives (4p) and Caraïbes (6p) luxury mobile homes only; Pacifique withdrawn. Sage Roompot URL / Brugsevaart 50 / Safari Tent / total 10 were wrong. Mobile-home counts unpublished. Season 27 Mar–2 Nov 2026.',
  rate_basis = 'unknown',
  rate_basis_notes = 'EUR. Dynamic booking rates; no static nightly card stored. BE +32 50 58 04 86. info@kustparknieuwpoort.be.',
  description = $$Kustpark Nieuwpoort, Brugsesteenweg 49b, 8620 Nieuwpoort (51.1281, 2.7381). Luxury mobile homes on Kompas Camping. Pool, indoor playground. Not safari-tent glamping.$$,
  activities_raw = 'On-site: outdoor pools with slide, indoor playground, sports, animation, bike hire, IJzer water sports. Nearby: Nieuwpoort beach, Plopsaland, Veurne, Ypres.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'No',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 10978 AND property_id = '2fe644c2-e825-4215-a3f9-84d165504a77';

UPDATE public.all_sage_data
SET
  site_name = 'Luxury Mobile Home', unit_type = 'Mobile Home', quantity_of_units = NULL,
  unit_capacity = '4-6', unit_bed = 'Varies by type',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = '27 Mar–2 Nov 2026. Maldives + Caraïbes lumped. Counts unpublished. Pacifique gone.',
  minimum_nights = '1',
  unit_description = $$Luxury Mobile Home: Maldives 4p and Caraïbes 6p lumped. Do not invent safari tents or a qty.$$,
  amenities_raw = 'Mobile home; full kitchen; dishwasher; wifi; veranda. Caraïbes has 2 bathrooms.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR unknown. Dynamic booking; no static nightly card stored.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published from Safari Tent stub. URL kustparknieuwpoort.com. Address Brugsesteenweg 49b. is_glamping_property No. Qty unpublished.'
WHERE id = 10978 AND property_id = '2fe644c2-e825-4215-a3f9-84d165504a77';

-- ============================================================================
-- Finca Les Coves — 8 units: 2 safari + 2 tiny + 2 beach + 1 cave + 1 finca.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Finca Les Coves', slug = 'finca-les-coves',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_finca_les_coves_2026_09',
  address = 'Partida Bugaia de Baix 2151', city = 'Jijona', state = 'Valencian Community',
  zip_code = '03100', country = 'Spain',
  lat = 38.5403, lon = -0.5031,
  url = 'https://www.booking.com/hotel/es/finca-les-coves.html', phone_number = '+34-692-615-575',
  property_total_sites = 8, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY['Booking.com']::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Boutique eco-glamping, ~80 ha Jijona mountains. Operator/Booking copy: 8 unique stays — 2 luxury safari lodges, 1 Spanish finca, 2 tiny houses, 1 cave villa, 2 beach houses. Sage Partida Almoraig 1 / +34 628 153 615 corrected. fincalescoves.com was parked/hijacked on 2026-09-04 — stored Booking URL. +34 692 615 575 / info@fincalescoves.com.',
  rate_basis = 'unknown',
  rate_basis_notes = 'EUR. No public static nightly card stored. +34 692 615 575 (weekdays 11:00–14:00). info@fincalescoves.com.',
  description = $$Finca Les Coves, Partida Bugaia de Baix 2151, 03100 Jijona (38.5403, -0.5031). Eight mixed stays on an 80 ha finca. Pool and bar. Official domain was parked at research time.$$,
  activities_raw = 'On-site: pool, bar, playground, cycling, stargazing. Nearby: Jijona, Alicante coast, Costa Blanca.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 11183 AND property_id = '22f36480-0dd4-4968-a72d-9c87fc4736c4';

UPDATE public.all_sage_data
SET
  site_name = 'Safari Lodge', unit_type = 'Safari Tent', quantity_of_units = 2,
  unit_capacity = '4', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'Yes', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Two luxury safari lodges. Other SKUs inserted.',
  minimum_nights = '1',
  unit_description = $$Safari Lodge (qty 2): Operator/Booking inventory. Do not invent a 3rd safari lodge.$$,
  amenities_raw = 'Safari lodge; ensuite; terrace. Pool/bar shared.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR unknown. No official static nightly card stored.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Address Bugaia de Baix 2151. This row is Safari Lodge qty 2. Tiny House, Beach House, Cave Villa, Finca inserted.'
WHERE id = 11183 AND property_id = '22f36480-0dd4-4968-a72d-9c87fc4736c4';

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
  'published', 'Yes', 'Yes', 'Sage', 'Finca Les Coves', v.site_name,
  'web_research_finca_les_coves_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country, g.slug, g.property_type,
  8, v.qty, v.unit_type, v.capacity, v.bed,
  'Yes', 'Yes', v.kitchenette, v.full_k,
  'Yes', 'Yes', 'No', 'Yes', 'Yes',
  'No', 'Yes', 'No', 'No', 'No',
  'Yes', 'No', 'Yes', 'No',
  NULL, v.season, '1',
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
  jsonb_build_object('2026', jsonb_build_object(
    'note', 'EUR unknown. No official static nightly card stored.'
  )),
  g.rate_basis, g.rate_basis_notes, g.description, v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    ('Tiny House', 2::numeric, 'Tiny Home', '4', '2 doubles',
     'Yes', 'Yes',
     'Year-round typical. Two Scandinavian tiny houses.',
     'Tiny House (qty 2): Scandinavian A-frame / log cabins. Do not invent a 3rd.',
     'Tiny house; 2 bedrooms; full kitchen typical; A/C; terrace; BBQ.',
     E'[2026-09-04] Added Tiny House qty 2 from operator/Booking inventory.'),
    ('Beach House', 2::numeric, 'Cottage', '4', 'Varies',
     'Yes', 'Yes',
     'Year-round typical. Two beach houses.',
     'Beach House (qty 2): Operator/Booking inventory. Do not invent a 3rd.',
     'Beach-house style cottage; ensuite; terrace.',
     E'[2026-09-04] Added Beach House qty 2 from operator/Booking inventory.'),
    ('Cave Villa', 1::numeric, 'Other Glamping', '7', 'Varies',
     'Yes', 'Yes',
     'Year-round typical. One cave villa.',
     'Cave Villa (qty 1): Up to 7. Do not invent a 2nd cave.',
     'Cave dwelling; ensuite; kitchen.',
     E'[2026-09-04] Added Cave Villa qty 1 from operator/Booking inventory.'),
    ('Finca', 1::numeric, 'Cottage', '6', 'Varies',
     'No', 'Yes',
     'Year-round typical. One authentic Spanish finca.',
     'Finca (qty 1): Traditional house. Do not invent a 2nd finca.',
     'Spanish finca; kitchen; ensuite.',
     E'[2026-09-04] Added Finca qty 1 from operator/Booking inventory.')
) AS v(site_name, qty, unit_type, capacity, bed, kitchenette, full_k, season, unit_desc, amenities, note)
WHERE g.id = 11183 AND g.property_id = '22f36480-0dd4-4968-a72d-9c87fc4736c4'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = '22f36480-0dd4-4968-a72d-9c87fc4736c4' AND x.site_name = v.site_name
  );

COMMIT;
