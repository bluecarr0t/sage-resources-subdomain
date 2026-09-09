-- Cielo (5 pearls), Bel Air Tremblant (42 units), Nimmo Bay (6 waterfront + 3 forest).

BEGIN;

-- ============================================================================
-- Cielo Glamping Maritime — 3 one-bed + 2 two-bed geodesic pearls.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Cielo Glamping Maritime', slug = 'cielo-glamping-maritime',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_cielo_glamping_maritime_2026_09',
  address = '232 Chemin des Huîtres', city = 'Haut-Shippagan', state = 'NB',
  zip_code = 'E8S 2N6', country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://www.glampingcielo.com/en', phone_number = '+1-506-601-8005',
  property_total_sites = 5, year_site_opened = 2019,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Pat & Emilie. 5 named Pearls on Baie St-Simon, opened Jan 2019. 3 one-bedroom (couples) + 2 two-bedroom (max 4). Each: ensuite, kitchen, Big Green Egg, hammock, year-round electric hot tub. No operator GPS published — lat/lon left empty. Zip E8S 2N6 (FAQ also E8S 2N7). Munro Pearl has accessible ramp.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD + tax. Operator from-rates: one-bedroom $260 / two-bedroom $320, hot tub included. Direct email/phone booking. +1 506-601-8005. allo@glampingcielo.com.',
  description = $$Cielo Glamping Maritime, 232 Chemin des Huîtres, Haut-Shippagan NB E8S 2N6. Five four-season geodesic Pearls on Baie St-Simon. No operator pin published.$$,
  activities_raw = 'On-site: beach, oyster trail, Hub local products, garden. Nearby: Acadian Peninsula, Shippagan.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13037 AND property_id = '244e1abf-5198-47d1-99f4-56727ee7c629';

UPDATE public.all_sage_data
SET
  site_name = 'One-Bedroom Pearl', unit_type = 'Dome', quantity_of_units = 3,
  unit_capacity = '2', unit_bed = 'Queen',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'Yes', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'Yes', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Year-round. Three one-bedroom Pearls lumped. Pets only in Moonsnail (two-bed).',
  minimum_nights = '1',
  unit_description = $$One-Bedroom Pearl (qty 3): Couples domes from CAD 260. Do not invent a 4th one-bed.$$,
  amenities_raw = 'Geodesic dome; ensuite; kitchenette; private hot tub; Big Green Egg. Couples.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 260, 'weekend', 260),
      'spring', jsonb_build_object('weekday', 260, 'weekend', 260),
      'summer', jsonb_build_object('weekday', 260, 'weekend', 260),
      'fall', jsonb_build_object('weekday', 260, 'weekend', 260),
      'note', 'CAD room_only + tax. Operator one-bedroom from $260.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. This row is One-Bedroom Pearl qty 3. Two-Bedroom Pearl inserted separately.'
WHERE id = 13037 AND property_id = '244e1abf-5198-47d1-99f4-56727ee7c629';

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
  'published', 'Yes', 'Yes', 'Sage', 'Cielo Glamping Maritime', 'Two-Bedroom Pearl',
  'web_research_cielo_glamping_maritime_2026_09', '2026-09-04', '2026-09-04',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, g.country, g.slug, g.property_type,
  5, 2, 'Dome', '4', '2 Queens',
  'Yes', 'Yes', 'Yes', 'No',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'No', 'Yes', 'No', 'Yes', 'No',
  'Yes', 'Yes', 'Yes', 'No',
  2019, 'Year-round. Two two-bedroom Pearls (Moon / Moonsnail). Pets in Moonsnail only.', '1',
  'Two-Bedroom Pearl (qty 2): Max 4 from CAD 320. Do not invent a 3rd two-bed.',
  'Geodesic dome; 2 bedrooms; ensuite; kitchenette; private hot tub. Pets in Moonsnail.',
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
    'winter', jsonb_build_object('weekday', 320, 'weekend', 320),
    'spring', jsonb_build_object('weekday', 320, 'weekend', 320),
    'summer', jsonb_build_object('weekday', 320, 'weekend', 320),
    'fall', jsonb_build_object('weekday', 320, 'weekend', 320),
    'note', 'CAD room_only + tax. Operator two-bedroom from $320.'
  )),
  g.rate_basis, g.rate_basis_notes, g.description,
  E'[2026-09-04] Added Two-Bedroom Pearl qty 2 from glampingcielo.com.'
