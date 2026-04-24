-- Rename all_glamping_properties.is_closed → is_open and flip Yes/No semantics:
--   Former is_closed = 'No' (operating)  → is_open = 'Yes'
--   Former is_closed = 'Yes' (closed)     → is_open = 'No'
-- Apply in Supabase SQL editor (or psql) against the project that owns all_glamping_properties.

BEGIN;

DROP INDEX IF EXISTS idx_all_glamping_properties_is_closed;

ALTER TABLE public.all_glamping_properties
  RENAME COLUMN is_closed TO is_open;

UPDATE public.all_glamping_properties
SET is_open = CASE
  WHEN LOWER(TRIM(COALESCE(is_open, ''))) = 'yes' THEN 'No'
  WHEN LOWER(TRIM(COALESCE(is_open, ''))) = 'no' THEN 'Yes'
  ELSE 'Yes'
END;

ALTER TABLE public.all_glamping_properties
  ALTER COLUMN is_open SET DEFAULT 'Yes';

COMMENT ON COLUMN public.all_glamping_properties.is_open IS
  'Whether the property is open for guests (Yes) or not (No). Replaces is_closed with inverted Yes/No values.';

CREATE INDEX IF NOT EXISTS idx_all_glamping_properties_is_open
  ON public.all_glamping_properties (is_open)
  WHERE is_open IS NOT NULL;

COMMIT;
