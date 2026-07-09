-- ============================================================================
-- Canonical unit_type cleanup (Jun 2026)
--
--   Hobbit Home     → Hobbit House
--   Cave            → Cave House   (exact label only; not Cave Room)
--   Glamping Tent   → Canvas Tent
-- ============================================================================

BEGIN;

UPDATE public.all_glamping_properties
SET
  unit_type = 'Hobbit House',
  date_updated = to_char(current_date, 'YYYY-MM-DD'),
  notes = COALESCE(notes, '') || E'\n\nUnit type (Jun 2026): Hobbit Home → Hobbit House.'
WHERE lower(trim(unit_type)) = 'hobbit home';

UPDATE public.all_glamping_properties
SET
  unit_type = 'Cave House',
  date_updated = to_char(current_date, 'YYYY-MM-DD'),
  notes = COALESCE(notes, '') || E'\n\nUnit type (Jun 2026): Cave → Cave House.'
WHERE lower(trim(unit_type)) = 'cave';

UPDATE public.all_glamping_properties
SET
  unit_type = 'Canvas Tent',
  date_updated = to_char(current_date, 'YYYY-MM-DD'),
  notes = COALESCE(notes, '') || E'\n\nUnit type (Jun 2026): Glamping Tent → Canvas Tent.'
WHERE lower(trim(unit_type)) = 'glamping tent';

-- Verification (expect 0 rows each):
-- SELECT unit_type, count(*) FROM all_glamping_properties
-- WHERE lower(trim(unit_type)) IN ('hobbit home', 'cave', 'glamping tent')
-- GROUP BY 1;

COMMIT;
