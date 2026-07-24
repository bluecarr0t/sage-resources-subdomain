-- Phase 1 Mirror Cabin corrections / siblings (2026-07-13)
-- discovery_source: ood_mirror_cabin_phase1_2026_07_13

UPDATE public.all_sage_data SET unit_type = 'Mirror Cabin', date_updated = '2026-07-13', notes = COALESCE(notes || E'\n', '') || '[2026-07-13] Phase 1: unit_type Tiny Home → Mirror Cabin (boltfarmtreehouse.com markets Mirror Cabin + Floating Mirror Cabin; BusinessWire confirms ÖÖD units.)' WHERE id = 10045;
UPDATE public.all_sage_data SET unit_type = 'Mirror Cabin', date_updated = '2026-07-13', notes = COALESCE(notes || E'\n', '') || '[2026-07-13] Phase 1: unit_type Tiny Home → Mirror Cabin (eastzionresort.com/mirror-house-rentals — stand-alone mirrored tiny homes (qty 3 in Sage).)' WHERE id = 12237;
UPDATE public.all_sage_data SET unit_type = 'Mirror Cabin', date_updated = '2026-07-13', notes = COALESCE(notes || E'\n', '') || '[2026-07-13] Phase 1: unit_type Cabin → Mirror Cabin (Duplicate of South Cape Mirror Cabin (id 10326 already Mirror Cabin); Portland Monthly confirms ÖÖD at Two Capes.)' WHERE id = 9565;
-- INSERT sibling for Cameron Ranch Glamping - Bastrop (anchor id 10912); applied via script
