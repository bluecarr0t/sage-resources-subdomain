-- Reject screenshot stubs that are not a single operating lodging property.
-- Do not merge nearby parks, hotels, or holiday homes.

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_biosfera_val_mustair_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. Sage Glamping Resort Biosfera Val Müstair / Via Maistra 91, Tschierv is not an operator. biosfera.ch is the Val Müstair nature-park booking portal (hotels, apartments, camping). Phone +41 81 858 57 58 is not a glamping-resort line. Do not merge Hotel Al Rom (Plaun Grond 27) or Camping Muglin.'
WHERE id = 11232
  AND property_id = 'ab09b1b0-9ad4-4ed1-bcba-bab47dde2768';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_biosphaere_blatten_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. Sage Glamping Resort Biosphäre Blatten / Dorfstrasse 1, 3919 Blatten is not an operator. biosphaere.ch is UNESCO Biosphäre Entlebuch (Schüpfheim), not Valais. Blatten (Lötschental) was destroyed by the May 2025 Birch glacier collapse. Do not merge Reka-Feriendorf Blatten-Belalp (different Blatten bei Naters).'
WHERE id = 11238
  AND property_id = '2dac725f-ecdd-494b-bb3e-9aa8c78ada07';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_nature_resort_mosel_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. natureresortmosel.de is not an operator. Weinstrasse 10 / +49 6531 987654 are placeholders. Do not merge MoselCamping Bernkastel (Hauptstraße 165), KNAUS Bernkastel-Kues, or Mosel Glamping in Traben-Trarbach.'
WHERE id = 11015
  AND property_id = '2d26448a-1edc-4751-9006-a10f9139f9e0';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_ostsee_glamping_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. ostsee-glamping.de is not an operator. Zum Zeltplatz 1 / +49 38292 8610 are not a Kröpelin glamping resort. Do not merge Campingplatz Zur Kühlung / Diedrichshagen (Zur Plantage 8).'
WHERE id = 11017
  AND property_id = 'a0290dc1-297e-4e3a-ace1-520b55f89064';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_yurt_village_haliburton_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. Sage Yurt Village / 789 Lakeside Dr, Haliburton with 705-555-0303 and yurtvillage.com is a placeholder. Do not merge McGovern''s Retreat, Woods Parka Lodge, or Lifestyles Management Yurt Village (Ashburn). Update by id 115 only — do not touch Lemele sibling 11123.'
WHERE id = 115
  AND property_id = '824280ac-8c08-4450-b40c-b196a199f7ce';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_tenerife_glamping_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. tenerifeglamping.com is not an operating lodging site. Phone +34 922 123456 and Carretera General del Norte are placeholders. glamping-tenerife.com is a coming-soon teaser, not inventory. Do not merge Adeje-registered Glamping Tenerife SL or independent island listings.'
WHERE id = 11191
  AND property_id = '5bd78a7b-dcbc-4624-8ee8-3b5e97b6e050';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Closed',
  discovery_source = 'web_research_scube_park_berlin_closed_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. Scube Park Columbia / scubepark.de brand closed; site rebranded to EASY Lodges Berlin before January 2019 at the same Columbiadamm 160 address. Do not merge or rename this stub into EASY Lodges (different current brand). Sage qty 34 cubes unpublished.'
WHERE id = 11035
  AND property_id = '42a8941c-9302-495e-bf67-9ed67e29b925';

COMMIT;
