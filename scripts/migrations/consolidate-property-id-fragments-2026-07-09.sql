-- Consolidate fragmented property_id UUIDs onto the lowest-id anchor row
-- per normalized (property_name, city, state) group.
--
-- Priority review: Douglas Lake Ranch, Westgate River Ranch, Bliss Camps Glamping.
-- Safe to re-run: only updates rows whose property_id differs from anchor.
--
-- Run: psql $DATABASE_URL -f scripts/migrations/consolidate-property-id-fragments-2026-07-09.sql
-- Or:  npx tsx scripts/apply-p0-sage-data-migrations-2026-07-09.ts

WITH groups AS (
  SELECT
    lower(btrim(property_name)) AS n,
    lower(btrim(coalesce(city, ''))) AS c,
    lower(btrim(coalesce(state, ''))) AS s,
    MIN(id) AS anchor_id,
    COUNT(*) AS row_count,
    COUNT(DISTINCT property_id) AS distinct_pids
  FROM public.all_sage_data
  WHERE property_name IS NOT NULL
    AND btrim(property_name) <> ''
  GROUP BY 1, 2, 3
  HAVING COUNT(DISTINCT property_id) > 1
),
canon AS (
  SELECT
    g.n,
    g.c,
    g.s,
    g.anchor_id,
    g.row_count,
    g.distinct_pids,
    a.property_id AS canonical_pid,
    a.slug AS anchor_slug
  FROM groups g
  JOIN public.all_sage_data a ON a.id = g.anchor_id
)
UPDATE public.all_sage_data t
SET
  property_id = c.canonical_pid,
  date_updated = to_char(current_date, 'YYYY-MM-DD'),
  notes = COALESCE(t.notes, '') || E'\n\nMerge (2026-07-09): consolidated property_id onto anchor row ' || c.anchor_id::text || '.'
FROM canon c
WHERE lower(btrim(t.property_name)) = c.n
  AND lower(btrim(coalesce(t.city, ''))) = c.c
  AND lower(btrim(coalesce(t.state, ''))) = c.s
  AND t.property_id IS DISTINCT FROM c.canonical_pid;
