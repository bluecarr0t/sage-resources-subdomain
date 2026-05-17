-- Rename stored is_open value 'No' → 'Closed' (not operating for guests).
-- Keeps legacy rows readable if any casing/whitespace variants exist.

UPDATE public.all_glamping_properties
SET is_open = 'Closed'
WHERE LOWER(TRIM(COALESCE(is_open, ''))) = 'no';

COMMENT ON COLUMN public.all_glamping_properties.is_open IS
  'Guest operating status: Yes = open for stays, Closed = not operating, Under Construction = pre-opening.';
