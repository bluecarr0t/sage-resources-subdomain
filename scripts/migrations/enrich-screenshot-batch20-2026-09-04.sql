-- Official named inventory / rates. Never write rate_avg_retail_daily_rate.

BEGIN;

-- ============================================================================
-- Your Nature (Eco-Lodge row) — Landal Forest Resort. Cottage from €139.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Your Nature', slug = 'your-nature',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_your_nature_2026_09',
  address = 'Chemin du Bois de Fouage 1', city = 'Antoing', state = 'Wallonia',
  zip_code = '7640', country = 'Belgium',
  url = 'https://www.yournature.be/', phone_number = '+32 69 31 31 30',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Landal Forest Resort Your Nature / yournature.be, Chemin du Bois de Fouage 1, 7640 Antoing. Hospitality +32 69 31 31 30 (Sage +32 69 77 77 77 stale). Named types: The Leaf, TreeLoft, Cottage, Lodge, Blue Lodge, Lake House. VisitWallonia “over 180” / Landal “181” — park total unpublished (expansion underway). Sage Eco-Lodge / 75 / 200 invented.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Official Cottage from €139* (self-catering; pool/lounge access included). TreeLoft and other types unpublished. Do not store Sage 200.',
  description = $$Your Nature (Landal Forest Resort), Chemin du Bois de Fouage 1, 7640 Antoing. Official eco-lodge village in the Bois de Fouage. Lodge-type counts unpublished.$$,
  activities_raw = 'On-site: indoor/outdoor pool, wellness, restaurants, e-carts, lake. Nearby: Tournai, Hainaut.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 10963 AND property_id = '19f73315-387e-4f10-af42-ccc56ca80a78';

UPDATE public.all_sage_data
SET
  site_name = 'The Cottage', unit_type = 'Eco-Lodge', quantity_of_units = NULL,
  unit_capacity = '4', unit_bed = 'Double + sofa bed',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'Yes', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round resort. This row is Cottage / eco-lodge mix. TreeLoft on sibling id 10975. Do not store qty 75.',
  minimum_nights = NULL,
  unit_description = $$Eco-Lodge (qty unpublished): official Cottage and Leaf / Lodge / Lake House types. TreeLoft unpublished on this row.$$,
  amenities_raw = 'Eco-lodge; full kitchen; terrace; wifi; pool access; linen included.',
  rate_summer_weekday = '139', rate_summer_weekend = '139',
  rate_winter_weekday = '139', rate_winter_weekend = '139',
  rate_spring_weekday = '139', rate_spring_weekend = '139',
  rate_fall_weekday = '139', rate_fall_weekend = '139',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 139, 'weekend', 139),
      'spring', jsonb_build_object('weekday', 139, 'weekend', 139),
      'summer', jsonb_build_object('weekday', 139, 'weekend', 139),
      'fall', jsonb_build_object('weekday', 139, 'weekend', 139),
      'note', 'EUR room_only. Official Cottage from €139. Do not store Sage 200.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official Chemin du Bois de Fouage 1 / +32 69 31 31 30. Cottage from €139. Park total and SKU split unpublished. Cleared 75 / 200 / stale 69 77 77 77.'
WHERE id = 10963 AND property_id = '19f73315-387e-4f10-af42-ccc56ca80a78';

-- ============================================================================
-- Your Nature (TreeLoft row) — official treehouse type; count unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Your Nature', slug = 'your-nature',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_your_nature_treeloft_2026_09',
  address = 'Chemin du Bois de Fouage 1', city = 'Antoing', state = 'Wallonia',
  zip_code = '7640', country = 'Belgium',
  url = 'https://www.yournature.be/en/a-space-of-ones-own/the-treeloft/',
  phone_number = '+32 69 31 31 30',
  lat = NULL, lon = NULL,
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'No', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'Yes', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'upscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official TreeLoft type at Your Nature: 59 m² loft on trunks, 2 bedrooms, sauna, 2 terraces, max 4. Count unpublished. Sage Rue Croix Madame 1 / +32 69 77 90 00 / Treehouse 36 / 250 invented. Sibling eco-lodge row is id 10963.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Official TreeLoft from-rate unpublished (calendar). Cottage from €139 lives on id 10963. Do not store Sage 250.',
  description = $$Your Nature TreeLoft, Chemin du Bois de Fouage 1, 7640 Antoing. Official perched loft type. Count unpublished.$$,
  activities_raw = 'On-site: indoor/outdoor pool, wellness, restaurants, forest. Nearby: Tournai.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 10975 AND property_id = '19f73315-387e-4f10-af42-ccc56ca80a78';

