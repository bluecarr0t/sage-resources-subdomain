-- Simplify managed_users.role to admin | author (replaces user/editor).

ALTER TABLE public.managed_users
  DROP CONSTRAINT IF EXISTS managed_users_role_check;

UPDATE public.managed_users
SET role = 'author'
WHERE role IS NULL OR role IN ('user', 'editor');

UPDATE public.managed_users
SET role = 'admin'
WHERE lower(split_part(email, '@', 1)) IN ('garwood', 'heilala', 'harsell');

UPDATE public.managed_users
SET role = 'author'
WHERE lower(split_part(email, '@', 1)) NOT IN ('garwood', 'heilala', 'harsell');

ALTER TABLE public.managed_users
  ALTER COLUMN role SET DEFAULT 'author';

ALTER TABLE public.managed_users
  ADD CONSTRAINT managed_users_role_check
  CHECK (role IN ('admin', 'author'));

COMMENT ON COLUMN public.managed_users.role IS
  'Access level: admin or author (default author for new users).';
