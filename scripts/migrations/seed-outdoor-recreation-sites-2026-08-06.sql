-- Expand outdoor_recreation_sites seed for Demand Indicators coverage.
-- Idempotent via (source, source_id) unique constraint.

INSERT INTO outdoor_recreation_sites (name, site_type, state, latitude, longitude, annual_visitors, source, source_id)
VALUES
  ('Smith Rock State Park', 'state_park', 'OR', 44.3679, -121.1406, NULL, 'manual_seed', 'smith-rock-or'),
  ('Silver Falls State Park', 'state_park', 'OR', 44.8773, -122.6556, NULL, 'manual_seed', 'silver-falls-or'),
  ('Cape Lookout State Park', 'state_park', 'OR', 45.3536, -123.9720, NULL, 'manual_seed', 'cape-lookout-or'),
  ('Garden of the Gods', 'outdoor_hub', 'CO', 38.8739, -104.8917, NULL, 'manual_seed', 'garden-gods-co'),
  ('Red Rocks Park', 'outdoor_hub', 'CO', 39.6654, -105.2057, NULL, 'manual_seed', 'red-rocks-co'),
  ('Roxborough State Park', 'state_park', 'CO', 39.4294, -105.0686, NULL, 'manual_seed', 'roxborough-co'),
  ('Hanging Lake', 'outdoor_hub', 'CO', 39.6014, -107.1919, NULL, 'manual_seed', 'hanging-lake-co'),
  ('Devil''s Lake State Park', 'state_park', 'WI', 43.4147, -89.7134, NULL, 'manual_seed', 'devils-lake-wi'),
  ('Peninsula State Park', 'state_park', 'WI', 45.1486, -87.2214, NULL, 'manual_seed', 'peninsula-wi'),
  ('Interstate State Park', 'state_park', 'MN', 45.3947, -92.6696, NULL, 'manual_seed', 'interstate-mn'),
  ('Itasca State Park', 'state_park', 'MN', 47.2397, -95.2061, NULL, 'manual_seed', 'itasca-mn'),
  ('Franconia Notch State Park', 'state_park', 'NH', 44.1470, -71.6795, NULL, 'manual_seed', 'franconia-nh'),
  ('Baxter State Park', 'state_park', 'ME', 45.9042, -68.9995, NULL, 'manual_seed', 'baxter-me'),
  ('Dead Horse Point State Park', 'state_park', 'UT', 38.4828, -109.7394, NULL, 'manual_seed', 'dead-horse-ut'),
  ('Antelope Island State Park', 'state_park', 'UT', 41.0394, -112.2411, NULL, 'manual_seed', 'antelope-island-ut'),
  ('Custer State Park', 'state_park', 'SD', 43.7667, -103.4333, NULL, 'manual_seed', 'custer-sd'),
  ('Palo Duro Canyon State Park', 'state_park', 'TX', 34.9847, -101.6667, NULL, 'manual_seed', 'palo-duro-tx'),
  ('Enchanted Rock State Natural Area', 'state_park', 'TX', 30.5066, -98.8189, NULL, 'manual_seed', 'enchanted-rock-tx'),
  ('Pfeiffer Big Sur State Park', 'state_park', 'CA', 36.2503, -121.7828, NULL, 'manual_seed', 'pfeiffer-big-sur-ca'),
  ('Anza-Borrego Desert State Park', 'state_park', 'CA', 33.2580, -116.3750, NULL, 'manual_seed', 'anza-borrego-ca'),
  ('Humboldt Redwoods State Park', 'state_park', 'CA', 40.3122, -123.9061, NULL, 'manual_seed', 'humboldt-redwoods-ca'),
  ('Letchworth State Park', 'state_park', 'NY', 42.5706, -78.0497, NULL, 'manual_seed', 'letchworth-ny'),
  ('Watkins Glen State Park', 'state_park', 'NY', 42.3742, -76.8717, NULL, 'manual_seed', 'watkins-glen-ny'),
  ('Assateague State Park', 'state_park', 'MD', 38.2167, -75.1528, NULL, 'manual_seed', 'assateague-md'),
  ('Table Rock State Park', 'state_park', 'SC', 35.0317, -82.7017, NULL, 'manual_seed', 'table-rock-sc'),
  ('Fall Creek Falls State Park', 'state_park', 'TN', 35.6561, -85.3569, NULL, 'manual_seed', 'fall-creek-falls-tn'),
  ('Petit Jean State Park', 'state_park', 'AR', 35.1181, -92.9322, NULL, 'manual_seed', 'petit-jean-ar'),
  ('Starved Rock State Park', 'state_park', 'IL', 41.3211, -88.9917, NULL, 'manual_seed', 'starved-rock-il'),
  ('Hocking Hills State Park', 'state_park', 'OH', 39.4306, -82.5417, NULL, 'manual_seed', 'hocking-hills-oh'),
  ('Mohican State Park', 'state_park', 'OH', 40.6111, -82.3167, NULL, 'manual_seed', 'mohican-oh')
ON CONFLICT (source, source_id) DO UPDATE SET
  name = EXCLUDED.name,
  site_type = EXCLUDED.site_type,
  state = EXCLUDED.state,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  annual_visitors = COALESCE(EXCLUDED.annual_visitors, outdoor_recreation_sites.annual_visitors),
  updated_at = NOW();
