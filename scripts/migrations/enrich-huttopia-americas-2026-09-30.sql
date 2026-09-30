-- Huttopia Americas (americas.huttopia.com), researched 2026-09-30.
-- All 8 operating destinations already exist in all_sage_data.
-- This migration adds missing accommodation types (Berkshires was a shell only),
-- two Les Deux Lacs types, White Mountains Bonaventure, and refreshes brand/URLs.
-- New unit rows use the table default research_status = in_progress.
-- Unit counts and nightly rates are not published on the marketing pages, so those stay null.

BEGIN;

UPDATE public.glamping_brands
SET website_url = 'https://americas.huttopia.com/en/',
    reported_location_count = 8,
    notes = COALESCE(notes, '') || E'\n\n[2026-09-30] Americas brand site lists 8 destinations (Berkshires, Lake George–Adirondacks, Paradise Springs, Southern Maine, White Mountains, Wine Country, Les Deux Lacs–Laurentides, Sutton). Homepage copy says “9 destinations”; only 8 unique /site/ pages exist.',
    updated_at = now()
WHERE slug = 'huttopia';

-- Point property URLs at the current Americas host.
UPDATE public.all_sage_data
SET url = regexp_replace(url, 'https://canada-usa\.huttopia\.com', 'https://americas.huttopia.com', 'g'),
    date_updated = '2026-09-30'
WHERE brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'huttopia')
  AND url ILIKE '%canada-usa.huttopia.com%';

UPDATE public.all_sage_data
SET url = 'https://americas.huttopia.com/en/site/paradise-springs/',
    date_updated = '2026-09-30'
WHERE slug = 'huttopia-paradise-springs'
  AND (url IS NULL OR url = 'https://americas.huttopia.com/en/' OR url = 'https://canada-usa.huttopia.com/en/');

UPDATE public.all_sage_data
SET url = 'https://americas.huttopia.com/en/site/wine-country/',
    date_updated = '2026-09-30'
WHERE slug = 'huttopia-wine-country'
  AND (url IS NULL OR url IN ('https://americas.huttopia.com/en/', 'https://canada-usa.huttopia.com/en/'));

UPDATE public.all_sage_data
SET url = 'https://americas.huttopia.com/en/site/white-mountains/',
    date_updated = '2026-09-30'
WHERE slug = 'huttopia-white-mountains'
  AND (url IS NULL OR url IN ('https://americas.huttopia.com/en/', 'https://canada-usa.huttopia.com/en/'));

UPDATE public.all_sage_data
SET url = 'https://americas.huttopia.com/en/site/adirondacks/',
    date_updated = '2026-09-30'
WHERE slug = 'huttopia-adirondacks'
  AND (url IS NULL OR url = 'https://americas.huttopia.com/en/' OR url NOT ILIKE '%/site/adirondacks/%');

UPDATE public.all_sage_data
SET url = 'https://americas.huttopia.com/en/site/southern-maine/',
    date_updated = '2026-09-30'
WHERE slug = 'huttopia-southern-maine'
  AND url NOT ILIKE '%/site/southern-maine/%';

-- Berkshires shell: address/amenities from LocalBusiness JSON-LD + destination page.
UPDATE public.all_sage_data
SET
  address = '312 Kittle Road',
  city = 'Hancock',
  state = 'MA',
  zip_code = '01237',
  country = 'United States',
  lat = 42.57312420375,
  lon = -73.32603734835,
  phone_number = '+1-413-343-8192',
  url = 'https://americas.huttopia.com/en/site/berkshires/',
  property_type = 'Glamping',
  brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'huttopia'),
  property_family_friendly = 'Yes',
  property_pool = 'Yes',
  property_restaurant = 'Yes',
  property_general_store = 'Yes',
  property_clubhouse = 'Yes',
  setting_forest = 'Yes',
  setting_mountainous = 'Yes',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_swimming = 'Yes',
  land_operator_category = 'private_commercial',
  glamping_service_tier = 'midscale',
  glamping_service_tier_source = 'manual',
  rate_basis = 'room_only',
  rate_basis_notes = 'Marketing page does not list nightly rates. Bookable via Huttopia siteId=110. Season on JSON-LD for 2026: May 21–Oct 18.',
  discovery_source = 'huttopia_americas_web_research_2026_09_30',
  date_updated = '2026-09-30',
  description = $$Huttopia Berkshires, 312 Kittle Road, Hancock, Massachusetts. Ready-to-camp tents and Sierra tiny houses on about 123 acres with views of Jiminy Peak, a heated pool, café/restaurant, camp store, and central lodge. Season typically late May through mid-October.$$,
  notes = COALESCE(notes, '') || E'\n\n[2026-09-30] Enriched from americas.huttopia.com/en/site/berkshires/. Zip corrected to 01237 (was 01267). Phone from LocalBusiness JSON-LD.'
WHERE id = 10859;

