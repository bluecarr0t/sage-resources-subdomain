-- Internal job notes thread (dated entries, Supabase-only).

ALTER TABLE public.project_pipeline_jobs
  ADD COLUMN IF NOT EXISTS job_notes JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.project_pipeline_jobs.job_notes IS
  'JSON array of internal job notes with timestamps. Supabase-only.';

-- Migrate legacy plain-text notes into a single imported entry.
UPDATE public.project_pipeline_jobs
SET job_notes = jsonb_build_array(
  jsonb_build_object(
    'id', 'legacy-' || job_number,
    'note', TRIM(notes),
    'createdAt', COALESCE(updated_at, synced_at, NOW())::text,
    'createdByEmail', '',
    'createdByDisplayName', 'Imported'
  )
)
WHERE COALESCE(TRIM(notes), '') <> ''
  AND job_notes = '[]'::jsonb;

UPDATE public.project_pipeline_jobs
SET notes = ''
WHERE COALESCE(TRIM(notes), '') <> '';
