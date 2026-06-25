-- Pipeline access + division fields on managed_users (replaces hardcoded super-viewers).

ALTER TABLE public.managed_users
  ADD COLUMN IF NOT EXISTS pipeline_view_all BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS division TEXT,
  ADD COLUMN IF NOT EXISTS pipeline_segment_default TEXT;

ALTER TABLE public.managed_users
  DROP CONSTRAINT IF EXISTS managed_users_division_check;

ALTER TABLE public.managed_users
  ADD CONSTRAINT managed_users_division_check
  CHECK (division IS NULL OR division IN ('outdoor', 'commercial'));

ALTER TABLE public.managed_users
  DROP CONSTRAINT IF EXISTS managed_users_pipeline_segment_default_check;

ALTER TABLE public.managed_users
  ADD CONSTRAINT managed_users_pipeline_segment_default_check
  CHECK (
    pipeline_segment_default IS NULL
    OR pipeline_segment_default IN ('Outdoor', 'Commercial')
  );

COMMENT ON COLUMN public.managed_users.pipeline_view_all IS
  'When true, user sees all project pipeline jobs (replaces legacy super-viewer email list).';

COMMENT ON COLUMN public.managed_users.division IS
  'Sage division: outdoor or commercial. Used to infer default pipeline segment filter.';

COMMENT ON COLUMN public.managed_users.pipeline_segment_default IS
  'Optional explicit default segment filter on Project Pipeline (Outdoor or Commercial).';

-- Backfill legacy super-viewers (local-part match, any allowed domain).
UPDATE public.managed_users
SET pipeline_view_all = true
WHERE lower(split_part(email, '@', 1)) IN ('garwood', 'heilala', 'harsell');

-- Infer division from email domain where not set.
UPDATE public.managed_users
SET division = 'commercial'
WHERE division IS NULL
  AND lower(split_part(email, '@', 2)) = 'sagecommercialadvisory.com';

UPDATE public.managed_users
SET division = 'outdoor'
WHERE division IS NULL
  AND lower(split_part(email, '@', 2)) = 'sageoutdooradvisory.com';