UPDATE public.all_sage_data
SET
  site_name = 'The TreeLoft', unit_type = 'Treehouse', quantity_of_units = NULL,
  unit_capacity = '4', unit_bed = 'Double + sofa bed',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'Yes', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'No', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'Yes',
  operating_season_months = 'Year-round. Official TreeLoft count unpublished. Do not store qty 36.',
  minimum_nights = NULL,
  unit_description = $$Treehouse (qty unpublished): official TreeLoft perched loft with sauna. Other lodge types on id 10963.$$,
  amenities_raw = 'TreeLoft; kitchen; sauna; two terraces; wifi; pool access.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. TreeLoft calendar only. Cottage from €139 on id 10963. Do not store Sage 250.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published TreeLoft SKU. Relocated off invented Croix Madame. Count unpublished. Cleared 36 / 250 / stale 69 77 90 00.'
WHERE id = 10975 AND property_id = '19f73315-387e-4f10-af42-ccc56ca80a78';

-- ============================================================================
-- New Frontiers Retreat — official domes/cabins/tents; counts unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'New Frontiers Retreat', slug = 'new-frontiers-retreat',
  property_type = 'Glamping', source = 'Sage',
  discovery_source = 'web_research_new_frontiers_retreat_2026_09',
  address = '10545 Hwy 60', city = 'Eganville', state = 'ON',
  zip_code = 'K0J 1T0', country = 'Canada',
  url = 'https://newfrontiersretreat.ca/', phone_number = '+1 343-549-9330',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'No',
  property_playground = 'Yes', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official New Frontiers Retreat, 10545 Hwy 60, Eganville ON K0J 1T0. Phone/text 343-549-9330. Official mix: geodesic domes (ensuite composting bath), cabins / tiny cabins, wall tents, BYO camping. Per-SKU unpublished. Do not store scrape 238/275/213.',
  rate_basis = 'room_only',
  rate_basis_notes = 'CAD. Official site has no from-rate (Airbnb / Booking / Hipcamp / call). Do not store Sage 238/275/213.',
  description = $$New Frontiers Retreat, 10545 Hwy 60, Eganville, ON, on the Bonnechere River. Official geodesic-dome, cabin and tent camp. Unit counts unpublished.$$,
  activities_raw = 'On-site: forest trails, canoe/kayak/SUP on the Bonnechere, campfires. Nearby: Bonnechere Caves, Bonnechere Provincial Park, Eganville.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'No',
  date_updated = '2026-09-04'
WHERE id = 13061 AND property_id = '2ef14044-1865-4cad-b612-317906d93198';

UPDATE public.all_sage_data
SET
  site_name = 'Geodesic Dome', unit_type = 'Dome', quantity_of_units = NULL,
  unit_capacity = '2', unit_bed = 'King loft',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Three-season typical. Official dome count unpublished. Cabins and wall tents unpublished.',
  minimum_nights = NULL,
  unit_description = $$Dome (qty unpublished): official ensuite geodesic domes. Cabins, tiny cabins and wall tents unpublished.$$,
  amenities_raw = 'Geodesic dome; composting ensuite; kitchenette; linens; wifi; river.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'CAD room_only. Official calendar / OTA only. Do not store Sage 238/275/213.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 10545 Hwy 60 / 343-549-9330. Dome count unpublished. Cleared scrape 238/275/213.'
