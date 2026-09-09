-- Reject screenshot stubs that are not a single operating lodging property.
-- Do not merge nearby parks, hotels, or holiday homes.

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_bavarian_forest_holidays_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. bavarianforestholidays.com / Dorfstraße 47, 94209 Regen is not an operator. LinkedIn "Bavarian Forest Holidays" is a Bayerisch Eisenstein domain stub. +49 9921 604960 is not a glamping line. Do not merge published Bavarian Forest Glamping (id 11006, Grafenau), FORSTGUT (Schlossau 1), Ferienwohnungen Rauch (Dorfstraße 34), or Kanu & Camp Aqua Hema.'
WHERE id = 11040
  AND property_id = '01c14727-0ac7-4d03-90b9-181eaf288452';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_pec_safari_retreat_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. princeedwardcountysafariretreat.com / 222 Vineyard Ln, Picton with +1 613-890-1234 and Safari Tent qty 10 are placeholders. Do not merge Fronterra Farm or Lakecroft (Cherry Valley).'
WHERE id = 96
  AND property_id = '17b28f05-fafc-4c8f-9d4d-57247c21dee2';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Closed',
  discovery_source = 'web_research_crane_29_closed_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. Canopy & Stars at Crane 29 was a 130-night 2017 pop-up treehouse on Bristol Harbourside crane 29 (M-Shed). Official canopyandstars.co.uk/crane29: dismantled after late September 2017. Do not keep as a live listing or rename into the Canopy & Stars marketplace.'
WHERE id = 11287
  AND property_id = '657d91af-e6e9-4a22-b072-672d9354187f';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_eco_treehouse_resort_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. ecotreehouseresort.com / Carretera a Chamula Km 5 with +52 967 678 9012, coords 16.123456/-92.123456, and Treehouse qty 9 are placeholders. Do not merge Aura Eco Glamping (Calz. de la Quinta 128) or Gaia''s Glamping.'
WHERE id = 82
  AND property_id = '676bb326-eec5-4e16-9cad-b0e0e9e01c7a';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_treehouse_de_uil_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. treehousedeuil.nl / Bosweg 12, Apeldoorn with +31 55 1234567 is not an operator. Do not merge Boomhut De Uil (Achter De Hoven 1, Leeuwarden) or Vakantiepark Miggelenberg treehouses.'
WHERE id = 11111
  AND property_id = '13cff2d6-ea22-45c3-a42e-3ce21b1f4e2c';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_boomhut_xxl_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. boomhutxxl.nl is not a Drouwen operator. Boomhut XXL is a 2017 SBS6 treehouse product placed at several Drenthe parks. Sage Gasselterstraat 7 / +31 599 564040 copies Vakantiepark Drouwenerzand (their Luxe Boomhut is a different brand). Do not merge Drouwenerzand, Camping Diever, Torentjeshoek, or Westerbergen.'
WHERE id = 11113
  AND property_id = '5f8690af-083f-415c-b63c-da975228b751';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_tulum_treehouse_escape_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. tulumtreehouseescape.com / Aldea Zama with +52 984 567 8901, coords 20.876543/-87.876543, and Treehouse qty 5 are placeholders. Do not merge Ajal Tulum, Treehouse Tulum H2Ojos, or the Design Hotels Tulum Treehouse villa.'
WHERE id = 81
  AND property_id = '8f8518fc-433a-4a61-84fa-a1dad4e7df89';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_tulum_jungle_tents_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. tulumjungletents.com / Carretera Tulum-Coba Km 10 with +52 984 678 9012, coords 20.345678/-87.345678, and Safari Tent qty 9 are placeholders. Do not merge Nativus Tulum, Libélula Tulum, or Turquesa Tulum Jungle Camping.'
WHERE id = 103
  AND property_id = '23311c3f-208b-45b7-9ebd-91704bb65f32';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_yurt_glamping_belgium_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. yurtglampingbelgium.com / Yurtstraat 12, 9000 Ghent with +32 9 123 45 67 is a placeholder. Do not merge Urban Gardens Gent (Campinglaan 16) or the Horebeke Geuzenhoek yurt.'
WHERE id = 10980
  AND property_id = '48999202-d5d8-40f1-bc66-8479e1024911';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_jungle_canopy_treehouses_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. junglecanopytreehouses.com / Laguna Bacalar with +52 983 789 0123, coords 18.123456/-88.123456, and Treehouse qty 6 are placeholders. Do not merge Boca de Agua (Chetumal–Cancún Km 4.5).'
WHERE id = 83
  AND property_id = 'bca6646b-26a9-4462-9843-3b3168ebbdf1';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_glamping_hub_seelisberg_aggregator_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. Sage URL is a Glamping Hub destination page, not an operator. Do not merge Naturcamping Seelisberg (Seelistrasse 4; 4m/5m/6m yurts).'
WHERE id = 11225
  AND property_id = '3cc6b773-ba64-4662-abcf-b8ce7fe935fb';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_yukon_wilderness_safari_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. yukonwildernesssafaricamp.com / 333 Wilderness Rd, Whitehorse with +1 867-901-2345 and Safari Tent qty 5 are placeholders. Do not merge Sky High Wilderness Ranch, Takhini Hot Springs, or Mount Sima Alpine Escape.'
WHERE id = 97
  AND property_id = 'c00e6122-40f4-44bc-bf4b-7cd288e1a351';

COMMIT;
