-- Whether a managed user acts as a project manager on Active Jobs (in addition to author/consultant).

ALTER TABLE public.managed_users
  ADD COLUMN IF NOT EXISTS is_project_manager BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.managed_users.is_project_manager IS
  'When true, user can receive project-manager Active Jobs email notifications and manage PM toggles on /admin/account.';