WHERE id = 13061 AND property_id = '2ef14044-1865-4cad-b612-317906d93198';

-- ============================================================================
-- Lisboa Camping & Bungalows — official 70 bungalows. Glamping unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Lisboa Camping & Bungalows', slug = 'lisboa-camping-bungalows',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_lisboa_camping_2026_09',
  address = 'Estrada da Circunvalação', city = 'Lisbon', state = 'Lisbon',
  zip_code = '1400-061', country = 'Portugal',
  url = 'https://lisboacamping.com/', phone_number = '+351 217 628 200',
  lat = 38.7250, lon = -9.2075,
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'Yes', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Lisboa Camping & Bungalows (Catarino & Associates), Estrada da Circunvalação, 1400-061 Lisboa, Parque Florestal de Monsanto. Official “Our 70 bungalows”. Official GPS N38°43''30'''' W9°12''27''''. Glamping Lisboa / equipped pitches exist — counts unpublished (Visit Lisboa 4 / 189 is directory). Sage Safari Tent / 70 / 100 misapplied the bungalow count to safari tents.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Booking engine / promo calendar only. Do not store Sage 100.',
  description = $$Lisboa Camping & Bungalows, Estrada da Circunvalação, 1400-061 Lisboa, Monsanto forest. Official 70 bungalows. Pitch and glamping counts unpublished.$$,
  activities_raw = 'On-site: pools, tennis, mini-golf, playground, restaurant, shop. Nearby: Lisbon centre, Sintra, Cascais.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11166 AND property_id = '31d53e2c-b005-4eee-92a4-2381cd2095a8';

UPDATE public.all_sage_data
SET
  site_name = 'Bungalow', unit_type = 'Bungalow', quantity_of_units = 70,
  unit_capacity = '6', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'Yes', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round. This row is official 70 bungalows. Equipped pitches and Glamping Lisboa unpublished. Do not store Safari Tent.',
  minimum_nights = '1',
  unit_description = $$Bungalow (qty 70): official Lisboa / Monsanto / Esquilo bungalows. Glamping tents and pitches unpublished.$$,
  amenities_raw = 'Bungalow; kitchenette; bathroom; porch; pool access; wifi.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Official calendar / promos. Do not store Sage 100.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 70 bungalows. Cleared Safari Tent / invented 100. Pitches and glamping unpublished.'
WHERE id = 11166 AND property_id = '31d53e2c-b005-4eee-92a4-2381cd2095a8';

-- ============================================================================
-- Camping Monte Holiday — official treehouses; count unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Camping Monte Holiday', slug = 'camping-monte-holiday',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_camping_monte_holiday_2026_09',
  address = 'Finca El Tercio Nuevo', city = 'Gargantilla del Lozoya',
  state = 'Community of Madrid', zip_code = '28739', country = 'Spain',
  url = 'https://www.campingmonteholiday.com/', phone_number = '+34 691 584 523',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Monte Holiday Ecoturismo, Finca El Tercio Nuevo, Gargantilla del Lozoya, Sierra de Guadarrama. Official types: treehouses (with/without bath), panoramic treehouse, bungalows, ecolodges, tent and caravan pitches. Per-SKU unpublished (ACSI 125 vs camping.info 120 tourist pitches conflict). Sage Treehouse / 20 / 150 invented. Phone on official site +34 691 584 523 (Sage +34 918 694 097 stale).',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Official promo/calendar only (weekend packages). Do not store Sage 150.',
  description = $$Camping Monte Holiday, Finca El Tercio Nuevo, Gargantilla del Lozoya, Madrid. Official family campground with treehouses in the Lozoya valley. Treehouse and pitch counts unpublished.$$,
  activities_raw = 'On-site: playground, hiking. Nearby: Sierra de Guadarrama, Lozoya valley, Madrid.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11207 AND property_id = '8f3de74b-6c57-433e-abb9-eced3dbe58d2';

