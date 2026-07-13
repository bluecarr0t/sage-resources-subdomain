-- Phase 1 Jupe USA enrichments (2026-07-13)
-- discovery_source note tag: jupe_enrich_us_2026_07_13

UPDATE public.all_sage_data SET quantity_of_units = '8', date_updated = '2026-07-13', notes = COALESCE(notes || E'\n', '') || '[2026-07-13] Phase 1 Jupe enrich: quantity_of_units null → 8 (flyingflags.com/room/jupes-tent — “Enjoy one of our eight available Jupes!”) [jupe_enrich_us_2026_07_13]' WHERE id = 9562;
