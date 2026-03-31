-- Unified amenities: Site Builder catalog (slug + costs) and all_glamping_properties dataset fields
-- in one table. Catalog rows: slug NOT NULL, glamping_property_column NULL, glamping_fields JSONB
-- lists linked dataset columns. Dataset-only rows: slug NULL, glamping_property_column NOT NULL.
--
-- After this migration, run: npx tsx scripts/seed-site-builder-data.ts (or populate-amenities-glamping-metadata.ts)
-- to fill glamping_fields and dataset-only rows from lib/site-builder/glamping-properties-amenity-columns.ts

CREATE TABLE IF NOT EXISTS amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT,
  glamping_property_column TEXT,
  name TEXT NOT NULL,
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('glamping', 'rv', 'both')),
  scope TEXT CHECK (scope IS NULL OR scope IN ('unit', 'rv', 'property')),
  glamping_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_cost_basis TEXT,
  default_cost_source_url TEXT,
  sources JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT amenities_catalog_or_dataset CHECK (
    (slug IS NOT NULL AND glamping_property_column IS NULL)
    OR (slug IS NULL AND glamping_property_column IS NOT NULL)
  ),
  CONSTRAINT amenities_slug_key UNIQUE (slug),
  CONSTRAINT amenities_glamping_property_column_key UNIQUE (glamping_property_column)
);

CREATE INDEX IF NOT EXISTS idx_amenities_sort_order ON amenities(sort_order);
CREATE INDEX IF NOT EXISTS idx_amenities_applies_to ON amenities(applies_to);

COMMENT ON TABLE amenities IS
  'Site Builder amenity costs (slug rows) plus all_glamping_properties columns (dataset rows); glamping_fields links slugs to columns.';

COMMENT ON COLUMN amenities.glamping_fields IS
  'For catalog rows: [{ "column": "unit_wifi", "scope": "unit" }, ...]. Empty for dataset-only rows.';

-- Copy from legacy table using only columns from create-site-builder-tables.sql (always present).
-- Optional columns are backfilled in separate steps when they exist (older DBs may not have run later migrations).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'site_builder_amenity_costs'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'amenities'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO amenities (
    id,
    slug,
    glamping_property_column,
    name,
    cost_per_unit,
    applies_to,
    default_cost_basis,
    default_cost_source_url,
    sources,
    sort_order,
    created_at,
    scope,
    glamping_fields
  )
  SELECT
    sb.id,
    sb.slug,
    NULL::text,
    sb.name,
    sb.cost_per_unit,
    sb.applies_to,
    NULL::text,
    NULL::text,
    '[]'::jsonb,
    0,
    sb.created_at,
    NULL::text,
    '[]'::jsonb
  FROM site_builder_amenity_costs sb
  WHERE NOT EXISTS (SELECT 1 FROM amenities a WHERE a.slug = sb.slug);

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'site_builder_amenity_costs' AND column_name = 'sources'
  ) THEN
    UPDATE amenities a
    SET sources = COALESCE(s.sources, '[]'::jsonb)
    FROM site_builder_amenity_costs s
    WHERE a.slug = s.slug AND a.glamping_property_column IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'site_builder_amenity_costs' AND column_name = 'sort_order'
  ) THEN
    UPDATE amenities a
    SET sort_order = COALESCE(s.sort_order, 0)
    FROM site_builder_amenity_costs s
    WHERE a.slug = s.slug AND a.glamping_property_column IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'site_builder_amenity_costs' AND column_name = 'default_cost_basis'
  ) THEN
    UPDATE amenities a
    SET default_cost_basis = s.default_cost_basis
    FROM site_builder_amenity_costs s
    WHERE a.slug = s.slug AND a.glamping_property_column IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'site_builder_amenity_costs' AND column_name = 'default_cost_source_url'
  ) THEN
    UPDATE amenities a
    SET default_cost_source_url = s.default_cost_source_url
    FROM site_builder_amenity_costs s
    WHERE a.slug = s.slug AND a.glamping_property_column IS NULL;
  END IF;
END $$;