INSERT INTO public.all_sage_data (
  is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type, url,
  phone_number, brand_id, property_id,
  property_total_sites, quantity_of_units, unit_type, unit_capacity, unit_sq_ft,
  unit_private_bathroom, unit_shower, unit_air_conditioning, unit_wifi, unit_pets,
  unit_electricity, unit_full_kitchen, unit_kitchenette, unit_mini_fridge,
  unit_campfires, unit_picnic_table, unit_patio, unit_wood_burning_stove,
  property_family_friendly, property_pool, property_restaurant, property_general_store,
  property_clubhouse, setting_forest, setting_mountainous,
  activities_hiking, activities_biking, activities_swimming,
  land_operator_category, glamping_service_tier, glamping_service_tier_source,
  rate_basis, rate_basis_notes, unit_description, description, notes
)
SELECT
  'Yes', 'Yes', 'Sage', g.property_name, v.site_name,
  'huttopia_americas_web_research_2026_09_30', '2026-09-30', '2026-09-30',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, 'United States', g.slug, g.property_type, g.url,
  g.phone_number, g.brand_id, g.property_id,
  NULL, NULL, v.unit_type, v.capacity, v.sq_ft,
  v.private_bath, v.shower, v.ac, NULL, 'Yes',
  'Yes', v.full_kitchen, v.kitchenette, v.mini_fridge,
  'Yes', v.picnic, 'Yes', v.wood_stove,
  g.property_family_friendly, g.property_pool, g.property_restaurant, g.property_general_store,
  g.property_clubhouse, g.setting_forest, g.setting_mountainous,
  g.activities_hiking, g.activities_biking, g.activities_swimming,
  g.land_operator_category, 'midscale', 'manual',
  g.rate_basis, g.rate_basis_notes, v.unit_desc,
  'Sibling unit type — Huttopia Berkshires.',
  v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    ('THE TRAPPEUR W/ WOOD STOVE', 'Safari Tent', '5', 425::numeric, 'Yes', 'Yes', 'No', 'No', 'Yes', 'No', 'No', 'Yes',
      $$Up to 5 guests, about 425 sq ft. Two bedrooms, private compact bathroom, kitchenette, electricity, wood stove, BBQ, outdoor lounge, fire pit.$$,
      $$New row 2026-09-30 from Berkshires accommodations page. Quantity and rates not published.$$),
    ('THE CANADIENNE W/ WOOD STOVE', 'Safari Tent', '5', 350, 'No', 'No', 'No', 'No', 'Yes', 'No', 'No', 'Yes',
      $$Up to 5 guests, about 350 sq ft. Two bedrooms, kitchenette, wood stove, shared bathroom, BBQ, outdoor lounge, fire pit.$$,
      $$New row 2026-09-30 from Berkshires accommodations page.$$),
    ('THE BONAVENTURE', 'Safari Tent', '2', 225, 'No', 'No', 'No', 'No', 'Yes', 'No', 'Yes', 'No',
      $$Up to 2 guests, about 225 sq ft. One bed, cooler, lights, kitchen equipment, shared bathroom, BBQ, picnic table, fire pit.$$,
      $$New row 2026-09-30 from Berkshires accommodations page.$$),
    ('THE SIERRA TINY HOUSE W/ WOOD STOVE', 'Tiny Home', '5', 355, 'Yes', 'Yes', 'Yes', 'Yes', 'No', 'No', 'No', 'Yes',
      $$Up to 5 guests, about 355 sq ft. Queen bedroom plus kids’ room with three twin bunks. Full kitchen and bathroom, reversible AC, heating, wood stove, BBQ, outdoor lounge, fire pit.$$,
      $$New row 2026-09-30. Marketed as brand-new Sierra Tiny House on the Berkshires page.$$)
) AS v(site_name, unit_type, capacity, sq_ft, private_bath, shower, ac, full_kitchen, kitchenette, mini_fridge, picnic, wood_stove, unit_desc, note)
WHERE g.id = 10859
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = g.property_id AND x.site_name = v.site_name
  );

-- Les Deux Lacs: canoe-camping tent and electric pitch.
UPDATE public.all_sage_data
SET
  address = '4500 Chem. du Lac Caribou',
  city = 'Mont-Blanc',
  state = 'QC',
  zip_code = 'J0T 2G0',
  country = 'Canada',
  lat = 46.03378519018,
  lon = -74.48731345432,
  phone_number = '+1-438-802-9684',
  url = 'https://americas.huttopia.com/en/site/les-deux-lacs-laurentides/',
  discovery_source = 'huttopia_americas_web_research_2026_09_30',
  date_updated = '2026-09-30',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-30] Address/city refreshed from LocalBusiness JSON-LD (Mont-Blanc / 4500 Chem. du Lac Caribou). Prior city was Lac-Supérieur.'
WHERE property_id = 'bda342d8-ec1b-46a9-b8bf-b02edf7a84d8';

