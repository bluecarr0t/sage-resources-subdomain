-- Village Camp (villagecamp.com), researched 2026-09-30.
-- Bookable types and nightly rates are from Newbook for arrival Tue 10 Nov 2026,
-- departure Sat 14 Nov 2026 (4 nights). That displayed nightly rate blends weekday
-- and weekend nights, so it is stored only on rate_fall_weekday and labeled in
-- rate_basis_notes. "Only N sites available" is leftover inventory, not a count.
-- Named pads are not published. quantity_of_units stays null except unique Moab homes.

BEGIN;

INSERT INTO public.glamping_brands (slug, display_name, brand_tier, website_url, reported_location_count, notes)
VALUES (
  'village-camp',
  'Village Camp',
  'standalone',
  'https://villagecamp.com/',
  5,
  'Three operating camps (Flagstaff, Truckee-Tahoe, Moab) plus Park City and Durango listed as coming soon on the homepage, 2026-09-30.'
)
ON CONFLICT (slug) DO UPDATE
SET display_name = EXCLUDED.display_name,
    website_url = EXCLUDED.website_url,
    reported_location_count = EXCLUDED.reported_location_count,
    updated_at = now();

-- Flagstaff shell becomes the Spruce cabin. Other types are inserted below.
UPDATE public.all_sage_data SET
  site_name = 'Spruce Cabin | Roof Top Deck',
  unit_type = 'Cabin',
  property_type = 'Glamping Resort',
  is_glamping_property = 'Yes',
  quantity_of_units = NULL,
  unit_capacity = '7',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_electricity = 'Yes',
  unit_full_kitchen = 'Yes',
  unit_kitchenette = 'No',
  unit_patio = 'Yes',
  unit_campfires = 'Yes',
  unit_mini_fridge = 'Yes',
  unit_ada_accessibility = 'No',
  rate_fall_weekday = '301.50',
  rate_fall_weekend = NULL,
  rate_unit_rates_by_year = '{"2026":{"fall":{"weekday":301.5,"note":"Newbook displayed $301.50/night for 10–14 Nov 2026 (Tue–Sat, 4 nights). Blended weekday and weekend nights."}}}'::jsonb,
  unit_description = $$Sleeps 5 to 7. Queen in the main-floor bedroom, second queen and a twin in the loft, sleeper sofa. Full kitchen. Private rooftop deck.$$,
  notes = $$[2026-09-30] Newbook villagecamp-flagstaff. Twelve cabin models from the cabin page; Aspen and Sycamore were not in the 10–14 Nov availability result. Four RV categories were priced in that same search. No published total site count; an older stored count of 48 was not on the site.$$,
  date_updated = '2026-09-30',
  discovery_source = 'newbook_web_research_2026_09_30'
