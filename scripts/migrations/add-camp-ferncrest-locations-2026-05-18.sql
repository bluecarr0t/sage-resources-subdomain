-- Camp Ferncrest multi-location brand (May 2026).
-- Renames existing Chambers Creek rows; adds Promised Land (PA), Flint Creek (OK), Acadia (ME).
-- Source: campferncrest.com location pages (JSON-LD LodgingBusiness, May 2026).

-- ── Rename existing Chambers Creek rows ─────────────────────────────────────
UPDATE public.all_glamping_properties
SET
  property_name = 'Camp Ferncrest - Chambers Creek',
  url = 'https://campferncrest.com/locations/chambers-creek',
  address = '6305 FM 916',
  zip_code = '76050',
  phone_number = '+1-682-907-1002',
  number_of_locations = 4,
  date_updated = '2026-05-18',
  description = $$Set on the Blackland Prairie south of Fort Worth, Camp Ferncrest Chambers Creek sits under a canopy of mature trees with shady ravines. Network glamping domes with climate control, fire pits, sauna/cold plunge, hot tub, and modern bathhouse amenities per operator site. Verify opening status and inventory on campferncrest.com.$$
WHERE id IN (9540, 11815);

-- Align Chambers Creek in-progress row coords with location page
UPDATE public.all_glamping_properties
SET lat = 32.27, lon = -97.18
WHERE id = 11815;

-- ── New locations ───────────────────────────────────────────────────────────
INSERT INTO public.all_glamping_properties (
  research_status,
  is_glamping_property,
  is_open,
  property_name,
  site_name,
  slug,
  property_type,
  unit_type,
  source,
  discovery_source,
  country,
  state,
  city,
  address,
  zip_code,
  lat,
  lon,
  url,
  phone_number,
  description,
  notes,
  date_added,
  date_updated,
  number_of_locations,
  land_operator_category
) VALUES
(
  'in_progress',
  'Yes',
  'Yes',
  'Camp Ferncrest - Promised Land',
  NULL,
  'camp-ferncrest-promised-land-greentown-pa',
  'Glamping Resort',
  'Geodesic Dome',
  'Sage',
  'camp_ferncrest_brand_2026_05',
  'United States',
  'PA',
  'Greentown',
  '16 Edgar Lane',
  '18426',
  41.34,
  -75.26,
  'https://campferncrest.com/locations/promised-land',
  '+1-610-472-9467',
  $$Camp Ferncrest Promised Land in the Poconos (Greentown, PA): geodesic dome glamping with heat/A/C, fire pits, hot tub, sauna, cold plunge, camp store, and game room per operator site. Distinct from Timberline Glamping at Promised Land State Park (separate operator/URL).$$,
  $$Source: campferncrest.com/locations/promised-land JSON-LD (May 2026). Brand: Ferncrest / Camp Ferncrest (Brian & Joanna Linton).$$,
  '2026-05-18',
  '2026-05-18',
  4,
  'private_commercial'
),
(
  'in_progress',
  'Yes',
  'Yes',
  'Camp Ferncrest - Flint Creek',
  NULL,
  'camp-ferncrest-flint-creek-colcord-ok',
  'Glamping Resort',
  'Geodesic Dome',
  'Sage',
  'camp_ferncrest_brand_2026_05',
  'United States',
  'OK',
  'Colcord',
  '57025 County Rd 660',
  '74338',
  36.26,
  -94.69,
  'https://campferncrest.com/locations/flint-creek',
  '+1-580-232-2665',
  $$Camp Ferncrest Flint Creek in northeast Oklahoma (Colcord): creekside geodesic dome glamping with heat/A/C, fire pit, camp store, mini fridge, microwave, private picnic area, and creekside beach access per operator site.$$,
  $$Source: campferncrest.com/locations/flint-creek JSON-LD (May 2026).$$,
  '2026-05-18',
  '2026-05-18',
  4,
  'private_commercial'
),
(
  'in_progress',
  'Yes',
  'Yes',
  'Camp Ferncrest - Acadia',
  NULL,
  'camp-ferncrest-acadia-sargentville-me',
  'Glamping Resort',
  'Geodesic Dome',
  'Sage',
  'camp_ferncrest_brand_2026_05',
  'United States',
  'ME',
  'Sargentville',
  '232 Caterpillar Hill Rd',
  '04673',
  44.36,
  -68.71,
  'https://campferncrest.com/locations/acadia',
  '+1-207-367-4441',
  $$Camp Ferncrest Acadia on the Maine coast (Sargentville, near Acadia NP): geodesic dome glamping with heat/A/C, private bath access, fire pit, modern bathhouse, mini fridge, microwave, and private picnic area per operator site.$$,
  $$Source: campferncrest.com/locations/acadia JSON-LD (May 2026). City listed as Sargentville on operator site; region marketed as Acadia.$$,
  '2026-05-18',
  '2026-05-18',
  4,
  'private_commercial'
);
