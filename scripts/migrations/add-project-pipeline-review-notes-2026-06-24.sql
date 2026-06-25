-- Author/reviewer workflow notes (visible to project author + admins only).

ALTER TABLE public.project_pipeline_jobs
  ADD COLUMN IF NOT EXISTS review_notes JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.project_pipeline_jobs.review_notes IS
  'JSON array of review workflow events (submit, resubmit, reviewer feedback). Supabase-only.';