WHERE id = 13140;

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  city, state, country, slug, property_type, url, property_id, brand_id,
  quantity_of_units, unit_type, unit_capacity,
  unit_private_bathroom, unit_shower, unit_wifi, unit_pets, unit_electricity,
  unit_full_kitchen, unit_kitchenette, unit_patio, unit_campfires, unit_mini_fridge,
  unit_picnic_table, unit_ada_accessibility, unit_sq_ft,
  rate_fall_weekday, rate_unit_rates_by_year,
  unit_description, description, notes
)
SELECT
  'published', 'Yes', v.is_glamping, 'Sage', g.property_name, v.site_name,
  'newbook_web_research_2026_09_30', '2026-09-30', '2026-09-30',
  g.city, g.state, 'United States', g.slug, g.property_type, g.url, g.property_id,
  (SELECT id FROM public.glamping_brands WHERE slug = 'village-camp'),
  NULL, v.unit_type, v.capacity,
  v.private_bath, v.shower, 'Yes', 'Yes', 'Yes',
  v.full_kitchen, v.kitchenette, v.patio, v.campfires, v.mini_fridge,
  v.picnic, v.ada, v.sq_ft,
  v.rate,
  CASE WHEN v.rate IS NULL THEN NULL
    ELSE jsonb_build_object('2026', jsonb_build_object('fall', jsonb_build_object(
      'weekday', v.rate::numeric,
      'note', 'Newbook displayed nightly rate for 10–14 Nov 2026 (Tue–Sat, 4 nights). Blended weekday and weekend nights.'
    )))
  END,
  v.unit_desc,
  'Sibling unit type — Village Camp Flagstaff.',
  v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    ('Oak Cabin', 'Cabin', 'Yes', '6', 'Yes', 'Yes', 'Yes', 'No', 'No', 'No', 'Yes', 'No', 'No', NULL::numeric, '306.50',
      $$Two queen bedrooms, bunk room with two twin bunks, two bathrooms, full kitchen, washer and dryer.$$,
      $$New row 2026-09-30. Newbook had 3 sites left for 10–14 Nov 2026; that is remaining inventory, not a unit count.$$),
    ('Maple Cabin | Roof Top Deck', 'Cabin', 'Yes', '9', 'Yes', 'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'No', 'No', 900, '324.00',
      $$900+ sq ft. Sleeps 8 to 9. Three bedrooms, full kitchen, rooftop deck. Newbook: two queen bedrooms, bunk room, sleeper sofa.$$,
      $$New row 2026-09-30. Newbook had 5 sites left for 10–14 Nov 2026; that is remaining inventory, not a unit count.$$),
    ('Willow Cabin | Roof Top Deck', 'Cabin', 'Yes', '7', 'Yes', 'Yes', 'Yes', 'No', 'No', 'Yes', 'Yes', 'No', 'No', NULL, '206.50',
      $$Sleeps 5 to 7. Primary queen, loft with a queen and a twin, sleeper sofa. Full kitchen, washer and dryer, electric fireplace, rooftop deck.$$,
      $$New row 2026-09-30. Newbook villagecamp-flagstaff.$$),
    ('Juniper Cabin', 'Cabin', 'Yes', '9', 'Yes', 'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'No', 'No', NULL, '214.00',
      $$Marketing page: sleeps up to 9. Queen, twin bunk, three twins, sleeper sofa. Full kitchen, full bathroom, private patio and fire pit. Newbook occupant count on the same search was 8.$$,
      $$New row 2026-09-30. Newbook villagecamp-flagstaff.$$),
    ('Elm Cabin | Roof Top Deck', 'Cabin', 'Yes', '6', 'Yes', 'Yes', 'Yes', 'No', 'No', 'Yes', 'Yes', 'No', 'No', NULL, '219.00',
      $$Sleeps 4 to 6. Queen, two full beds, sleeper sofa. Full kitchen and a large rooftop deck.$$,
      $$New row 2026-09-30. Newbook villagecamp-flagstaff.$$),
    ('Birch Cabin | Roof Top Deck', 'Cabin', 'Yes', '10', 'Yes', 'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'No', 'No', NULL, '304.00',
      $$Sleeps 8 to 10. Two queen bedrooms, flex room with two twin bunks, sleeper sofa. Full kitchen and rooftop deck with a fire pit.$$,
      $$New row 2026-09-30. Newbook villagecamp-flagstaff.$$),
    ('Cottonwood Cabin', 'Cabin', 'Yes', '8', 'Yes', 'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'No', 'No', NULL, '214.00',
      $$Sleeps 6 to 8. Queen, two full beds, sleeper sofa. Full kitchen, front porch, and fire pit.$$,
      $$New row 2026-09-30. Newbook villagecamp-flagstaff.$$),
    ('Ponderosa Cabin', 'Cabin', 'Yes', '8', 'Yes', 'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'No', 'No', NULL, '226.50',
      $$Sleeps 6 to 8. Queen in the master, twin bunk, loft, sleeper sofa. Full kitchen. Newbook also lists a porch fire pit.$$,
      $$New row 2026-09-30. Newbook villagecamp-flagstaff.$$),
    ('Cypress Cabin', 'Cabin', 'Yes', '6', 'Yes', 'Yes', 'Yes', 'No', 'No', 'No', 'Yes', 'No', 'No', NULL, '250.00',
      $$Sleeps 4 to 6. Queen, two twins, sleeper sofa. Full kitchen with full-size appliances and an electric fireplace.$$,
      $$New row 2026-09-30. Newbook villagecamp-flagstaff.$$),
    ('Aspen Cabin', 'Cabin', 'Yes', '6', 'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'No', 'No', NULL, NULL,
      $$Sleeps up to 6. King, two twins, sleeper sofa. Kitchenette, stone shower, front porch, fire pit.$$,
      $$On the Flagstaff cabin page 2026-09-30. Not returned by the Newbook search for 10–14 Nov 2026, so no rate is stored.$$),
    ('Sycamore Cabin', 'Cabin', 'Yes', '4', 'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'No', 'Yes', NULL, NULL,
      $$Accessible cabin, sleeps up to 4. Queen and two twins. Kitchenette, roll-in shower, front porch, fire pit.$$,
      $$On the Flagstaff cabin page 2026-09-30. Not returned by the Newbook search for 10–14 Nov 2026, so no rate is stored.$$),
    ('Super Premium Pull Through', 'RV Site', 'No', '6', 'No', 'No', 'No', 'No', 'Yes', 'Yes', 'No', 'Yes', 'No', NULL, '107.50',
      $$Pull-through. Outdoor kitchen and fireplace, partial concrete, picnic table. 20/30/50-amp, sewer, water, Wi-Fi. Pet-friendly. Resort bathhouse.$$,
      $$New row 2026-09-30. Newbook villagecamp-flagstaff, 10–14 Nov 2026.$$),
    ('Super Premium Lot', 'RV Site', 'No', '6', 'No', 'No', 'No', 'No', 'Yes', 'Yes', 'No', 'Yes', 'No', NULL, '135.00',
      $$Mountain views, outdoor kitchen and fireplace, 12×45 ft patio, picnic table. 20/30/50-amp full hookups, Wi-Fi. Pet-friendly.$$,
      $$New row 2026-09-30. Newbook $135.00/night for 10–14 Nov 2026.$$),
    ('Premium Back-In Lot', 'RV Site', 'No', '6', 'No', 'No', 'No', 'No', 'Yes', 'Yes', 'No', 'Yes', 'No', NULL, '82.50',
      $$Back-in with mountain views, fire pit, 12×25 ft patio, picnic table. 20/30/50-amp full hookups, Wi-Fi. Pet-friendly.$$,
      $$New row 2026-09-30. Newbook villagecamp-flagstaff.$$),
    ('Back-In Lot', 'RV Site', 'No', '6', 'No', 'No', 'No', 'No', 'No', 'No', 'No', 'Yes', 'No', NULL, '77.50',
      $$Standard back-in with a picnic table. 20/30/50-amp full hookups, Wi-Fi. No outdoor kitchen or fireplace. Pet-friendly.$$,
      $$New row 2026-09-30. Newbook villagecamp-flagstaff.$$)
) AS v(site_name, unit_type, is_glamping, capacity, private_bath, shower, full_kitchen, kitchenette, campfires, patio, mini_fridge, picnic, ada, sq_ft, rate, unit_desc, note)
WHERE g.id = 13140
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = g.property_id AND x.site_name = v.site_name
  );

