-- Supabase-only project notes (not synced from Google Sheets).

ALTER TABLE public.project_pipeline_jobs
  ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.project_pipeline_jobs.notes IS
  'Free-form project notes saved from the UI. Not mirrored from Google Sheets.';