FROM public.all_sage_data g
WHERE g.id = 13037 AND g.property_id = '244e1abf-5198-47d1-99f4-56727ee7c629'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = '244e1abf-5198-47d1-99f4-56727ee7c629' AND x.site_name = 'Two-Bedroom Pearl'
  );

-- ============================================================================
-- Bel Air Tremblant — 42 lodging units (domes, lofts, chalets lumped).
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Bel Air Tremblant', slug = 'bel-air-tremblant',
  property_type = 'Outdoor Boutique Hotel', source = 'Sage',
  discovery_source = 'web_research_bel_air_tremblant_2026_09',
  address = '80 Rue des Sept Sommets', city = 'La Conception', state = 'QC',
  zip_code = 'J0T 1M0', country = 'Canada',
  lat = NULL, lon = NULL,
  url = 'https://belairtremblant.com/', phone_number = '+1-819-774-0203',
  property_total_sites = 42, year_site_opened = 2018,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'Yes', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'Yes', property_pickball_courts = 'Yes',
  property_fitness_room = 'Yes', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official homepage: 42 distinctive lodging units (domes, lofts, cabins, chalets) on ~540 acres. Opened 2018. CITQ #627649. Clubhouse, Ekki Sushi, Bistro Bel Air, Ono Spa. Rentals page also says over 50 — stored official 42. Dome vs chalet SKU split unpublished. No operator GPS published. Marketed as Mont-Tremblant; civic address La Conception.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Official from-ranges: Twin Dome $190–750 / Glass $300–1000 / Deluxe $235–900. Stored Twin Dome from-rate 190. +1 819-774-0203.',
  description = $$Bel Air Tremblant, 80 Rue des Sept Sommets, La Conception QC J0T 1M0. Official 42 lodging units: luxury domes plus lofts and chalets. Clubhouse restaurants and spa. No operator pin published.$$,
  activities_raw = 'On-site: pool, spa, tennis/pickleball, mini farm, fitness, yoga, fat bikes, snowshoe. Nearby: Mont-Tremblant, Old Village, Petit Train du Nord.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13056 AND property_id = '1b62f073-556f-45f8-b483-2e7c3ae1e9ee';

UPDATE public.all_sage_data
SET
  site_name = 'Domes & Lodging', unit_type = 'Other Glamping', quantity_of_units = 42,
  unit_capacity = '2-8', unit_bed = 'Varies by unit',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'Yes',
  operating_season_months = 'Year-round. Official 42 units lumped (domes/lofts/chalets). Do not invent a dome-only count.',
  minimum_nights = '1',
  unit_description = $$Domes & Lodging (qty 42): Official homepage inventory. Small dogs under 10 kg. Private hot tub/sauna typical on dome SKUs.$$,
  amenities_raw = 'Dome/loft/chalet mix; ensuite; kitchenette or kitchen; private deck; hot tub/sauna typical. Pets small dogs.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 190, 'weekend', 190),
      'spring', jsonb_build_object('weekday', 190, 'weekend', 190),
      'summer', jsonb_build_object('weekday', 190, 'weekend', 190),
      'fall', jsonb_build_object('weekday', 190, 'weekend', 190),
      'note', 'CAD room_only. Twin Dome official from $190; Glass from $300. Wide seasonal range.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 42 units lumped. Address La Conception. Luxury tier. Dome/chalet split unpublished.'
WHERE id = 13056 AND property_id = '1b62f073-556f-45f8-b483-2e7c3ae1e9ee';

