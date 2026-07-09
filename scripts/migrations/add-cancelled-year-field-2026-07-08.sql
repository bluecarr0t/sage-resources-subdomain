-- Year cancelled for pipeline projects (is_open = Cancelled).
-- Safe to re-run.

ALTER TABLE public.all_sage_data
  ADD COLUMN IF NOT EXISTS cancelled_year smallint;

COMMENT ON COLUMN public.all_sage_data.cancelled_year IS
  'Calendar year the pipeline project was cancelled, denied, or abandoned (when is_open = Cancelled).';

CREATE INDEX IF NOT EXISTS idx_all_sage_data_cancelled_year
  ON public.all_sage_data (cancelled_year)
  WHERE is_open = 'Cancelled' AND cancelled_year IS NOT NULL;

-- Backfill known USA cancelled pipeline projects (Jul 2026 research)
UPDATE public.all_sage_data SET cancelled_year = 2025, date_updated = '2026-07-08'
WHERE property_name IN ('AutoCamp Napa', 'The Grange Campground') AND is_open = 'Cancelled';

UPDATE public.all_sage_data SET cancelled_year = 2026, date_updated = '2026-07-08'
WHERE property_name IN ('Yonder Twentynine Palms', 'Ofland Twentynine Palms') AND is_open = 'Cancelled';

UPDATE public.all_sage_data SET cancelled_year = 2023, date_updated = '2026-07-08'
WHERE property_name = 'Flamingo Heights Glamping Resort' AND is_open = 'Cancelled';

UPDATE public.all_sage_data SET cancelled_year = 2023, date_updated = '2026-07-08'
WHERE property_name = 'Terramor Outdoor Resort - Saugerties' AND is_open = 'Cancelled';

UPDATE public.all_sage_data SET cancelled_year = 2025, date_updated = '2026-07-08'
WHERE property_name = 'Fox Hollow Campground' AND is_open = 'Cancelled';

UPDATE public.all_sage_data SET cancelled_year = 2022, date_updated = '2026-07-08'
WHERE property_name = 'Dream Away Lodge Glamping Resort' AND is_open = 'Cancelled';

UPDATE public.all_sage_data SET cancelled_year = 2025, date_updated = '2026-07-08'
WHERE property_name = 'Oculis Lodge' AND is_open = 'Cancelled';

UPDATE public.all_sage_data SET cancelled_year = 2025, date_updated = '2026-07-08'
WHERE property_name = 'Under Canvas Mancos' AND is_open = 'Cancelled';
