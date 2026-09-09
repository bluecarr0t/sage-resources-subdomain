-- Reject screenshot stubs that are not a single operating lodging property.
-- Do not merge nearby parks, hotels, or holiday homes.

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_nature_family_glamping_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. naturefamily.pt / Rua do Vale Serrano, Ferreira do Zêzere with +351 249 361 680 and Safari Tent qty 10 are not an operator. Do not merge Camping Quinta da Cerejeira or Alma do Zêzere. Different town from Ferreira do Alentejo "Glamping Portugal".'
WHERE id = 11163
  AND property_id = 'da75e6e0-7a35-4c73-9a06-e104005250b5';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_madeira_glamping_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. madeiraglamping.com / Caminho da Lombada, Ponta do Sol with +351 965 123 456 and Yurt qty 10 are placeholders. Do not merge Canto das Fontes (Caminho das Fontes, Anjos; 3 tents).'
WHERE id = 11155
  AND property_id = '1dd49bc3-d09c-4771-8050-d92327b40aea';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_yucatan_treehouse_lodge_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. yucatantreehouselodge.com / Carretera Valladolid–Chichén Itzá Km 10 with +52 985 789 0123, coords 20.9876/-88.1234, and Treehouse qty 6 are placeholders. Do not merge nearby Valladolid or Chichén Itzá hotels.'
WHERE id = 55
  AND property_id = '3c485cbb-298b-4d7a-b92e-bb32ccac6bc1';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_verborgen_verblijf_ouddorp_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. hetverborgenverblijf.nl / Klepperweg 1, Ouddorp with +31 187 681234 is not an Ouddorp operator. Real Het Verborgen Verblijf is B&Bs in Doornspijk (Rode Landsweg 28). Do not merge that Veluwe stay, RCN Toppershoedje, or ECO Grevelingenstrand.'
WHERE id = 11132
  AND property_id = '568a2320-8922-436a-b9a3-af8313aae81a';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_bosbeekpoort_beringen_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. glampingdebosbeekpoort.be / Bosbeekstraat 1, 3580 Beringen with +32 11 23 45 67 is a placeholder. Update by id 10996 only — do not touch rejected Bree sibling 10973. Do not merge Vakantiewoning De Bosbeekpoort (Oudsbergen) or Witte Merel Glamping (Beringen).'
WHERE id = 10996
  AND property_id = 'd33de290-bb6c-4c29-8213-3e60618de8ef';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_treehouse_lodge_tulum_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. treehouselodgetulum.com / Carretera Tulum–Boca Paila Km 5.5 with +52 984 123 4567, coords 20.123456/-87.123456, and Treehouse qty 6 are placeholders. Do not merge Ajal Tulum, H2Ojos, or Libélula.'
WHERE id = 77
  AND property_id = 'aa330153-c24f-4d7b-ac5e-07497865906d';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_sierra_madre_treehouse_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. sierramadretreehouseresort.com / Camino a Mermejita, Mazunte with +52 958 890 1234, coords 15.123456/-96.123456, and Treehouse qty 7 are placeholders. Do not merge Mazunte beach hotels or Aura-style Chiapas stays.'
WHERE id = 84
  AND property_id = '41cc80db-3bd0-47a2-8543-ad0f33666df8';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_rocky_mountain_safari_camp_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. rockymountainsafaricamp.com / 789 Alpine Ave, Canmore with +1 403-456-7890 and Safari Tent qty 15 are placeholders. Do not merge Canmore Adventures tours, Rocky Mountain Ski Lodge, or Banff/Canmore hotels.'
WHERE id = 92
  AND property_id = '1d2cc233-a2ac-4fa5-940b-12705ab5fe49';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_glamping_suisse_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. glampingsuisse.ch / Route de la Télécabine 1, Vernayaz with +41 79 123 45 67 is a placeholder. Do not merge Alp Safari (Nax) or Rêves Gourmands (Vernayaz).'
WHERE id = 11217
  AND property_id = '8b2eee34-ec35-4b20-bf76-cf3f089308c0';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_selva_treehouse_retreat_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. selvatreehouseretreat.com / Avenida 10, Playa del Carmen with +52 984 234 5678, coords 20.6543/-87.1234, and Treehouse qty 7 are placeholders. Do not merge Playa del Carmen hotels or Tulum treehouse operators.'
WHERE id = 50
  AND property_id = 'd07359a0-eb71-4c3f-80cc-9cacd2bb6200';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_oaxaca_nature_retreat_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. oaxacanatureretreat.com / San José del Pacífico with +52 951 012 3456, coords 16.123456/-96.789012, and Safari Tent qty 7 are placeholders. Do not merge San José del Pacífico cabins or Mazunte stays.'
WHERE id = 107
  AND property_id = '3a838079-02f8-427e-8ebd-2f1ca63e7fa2';

COMMIT;
