CREATE SCHEMA IF NOT EXISTS campspot;

CREATE TABLE IF NOT EXISTS campspot.old_data_table (
  property_id VARCHAR NOT NULL,
  site_id BIGINT NOT NULL,
  site_number VARCHAR,
  year INTEGER NOT NULL,
  property_name VARCHAR NOT NULL,
  site_name VARCHAR,
  avg_occupancy DOUBLE PRECISION,
  avg_price DOUBLE PRECISION,
  revpar DOUBLE PRECISION,
  min_price DOUBLE PRECISION,
  max_price DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS campspot.propertydetails (
  id INTEGER NOT NULL,
  name VARCHAR NOT NULL,
  link VARCHAR NOT NULL,
  description VARCHAR,
  address VARCHAR,
  city VARCHAR,
  state VARCHAR,
  country VARCHAR,
  postal_code VARCHAR,
  coordinates geometry(Point, 4326),
  recommends JSON,
  sites_count JSON,
  core_amenities JSON,
  activities JSON,
  basic_amenities JSON,
  policies JSON,
  rv_types JSON,
  categories JSON,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  discounts JSON
);

CREATE TABLE IF NOT EXISTS campspot.propertys (
  id INTEGER NOT NULL,
  slug VARCHAR NOT NULL,
  scraping_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campspot.scrapings (
  id INTEGER NOT NULL,
  status INTEGER NOT NULL,
  type VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campspot.sitedetails (
  id INTEGER NOT NULL,
  category VARCHAR,
  name VARCHAR NOT NULL,
  description VARCHAR,
  config JSON,
  amenities JSON,
  rv_types JSON,
  property_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_parent BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS campspot.sites (
  id INTEGER NOT NULL,
  scraping_id INTEGER NOT NULL,
  parent_id INTEGER,
  is_parent BOOLEAN NOT NULL,
  camp_available BOOLEAN,
  price DOUBLE PRECISION,
  total_price DOUBLE PRECISION,
  property_id INTEGER NOT NULL,
  property_scraping_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campspot.siteseasonals (
  id INTEGER NOT NULL,
  scraping_id INTEGER NOT NULL,
  seasonal_rates JSON,
  property_id INTEGER NOT NULL,
  property_scraping_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