UPDATE public.all_sage_data SET
  address = '5560 Forest Service 171 Rd',
  city = 'Bellemont',
  state = 'AZ',
  zip_code = '86015',
  lat = 35.245809,
  lon = -111.834561,
  country = 'United States',
  phone_number = '+1-928-550-6979',
  url = 'https://villagecamp.com/resorts/flagstaff/',
  property_type = CASE WHEN unit_type = 'RV Site' THEN 'RV Resort' ELSE 'Glamping Resort' END,
  property_total_sites = NULL,
  brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'village-camp'),
  property_family_friendly = 'Yes',
  property_clubhouse = 'Yes',
  property_restaurant = 'Yes',
  property_alcohol_available = 'Yes',
  property_general_store = 'Yes',
  property_pool = 'Yes',
  property_hot_tub = 'Yes',
  property_playground = 'Yes',
  property_laundry = 'Yes',
  property_extended_stay = 'Yes',
  setting_forest = 'Yes',
  setting_mountainous = 'Yes',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_stargazing = 'Yes',
  activities_swimming = 'Yes',
  land_operator_category = 'private_commercial',
  glamping_service_tier = CASE WHEN unit_type = 'Cabin' THEN 'upscale' ELSE 'midscale' END,
  glamping_service_tier_source = 'manual',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD Newbook displayed nightly rate, before tax, for arrival Tue 10 Nov 2026 and departure Sat 14 Nov 2026 (4 nights). The figure blends weekday and weekend nights; no separate weekend rate is stored. RV sites are full hookup. RVs generally must be RVIA certified and 10 years or newer. Dogs are allowed. A $50 fee applies if a guest locks a specific site number. USPS does not deliver to the resort.',
  date_updated = '2026-09-30',
  discovery_source = 'newbook_web_research_2026_09_30',
  description = $$Village Camp Flagstaff, 5560 Forest Service 171 Rd, Bellemont, Arizona. Operating cabin and RV resort west of Flagstaff, with a clubhouse, bar and bistro, general store, event lawn, seasonal mountain-view pool, year-round hot tub, amphitheater, playground, and laundry. Bookable cabin models and RV site types are sold by category in Newbook; individual pad numbers are not a public catalog.$$
WHERE property_id = 'fd5fc3d7-b4a4-44be-9f0c-7de05fe6d507';