UPDATE public.all_sage_data
SET
  site_name = 'Treehouse', unit_type = 'Treehouse', quantity_of_units = NULL,
  unit_capacity = '2-5', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'Yes', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Year-round typical. Official treehouse count unpublished. Pitches / bungalows / ecolodges unpublished. Do not store qty 20.',
  minimum_nights = '2',
  unit_description = $$Treehouse (qty unpublished): official Monte Holiday treehouses (bath / toilet / no-bath and panoramic). Pitches unpublished.$$,
  amenities_raw = 'Treehouse 4–7 m high; A/C on equipped units; terrace; some ensuite.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Official promo/calendar. Do not store Sage 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official Finca El Tercio Nuevo / +34 691 584 523. Treehouse count unpublished. Cleared 20 / 150.'
WHERE id = 11207 AND property_id = '8f3de74b-6c57-433e-abb9-eced3dbe58d2';

-- ============================================================================
-- De Betuwse Hofjes — official safari tents; counts unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'De Betuwse Hofjes', slug = 'de-betuwse-hofjes',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_de_betuwse_hofjes_2026_09',
  address = 'Hoge Dijkseweg 40', city = 'Kesteren', state = 'Gelderland',
  zip_code = '4041 AW', country = 'Netherlands',
  url = 'https://www.debetuwsehofjes.nl/', phone_number = '+31 488 481 477',
  lat = NULL, lon = NULL,
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'Yes', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'Yes',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official De Betuwse Hofjes (campingbetuwe.nl redirects here), Hoge Dijkseweg 40, 4041 AW Kesteren. Phone +31 488 48 14 77 (Sage Rijnbandijk 3 / +31 488 482 172 stale). Official safari types: Ranger, Betuwe, Mini, Wood, Hiker lodges. Pitch / rental counts unpublished (ACSI 86 tourist / 24 safari vs Villatent 20 conflict). Sage Safari Tent / 20 / 120 invented.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Official last-minute / calendar only. Do not store Sage 120.',
  description = $$De Betuwse Hofjes, Hoge Dijkseweg 40, 4041 AW Kesteren. Official family park at the foot of Utrechtse Heuvelrug. Safari-tent and pitch counts unpublished.$$,
  activities_raw = 'On-site: three swim lakes, sandy beach, playgrounds, airtrampoline, entertainment. Nearby: Utrechtse Heuvelrug, Betuwe orchards.',
  activities_hiking = 'Yes', activities_swimming = 'Yes', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'No', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11101 AND property_id = 'b5cf28d3-c084-4ea3-bb9c-9b72342f7ac8';

UPDATE public.all_sage_data
SET
  site_name = 'Safari Tent', unit_type = 'Safari Tent', quantity_of_units = NULL,
  unit_capacity = '2-8', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Typical mid-March–mid-October. Official safari count unpublished. Pitches unpublished. Do not store qty 20.',
  minimum_nights = NULL,
  unit_description = $$Safari Tent (qty unpublished): official Ranger / Betuwe / Mini / Wood / Hiker lodges. Tourist pitches unpublished.$$,
  amenities_raw = 'Safari tent / lodge; wifi spots; pets welcome; swim lakes.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'EUR room_only. Official calendar. Do not store Sage 120.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as De Betuwse Hofjes. Relocated Hoge Dijkseweg 40; cleared invented Rijnbandijk GPS. Safari count unpublished. Cleared 20 / 120.'
WHERE id = 11101 AND property_id = 'b5cf28d3-c084-4ea3-bb9c-9b72342f7ac8';

