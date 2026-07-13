-- Demote published rows whose is_open is not operating (Yes).
-- Policy: research_status → in_progress; is_open unchanged (pipeline tracking preserved).
--
-- Expected scope (~79 rows): Cancelled, Closed, Under Construction,
-- Proposed Development, Temporarily closed.
--
-- Run: psql $DATABASE_URL -f scripts/migrations/demote-published-non-operating-2026-07-09.sql
-- Or:  npx tsx scripts/apply-p0-sage-data-migrations-2026-07-09.ts

UPDATE public.all_sage_data
SET
  research_status = 'in_progress',
  date_updated = to_char(current_date, 'YYYY-MM-DD'),
  notes = COALESCE(notes, '') || E'\n\nStatus reconcile (2026-07-09): demoted from published; is_open=' || COALESCE(is_open, '') || ' (pipeline/non-operating).'
WHERE lower(trim(coalesce(research_status, ''))) = 'published'
  AND lower(trim(coalesce(is_open, ''))) <> 'yes';