-- Truckee shell becomes the non-pet Adventure Cabin.
UPDATE public.all_sage_data SET
  site_name = 'Adventure Cabin',
  unit_type = 'Cabin',
  property_type = 'Glamping Resort',
  is_glamping_property = 'Yes',
  quantity_of_units = NULL,
  property_total_sites = NULL,
  unit_capacity = '4',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'No',
  unit_electricity = 'Yes',
  unit_full_kitchen = 'Yes',
  unit_kitchenette = 'No',
  unit_patio = 'Yes',
  unit_campfires = 'Yes',
  unit_mini_fridge = 'Yes',
  unit_ada_accessibility = 'No',
  rate_fall_weekday = '268.75',
  rate_fall_weekend = NULL,
  rate_unit_rates_by_year = '{"2026":{"fall":{"weekday":268.75,"note":"Newbook displayed $268.75/night for 10–14 Nov 2026 (Tue–Sat, 4 nights). Blended weekday and weekend nights."}}}'::jsonb,
  unit_description = $$Sleeps up to 4. Queen and two twins. Full kitchen, full bathroom with in-floor radiant heat, deck with a private fire pit. Pet-friendly cabins are a separate bookable type.$$,
  notes = $$[2026-09-30] Newbook villagecamp-truckee. Elite and Economy pull-throughs are on the RV marketing page but were not priced for a 30-foot motorhome on 10–14 Nov 2026. property_total_sites 130 cleared.$$,
  date_updated = '2026-09-30',
  discovery_source = 'newbook_web_research_2026_09_30'
WHERE id = 13141;

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  city, state, country, slug, property_type, url, property_id, brand_id,
  quantity_of_units, unit_type, unit_capacity,
  unit_private_bathroom, unit_shower, unit_wifi, unit_pets, unit_electricity,
  unit_full_kitchen, unit_patio, unit_campfires, unit_picnic_table, unit_mini_fridge,
  unit_ada_accessibility, unit_cable,
  rate_fall_weekday, rate_unit_rates_by_year,
  unit_description, description, notes
)
SELECT
  'published', 'Yes', v.is_glamping, 'Sage', g.property_name, v.site_name,
  'newbook_web_research_2026_09_30', '2026-09-30', '2026-09-30',
  g.city, g.state, 'United States', g.slug, g.property_type, g.url, g.property_id,
  (SELECT id FROM public.glamping_brands WHERE slug = 'village-camp'),
  NULL, v.unit_type, '6',
  'No', 'No', 'Yes', 'Yes', 'Yes',
  'No', 'No', v.campfires, 'Yes', 'No',
  v.ada, 'Yes',
  v.rate,
  CASE WHEN v.rate IS NULL THEN NULL
    ELSE jsonb_build_object('2026', jsonb_build_object('fall', jsonb_build_object(
      'weekday', v.rate::numeric,
      'note', v.rate_note
    )))
  END,
  v.unit_desc,
  'Sibling unit type — Village Camp Truckee-Tahoe.',
  v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    ('Adventure Cabin (Pet-Friendly)', 'Cabin', 'Yes', 'No', 'No', '281.25',
      $$Same Adventure Cabin layout as the non-pet cabin: sleeps up to 4, queen and two twins, full kitchen, private fire pit. This category allows pets.$$,
      $$Newbook displayed nightly rate for 10–14 Nov 2026 (Tue–Sat, 4 nights). Blended weekday and weekend nights.$$,
      $$New row 2026-09-30. Newbook villagecamp-truckee. Occupant tools showed 4; capacity column left at the RV default only on RV rows.$$),
    ('Deluxe Pull Through', 'RV Site', 'No', 'No', 'No', '137.50',
      $$Premium pull-through with upgraded landscaping. Full hookups. Priced for a 30-foot motorhome.$$,
      $$Newbook displayed nightly rate for 10–14 Nov 2026 with equipment type Motorhome and length 30 ft.$$,
      $$New row 2026-09-30.$$),
    ('Premium Pull Through', 'RV Site', 'No', 'No', 'No', '101.25',
      $$Shaded pull-through among trees. Full hookup.$$,
      $$Newbook displayed nightly rate for 10–14 Nov 2026 with equipment type Motorhome and length 30 ft.$$,
      $$New row 2026-09-30.$$),
    ('Premium ADA Pull Through', 'RV Site', 'No', 'No', 'Yes', '127.50',
      $$Premium pull-through with easier access, set among the trees. Full hookup.$$,
      $$Newbook displayed nightly rate for 10–14 Nov 2026 with equipment type Motorhome and length 30 ft.$$,
      $$New row 2026-09-30.$$),
    ('Back-In', 'RV Site', 'No', 'No', 'No', '110.00',
      $$Back-in site for smaller motorhomes or travel trailers. Full hookup on compacted gravel, with limited tree cover.$$,
      $$Newbook displayed nightly rate for 10–14 Nov 2026 with equipment type Motorhome and length 30 ft.$$,
      $$New row 2026-09-30.$$),
    ('Standard Pull Through', 'RV Site', 'No', 'No', 'No', '92.50',
      $$Pull-through with full hookups.$$,
      $$Newbook displayed nightly rate for 10–14 Nov 2026 with equipment type Motorhome and length 30 ft.$$,
      $$New row 2026-09-30.$$),
    ('Elite Pull-Through', 'RV Site', 'No', 'No', 'No', NULL,
      $$Listed on the Truckee RV page with Premium ADA, Premium, Standard, Economy, and Back-In. Not in the priced Newbook list for a 30-foot motorhome on 10–14 Nov 2026.$$,
      NULL,
      $$Marketing type only for that search. No rate stored.$$),
    ('Economy Pull-Through', 'RV Site', 'No', 'No', 'No', NULL,
      $$Listed on the Truckee RV page. Hidden as unavailable, or not eligible, for a 30-foot motorhome on 10–14 Nov 2026.$$,
      NULL,
      $$Marketing type only for that search. No rate stored.$$)
) AS v(site_name, unit_type, is_glamping, campfires, ada, rate, unit_desc, rate_note, note)
WHERE g.id = 13141
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = g.property_id AND x.site_name = v.site_name
  );

