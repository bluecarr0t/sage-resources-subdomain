-- Reject screenshot stubs that are not the operating lodging property.
-- Do not merge Camping Grächbiel, Adventurly Hannigalp, or Soul Glamping Madeira.

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_glamping_graechen_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. glamping-graechen.ch / Heiminen 468 / +41 27 956 16 16 and Safari Tent qty 10 are not an operator. Do not merge Camping Grächbiel (Eschulbodo 491, camping-graechbiel.ch) or Adventurly pop-up bubbles on Hannigalp.'
WHERE id = 11233
  AND property_id = '48a51b50-a477-4164-b047-0f9bf98d8df6';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_soul_glamping_lagos_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. Lagos Estrada da Praia / +351 912 345 678 is not an operator. soulglamping.com is Germana Francisco in Prazeres, Madeira (Caminho do Jardim Pelado, +351 961 340 400). Do not relocate this Lagos stub to Madeira or merge Lama / BeauDa.'
WHERE id = 11137
  AND property_id = '511a47da-2c7e-4dd2-b0d1-1246b6b7e948';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_soul_glamping_ibiza_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected as sibling ghost of Lagos Soul Glamping stub (same property_id). Santa Gertrudis / +34 971 325 235 is not an Ibiza operator. Do not merge Madeira Soul Glamping.'
WHERE id = 11186
  AND property_id = '511a47da-2c7e-4dd2-b0d1-1246b6b7e948';

COMMIT;
