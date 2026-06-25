-- Admin manual override for Supabase-only project_status (not in Google Sheets).

ALTER TABLE public.project_pipeline_jobs
  ADD COLUMN IF NOT EXISTS project_status_manual BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.project_pipeline_jobs.project_status_manual IS
  'When true, project_status was set manually by an admin and is not auto-derived from sheet fields.';
