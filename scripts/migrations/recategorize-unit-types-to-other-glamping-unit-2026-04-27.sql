-- Recategorize select unit_type labels to "Other Glamping Unit" (glamping + RoverPass unified tables).
-- Applied to production 2026-04-27. Safe to re-run: only updates rows that still match the old labels.
--
-- From labels (case-insensitive, normalized whitespace):
--   Other Glamping, Vardo, Casita, Shepard S Hut, Shepherd's Hut, Micro Cabin, Luxury Suite

UPDATE public.all_glamping_properties
SET
  unit_type = 'Other Glamping Unit',
  date_updated = to_char((now() AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD'),
  updated_at = now()
WHERE lower(trim(regexp_replace(coalesce(unit_type, ''), '\s+', ' ', 'g'))) IN (
  'other glamping',
  'vardo',
  'casita',
  'shepard s hut',
  'shepherd''s hut',
  'micro cabin',
  'luxury suite'
)
  AND (unit_type IS DISTINCT FROM 'Other Glamping Unit');

UPDATE public.all_roverpass_data_new
SET
  unit_type = 'Other Glamping Unit',
  date_updated = to_char((now() AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD'),
  updated_at = now()
WHERE lower(trim(regexp_replace(coalesce(unit_type, ''), '\s+', ' ', 'g'))) IN (
  'other glamping',
  'vardo',
  'casita',
  'shepard s hut',
  'shepherd''s hut',
  'micro cabin',
  'luxury suite'
)
  AND (unit_type IS DISTINCT FROM 'Other Glamping Unit');
