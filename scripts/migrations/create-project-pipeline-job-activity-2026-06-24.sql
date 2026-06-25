-- Active Jobs audit trail: who changed what, when.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.project_pipeline_job_activity (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sheet_id TEXT NOT NULL,
  sheet_name TEXT NOT NULL,
  job_number TEXT NOT NULL,
  client TEXT NOT NULL DEFAULT '',
  appraiser_consultant TEXT NOT NULL DEFAULT '',
  proj_mgr TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  actor_user_id UUID,
  actor_email TEXT NOT NULL DEFAULT '',
  actor_display_name TEXT NOT NULL DEFAULT '',
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  visible_to_emails TEXT[] NOT NULL DEFAULT '{}'::text[]
);

CREATE INDEX IF NOT EXISTS idx_project_pipeline_job_activity_created_at
  ON public.project_pipeline_job_activity (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_pipeline_job_activity_job
  ON public.project_pipeline_job_activity (sheet_id, sheet_name, job_number);

CREATE INDEX IF NOT EXISTS idx_project_pipeline_job_activity_actor_email
  ON public.project_pipeline_job_activity (lower(actor_email));

CREATE INDEX IF NOT EXISTS idx_project_pipeline_job_activity_visible_emails
  ON public.project_pipeline_job_activity USING GIN (visible_to_emails);

COMMENT ON TABLE public.project_pipeline_job_activity IS
  'Audit log for Active Jobs (project pipeline) edits by consultants and PMs.';

ALTER TABLE public.project_pipeline_job_activity ENABLE ROW LEVEL SECURITY;
