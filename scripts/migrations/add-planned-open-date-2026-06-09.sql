-- Scheduled open date for Under Construction properties (daily cron flips to Yes).
-- Safe to re-run.

ALTER TABLE public.all_glamping_properties
  ADD COLUMN IF NOT EXISTS planned_open_date date;

COMMENT ON COLUMN public.all_glamping_properties.planned_open_date IS
  'When is_open = Under Construction, daily cron sets is_open = Yes on this date (UTC calendar day). Cleared after flip.';

CREATE INDEX IF NOT EXISTS idx_all_glamping_properties_planned_open_date
  ON public.all_glamping_properties (planned_open_date)
  WHERE is_open = 'Under Construction' AND planned_open_date IS NOT NULL;

-- Trailborn Mendocino Hillside — opening June 18, 2026
UPDATE public.all_glamping_properties
SET
  planned_open_date = '2026-06-18',
  date_updated = '2026-06-09',
  notes = COALESCE(notes, '') || E'\n\nJun 2026: planned_open_date 2026-06-18 — auto-flip to Open on that date.'
WHERE property_name ILIKE 'Trailborn Mendocino Hillside%'
   OR slug ILIKE 'trailborn-mendocino%';