-- ============================================================================
-- Nimmo Bay — update in_progress 209 (forest 3) and published sibling 10766 (waterfront 6).
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Nimmo Bay Wilderness Resort', slug = 'nimmo-bay-wilderness-resort',
  property_type = 'Outdoor Boutique Hotel', source = 'Sage',
  discovery_source = 'web_research_nimmo_bay_2026_09',
  address = '100 Little Nimmo Bay', city = 'Port McNeill', state = 'BC',
  zip_code = 'V0N 2R0', country = 'Canada',
  lat = 50.9394912, lon = -126.6819076,
  url = 'https://nimmobay.com/', phone_number = '+1-800-837-4354',
  property_total_sites = 9, year_site_opened = 1981,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'Yes', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'luxury', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Great Bear Rainforest lodge. Official 9 two-bedroom cabins: 6 waterfront + 3 forest. Inclusive package (meals, house drinks, guided activities). Coords from published sibling 10766. Sage 209 lat/lon 50.8872,-126.4844 replaced.',
  rate_basis = 'all_inclusive',
  rate_basis_notes = 'CAD per person, double occupancy. 2026 Inclusive from $2,799 pp/night (Nature and Nurture 3-night $8,399 / 3). Wild and Refined 3-night $10,199. Waterfront guarantee +$575/cabin/night. Transfers extra ($2,299 pp flight package). +1 800-837-4354.',
  description = $$Nimmo Bay Wilderness Resort, 100 Little Nimmo Bay, Great Bear Rainforest BC (50.9394912, -126.6819076). Nine two-bedroom cabins. All-inclusive lodge.$$,
  activities_raw = 'On-site: waterfall and floating hot tubs, floating saunas, kayak, SUP, snorkel, hike, yoga, fitness. Nearby: Great Bear Rainforest, Port Hardy floatplane.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'No',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 209 AND property_id = '8d70366f-9943-4b96-a156-116cc29c51c5';

UPDATE public.all_sage_data
SET
  site_name = 'Forest Cabin', unit_type = 'Luxury Cabin', quantity_of_units = 3,
  unit_capacity = '2-5', unit_bed = 'Queen + Twin / loft Queen',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'Yes',
  operating_season_months = 'Mid-May to October typical. Forest cabins 7/8/9. Included in base package.',
  minimum_nights = '3',
  unit_description = $$Forest Cabin (qty 3): Official cabins 7–9 near waterfall. Do not invent a 4th forest cabin.$$,
  amenities_raw = 'Two-bedroom cabin; wet bar; patio; inclusive meals. Shared lodge hot tubs/saunas.',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'spring', jsonb_build_object('weekday', 2799, 'weekend', 2799),
      'summer', jsonb_build_object('weekday', 3400, 'weekend', 3400),
      'fall', jsonb_build_object('weekday', 3400, 'weekend', 3400),
      'note', 'CAD all_inclusive PER PERSON double occ. Nature $2799 pp/n from 3-night $8399. Wild ~$3400 pp/n from 3-night $10199. Not a unit-night.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published in_progress sibling. This row is Forest Cabin qty 3. Waterfront is id 10766.'
WHERE id = 209 AND property_id = '8d70366f-9943-4b96-a156-116cc29c51c5';

UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  site_name = 'Waterfront Cabin', unit_type = 'Luxury Cabin', quantity_of_units = 6,
  property_total_sites = 9,
  property_type = 'Outdoor Boutique Hotel',
  address = '100 Little Nimmo Bay', city = 'Port McNeill', state = 'BC',
  zip_code = 'V0N 2R0', country = 'Canada',
  lat = 50.9394912, lon = -126.6819076,
  url = 'https://nimmobay.com/cabins/', phone_number = '+1-800-837-4354',
  glamping_service_tier = 'luxury', glamping_service_tier_source = 'manual',
  rate_basis = 'all_inclusive',
  rate_basis_notes = 'CAD per person, double occupancy. 2026 Inclusive from $2,799 pp/night. Waterfront guarantee +$575/cabin/night.',
  date_updated = '2026-09-04',
  operating_season_months = 'Mid-May to October typical. Waterfront cabins 1–6. Upgrade +$575/cabin/night.',
  unit_description = $$Waterfront Cabin (qty 6): Official cabins 1–6. Do not invent a 7th waterfront.$$,
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Aligned published sibling to official 6 waterfront + 3 forest. Update by id 10766 only.'
WHERE id = 10766 AND property_id = '8d70366f-9943-4b96-a156-116cc29c51c5';

COMMIT;