-- Pet cabin is a cabin, not an RV site. Fix fields the shared RV-shaped insert set.
UPDATE public.all_sage_data SET
  unit_capacity = '4',
  unit_private_bathroom = 'Yes',
  unit_shower = 'Yes',
  unit_full_kitchen = 'Yes',
  unit_patio = 'Yes',
  unit_campfires = 'Yes',
  unit_mini_fridge = 'Yes',
  unit_picnic_table = 'No',
  unit_cable = NULL
WHERE property_id = '11e5bac9-7d99-4a87-aca7-7f7f60dfd3b4'
  AND site_name = 'Adventure Cabin (Pet-Friendly)';

UPDATE public.all_sage_data SET
  address = '10100 Pioneer Trail',
  city = 'Truckee',
  state = 'CA',
  zip_code = '96161',
  lat = 39.33897,
  lon = -120.17439,
  country = 'United States',
  phone_number = '+1-530-625-7603',
  url = 'https://villagecamp.com/resorts/truckee-tahoe/',
  property_type = CASE WHEN unit_type = 'RV Site' THEN 'RV Resort' ELSE 'Glamping Resort' END,
  property_total_sites = NULL,
  brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'village-camp'),
  property_family_friendly = 'Yes',
  property_clubhouse = 'Yes',
  property_dog_park = 'Yes',
  property_fitness_room = 'Yes',
  property_playground = 'Yes',
  property_laundry = 'Yes',
  property_extended_stay = 'Yes',
  setting_forest = 'Yes',
  setting_mountainous = 'Yes',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_snow_sports = 'Yes',
  land_operator_category = 'private_commercial',
  glamping_service_tier = CASE WHEN unit_type = 'Cabin' THEN 'upscale' ELSE 'midscale' END,
  glamping_service_tier_source = 'manual',
  rate_basis = 'room_only',
  rate_basis_notes = 'USD Newbook displayed nightly rate, before tax, for arrival Tue 10 Nov 2026 and departure Sat 14 Nov 2026 (4 nights). The figure blends weekday and weekend nights. RV rates are for a 30-foot motorhome. The RV page says 90 pull-through shaded sites and also lists back-in sites, so 90 is not a total pad count. The previous stored total of 130 was cleared.',
  date_updated = '2026-09-30',
  discovery_source = 'newbook_web_research_2026_09_30',
  description = $$Village Camp Truckee-Tahoe, 10100 Pioneer Trail, Truckee, California. Operating eco-cabin and luxury RV resort with a clubhouse, fitness room, dog park, playground, laundry, and bathhouse. Cabins book as Adventure Cabin or Adventure Cabin (Pet-Friendly). RV sites book by category.$$
