-- ============================================================================
-- Reject screenshot stubs that are not a single operating lodging property.
-- Do not merge them into nearby real hotels.
-- ============================================================================

BEGIN;

-- Casa do Lago: casadolago.pt is an Aveiro wedding quinta, not Monchique
-- glamping. No published yurt operator at Caldas de Monchique 8550-232.
UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_casa_do_lago_mismatch_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. Sage URL casadolago.pt is Casa do Lago wedding venue (Aveiro), not a Monchique yurt/glamping operator. Address 8550-232 is Villa Termal Caldas de Monchique postal — do not merge. No published lodging inventory for this stub.'
WHERE id = 11141
  AND property_id = '0a6af250-91db-4bd1-bbc8-04618859b4ff';

-- Glamping Achterhoek: glampingachterhoek.nl / Vordenseweg 6 / +31 575 551 234
-- is not a 10-safari-tent park. Do not merge 't Haller (Beunkstege 4).
UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_glamping_achterhoek_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. No operator at glampingachterhoek.nl / Vordenseweg 6 Vorden. Qty 10 safari tents and phone +31 575 551 234 are placeholders. Distinct from mini-camping \'t Haller (Beunkstege 4; 1 safari tent + 25 pitches).'
WHERE id = 11102
  AND property_id = 'a2d80913-42bd-43c1-a7aa-00cbeebf9b47';

-- Glamping Hub Switzerland: OTA aggregator, not an Interlaken property.
UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_glampinghub_switzerland_aggregator_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. glampinghub.com/switzerland/ is an OTA listing index, not a lodging operator in Interlaken. Do not invent a campground or safari-tent inventory.'
WHERE id = 11213
  AND property_id = '282e213c-169b-4750-9cd3-0efb45acd364';

-- Mexico ghosts: fake sequential phones/coords and non-operating domains.
UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_mexico_ghost_stubs_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. treehousevillagetulum.com + phone +52 984 123 4567 + lat 20.1234 are placeholders. Do not merge Azulik, IKAL, Nest, or other Tulum treehouses.'
WHERE id = 49
  AND property_id = 'ed5ee560-8044-40eb-978a-e5e21b5f620b';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_mexico_ghost_stubs_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. nayarittreehouseresort.com + phone +52 329 567 8901 are placeholders. Do not merge Playa Viva or other Nayarit treehouses.'
WHERE id = 61
  AND property_id = 'f6998d0d-d2d9-4a4a-8cb4-c2215a341bfc';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_mexico_ghost_stubs_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. mayanjunglecamp.com + phone +52 984 890 1234 + lat 20.456789 are placeholders. Do not merge Mayan Glam, Casa Maya Kaan, or Libelula.'
WHERE id = 105
  AND property_id = '2e53c03e-31d2-4470-b7ed-0dc4fd817971';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_mexico_ghost_stubs_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. rivieraglampingparadise.com + phone +52 984 901 2345 + lat 20.789012 are placeholders. Do not merge Akumal Natura or other Akumal camps.'
WHERE id = 106
  AND property_id = 'bf1e862d-93f5-4a1c-9c3d-85758651f4bd';

-- Treehouse Belgium: dead site, dummy phone, fake Boomlaan 5.
-- Do not merge Boomkamp (Lakebossendreef 4, Oostkamp).
UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_treehouse_belgium_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. treehousebelgium.be is dead; Boomlaan 5 / +32 50 123 45 67 are placeholders. Distinct from Boomkamp (Lakebossendreef 4, 8020 Oostkamp) — do not silent-merge.'
WHERE id = 10981
  AND property_id = '78a04039-ddd8-4307-b778-c290d74bdae3';

COMMIT;
