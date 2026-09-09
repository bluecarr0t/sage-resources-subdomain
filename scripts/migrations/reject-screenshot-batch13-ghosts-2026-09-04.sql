-- Reject screenshot stubs that are not the operating lodging property.
-- Do not merge Glamping Hills Bragança, Hobbit Hillside Zacatlán, or Dorgali agriturismi.

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_glamping_hills_macao_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. glampinghills.com / Estrada Nacional 3, 6120-221 Mação / +351 925 678 910 and Safari Tent qty 10 are not an operator. Real Glamping Hills is João Madureira at Rua da Barreira 14, 5300-861 Santa Comba de Rossas, Bragança (glampinghills.pt, +351 938 712 419, 6 units). Do not relocate this Mação stub to Bragança or invent a second inventory.'
WHERE id = 11146
  AND property_id = 'c1948ec7-7f5f-4b40-b1af-3e8d032f81df';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_hobbit_hills_valle_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. hobbithillsecoresort.com / Calle del Bosque / +52 726 678 9012 and Hobbit House qty 9 are not an operator in Valle de Bravo. Do not merge Hotel Rodavento, Mi Cielo, or in-progress Hobbit Hillside Retreat Zacatlán (id 160).'
WHERE id = 157
  AND property_id = '357daacd-e969-43d5-9b5a-ea814b7f13d3';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_cala_gonone_treehouse_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. calagononetreehouse.com / Viale Bue Marino / +39 0784 987654 and Treehouse rates 230/270 are not an operator. Do not merge Agriturismo S''Ozzastru, Turismo Rurale Filieri, or Sa Mamma e Sole.'
WHERE id = 11065
  AND property_id = '470c2350-40f0-45ea-b580-7b9352cbf637';

COMMIT;
