-- State/province sweep metadata for the glamping pre-opening pipeline.
-- Live Proposed / Under Construction / Cancelled counts are computed from
-- all_sage_data; this table stores last-sweep status only.
-- Safe to re-run.

ALTER TABLE glamping_pipeline_discovery_runs
  ADD COLUMN IF NOT EXISTS region_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT;

CREATE TABLE IF NOT EXISTS glamping_pipeline_state_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'United States',
  sweep_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (sweep_status IN ('pending', 'in_progress', 'complete', 'no_projects_found')),
  last_researched_at TIMESTAMPTZ,
  last_run_id UUID REFERENCES glamping_pipeline_discovery_runs(id) ON DELETE SET NULL,
  last_articles_found INT NOT NULL DEFAULT 0,
  last_properties_inserted INT NOT NULL DEFAULT 0,
  sources_checked TEXT[] DEFAULT '{}',
  notes TEXT,
  priority INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (region_code, country)
);

CREATE INDEX IF NOT EXISTS idx_glamping_pipeline_state_coverage_status
  ON glamping_pipeline_state_coverage (sweep_status, priority, region_code);

COMMENT ON TABLE glamping_pipeline_state_coverage IS
  'Per-state / per-province sweep tracking for Proposed Development and Under Construction research.';

INSERT INTO glamping_pipeline_state_coverage (region_code, country, priority, sweep_status)
SELECT v.region_code, v.country, v.priority, 'pending'
FROM (VALUES
  -- US P0 (uncovered high-activity)
  ('TX', 'United States', 0),
  ('FL', 'United States', 0),
  ('NC', 'United States', 0),
  ('SC', 'United States', 0),
  ('NM', 'United States', 0),
  ('OK', 'United States', 0),
  -- US P1
  ('IL', 'United States', 1),
  ('WI', 'United States', 1),
  ('MN', 'United States', 1),
  ('MO', 'United States', 1),
  ('OH', 'United States', 1),
  ('IN', 'United States', 1),
  -- US P2
  ('AL', 'United States', 2),
  ('LA', 'United States', 2),
  ('MS', 'United States', 2),
  ('KY', 'United States', 2),
  ('WV', 'United States', 2),
  -- US P3
  ('CT', 'United States', 3),
  ('NJ', 'United States', 3),
  ('MD', 'United States', 3),
  ('DE', 'United States', 3),
  ('RI', 'United States', 3),
  ('NH', 'United States', 3),
  ('VT', 'United States', 3),
  -- US P4
  ('AK', 'United States', 4),
  ('WY', 'United States', 4),
  ('ND', 'United States', 4),
  ('SD', 'United States', 4),
  ('IA', 'United States', 4),
  ('KS', 'United States', 4),
  -- US P5 (partial coverage / re-sweep)
  ('AZ', 'United States', 5),
  ('AR', 'United States', 5),
  ('CA', 'United States', 5),
  ('CO', 'United States', 5),
  ('GA', 'United States', 5),
  ('HI', 'United States', 5),
  ('ID', 'United States', 5),
  ('ME', 'United States', 5),
  ('MA', 'United States', 5),
  ('MI', 'United States', 5),
  ('MT', 'United States', 5),
  ('NE', 'United States', 5),
  ('NV', 'United States', 5),
  ('NY', 'United States', 5),
  ('OR', 'United States', 5),
  ('PA', 'United States', 5),
  ('TN', 'United States', 5),
  ('UT', 'United States', 5),
  ('VA', 'United States', 5),
  ('WA', 'United States', 5),
  -- Canada P0
  ('QC', 'Canada', 0),
  ('MB', 'Canada', 0),
  ('PE', 'Canada', 0),
  ('NL', 'Canada', 0),
  -- Canada P1
  ('SK', 'Canada', 1),
  ('NT', 'Canada', 1),
  ('YT', 'Canada', 1),
  ('NU', 'Canada', 1),
  -- Canada P2 (existing pipeline rows)
  ('AB', 'Canada', 2),
  ('BC', 'Canada', 2),
  ('ON', 'Canada', 2),
  ('NB', 'Canada', 2),
  ('NS', 'Canada', 2)
) AS v(region_code, country, priority)
WHERE NOT EXISTS (
  SELECT 1
  FROM glamping_pipeline_state_coverage e
  WHERE e.region_code = v.region_code
    AND e.country = v.country
);