WHERE property_id = '11e5bac9-7d99-4a87-aca7-7f7f60dfd3b4';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type, url,
  phone_number, brand_id,
  property_total_sites, quantity_of_units, unit_type, unit_capacity,
  unit_private_bathroom, unit_shower, unit_air_conditioning, unit_wifi, unit_pets,
  unit_electricity, unit_full_kitchen, unit_patio, unit_campfires, unit_picnic_table,
  unit_mini_fridge, unit_cable, unit_ada_accessibility,
  property_family_friendly, property_clubhouse, property_pool, property_hot_tub,
  property_dog_park, property_fitness_room, property_laundry, property_pickball_courts,
  setting_desert, setting_canyon, activities_hiking, activities_biking, activities_off_roading_ohv,
  land_operator_category, glamping_service_tier, glamping_service_tier_source,
  rate_fall_weekday, rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  unit_description, description, notes
)
SELECT
  'published', 'Yes', 'Yes', 'Sage', 'Village Camp Moab', '3bd/3ba Luxury Vacation Home M24',
  'newbook_web_research_2026_09_30', '2026-09-30', '2026-09-30',
  '1261 North Highway 191', 'Moab', 'UT', '84532', 38.59048, -109.568218, 'United States',
  'village-camp-moab', 'Glamping Resort', 'https://villagecamp.com/resorts/moab/',
  '+1-435-500-2122', (SELECT id FROM public.glamping_brands WHERE slug = 'village-camp'),
  NULL, 1, 'Vacation Home', '10',
  'Yes', 'Yes', 'Yes', 'Yes', 'No',
  'Yes', 'Yes', 'Yes', 'No', 'Yes',
  'Yes', 'Yes', 'No',
  'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'private_commercial', 'upscale', 'manual',
  '459.00',
  '{"2026":{"fall":{"weekday":459,"note":"Newbook displayed $459.00/night for 10–14 Nov 2026 (Tue–Sat, 4 nights). One home left in that search."}}}'::jsonb,
  'room_only',
  'USD Newbook displayed nightly rate, before tax, for arrival Tue 10 Nov 2026 and departure Sat 14 Nov 2026 (4 nights). The figure blends weekday and weekend nights. Vacation homes and the casita are no-pets. RV rates are for a 30-foot motorhome. Phone +1-435-500-2122 is the locations-page number; JSON-LD on the Moab page lists +1-435-259-6108.',
  $$Three master suites and three bathrooms. Gourmet kitchen. Newbook occupant count 10. One named home, M24.$$,
  $$Village Camp Moab, 1261 North Highway 191, Moab, Utah. Operating luxury RV resort with vacation homes, a casita, and adventure cabins. Seasonal pools through November 1, year-round hot tub, clubhouse, dog park, fitness center, pickleball, laundry, and a serenity pond.$$,
  $$Anchor row 2026-09-30. Newbook villagecamp-moab. Named home M24, quantity 1.$$
