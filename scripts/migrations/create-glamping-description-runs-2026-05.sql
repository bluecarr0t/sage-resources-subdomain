-- Audit trail for web-backed SEO description generation on all_glamping_properties.
-- Apply in Supabase SQL Editor (or psql). Service-role scripts insert rows; no RLS (matches glamping_discovery_runs pattern).

CREATE TABLE IF NOT EXISTS public.glamping_description_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id BIGINT NOT NULL REFERENCES public.all_glamping_properties (id) ON DELETE CASCADE,
  research_status_at_run TEXT,
  dry_run BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL,
  source_urls TEXT[] NOT NULL DEFAULT '{}',
  evidence_chars INT NOT NULL DEFAULT 0,
  model TEXT,
  prompt_version TEXT NOT NULL DEFAULT 'v1',
  generated_description TEXT,
  validation_warnings TEXT[] NOT NULL DEFAULT '{}',
  error_message TEXT,
  applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_glamping_description_runs_property_id
  ON public.glamping_description_runs (property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_glamping_description_runs_status_created
  ON public.glamping_description_runs (status, created_at DESC);

COMMENT ON TABLE public.glamping_description_runs IS
  'One row per attempt to generate an SEO-oriented property description from official URL + structured DB context.';

COMMENT ON COLUMN public.glamping_description_runs.status IS
  'pending | success | failed | skipped — terminal states except pending at insert.';

COMMENT ON COLUMN public.glamping_description_runs.applied IS
  'True when generated_description was written to all_glamping_properties.description (false for dry_run or validation failure).';
