-- Site Builder tables: glamping unit types, RV site types, amenity costs
-- Run: npx tsx scripts/apply-site-builder-migration.ts
--
-- Supports configuring glamping units (cabins, domes) and RV sites with amenities,
-- cost calculation via CCE (glamping) or base cost (RV), and AI image generation.

-- Table 1: Glamping unit types (maps to CCE occupancies for structure cost)
CREATE TABLE IF NOT EXISTS site_builder_glamping_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  default_sqft INTEGER,
  default_diameter_ft INTEGER,
  cce_occupancy_code INTEGER,
  default_quality_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: RV site types (pad/utility configs, not buildings)
CREATE TABLE IF NOT EXISTS site_builder_rv_site_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  width_ft INTEGER,
  depth_ft INTEGER,
  base_cost_per_site NUMERIC NOT NULL,
  hookup_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 3: Amenity costs (shared between glamping and RV where applicable)
CREATE TABLE IF NOT EXISTS site_builder_amenity_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  cost_per_unit NUMERIC NOT NULL,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('glamping', 'rv', 'both')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sb_glamping_types_slug ON site_builder_glamping_types(slug);
CREATE INDEX IF NOT EXISTS idx_sb_glamping_types_occupancy ON site_builder_glamping_types(cce_occupancy_code);
CREATE INDEX IF NOT EXISTS idx_sb_rv_site_types_slug ON site_builder_rv_site_types(slug);
CREATE INDEX IF NOT EXISTS idx_sb_amenity_costs_slug ON site_builder_amenity_costs(slug);
CREATE INDEX IF NOT EXISTS idx_sb_amenity_costs_applies ON site_builder_amenity_costs(applies_to);
