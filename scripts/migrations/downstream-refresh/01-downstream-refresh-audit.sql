-- Audit log for Phase 4 downstream refresh (unified_comps + RV overview cache).

CREATE TABLE IF NOT EXISTS public.downstream_refresh_runs (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  trigger_source TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  options JSONB
);

CREATE INDEX IF NOT EXISTS idx_downstream_refresh_runs_started
  ON public.downstream_refresh_runs (started_at DESC);
