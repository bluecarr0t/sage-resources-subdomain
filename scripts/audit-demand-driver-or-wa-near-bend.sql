-- Audit demand-driver reference coverage near Bend, OR (44.0582°N, 121.3153°W).
-- Run in Supabase SQL Editor; adjust anchor or radii as needed.

WITH anchor AS (
  SELECT 44.0582::double precision AS lat, -121.3153::double precision AS lon
),
radii AS (
  SELECT 100::double precision AS r_ski_mi, 50::double precision AS r_winery_mi, 200::double precision AS r_park_mi
)
-- Ski resorts in OR/WA with coordinates (text lat/lon must parse as numeric)
SELECT 'ski_or_wa' AS layer, country, state_province, name, lat, lon
FROM ski_resorts
WHERE country IN ('US', 'USA')
  AND state_province IN (
    'OR', 'Oregon', 'WA', 'Washington'
  )
  AND lat IS NOT NULL AND lon IS NOT NULL
ORDER BY state_province, name
LIMIT 200;

-- Wineries in OR/WA with coordinates
SELECT 'winery_or_wa' AS layer, country, state_province, name, lat, lon
FROM wineries
WHERE country IN ('US', 'USA')
  AND state_province IN ('OR', 'Oregon', 'WA', 'Washington')
  AND lat IS NOT NULL AND lon IS NOT NULL
ORDER BY state_province, name
LIMIT 200;

-- Outdoor recreation seed / table presence
SELECT 'outdoor_sites' AS layer, name, site_type, state, latitude, longitude
FROM outdoor_recreation_sites
ORDER BY name;
