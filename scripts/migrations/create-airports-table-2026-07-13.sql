-- Major / large commercial airports for glamping market overview
-- Transportation Analysis (distance → rate impact).
-- US traffic: FAA CY2023 passenger enplanements (primary commercial service).
-- Canada traffic: approximate CY2023 passenger enplanements from published airport reports.

CREATE TABLE IF NOT EXISTS airports (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  iata_code TEXT NOT NULL,
  icao_code TEXT,
  city TEXT,
  state_province TEXT,
  country TEXT NOT NULL DEFAULT 'USA',
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  -- FAA hub size for US; Canada hubs tagged large/medium by traffic band.
  hub_size TEXT NOT NULL CHECK (hub_size IN ('large', 'medium', 'small')),
  -- Average / reference-year annual passenger boardings (enplanements).
  avg_annual_passengers BIGINT,
  traffic_year INTEGER,
  traffic_metric TEXT NOT NULL DEFAULT 'enplanements',
  data_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT airports_iata_code_unique UNIQUE (iata_code)
);

CREATE INDEX IF NOT EXISTS idx_airports_coordinates
  ON airports (latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_airports_hub_size
  ON airports (hub_size);

CREATE INDEX IF NOT EXISTS idx_airports_country
  ON airports (country);

ALTER TABLE airports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on airports" ON airports;
CREATE POLICY "Allow public read access on airports"
  ON airports
  FOR SELECT
  USING (true);

COMMENT ON TABLE airports IS
  'Major commercial airports (US FAA hubs + select Canadian gateways) with coordinates and annual passenger traffic for proximity / rate analysis.';
COMMENT ON COLUMN airports.avg_annual_passengers IS
  'Reference-year passenger boardings (enplanements). US figures from FAA CY commercial-service enplanements.';
COMMENT ON COLUMN airports.hub_size IS
  'large | medium | small — FAA hub category for US; analogous band for Canada.';

INSERT INTO airports (
  name, iata_code, icao_code, city, state_province, country,
  latitude, longitude, hub_size, avg_annual_passengers, traffic_year, traffic_metric, data_source
) VALUES
  -- FAA Large hubs (CY2023 enplanements)
  ('Hartsfield-Jackson Atlanta International Airport', 'ATL', 'KATL', 'Atlanta', 'GA', 'USA', 33.6407, -84.4277, 'large', 50950068, 2023, 'enplanements', 'FAA CY2023'),
  ('Los Angeles International Airport', 'LAX', 'KLAX', 'Los Angeles', 'CA', 'USA', 33.9425, -118.4081, 'large', 40956673, 2023, 'enplanements', 'FAA CY2023'),
  ('Dallas/Fort Worth International Airport', 'DFW', 'KDFW', 'Dallas-Fort Worth', 'TX', 'USA', 32.8998, -97.0403, 'large', 39246212, 2023, 'enplanements', 'FAA CY2023'),
  ('Denver International Airport', 'DEN', 'KDEN', 'Denver', 'CO', 'USA', 39.8561, -104.6737, 'large', 37863967, 2023, 'enplanements', 'FAA CY2023'),
  ('Chicago O''Hare International Airport', 'ORD', 'KORD', 'Chicago', 'IL', 'USA', 41.9742, -87.9073, 'large', 35843104, 2023, 'enplanements', 'FAA CY2023'),
  ('John F. Kennedy International Airport', 'JFK', 'KJFK', 'New York', 'NY', 'USA', 40.6413, -73.7781, 'large', 30804355, 2023, 'enplanements', 'FAA CY2023'),
  ('Orlando International Airport', 'MCO', 'KMCO', 'Orlando', 'FL', 'USA', 28.4312, -81.3081, 'large', 28033205, 2023, 'enplanements', 'FAA CY2023'),
  ('Harry Reid International Airport', 'LAS', 'KLAS', 'Las Vegas', 'NV', 'USA', 36.0840, -115.1537, 'large', 27896199, 2023, 'enplanements', 'FAA CY2023'),
  ('Charlotte Douglas International Airport', 'CLT', 'KCLT', 'Charlotte', 'NC', 'USA', 35.2144, -80.9473, 'large', 25896224, 2023, 'enplanements', 'FAA CY2023'),
  ('Miami International Airport', 'MIA', 'KMIA', 'Miami', 'FL', 'USA', 25.7959, -80.2870, 'large', 24717048, 2023, 'enplanements', 'FAA CY2023'),
  ('Seattle-Tacoma International Airport', 'SEA', 'KSEA', 'Seattle', 'WA', 'USA', 47.4502, -122.3088, 'large', 24594210, 2023, 'enplanements', 'FAA CY2023'),
  ('Newark Liberty International Airport', 'EWR', 'KEWR', 'Newark', 'NJ', 'USA', 40.6895, -74.1745, 'large', 24575320, 2023, 'enplanements', 'FAA CY2023'),
  ('San Francisco International Airport', 'SFO', 'KSFO', 'San Francisco', 'CA', 'USA', 37.6213, -122.3790, 'large', 24191159, 2023, 'enplanements', 'FAA CY2023'),
  ('Phoenix Sky Harbor International Airport', 'PHX', 'KPHX', 'Phoenix', 'AZ', 'USA', 33.4373, -112.0078, 'large', 23880504, 2023, 'enplanements', 'FAA CY2023'),
  ('George Bush Intercontinental Airport', 'IAH', 'KIAH', 'Houston', 'TX', 'USA', 29.9902, -95.3368, 'large', 22228844, 2023, 'enplanements', 'FAA CY2023'),
  ('Boston Logan International Airport', 'BOS', 'KBOS', 'Boston', 'MA', 'USA', 42.3656, -71.0096, 'large', 19962678, 2023, 'enplanements', 'FAA CY2023'),
  ('Fort Lauderdale-Hollywood International Airport', 'FLL', 'KFLL', 'Fort Lauderdale', 'FL', 'USA', 26.0726, -80.1527, 'large', 17063063, 2023, 'enplanements', 'FAA CY2023'),
  ('Minneapolis-Saint Paul International Airport', 'MSP', 'KMSP', 'Minneapolis', 'MN', 'USA', 44.8848, -93.2223, 'large', 17019128, 2023, 'enplanements', 'FAA CY2023'),
  ('LaGuardia Airport', 'LGA', 'KLGA', 'New York', 'NY', 'USA', 40.7769, -73.8740, 'large', 16173073, 2023, 'enplanements', 'FAA CY2023'),
  ('Detroit Metropolitan Wayne County Airport', 'DTW', 'KDTW', 'Detroit', 'MI', 'USA', 42.2162, -83.3554, 'large', 15378601, 2023, 'enplanements', 'FAA CY2023'),
  ('Philadelphia International Airport', 'PHL', 'KPHL', 'Philadelphia', 'PA', 'USA', 39.8744, -75.2424, 'large', 13658669, 2023, 'enplanements', 'FAA CY2023'),
  ('Salt Lake City International Airport', 'SLC', 'KSLC', 'Salt Lake City', 'UT', 'USA', 40.7899, -111.9791, 'large', 12905368, 2023, 'enplanements', 'FAA CY2023'),
  ('Baltimore/Washington International Thurgood Marshall Airport', 'BWI', 'KBWI', 'Baltimore', 'MD', 'USA', 39.1774, -76.6684, 'large', 12849721, 2023, 'enplanements', 'FAA CY2023'),
  ('Ronald Reagan Washington National Airport', 'DCA', 'KDCA', 'Arlington', 'VA', 'USA', 38.8512, -77.0402, 'large', 12365030, 2023, 'enplanements', 'FAA CY2023'),
  ('San Diego International Airport', 'SAN', 'KSAN', 'San Diego', 'CA', 'USA', 32.7338, -117.1933, 'large', 12190183, 2023, 'enplanements', 'FAA CY2023'),
  ('Washington Dulles International Airport', 'IAD', 'KIAD', 'Dulles', 'VA', 'USA', 38.9531, -77.4565, 'large', 12073571, 2023, 'enplanements', 'FAA CY2023'),
  ('Tampa International Airport', 'TPA', 'KTPA', 'Tampa', 'FL', 'USA', 27.9755, -82.5332, 'large', 11677632, 2023, 'enplanements', 'FAA CY2023'),
  ('Nashville International Airport', 'BNA', 'KBNA', 'Nashville', 'TN', 'USA', 36.1263, -86.6774, 'large', 11227243, 2023, 'enplanements', 'FAA CY2023'),
  ('Austin-Bergstrom International Airport', 'AUS', 'KAUS', 'Austin', 'TX', 'USA', 30.1975, -97.6664, 'large', 10833443, 2023, 'enplanements', 'FAA CY2023'),
  ('Chicago Midway International Airport', 'MDW', 'KMDW', 'Chicago', 'IL', 'USA', 41.7868, -87.7522, 'large', 10659520, 2023, 'enplanements', 'FAA CY2023'),
  ('Daniel K. Inouye International Airport', 'HNL', 'PHNL', 'Honolulu', 'HI', 'USA', 21.3187, -157.9225, 'large', 10149761, 2023, 'enplanements', 'FAA CY2023'),

  -- FAA Medium hubs used in ARDR / regional coverage
  ('Dallas Love Field', 'DAL', 'KDAL', 'Dallas', 'TX', 'USA', 32.8471, -96.8518, 'medium', 8559052, 2023, 'enplanements', 'FAA CY2023'),
  ('Portland International Airport', 'PDX', 'KPDX', 'Portland', 'OR', 'USA', 45.5898, -122.5951, 'medium', 8123054, 2023, 'enplanements', 'FAA CY2023'),
  ('St. Louis Lambert International Airport', 'STL', 'KSTL', 'St. Louis', 'MO', 'USA', 38.7487, -90.3700, 'medium', 7307561, 2023, 'enplanements', 'FAA CY2023'),
  ('Raleigh-Durham International Airport', 'RDU', 'KRDU', 'Raleigh', 'NC', 'USA', 35.8801, -78.7880, 'medium', 7119040, 2023, 'enplanements', 'FAA CY2023'),
  ('William P. Hobby Airport', 'HOU', 'KHOU', 'Houston', 'TX', 'USA', 29.6454, -95.2789, 'medium', 6800320, 2023, 'enplanements', 'FAA CY2023'),
  ('Sacramento International Airport', 'SMF', 'KSMF', 'Sacramento', 'CA', 'USA', 38.6954, -121.5908, 'medium', 6371910, 2023, 'enplanements', 'FAA CY2023'),
  ('Louis Armstrong New Orleans International Airport', 'MSY', 'KMSY', 'New Orleans', 'LA', 'USA', 29.9934, -90.2580, 'medium', 6309212, 2023, 'enplanements', 'FAA CY2023'),
  ('Norman Y. Mineta San José International Airport', 'SJC', 'KSJC', 'San Jose', 'CA', 'USA', 37.3639, -121.9289, 'medium', 5958855, 2023, 'enplanements', 'FAA CY2023'),
  ('Kansas City International Airport', 'MCI', 'KMCI', 'Kansas City', 'MO', 'USA', 39.2976, -94.7139, 'medium', 5654068, 2023, 'enplanements', 'FAA CY2023'),
  ('San Antonio International Airport', 'SAT', 'KSAT', 'San Antonio', 'TX', 'USA', 29.5337, -98.4698, 'medium', 5336684, 2023, 'enplanements', 'FAA CY2023'),
  ('John Wayne Airport', 'SNA', 'KSNA', 'Santa Ana', 'CA', 'USA', 33.6757, -117.8682, 'medium', 5706332, 2023, 'enplanements', 'FAA CY2023'),
  ('Oakland San Francisco Bay Airport', 'OAK', 'KOAK', 'Oakland', 'CA', 'USA', 37.7126, -122.2197, 'medium', 5520812, 2023, 'enplanements', 'FAA CY2023'),
  ('Indianapolis International Airport', 'IND', 'KIND', 'Indianapolis', 'IN', 'USA', 39.7173, -86.2944, 'medium', 4788376, 2023, 'enplanements', 'FAA CY2023'),
  ('Cleveland Hopkins International Airport', 'CLE', 'KCLE', 'Cleveland', 'OH', 'USA', 41.4117, -81.8498, 'medium', 4803822, 2023, 'enplanements', 'FAA CY2023'),
  ('Pittsburgh International Airport', 'PIT', 'KPIT', 'Pittsburgh', 'PA', 'USA', 40.4915, -80.2329, 'medium', 4493052, 2023, 'enplanements', 'FAA CY2023'),
  ('Cincinnati/Northern Kentucky International Airport', 'CVG', 'KCVG', 'Hebron', 'KY', 'USA', 39.0488, -84.6678, 'medium', 4287722, 2023, 'enplanements', 'FAA CY2023'),
  ('John Glenn Columbus International Airport', 'CMH', 'KCMH', 'Columbus', 'OH', 'USA', 39.9980, -82.8919, 'medium', 4095189, 2023, 'enplanements', 'FAA CY2023'),
  ('Albuquerque International Sunport', 'ABQ', 'KABQ', 'Albuquerque', 'NM', 'USA', 35.0402, -106.6090, 'medium', 2605163, 2023, 'enplanements', 'FAA CY2023'),
  ('Ted Stevens Anchorage International Airport', 'ANC', 'PANC', 'Anchorage', 'AK', 'USA', 61.1743, -149.9983, 'medium', 2681818, 2023, 'enplanements', 'FAA CY2023'),
  ('Boise Airport', 'BOI', 'KBOI', 'Boise', 'ID', 'USA', 43.5644, -116.2228, 'medium', 2369164, 2023, 'enplanements', 'FAA CY2023'),

  -- Major Canadian gateways (approx. CY2023 enplanements)
  ('Toronto Pearson International Airport', 'YYZ', 'CYYZ', 'Mississauga', 'ON', 'Canada', 43.6777, -79.6248, 'large', 22400000, 2023, 'enplanements', 'Airport authority / StatsCan approx'),
  ('Vancouver International Airport', 'YVR', 'CYVR', 'Richmond', 'BC', 'Canada', 49.1967, -123.1815, 'large', 13200000, 2023, 'enplanements', 'Airport authority / StatsCan approx'),
  ('Montréal-Pierre Elliott Trudeau International Airport', 'YUL', 'CYUL', 'Dorval', 'QC', 'Canada', 45.4706, -73.7408, 'large', 10500000, 2023, 'enplanements', 'Airport authority / StatsCan approx'),
  ('Calgary International Airport', 'YYC', 'CYYC', 'Calgary', 'AB', 'Canada', 51.1215, -114.0076, 'large', 9000000, 2023, 'enplanements', 'Airport authority / StatsCan approx'),
  ('Edmonton International Airport', 'YEG', 'CYEG', 'Leduc County', 'AB', 'Canada', 53.3097, -113.5796, 'medium', 4000000, 2023, 'enplanements', 'Airport authority / StatsCan approx'),
  ('Ottawa Macdonald-Cartier International Airport', 'YOW', 'CYOW', 'Ottawa', 'ON', 'Canada', 45.3225, -75.6692, 'medium', 2100000, 2023, 'enplanements', 'Airport authority / StatsCan approx')
ON CONFLICT (iata_code) DO UPDATE SET
  name = EXCLUDED.name,
  icao_code = EXCLUDED.icao_code,
  city = EXCLUDED.city,
  state_province = EXCLUDED.state_province,
  country = EXCLUDED.country,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  hub_size = EXCLUDED.hub_size,
  avg_annual_passengers = EXCLUDED.avg_annual_passengers,
  traffic_year = EXCLUDED.traffic_year,
  traffic_metric = EXCLUDED.traffic_metric,
  data_source = EXCLUDED.data_source,
  updated_at = NOW();
