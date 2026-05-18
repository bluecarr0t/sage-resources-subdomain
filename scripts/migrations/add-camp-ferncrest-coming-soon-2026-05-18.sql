-- Camp Ferncrest "Coming Soon" locations (May 2026).
-- Ocoee TN, Elkhorn River NE, Bryson City NC — is_open = Under Construction.
-- Source: campferncrest.com/locations (Coming Soon section, May 2026).

-- Rename existing Elkhorn River / Tallgrass network rows to Camp Ferncrest brand
UPDATE public.all_glamping_properties
SET
  property_name = 'Camp Ferncrest - Elkhorn River',
  is_open = 'Under Construction',
  number_of_locations = 7,
  date_updated = '2026-05-18',
  notes = COALESCE(notes, '') || E'\n\nRenamed to Camp Ferncrest - Elkhorn River (coming soon on campferncrest.com/locations, May 2026). Pre-launch site: tallgrassretreat.com.'
WHERE id IN (11849, 11856, 11857);

-- New coming-soon locations (no dedicated campferncrest.com location pages yet)
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
  lat,
  lon,
  url,
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
  'Under Construction',
  'Camp Ferncrest - Ocoee',
  NULL,
  'camp-ferncrest-ocoee-tn',
  'Glamping Resort',
  'Geodesic Dome',
  'Sage',
  'camp_ferncrest_brand_2026_05',
  'United States',
  'TN',
  'Ocoee',
  35.23,
  -84.72,
  'https://campferncrest.com/locations',
  $$Camp Ferncrest Ocoee — Ferncrest-network glamping dome property coming soon in the Ocoee, Tennessee area (listed under Coming Soon on campferncrest.com). Verify address and opening timeline with operator.$$,
  $$Source: campferncrest.com/locations Coming Soon (May 2026). Insider signup: founders.findingpromisedland.com/ocoee-free-signup-1. Coordinates are city-center approximate.$$,
  '2026-05-18',
  '2026-05-18',
  7,
  'private_commercial'
),
(
  'in_progress',
  'Yes',
  'Under Construction',
  'Camp Ferncrest - Bryson City',
  NULL,
  'camp-ferncrest-bryson-city-nc',
  'Glamping Resort',
  'Geodesic Dome',
  'Sage',
  'camp_ferncrest_brand_2026_05',
  'United States',
  'NC',
  'Bryson City',
  35.43,
  -83.44,
  'https://campferncrest.com/locations',
  $$Camp Ferncrest Bryson City — Ferncrest-network glamping dome property coming soon near Bryson City, North Carolina / Great Smoky Mountains gateway (listed under Coming Soon on campferncrest.com). Verify address and opening timeline with operator.$$,
  $$Source: campferncrest.com/locations Coming Soon (May 2026). Insider signup: founders.findingpromisedland.com/bryson-city-insider. Coordinates are city-center approximate.$$,
  '2026-05-18',
  '2026-05-18',
  7,
  'private_commercial'
);

-- Align location count on all Camp Ferncrest rows
UPDATE public.all_glamping_properties
SET number_of_locations = 7, date_updated = '2026-05-18'
WHERE property_name ILIKE 'Camp Ferncrest%';
