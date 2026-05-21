-- Remap rows where property_type holds a glamping unit label → canonical 'Glamping'.
-- Keeps unit_type unchanged. Does not remap legacy resort strings (Glamping Resort, etc.).

UPDATE public.all_glamping_properties
SET
  property_type = 'Glamping',
  date_updated = '2026-05-21'
WHERE TRIM(COALESCE(property_type, '')) <> ''
  AND TRIM(property_type) NOT IN (
    'Glamping',
    'Outdoor Boutique Hotel',
    'Landscape Hotel',
    'Marina',
    'Campground',
    'RV Resort',
    'Unknown'
  )
  AND (
    TRIM(property_type) = TRIM(COALESCE(unit_type, ''))
    OR TRIM(property_type) = TRIM(SPLIT_PART(COALESCE(unit_type, ''), ',', 1))
    OR TRIM(property_type) IN (
      'A-Frame',
      'Airstream',
      'Beach Cabin',
      'Beach House',
      'Beach Lodge',
      'Bell Tent',
      'Bothy',
      'Bubble Tent',
      'Bungalow',
      'Cabin',
      'Cabin (Wood or Log)',
      'Canvas Cottage',
      'Canvas Tent',
      'Cave House',
      'Cave Room',
      'Chalet',
      'Cottage',
      'Covered Wagon',
      'Cube Cabin',
      'Dome',
      'Eco Cabin',
      'Eco Cottage',
      'Eco-house',
      'Eco-pod',
      'Eco-suite',
      'Floating Tent',
      'Glamping Pod',
      'Glamping Tent',
      'Hut',
      'Igloo',
      'Lodge',
      'Lodge Tent',
      'Luxury Room',
      'Luxury Tent',
      'Mixed Glamping',
      'Mobile Home',
      'Modern Tiny Home Cabin',
      'Open-air Room',
      'Pod',
      'Roulotte',
      'RV Site',
      'Safari Tent',
      'Safari Tent (Poles)',
      'Safari Tent (Timber Framed)',
      'Teepee',
      'Tent',
      'Tent Site',
      'Tipi',
      'Tiny Home',
      'Tiny House',
      'Tree Tent',
      'Treehouse',
      'Villa',
      'Wagonette',
      'Wall Tent',
      'Yurt',
      'Shepherd''s Hut'
    )
    OR TRIM(property_type) ~* '^Safari Tent(\s|\(|$)'
    OR TRIM(property_type) ~* '^Cabin\s*\('
  );