-- ============================================================================
-- Cotswold Campervan Stays — successor of Campden Yurts. Official 5 gravel pitches.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'No',
  property_name = 'Cotswold Campervan Stays', slug = 'cotswold-campervan-stays',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_cotswold_campervan_stays_2026_09',
  address = 'Hillside Nursery, Kingcombe Lane', city = 'Chipping Campden',
  state = 'Gloucestershire', zip_code = 'GL55 6PN', country = 'United Kingdom',
  url = 'https://cotswoldcampervanstays.co.uk/', phone_number = '+44 7792 624036',
  lat = NULL, lon = NULL,
  property_total_sites = 10, year_site_opened = 2017,
  property_clubhouse = 'No', property_food_on_site = 'No', property_restaurant = 'No',
  property_laundry = 'No', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'No', property_has_rentals = 'No',
  property_playground = 'No', property_general_store = 'Yes',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'No', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'rustic', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Same operator as closed Campden Yurts (2 yurts). Official successor Cotswold Campervan Stays: 5 × 8m x 4m gravel pitches for vans ≤6 m plus 5 walker tent pitches. Permission 29 May 2026; targeting September 2026 opening. Sage Westington Hill / +44 1386 840164 / Yurt qty 3 / 150 invented or stale. is_glamping_property No — yurts gone.',
  rate_basis = 'room_only',
  rate_basis_notes = 'GBP. New site rates unpublished (yurt £90–135 pages are historical). Do not store Sage 150.',
  description = $$Cotswold Campervan Stays, Hillside Nursery, Kingcombe Lane, Chipping Campden GL55 6PN. Official successor to Campden Yurts. 5 gravel van pitches plus 5 walker tent pitches.$$,
  activities_raw = 'On-site: campfires, kitchen room, communal shelter. Nearby: Chipping Campden, Cotswold Way.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11258 AND property_id = '40c9c8e4-5423-490d-8da4-84615aeb88b4';

UPDATE public.all_sage_data
SET
  site_name = 'Gravel Pitch', unit_type = 'Campsite', quantity_of_units = 5,
  unit_capacity = NULL, unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'No',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'Yes', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'Yes', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Intended year-round. This row is official 5 gravel van pitches. 5 walker tent pitches unpublished as a separate SKU. Yurts closed. Do not store Yurt / 3.',
  minimum_nights = NULL,
  unit_description = $$Campsite (qty 5): official 8m × 4m gravel pitches for campervans/motorhomes up to 6 m. Walker tent pitches unpublished.$$,
  amenities_raw = 'Gravel pitch; optional metered EHU; shared bathrooms; kitchen room; dogs welcome.',
  rate_summer_weekday = NULL, rate_summer_weekend = NULL,
  rate_winter_weekday = NULL, rate_winter_weekend = NULL,
  rate_spring_weekday = NULL, rate_spring_weekend = NULL,
  rate_fall_weekday = NULL, rate_fall_weekend = NULL,
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'note', 'GBP room_only. Successor rates unpublished. Do not store Sage yurt 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published as Cotswold Campervan Stays (Campden Yurts closed). Official 5 gravel pitches. Relocated Kingcombe Lane; cleared Westington GPS. is_glamping_property No.'
WHERE id = 11258 AND property_id = '40c9c8e4-5423-490d-8da4-84615aeb88b4';

-- ============================================================================
-- Cotswold Farm Park — official 7 safari tents (6 Songbird + Sunflower). From £135.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Cotswold Farm Park', slug = 'cotswold-farm-park',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_cotswold_farm_park_2026_09',
  address = 'Guiting Power', city = 'Guiting Power', state = 'Gloucestershire',
  zip_code = 'GL54 5FL', country = 'United Kingdom',
  url = 'https://cotswoldfarmpark.co.uk/where-to-stay/',
  phone_number = '+44 1451 850307',
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'No', property_hot_tub = 'Yes',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'Yes', property_general_store = 'Yes',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Cotswold Farm Park Holidays, Guiting Power, Cheltenham GL54 5FL. Official 6 Songbird safari tents + 1 Sunflower safari tent = 7. Official safari from £135*. Lodges from £200, cabins from £195, pods from £50, touring from £25.95 — those SKUs unpublished. Sage Safari Tent / 12 / 150 invented.',
  rate_basis = 'room_only',
  rate_basis_notes = 'GBP. Official safari tents from £135*. Farm Park daytime entry included. Stored 135. Do not store Sage 150.',
  description = $$Cotswold Farm Park Holidays, Guiting Power, GL54 5FL. Official Adam Henson rare-breeds farm with 7 safari tents plus unpublished lodges, cabins, pods and pitches.$$,
  activities_raw = 'On-site: Farm Park, animals, seasonal events, bar, shop. Nearby: Cotswolds, Cheltenham, Stow.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'Yes', setting_field = 'Yes', setting_mountainous = 'No', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11259 AND property_id = '9a07fff4-950f-441b-9c4c-72b23d5dd9d1';

