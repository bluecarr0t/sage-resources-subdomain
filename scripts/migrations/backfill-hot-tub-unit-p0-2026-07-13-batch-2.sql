-- Auto-generated hot tub backfill (review before apply)
-- Rows: 1

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nHot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://twinlakescampresort.com/.'
WHERE id = 10124;
