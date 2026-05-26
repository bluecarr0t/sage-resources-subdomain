-- Glamping.com North America gap fill (May 2026): 3 sitemap listings not matched after primary pass.
-- Eco Itaka Glamping, Joy Tulum, Baja Camp (La Paz). Safe to re-run.

INSERT INTO public.all_glamping_properties (
  research_status,
  is_glamping_property,
  is_open,
  property_name,
  slug,
  property_type,
  unit_type,
  source,
  discovery_source,
  country,
  state,
  city,
  url,
  description,
  notes,
  date_added,
  date_updated,
  land_operator_category
)
SELECT
  v.research_status,
  v.is_glamping_property,
  v.is_open,
  v.property_name,
  v.slug,
  v.property_type,
  v.unit_type,
  v.source,
  v.discovery_source,
  v.country,
  v.state,
  v.city,
  v.url,
  v.description,
  v.notes,
  v.date_added,
  v.date_updated,
  v.land_operator_category
FROM (
  VALUES
  (
    'published', 'Yes', 'Yes',
    'Eco Itaka Glamping',
    'eco-itaka-glamping-playa-del-carmen-qroo',
    'Glamping Resort', 'Tent',
    'Sage', 'glamping_com_north_america_2026_05',
    'Mexico', 'Quintana Roo', 'Playa del Carmen',
    'https://www.glamping.com/destination/north-america/quintana-roo/playa-del-carmen/eco-itaka-glamping/',
    $$Eco Itaka Glamping — jungle glamping near Playa del Carmen, Quintana Roo, listed in the Glamping.com North America collection.$$,
    $$Sources: Glamping.com North America directory audit (May 2026). Listing: https://www.glamping.com/destination/north-america/quintana-roo/playa-del-carmen/eco-itaka-glamping/$$,
    '2026-05-26', '2026-05-26', 'private_commercial'
  ),
  (
    'published', 'Yes', 'Yes',
    'Joy Tulum',
    'joy-tulum-tulum-qroo',
    'Glamping Resort', 'Tent',
    'Sage', 'glamping_com_north_america_2026_05',
    'Mexico', 'Quintana Roo', 'Tulum',
    'https://www.glamping.com/destination/north-america/quintana-roo/tulum/joy-tulum/',
    $$Joy Tulum — boutique tented glamping in the Tulum, Quintana Roo area, listed in the Glamping.com North America collection. Distinct from Nomade Tulum (separate operator).$$,
    $$Sources: Glamping.com North America directory audit (May 2026). Listing: https://www.glamping.com/destination/north-america/quintana-roo/tulum/joy-tulum/$$,
    '2026-05-26', '2026-05-26', 'private_commercial'
  ),
  (
    'published', 'Yes', 'Yes',
    'Baja Camp',
    'baja-camp-la-paz-bcs',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'glamping_com_north_america_2026_05',
    'Mexico', 'Baja California Sur', 'La Paz',
    'https://www.glamping.com/destination/north-america/baja-california/la-paz/baja-camp/',
    $$Baja Camp — beachfront safari-tent glamping on the Sea of Cortez near La Paz, Baja California Sur. Listed separately from Baja Airstream Experience on Glamping.com.$$,
    $$Sources: Glamping.com North America directory audit (May 2026). Listing: https://www.glamping.com/destination/north-america/baja-california/la-paz/baja-camp/ . Related operator: Baja Airstream Experience (same market; verify if same entity).$$,
    '2026-05-26', '2026-05-26', 'private_commercial'
  )
) AS v(
  research_status, is_glamping_property, is_open, property_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city, url, description, notes,
  date_added, date_updated, land_operator_category
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.all_glamping_properties p
  WHERE lower(trim(p.property_name)) = lower(trim(v.property_name))
     OR lower(trim(p.slug)) = lower(trim(v.slug))
);