WHERE NOT EXISTS (
  SELECT 1 FROM public.all_sage_data x
  WHERE x.slug = 'village-camp-moab' AND x.site_name = '3bd/3ba Luxury Vacation Home M24'
);

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type, url,
  phone_number, brand_id, property_id,
  property_total_sites, quantity_of_units, unit_type, unit_capacity,
  unit_private_bathroom, unit_shower, unit_air_conditioning, unit_wifi, unit_pets,
  unit_electricity, unit_full_kitchen, unit_kitchenette, unit_patio, unit_campfires,
  unit_picnic_table, unit_mini_fridge, unit_cable, unit_ada_accessibility,
  property_family_friendly, property_clubhouse, property_pool, property_hot_tub,
  property_dog_park, property_fitness_room, property_laundry, property_pickball_courts,
  setting_desert, setting_canyon, activities_hiking, activities_biking, activities_off_roading_ohv,
  land_operator_category, glamping_service_tier, glamping_service_tier_source,
  rate_fall_weekday, rate_unit_rates_by_year, rate_basis, rate_basis_notes,
  unit_description, description, notes
)
SELECT
  'published', 'Yes', v.is_glamping, 'Sage', g.property_name, v.site_name,
  'newbook_web_research_2026_09_30', '2026-09-30', '2026-09-30',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, 'United States', g.slug, g.property_type, g.url,
  g.phone_number, g.brand_id, g.property_id,
  NULL, v.qty, v.unit_type, v.capacity,
  v.private_bath, v.shower, v.ac, 'Yes', v.pets,
  'Yes', v.full_kitchen, 'No', 'Yes', 'No',
  v.picnic, v.mini_fridge, v.cable, 'No',
  g.property_family_friendly, g.property_clubhouse, g.property_pool, g.property_hot_tub,
  g.property_dog_park, g.property_fitness_room, g.property_laundry, g.property_pickball_courts,
  g.setting_desert, g.setting_canyon, g.activities_hiking, g.activities_biking, g.activities_off_roading_ohv,
  g.land_operator_category, v.tier, 'manual',
  v.rate,
  CASE WHEN v.rate IS NULL THEN NULL
    ELSE jsonb_build_object('2026', jsonb_build_object('fall', jsonb_build_object(
      'weekday', v.rate::numeric,
      'note', 'Newbook displayed nightly rate for 10–14 Nov 2026 (Tue–Sat, 4 nights). Blended weekday and weekend nights. RV search used a 30-foot motorhome.'
    )))
  END,
  g.rate_basis, g.rate_basis_notes,
  v.unit_desc,
  'Sibling unit type — Village Camp Moab.',
  v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    ('Luxury Vacation Home 4-BED M20', 'Vacation Home', 'Yes', 1::numeric, '8', 'Yes', 'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'upscale', '481.50',
      $$Four bedrooms and 4.5 bathrooms, about 4,000 sq ft on the marketing page. Three king suites plus a bedroom with two full beds. Gourmet kitchen. No pets. Named home M20.$$,
      $$New row 2026-09-30. One home left in the 10–14 Nov search.$$),
    ('Luxury Vacation Home M21', 'Vacation Home', 'Yes', 1, '6', 'Yes', 'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'upscale', '459.00',
      $$Three master suites and 3.5 bathrooms. Gourmet kitchen. No pets. Named home M21.$$,
      $$New row 2026-09-30. One home left in the 10–14 Nov search.$$),
    ('Luxury Casita R5', 'Vacation Home', 'Yes', 1, '4', 'Yes', 'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'upscale', '424.75',
      $$Two king suites and 2.25 bathrooms. Gourmet kitchen, patio, picnic table. No pets. Named casita R5.$$,
      $$New row 2026-09-30. One casita left in the 10–14 Nov search.$$),
    ('Adventure Cabin', 'Cabin', 'Yes', NULL, '4', 'Yes', 'Yes', 'Yes', NULL, 'Yes', 'No', 'Yes', 'Yes', 'upscale', NULL,
      $$Sleeps up to 4. Queen, two twins, sleeper sofa on the cabin page. Full bathroom, microwave, mini-fridge, outdoor grill, patio. Two-night minimum on the cabin page. Not in the Newbook lodging results for 10–14 Nov 2026.$$,
      $$Marketing cabin. No rate stored for that window.$$),
    ('Premium Pull Through With Pergola (PF)', 'RV Site', 'No', NULL, '6', 'No', 'No', NULL, 'Yes', 'No', 'Yes', 'No', 'Yes', 'midscale', '99.00',
      $$Premium pull-through with a pergola in the owner section. Class A or fifth wheel, generally 10 years or newer. Full hookups.$$,
      $$New row 2026-09-30. (PF) kept from the Newbook name.$$),
    ('Premium Back-In With Pergola (PF)', 'RV Site', 'No', NULL, '6', 'No', 'No', NULL, 'Yes', 'No', 'Yes', 'No', 'Yes', 'midscale', '99.00',
      $$Premium back-in with a pergola. Class A or fifth wheel, generally 10 years or newer.$$,
      $$New row 2026-09-30.$$),
    ('Premium Pull-In With Pergola (PF)', 'RV Site', 'No', NULL, '6', 'No', 'No', NULL, 'Yes', 'No', 'Yes', 'No', 'Yes', 'midscale', '99.00',
      $$Premium pull-in with a pergola. Newbook says Class A only because of the site design, generally 10 years or newer.$$,
      $$New row 2026-09-30.$$),
    ('Premium Pull Through (PF)', 'RV Site', 'No', NULL, '6', 'No', 'No', NULL, 'Yes', 'No', 'Yes', 'No', 'Yes', 'midscale', '94.00',
      $$Premium pull-through in the owner section. Class A or fifth wheel, generally 10 years or newer.$$,
      $$New row 2026-09-30.$$),
    ('Premium Back-In', 'RV Site', 'No', NULL, '6', 'No', 'No', NULL, 'Yes', 'No', 'Yes', 'No', 'Yes', 'midscale', '94.00',
      $$Premium back-in. Class A or fifth wheel, generally 10 years or newer.$$,
      $$New row 2026-09-30.$$),
    ('Elite Back-In (PF)', 'RV Site', 'No', NULL, '6', 'No', 'No', NULL, 'Yes', 'No', 'Yes', 'No', 'Yes', 'midscale', '89.00',
      $$Elite back-in with views toward the Slickrock Trail. Class A, B, C, travel trailer, or fifth wheel, generally 10 years or newer.$$,
      $$New row 2026-09-30.$$),
    ('Elite Pull-In (PF)', 'RV Site', 'No', NULL, '6', 'No', 'No', NULL, 'Yes', 'No', 'Yes', 'No', 'Yes', 'midscale', '89.00',
      $$Elite pull-in. Newbook says Class A, B, or C, generally 10 years or newer.$$,
      $$New row 2026-09-30.$$),
    ('Deluxe Back-In (PF)', 'RV Site', 'No', NULL, '6', 'No', 'No', NULL, 'Yes', 'No', 'Yes', 'No', 'Yes', 'midscale', '69.00',
      $$Deluxe back-in. Marketing deluxe sites are gravel with 30/50-amp, water, and sewer.$$,
      $$New row 2026-09-30.$$),
    ('Standard Pull Through (PF)', 'RV Site', 'No', NULL, '6', 'No', 'No', NULL, 'Yes', 'No', 'No', 'No', 'Yes', 'midscale', '59.00',
      $$Standard pull-through. Newbook: no sewer hookup at the site (dump station on property) and 30-amp electric. Views toward the Portal Trail.$$,
      $$New row 2026-09-30.$$)
) AS v(site_name, unit_type, is_glamping, qty, capacity, private_bath, shower, ac, pets, full_kitchen, picnic, mini_fridge, cable, tier, rate, unit_desc, note)
WHERE g.site_name = '3bd/3ba Luxury Vacation Home M24'
  AND g.slug = 'village-camp-moab'
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = g.property_id AND x.site_name = v.site_name
  );

