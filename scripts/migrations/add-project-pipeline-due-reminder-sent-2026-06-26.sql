-- Dedupe log for scheduled due-date reminder emails.

CREATE TABLE IF NOT EXISTS public.project_pipeline_due_reminder_sent (
  sheet_id TEXT NOT NULL,
  sheet_name TEXT NOT NULL,
  job_number TEXT NOT NULL,
  due_date_snapshot TEXT NOT NULL,
  reminder_type TEXT NOT NULL,
  reminder_key TEXT NOT NULL DEFAULT '',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_pipeline_due_reminder_sent_pkey
    PRIMARY KEY (sheet_id, sheet_name, job_number, due_date_snapshot, reminder_type, reminder_key)
);

CREATE INDEX IF NOT EXISTS idx_project_pipeline_due_reminder_sent_sent_at
  ON public.project_pipeline_due_reminder_sent (sent_at DESC);

COMMENT ON TABLE public.project_pipeline_due_reminder_sent IS
  'Tracks scheduled due-date reminder emails (upcoming, due today, overdue) per job and due date.';

ALTER TABLE public.project_pipeline_due_reminder_sent ENABLE ROW LEVEL SECURITY;
