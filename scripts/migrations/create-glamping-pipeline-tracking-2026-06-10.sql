-- Glamping pipeline weekly sync: status history, run metrics, processed URLs.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS glamping_pipeline_discovery_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dry_run BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  articles_found INT NOT NULL DEFAULT 0,
  articles_fetched INT NOT NULL DEFAULT 0,
  articles_failed INT NOT NULL DEFAULT 0,
  properties_extracted INT NOT NULL DEFAULT 0,
  properties_new INT NOT NULL DEFAULT 0,
  properties_inserted INT NOT NULL DEFAULT 0,
  status_updates_detected INT NOT NULL DEFAULT 0,
  status_updates_applied INT NOT NULL DEFAULT 0,
  processed_urls_count INT NOT NULL DEFAULT 0,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_glamping_pipeline_discovery_runs_completed_at
  ON glamping_pipeline_discovery_runs (completed_at DESC NULLS LAST);

COMMENT ON TABLE glamping_pipeline_discovery_runs IS
  'Run history for the weekly USA glamping pipeline (proposed / under construction) sync.';

CREATE TABLE IF NOT EXISTS glamping_pipeline_processed_urls (
  url TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  properties_extracted INT,
  status_updates_extracted INT
);

COMMENT ON TABLE glamping_pipeline_processed_urls IS
  'Article URLs processed by the weekly glamping pipeline sync (separate from general discovery).';

CREATE TABLE IF NOT EXISTS glamping_pipeline_status_history (
  id BIGSERIAL PRIMARY KEY,
  property_id INT NOT NULL REFERENCES public.all_sage_data(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  is_open TEXT NOT NULL,
  started_on DATE NOT NULL,
  ended_on DATE,
  change_source TEXT NOT NULL,
  evidence_url TEXT,
  notes TEXT,
  run_id UUID REFERENCES glamping_pipeline_discovery_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT glamping_pipeline_status_history_is_open_check CHECK (
    is_open IN (
      'Yes',
      'Under Construction',
      'Proposed Development',
      'Cancelled',
      'Temporarily closed',
      'Closed'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_glamping_pipeline_status_history_current
  ON glamping_pipeline_status_history (property_id)
  WHERE ended_on IS NULL;

CREATE INDEX IF NOT EXISTS idx_glamping_pipeline_status_history_slug
  ON glamping_pipeline_status_history (slug);

CREATE INDEX IF NOT EXISTS idx_glamping_pipeline_status_history_started_on
  ON glamping_pipeline_status_history (started_on DESC);

COMMENT ON TABLE glamping_pipeline_status_history IS
  'Dated stages for all_glamping_properties.is_open — one open row per property (ended_on IS NULL).';

COMMENT ON COLUMN glamping_pipeline_status_history.started_on IS
  'UTC calendar date when the property entered this is_open value.';

COMMENT ON COLUMN glamping_pipeline_status_history.ended_on IS
  'UTC calendar date when the property left this is_open value (exclusive end of stint). NULL = current.';

-- Backfill current pipeline rows (USA) that have no history yet.
INSERT INTO glamping_pipeline_status_history (
  property_id,
  slug,
  is_open,
  started_on,
  change_source,
  notes
)
SELECT
  p.id,
  p.slug,
  p.is_open,
  COALESCE(
    NULLIF(TRIM(p.date_added), '')::date,
    NULLIF(TRIM(p.date_updated), '')::date,
    CURRENT_DATE
  ),
  'initial_backfill',
  'Backfilled from existing pipeline row at migration time.'
FROM public.all_sage_data p
WHERE p.country = 'United States'
  AND p.is_open IN ('Proposed Development', 'Under Construction')
  AND NOT EXISTS (
    SELECT 1
    FROM glamping_pipeline_status_history h
    WHERE h.property_id = p.id
  );
