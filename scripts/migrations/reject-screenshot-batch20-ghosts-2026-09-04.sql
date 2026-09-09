-- Reject screenshot stubs that are not the operating lodging property.
-- Do not merge TCS Gordevio, Piccolo Paradiso, La Piantata, Landal Klein
-- Oisterwijk, Morgenrood, Glamp Outdoor Camp Veluwe, or Cotswold Campervan Stays.

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_glamping_lago_maggiore_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. glampinglagomaggiore.ch is a parked lander. Via Cantonale 1, 6673 Maggia / +41 91 753 18 18 and Safari Tent / total 15 / 200 are not an operator (Maggia is Valle Maggia, not Lago Maggiore). Nearby real camps are TCS Camping Gordevio (+41 91 753 14 44) and Camping Piccolo Paradiso — do not merge.'
WHERE id = 11228
  AND property_id = 'f6222aa9-2cd1-483c-8a7b-dc3607c9725d';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_glampingspot_oisterwijk_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. glampingspot.com 404s. Bosweg 1 / +31 13 1234567 and Safari Tent / total 15 / 200 are invented. Do not merge Landal Klein Oisterwijk, Nivon Morgenrood, Mini Camping Oisterwijk, or sibling Glampingspot stubs (ids 11121, 11117).'
WHERE id = 11087
  AND property_id = '3bdcab00-80d2-44a6-a8cb-e69ace01eef8';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_giardino_dei_semplici_viterbo_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. ilgiardinodeisemplici.com is a parked lander. Strada Palanzana 16, Viterbo / +39 0761 176 8002 is not a treehouse resort. Real Il Giardino dei Semplici B&B is in Manta (CN), giardinodeisemplici.eu. Real Viterbo treehouses are already-published La Piantata (ids 11042 / 13343–13346). Do not merge either.'
WHERE id = 11074
  AND property_id = 'ef66678c-ab31-48d5-b259-19f17e47ce60';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'No',
  discovery_source = 'web_research_glamp_outdoor_camp_alkmaar_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. glampoutdoorcamp.nl is a parked/spam domain. Glamp Outdoor Camp was a 2020–2021 pop-up brand (Veluwe, Appeltern, Zuna, Twente, Winterswijk, Schaijk, Burgers'' Zoo) — Alkmaar was never a location. Oudorperdijkje 1 / +31 72 5112034 and Safari Tent / total 20 / 150 are invented. Sibling Veluwe stub (id 11082) already rejected. Do not merge any Alkmaar campground.'
WHERE id = 11103
  AND property_id = '1f84a649-f6c5-43c8-8ca8-e0ad7f59e5eb';

COMMIT;
