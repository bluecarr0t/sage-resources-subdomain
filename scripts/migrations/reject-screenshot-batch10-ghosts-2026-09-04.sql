-- Reject screenshot stubs that are not a single operating lodging property,
-- plus one duplicate of already-published Lanzarote Retreats.
-- Do not merge nearby parks or the real Parco Ibiza / Landal Hoenderloo.

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_finca_arrieta_duplicate_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected as duplicate. Finca de Arrieta is already published as Lanzarote Retreats (ids 11201 / 13331 / 13332): official 21 units (12 yurts + 8 cottages + 1 villa). Do not republish this Haría stub or merge a second inventory.'
WHERE id = 11190
  AND property_id = '2722c9ec-2a0f-4b89-8086-b65447cb185c';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_nature_glamping_funchal_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. natureglampingmadeira.com / Estrada Monumental 306, Funchal with +351 291 700 100 and Treehouse qty 10 are not an operator (hotel-strip address). Do not merge Vi Naturae, Canto das Fontes, Soul Glamping, or the already-rejected Madeira Glamping stub.'
WHERE id = 11156
  AND property_id = 'ca65ffc1-ef16-4cf0-84c7-ca93d63804f2';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_glamping_ibiza_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. glampingibiza.com / Sant Antoni with +34 971 343 456 and Safari Tent qty 10 are not an operator. Do not merge Parco Ibiza / ex Camping San Antonio (official 71 stays, +34 626 450 286, parcoibiza.com).'
WHERE id = 11187
  AND property_id = '09bd3bf8-be5a-4bb4-b248-5feeedce7ef0';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_glamping_de_veluwe_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. glampingdeveluwe.nl / Krimweg 140, Hoenderloo with +31 55 378 1234 and Safari Tent qty 20 are not an operator. Krimweg 140 is Landal / Roompot Bungalowpark Hoenderloo (reception +31 55 378 1808). Do not merge Landal, Resort Veluwe (ex Hertshoorn), or a 2021 popup-glamping permit.'
WHERE id = 11100
  AND property_id = 'a31d1994-1d6a-44f2-81c8-a79e72168323';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_strandpark_zeeuwse_kust_duplicate_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected as duplicate. Same Helleweg 8 park as screenshot Camping De Zeeuwse Kust (id 11093), published as Strandpark De Zeeuwse Kust. Do not store a second Safari Tent inventory.'
WHERE id = 11095
  AND property_id = 'd74710f0-12ea-491a-a8a1-dd2145f99787';

COMMIT;