UPDATE public.all_sage_data
SET property_type = 'RV Resort'
WHERE slug = 'village-camp-moab'
  AND unit_type = 'RV Site';

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, country, slug, property_type, url, phone_number, brand_id,
  unit_type, property_family_friendly, land_operator_category,
  description, notes
)
SELECT
  'published', 'Under Construction', 'Yes', 'Sage', 'Village Camp Park City', NULL,
  'newbook_web_research_2026_09_30', '2026-09-30', '2026-09-30',
  '2200 Rasmussen Rd', 'Park City', 'UT', '84098', 'United States',
  'village-camp-park-city', 'Glamping Resort', 'https://villagecamp.com/resorts/park-city-ut/',
  '+1-435-649-2535', (SELECT id FROM public.glamping_brands WHERE slug = 'village-camp'),
  NULL, 'Yes', 'private_commercial',
  $$Village Camp Park City is listed as coming soon. The Durango resort page directory gives 2200 Rasmussen Rd, Park City, UT 84098, and (435) 649-2535. No bookable units or rates were published.$$,
  $$[2026-09-30] Homepage marks Park City with an asterisk as coming soon. Coordinates were not published, so lat/lon are empty.$$
WHERE NOT EXISTS (
  SELECT 1 FROM public.all_sage_data WHERE slug = 'village-camp-park-city'
);

INSERT INTO public.all_sage_data (
  research_status, is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  city, state, country, slug, property_type, url, brand_id,
  unit_type, land_operator_category,
  description, notes
)
SELECT
  'published', 'Under Construction', 'Yes', 'Sage', 'Village Camp Durango', NULL,
  'newbook_web_research_2026_09_30', '2026-09-30', '2026-09-30',
  'Durango', 'CO', 'United States',
  'village-camp-durango', 'Glamping Resort', 'https://villagecamp.com/resorts/durango/',
  (SELECT id FROM public.glamping_brands WHERE slug = 'village-camp'),
  NULL, 'private_commercial',
  $$Village Camp Durango is a coming-soon page. The public page is still placeholder copy and does not give an address, phone, or site plan. State is recorded as Colorado from the Durango place name; the page itself does not print the state.$$,
  $$[2026-09-30] Homepage marks Durango with an asterisk as coming soon. No coordinates stored.$$
WHERE NOT EXISTS (
  SELECT 1 FROM public.all_sage_data WHERE slug = 'village-camp-durango'
);

-- This batch is published. New rows on the table default to in_progress.
UPDATE public.all_sage_data
SET research_status = 'published'
WHERE brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'village-camp');

ALTER TABLE public.all_sage_data
  ALTER COLUMN research_status SET DEFAULT 'in_progress';

-- Recompute averages after rate_unit_rates_by_year syncs the season columns.
UPDATE public.all_sage_data
SET rate_fall_weekday = rate_fall_weekday
WHERE brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'village-camp')
  AND rate_fall_weekday IS NOT NULL;

COMMIT;