INSERT INTO public.all_sage_data (
  is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type, url,
  phone_number, brand_id, property_id,
  quantity_of_units, unit_type, unit_capacity, unit_sq_ft,
  unit_private_bathroom, unit_shower, unit_electricity, unit_pets,
  unit_full_kitchen, unit_kitchenette, unit_campfires, unit_picnic_table,
  unit_wood_burning_stove, unit_water,
  land_operator_category, glamping_service_tier, glamping_service_tier_source,
  setting_forest, setting_lake, property_waterfront, activities_paddling, activities_hiking,
  rate_basis, unit_description, description, notes
)
SELECT
  'Yes', v.is_glamping, 'Sage', g.property_name, v.site_name,
  'huttopia_americas_web_research_2026_09_30', '2026-09-30', '2026-09-30',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, 'Canada', g.slug, g.property_type, g.url,
  g.phone_number, g.brand_id, g.property_id,
  NULL, v.unit_type, v.capacity, v.sq_ft,
  'No', 'No', v.electricity, 'Yes',
  'No', 'No', 'Yes', 'Yes',
  v.wood_stove, v.water,
  'private_commercial', 'midscale', 'manual',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'room_only', v.unit_desc,
  'Sibling unit type — Huttopia Les Deux Lacs – Laurentides.',
  v.note
FROM public.all_sage_data g
CROSS JOIN (
  VALUES
    ('CANADIENNE CANOE-CAMPING', 'Yes', 'Safari Tent', '5', 350::numeric, 'Yes', 'Yes', NULL,
      $$Lakefront Canadienne reached by canoe. About 350 sq ft, up to 5 guests. Two bedrooms with mattresses/pillows/blankets, shared living area with wood stove, portable battery, cooler, private fire pit with grill, private canoe. Linens, towels, dishes, and cooking utensils are not provided.$$,
      $$New row 2026-09-30 from Les Deux Lacs accommodations page.$$),
    ('CAMPSITE W/ ELECTRICITY', 'No', 'Campsite', '6', 170, 'Yes', 'No', 'No',
      $$Electric pitch for tents or RVs, about 170 sq ft, up to 6 guests. Private picnic table and fire pit; shared dry toilet on site. Pitches are about 2 km from Huttopia reception; washrooms with showers and potable water are at the Huttopia site and Parc Éco-Laurentides pavilion. Non-potable running water at the pitch.$$,
      $$New row 2026-09-30. Not glamping; raw pitch category on the Les Deux Lacs page.$$)
) AS v(site_name, is_glamping, unit_type, capacity, sq_ft, electricity, wood_stove, water, unit_desc, note)
WHERE g.id = 10860
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = g.property_id AND x.site_name = v.site_name
  );

-- White Mountains: Bonaventure is on the live page but missing from DB.
INSERT INTO public.all_sage_data (
  is_open, is_glamping_property, source, property_name, site_name,
  discovery_source, date_added, date_updated,
  address, city, state, zip_code, lat, lon, country, slug, property_type, url,
  phone_number, brand_id, property_id,
  quantity_of_units, unit_type, unit_capacity, unit_sq_ft,
  unit_private_bathroom, unit_shower, unit_electricity, unit_pets,
  unit_kitchenette, unit_mini_fridge, unit_campfires, unit_picnic_table,
  land_operator_category, glamping_service_tier, glamping_service_tier_source,
  setting_forest, setting_mountainous, setting_lake,
  rate_basis, unit_description, description, notes
)
SELECT
  'Yes', 'Yes', 'Sage', g.property_name, 'THE BONAVENTURE',
  'huttopia_americas_web_research_2026_09_30', '2026-09-30', '2026-09-30',
  g.address, g.city, g.state, g.zip_code, g.lat, g.lon, 'United States', g.slug, g.property_type,
  'https://americas.huttopia.com/en/site/white-mountains/',
  g.phone_number, g.brand_id, g.property_id,
  NULL, 'Safari Tent', '2', 225,
  'No', 'No', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes',
  'private_commercial', 'midscale', 'manual',
  'Yes', 'Yes', 'Yes',
  'room_only',
  $$Up to 2 guests, about 225 sq ft. One bed, mini-fridge, lights, kitchen equipment, shared bathroom, BBQ, picnic table, fire pit.$$,
  'Sibling unit type — Huttopia White Mountains.',
  $$New row 2026-09-30 from White Mountains accommodations page. Rates/quantity not on the marketing page.$$
FROM public.all_sage_data g
WHERE g.property_id = '0e7a4d64-eb2e-45c9-aa22-fa4d6f3741cb'
  AND g.id = (
    SELECT min(id) FROM public.all_sage_data
    WHERE property_id = '0e7a4d64-eb2e-45c9-aa22-fa4d6f3741cb'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.all_sage_data x
    WHERE x.property_id = g.property_id AND x.site_name = 'THE BONAVENTURE'
  );

COMMIT;
