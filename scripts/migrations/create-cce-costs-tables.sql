-- Create CCE (Commercial Cost Explorer) tables for Marshall & Swift cost data
-- Run this in Supabase SQL Editor before running the extraction script
--
-- To extract data: python scripts/extract-cce-pdf.py

-- Table 1: Occupancy lookup
CREATE TABLE IF NOT EXISTS cce_occupancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occupancy_code INTEGER UNIQUE NOT NULL,
  occupancy_name TEXT NOT NULL,
  section_number INTEGER,
  page_start INTEGER,
  page_end INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: Main cost data
CREATE TABLE IF NOT EXISTS cce_cost_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occupancy_id UUID NOT NULL REFERENCES cce_occupancies(id) ON DELETE CASCADE,
  building_class TEXT,
  quality_type TEXT,
  exterior_walls TEXT,
  interior_finish TEXT,
  lighting_plumbing TEXT,
  heat TEXT,
  cost_sq_m NUMERIC,
  cost_cu_ft NUMERIC,
  cost_sq_ft NUMERIC,
  source_page INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 3: Component costs (unit-in-place)
CREATE TABLE IF NOT EXISTS cce_component_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_name TEXT,
  item_name TEXT,
  cost_tier TEXT,
  col_1 NUMERIC,
  col_2 NUMERIC,
  col_3 NUMERIC,
  col_4 NUMERIC,
  source_page INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for search
CREATE INDEX IF NOT EXISTS idx_cce_occupancies_name ON cce_occupancies(occupancy_name);
CREATE INDEX IF NOT EXISTS idx_cce_occupancies_code ON cce_occupancies(occupancy_code);

CREATE INDEX IF NOT EXISTS idx_cce_cost_rows_occupancy ON cce_cost_rows(occupancy_id);
CREATE INDEX IF NOT EXISTS idx_cce_cost_rows_building_class ON cce_cost_rows(building_class);
CREATE INDEX IF NOT EXISTS idx_cce_cost_rows_quality_type ON cce_cost_rows(quality_type);
CREATE INDEX IF NOT EXISTS idx_cce_cost_rows_cost_sq_ft ON cce_cost_rows(cost_sq_ft);
CREATE INDEX IF NOT EXISTS idx_cce_cost_rows_exterior ON cce_cost_rows(exterior_walls);
CREATE INDEX IF NOT EXISTS idx_cce_cost_rows_interior ON cce_cost_rows(interior_finish);

-- Full-text search on text columns
CREATE INDEX IF NOT EXISTS idx_cce_cost_rows_search ON cce_cost_rows
  USING gin(to_tsvector('english', coalesce(building_class, '') || ' ' || coalesce(quality_type, '') || ' ' || coalesce(exterior_walls, '') || ' ' || coalesce(interior_finish, '')));