UPDATE public.all_sage_data
SET
  site_name = 'Safari Tent', unit_type = 'Safari Tent', quantity_of_units = 7,
  unit_capacity = '5-7', unit_bed = 'Varies',
  unit_private_bathroom = 'Yes', unit_shower = 'Yes', unit_kitchenette = 'Yes',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'Yes',
  unit_campfires = 'No', unit_patio = 'Yes', unit_cable = 'No',
  unit_mini_fridge = 'Yes', unit_picnic_table = 'No', unit_charcoal_grill = 'Yes',
  unit_ada_accessibility = 'No', unit_hot_tub = 'Yes', unit_sauna = 'No',
  operating_season_months = 'Seasonal Farm Park holidays. This row is official 6 Songbird + 1 Sunflower = 7. Lodges, cabins, pods and pitches unpublished. Do not store qty 12.',
  minimum_nights = '2',
  unit_description = $$Safari Tent (qty 7): official 6 Songbird tents plus Sunflower (hot tub). Other holiday SKUs unpublished.$$,
  amenities_raw = 'Safari tent; private bathroom pod; kitchen; deck; BBQ; Farm Park entry; dogs welcome.',
  rate_summer_weekday = '135', rate_summer_weekend = '135',
  rate_winter_weekday = '135', rate_winter_weekend = '135',
  rate_spring_weekday = '135', rate_spring_weekend = '135',
  rate_fall_weekday = '135', rate_fall_weekend = '135',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 135, 'weekend', 135),
      'spring', jsonb_build_object('weekday', 135, 'weekend', 135),
      'summer', jsonb_build_object('weekday', 135, 'weekend', 135),
      'fall', jsonb_build_object('weekday', 135, 'weekend', 135),
      'note', 'GBP room_only. Official safari from £135. Do not store Sage 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official 7 safari tents from £135. Cleared invented 12 / 150. Lodges/cabins/pods/pitches unpublished.'
WHERE id = 11259 AND property_id = '9a07fff4-950f-441b-9c4c-72b23d5dd9d1';

