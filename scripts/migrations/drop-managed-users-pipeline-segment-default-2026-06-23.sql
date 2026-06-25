-- Division alone drives default pipeline segment filter; drop legacy column.

ALTER TABLE public.managed_users
  DROP CONSTRAINT IF EXISTS managed_users_pipeline_segment_default_check;

ALTER TABLE public.managed_users
  DROP COLUMN IF EXISTS pipeline_segment_default;
