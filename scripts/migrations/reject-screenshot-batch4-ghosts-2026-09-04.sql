-- Reject screenshot stubs that are not a single operating lodging property.
-- Do not merge nearby parks, hotels, or holiday homes.

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_nature_lodge_winterswijk_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. Sage Nature Lodge / Winterswijk / Kobstederweg 13 is not an operator. naturelodge.nl is two lodges in Rheezerveen (Vechtdal), not Winterswijk. Kobstederweg 13 is Capfun Het Wieskamp. Phone +31 543 569123 is a placeholder. Update by id 11116 only — do not touch Aljezur sibling 11147.'
WHERE id = 11116
  AND property_id = '129dc18d-a973-435f-8f6a-1d09e04ef4c3';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_hoge_kempen_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. Sage Glamping Resort Hoge Kempen at Zetellaan 68, Maasmechelen is a stub (that address is Terhills Hotel). Do not merge EuroParcs Hoge Kempen (Molenblookstraat 64, 3690 Zutendaal, +32 89 61 18 11).'
WHERE id = 10988
  AND property_id = '0aed1da5-0e61-45df-be42-67ffcb57a70f';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_bosbeekpoort_bree_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. B&B Glamping De Bosbeekpoort / Bosbeekstraat 1, 3960 Bree is not an operator glamping site. Do not merge vakantiewoning De Bosbeekpoort (Leemkuilstraat 2, Oudsbergen) or Beringen stub 10996.'
WHERE id = 10973
  AND property_id = '9c4b517e-8a5f-4727-b885-a60e53c10b17';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_nordsee_glamping_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. nordsee-glamping.de is not an operator. Phone +49 4425 123456 and Nordseestraße 1 are placeholders. Do not merge Wangerland Touristik / Nordsee-Campingplatz Schillig or Hooksiel.'
WHERE id = 11020
  AND property_id = '57d7d395-9d0d-4268-84e9-8e6de346fea7';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_il_sole_calenzano_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. ilsoledicalenzano.it is not a published agriturismo. Via delle Casacce 89 is not an operator lodging address. Do not merge Tenuta San Donato, Fattoria di Sommaia, or Due Cuori e una Yurta.'
WHERE id = 11075
  AND property_id = '54cc084d-0523-4205-9bb5-19f322519bb1';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_abenteuerland_walsrode_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. abenteuerland.com + phone +49 5161 123456 are placeholders. Am Vogelpark 10 is Weltvogelpark, not a glamping operator. Do not merge Eilers-Hoff or local Stellplätze.'
WHERE id = 11027
  AND property_id = '0674998e-16c5-4add-aac7-efc3115f145b';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_masia_la_vileta_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. masialavileta.com is not an operator. Phone +34 938 580 123 is a placeholder. Do not merge Mas Vinyoles Natura or Mas Redortra.'
WHERE id = 11205
  AND property_id = '47de716c-6c19-454d-a45d-123d205073fb';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_oasis_nature_lodge_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. oasisnaturelodge.com is a template/lorem-ipsum site ($999 rooms). Phone +351 258 123 789 is a placeholder. Do not merge Glamping de Cerveira or Green Paradise Glamping.'
WHERE id = 11148
  AND property_id = '56f43bd2-b8d2-4cdd-83d9-8b4a17ed8ff9';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_forest_glamping_hamme_mille_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. forestglamping.be is not an operator in Hamme-Mille. Phone +32 10 24 56 78 and Rue de la Bruyère 123 are placeholders. Do not merge ma-tinée, Druum, or Forest Glamping Zomergem.'
WHERE id = 10966
  AND property_id = 'b05b4816-cbc7-4ee2-b4f8-72f624fbf598';

COMMIT;