-- ============================================================================
-- Camping Sass Dlacia — official pitches from €16. Count unpublished.
-- ============================================================================
UPDATE public.all_sage_data
SET
  research_status = 'published', is_open = 'Yes', is_glamping_property = 'Yes',
  property_name = 'Camping Sass Dlacia', slug = 'camping-sass-dlacia',
  property_type = 'Campground', source = 'Sage',
  discovery_source = 'web_research_camping_sass_dlacia_2026_09',
  address = 'Str. Sciarè 11', city = 'San Cassiano', state = 'Trentino-Alto Adige',
  zip_code = '39036', country = 'Italy',
  url = 'https://campingsassdlacia.it/', phone_number = '+39 0471 849527',
  lat = 46.5541, lon = 11.96999,
  property_total_sites = NULL, year_site_opened = NULL,
  property_clubhouse = 'Yes', property_food_on_site = 'Yes', property_restaurant = 'Yes',
  property_laundry = 'Yes', property_pool = 'No', property_hot_tub = 'No',
  property_sauna = 'No', property_family_friendly = 'Yes',
  property_remote_work_friendly = 'Yes', property_has_rentals = 'Yes',
  property_playground = 'No', property_general_store = 'No',
  property_extended_stay = 'No', property_pickball_courts = 'No',
  property_fitness_room = 'No', property_waterfront = 'No',
  property_alcohol_available = 'Yes', property_ota_platforms = ARRAY[]::text[],
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale', glamping_service_tier_source = 'manual',
  glamping_service_tier_notes = 'Official Camping Sass Dlacia, Str. Sciarè 11, 39036 San Cassiano (BZ), Alta Badia. Official GPS 46.5541 / 11.96999. Phone +39 0471 849527 (Sage +39 0471 849521 stale). Official Alpine Tent from €16 / Rolling Home from €24. Lodge from €220, Stargazing Cabin from €180 — those SKUs unpublished. Pitch count unpublished. Sage Safari Tent / 10 / 150 invented.',
  rate_basis = 'room_only',
  rate_basis_notes = 'EUR. Official Alpine Tent pitch from €16. Stored 16 as lowest official from-rate. Do not store Sage 150.',
  description = $$Camping Sass Dlacia, Str. Sciarè 11, San Cassiano, Alta Badia. Official Dolomites campground. Pitch count unpublished; lodge and cabins unpublished.$$,
  activities_raw = 'On-site: alpine setting, laundry, wifi. Nearby: San Cassiano, Alta Badia, Dolomites.',
  activities_hiking = 'Yes', activities_swimming = 'No', activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes', activities_scenic_drives = 'Yes',
  setting_ranch = 'No', setting_field = 'No', setting_mountainous = 'Yes', rv_parking = 'Yes',
  date_updated = '2026-09-04'
WHERE id = 11057 AND property_id = '1fe06712-bf3e-46d2-97b5-fe0eddee0888';

UPDATE public.all_sage_data
SET
  site_name = 'Alpine Tent Pitch', unit_type = 'Campsite', quantity_of_units = NULL,
  unit_capacity = NULL, unit_bed = NULL,
  unit_private_bathroom = 'No', unit_shower = 'No', unit_kitchenette = 'No',
  unit_full_kitchen = 'No', unit_air_conditioning = 'No', unit_wifi = 'Yes',
  unit_pets = 'Yes', unit_electricity = 'Yes', unit_water = 'No',
  unit_campfires = 'No', unit_patio = 'No', unit_cable = 'No',
  unit_mini_fridge = 'No', unit_picnic_table = 'No', unit_charcoal_grill = 'No',
  unit_ada_accessibility = 'No', unit_hot_tub = 'No', unit_sauna = 'No',
  operating_season_months = 'Seasonal Dolomites camp. Official pitch count unpublished. Lodge / Forest / A-Frame / Stargazing cabins unpublished. Do not store Safari Tent / 10.',
  minimum_nights = '1',
  unit_description = $$Tourist Pitch (qty unpublished): official Alpine Tent from €16 and Rolling Home from €24. Cabins unpublished.$$,
  amenities_raw = 'Pitch; electricity; shared WC/showers; wifi; laundry.',
  rate_summer_weekday = '16', rate_summer_weekend = '16',
  rate_winter_weekday = '16', rate_winter_weekend = '16',
  rate_spring_weekday = '16', rate_spring_weekend = '16',
  rate_fall_weekday = '16', rate_fall_weekend = '16',
  rate_unit_rates_by_year = jsonb_build_object(
    '2026', jsonb_build_object(
      'winter', jsonb_build_object('weekday', 16, 'weekend', 16),
      'spring', jsonb_build_object('weekday', 16, 'weekend', 16),
      'summer', jsonb_build_object('weekday', 16, 'weekend', 16),
      'fall', jsonb_build_object('weekday', 16, 'weekend', 16),
      'note', 'EUR room_only. Official Alpine Tent from €16. Do not store Sage 150.'
    )
  ),
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Published. Official Str. Sciarè 11 / +39 0471 849527 / GPS 46.5541, 11.96999. Pitch from €16. Cleared Safari Tent / 10 / 150.'
WHERE id = 11057 AND property_id = '1fe06712-bf3e-46d2-97b5-fe0eddee0888';

COMMIT;
