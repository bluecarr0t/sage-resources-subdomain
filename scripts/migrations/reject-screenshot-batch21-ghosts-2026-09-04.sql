-- Reject screenshot stubs that are not the operating lodging property.
-- Do not merge Spruce Lake, Perch Bay, Safari Lodge Zandvoort, Sea Lodges,
-- Baja Nomads, Rancho Danza del Sol, or Hoeve den Overdraght.

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_treehouse_adventure_kenora_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. treehouseadventure.ca / 987 Adventure Rd / +1 807-555-9876 and Treehouse qty 7 / 314 are not an operator in Kenora. Do not merge Spruce Lake Resort or Perch Bay.'
WHERE id = 76
  AND property_id = '49c84883-9b41-4a6a-b13b-74e48c23fec8';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_luxe_safari_tent_zandvoort_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. luxesafaritentresort.nl / Strandweg 1 / +31 23 1234567 and Safari Tent / total 20 / 200 are invented. Do not merge Safari Lodge Zandvoort (events venue) or Sea Lodges Zandvoort.'
WHERE id = 11120
  AND property_id = '4eaf6b13-5850-43ce-98a7-5d45fb4f15af';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_baja_treehouse_retreat_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. bajacaliforniatreehouseretreat.com / Calle Los Mangos / +52 612 678 9012 and Treehouse qty 5 / 519 are not an operator in Todos Santos. Do not merge Baja Nomads Hotel or Rancho Danza del Sol casitas.'
WHERE id = 62
  AND property_id = '9c01ebd9-011f-4d4f-bb68-7cf4e6b59692';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_glamping_flandres_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. glampingflandres.be / Westouterseweg 3 / +32 57 33 35 66 and Safari Tent / total 10 / 180 are not an operator in Poperinge. Nearby real farm glamping is Hoeve den Overdraght, Woestenseweg 31, +32 57 33 31 09 — do not merge.'
WHERE id = 10986
  AND property_id = '7201c8d4-3c41-4abc-9de4-cdf1eb1c7939';

COMMIT;
