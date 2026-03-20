-- Create CCE Catalog Units table for Converted Containers and similar product catalog data
-- Run this in Supabase SQL Editor before running the extraction script
--
-- To extract data: python scripts/extract-catalog-units.py --start-page 40

CREATE TABLE IF NOT EXISTS cce_catalog_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_section TEXT,
  manufacturer TEXT,
  product_model TEXT,
  unit_link TEXT,
  price NUMERIC,
  price_category TEXT,
  length_ft NUMERIC,
  width_ft NUMERIC,
  dimensions_ft TEXT,
  floor_area_sqft NUMERIC,
  frame_material TEXT,
  exterior_material TEXT,
  insulation_material TEXT,
  bathroom TEXT CHECK (bathroom IS NULL OR bathroom IN ('included', 'partial', 'not_included', 'add_on', 'no_data')),
  shower TEXT CHECK (shower IS NULL OR shower IN ('included', 'partial', 'not_included', 'add_on', 'no_data')),
  kitchen TEXT CHECK (kitchen IS NULL OR kitchen IN ('included', 'partial', 'not_included', 'add_on', 'no_data')),
  hvac TEXT CHECK (hvac IS NULL OR hvac IN ('included', 'partial', 'not_included', 'add_on', 'no_data')),
  plumbing_system TEXT CHECK (plumbing_system IS NULL OR plumbing_system IN ('included', 'partial', 'not_included', 'add_on', 'no_data')),
  electrical_system TEXT CHECK (electrical_system IS NULL OR electrical_system IN ('included', 'partial', 'not_included', 'add_on', 'no_data')),
  lead_time_weeks TEXT,
  warranty TEXT,
  certification TEXT,
  source_page INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(manufacturer, product_model, source_page)
);

-- Indexes for search and filtering
CREATE INDEX IF NOT EXISTS idx_cce_catalog_units_manufacturer ON cce_catalog_units(manufacturer);
CREATE INDEX IF NOT EXISTS idx_cce_catalog_units_product_model ON cce_catalog_units(product_model);
CREATE INDEX IF NOT EXISTS idx_cce_catalog_units_price ON cce_catalog_units(price);
CREATE INDEX IF NOT EXISTS idx_cce_catalog_units_floor_area ON cce_catalog_units(floor_area_sqft);
CREATE INDEX IF NOT EXISTS idx_cce_catalog_units_source_page ON cce_catalog_units(source_page);
CREATE INDEX IF NOT EXISTS idx_cce_catalog_units_catalog_section ON cce_catalog_units(catalog_section);

-- Full-text search on manufacturer and product model
CREATE INDEX IF NOT EXISTS idx_cce_catalog_units_search ON cce_catalog_units
  USING gin(to_tsvector('english', coalesce(manufacturer, '') || ' ' || coalesce(product_model, '') || ' ' || coalesce(catalog_section, '')));
