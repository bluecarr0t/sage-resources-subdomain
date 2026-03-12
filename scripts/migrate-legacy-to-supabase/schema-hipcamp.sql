CREATE SCHEMA IF NOT EXISTS hipcamp;

CREATE TABLE IF NOT EXISTS hipcamp.importedsites (
  id VARCHAR NOT NULL,
  import_id INTEGER NOT NULL,
  source VARCHAR,
  property_name VARCHAR,
  site_name VARCHAR,
  unit_type VARCHAR,
  property_type VARCHAR,
  property_total_sites VARCHAR,
  units_quantity VARCHAR,
  guest_capacity VARCHAR,
  year_opened VARCHAR,
  operating_season VARCHAR,
  locations_count VARCHAR,
  address VARCHAR,
  city VARCHAR,
  state VARCHAR,
  zip_code VARCHAR,
  country VARCHAR,
  rates JSON,
  season_rates JSON,
  link VARCHAR,
  description VARCHAR,
  getting_there VARCHAR,
  amenities JSON,
  coordinates geometry(Point, 4326),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hipcamp.imports (
  id INTEGER NOT NULL,
  status BOOLEAN,
  imported INTEGER NOT NULL,
  duplicated INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hipcamp.old_data_table (
  property_id VARCHAR NOT NULL,
  site_id VARCHAR NOT NULL,
  year INTEGER NOT NULL,
  avg_occupancy DOUBLE PRECISION,
  avg_price DOUBLE PRECISION,
  avg_total_price DOUBLE PRECISION,
  revpar DOUBLE PRECISION,
  min_price DOUBLE PRECISION,
  max_price DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS hipcamp.propertydetails (
  id UUID NOT NULL,
  name VARCHAR NOT NULL,
  link VARCHAR NOT NULL,
  description VARCHAR,
  address VARCHAR,
  city VARCHAR,
  state VARCHAR,
  acres DOUBLE PRECISION,
  coordinates geometry(Point, 4326),
  recommends JSON,
  sites_count JSON,
  terrain JSON,
  activities JSON,
  basic_amenities JSON,
  core_amenities JSON,
  rv_details JSON,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  country VARCHAR
);

CREATE TABLE IF NOT EXISTS hipcamp.propertys (
  id UUID NOT NULL,
  scraping_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hipcamp.scrapings (
  id INTEGER NOT NULL,
  status INTEGER NOT NULL,
  type VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hipcamp.sitedetails (
  id VARCHAR NOT NULL,
  category VARCHAR,
  category_list JSON,
  name VARCHAR,
  description VARCHAR,
  config JSON,
  core_amenities JSON,
  amenities JSON,
  rv_amenities JSON,
  rv_details JSON,
  property_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  capacity JSON
);

CREATE TABLE IF NOT EXISTS hipcamp.sites (
  id VARCHAR NOT NULL,
  scraping_id INTEGER NOT NULL,
  price DOUBLE PRECISION,
  property_id UUID NOT NULL,
  property_scraping_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  camp_available INTEGER NOT NULL,
  camp_count INTEGER NOT NULL,
  total_price DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS hipcamp.siteseasonals (
  id VARCHAR NOT NULL,
  scraping_id INTEGER NOT NULL,
  seasonal_rates JSON,
  property_id UUID NOT NULL,
  property_scraping_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
