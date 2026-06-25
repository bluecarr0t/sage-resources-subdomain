-- Per-user Active Jobs email notification toggles (self-service on /admin/account).

ALTER TABLE public.managed_users
  ADD COLUMN IF NOT EXISTS pipeline_email_preferences JSONB NOT NULL
  DEFAULT '{"submitForReview":true,"resubmitForReview":true,"reviewStatusChange":true,"dueDateChange":true}'::jsonb;

COMMENT ON COLUMN public.managed_users.pipeline_email_preferences IS
  'Per-user Active Jobs email notification toggles (submitForReview, resubmitForReview, reviewStatusChange, dueDateChange).';
