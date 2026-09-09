-- Reject screenshot stubs that are not the operating lodging property.
-- Do not merge Traveling Light Yukon, Kali-Tree Zacatlán, Mama Loo.mm,
-- Waldhisli, Baumhaus Dörfle, Vintage Vacations, Moonraker Golden,
-- Treetop Cozumel, Les Refuges Perchés, Fairmont Montebello, Green Water
-- Resort, or Baumhaushotel Otterndorf (id 11021).

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_northern_yurts_whitehorse_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. northernyurts.com / 321 Wilderness Rd / 867-555-0404 and Yurt qty 6 are not an operator in Whitehorse. Do not merge Traveling Light B&B yurt or Top of the Hill Glamping (Mendenhall).'
WHERE id = 116
  AND property_id = '0448753a-2e6d-432b-b32e-85204f2b9303';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_puebla_treehouse_escape_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. pueblatreehouseescape.com / Camino a Cuetzalan Km 8 / +52 222 345 6789 and Treehouse qty 9 are not an operator (invented GPS 19.0345 / -97.8765). Do not merge Kali-Tree Zacatlán or Xic Xanac.'
WHERE id = 59
  AND property_id = '8714f863-7c9e-4263-a4c7-684018ea15b1';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_jungle_treehouse_escape_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. jungletreehouseescape.com / Ruta de los Cenotes Km 18 / +52 998 567 8901 and Treehouse qty 9 are not an operator (invented GPS 20.8765 / -86.5432). Do not merge Mama Loo.mm or already-rejected Jungle Treehouse Retreat (id 78).'
WHERE id = 53
  AND property_id = '25d1ffa3-6d2b-4dea-8544-b97a0426273d';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_baumhaushotel_schwarzwald_dunningen_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. baumhaushotel-schwarzwald.de / Dorfstraße 1, 78655 Dunningen / +49 741 123456 is not an operator. Former “Schwarzwald Baumhaushotel” is Waldhisli, Weintalstraße 28, 77704 Oberkirch (waldhisli.de, +49 7802 706529, 4 treehouses). Baumhaus Dörfle is Tretenhofstraße 76, 77960 Seelbach (10 luxury treehouses). Do not relocate this Dunningen stub to either. Leave Baumhaushotel Otterndorf (id 11021) untouched.'
WHERE id = 11010
  AND property_id = 'c56b4f54-9034-46b5-9af8-cf617804785a';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_airstream_glamping_vancouver_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. airstreamglampingvancouver.com / 1234 Glamping Road / 604-123-4567 and Airstream qty 10 are not an operator (downtown Vancouver pin 49.2827 / -123.1207). Do not merge Vintage Vacations / Shubie or peer-to-peer BC Airstreams.'
WHERE id = 166
  AND property_id = '7a6a65ce-1cc9-484c-aa42-6c5411eb5050';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_hobbit_hillside_zacatlan_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. hobbithillsideretreat.com / Calle de las Flores / +52 797 012 3456 and Hobbit House qty 6 are not an operator in Zacatlán. Do not merge Kali-Tree (Carretera San Miguel Tenango, San Pedro Atmatla) or already-rejected Hobbit Hills Eco Resort Valle de Bravo (id 157).'
WHERE id = 160
  AND property_id = '6f8094c0-407b-4cb7-8c3e-8fa94e91c814';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_enchanted_forest_retreat_golden_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. enchantedforestretreat.com / 456 Enchanted Way / 250-344-5678 and Treehouse qty 9 are not an operator in Golden. Do not merge Moonraker Treehouse & Cabins, Gunnywolf, or The Blaeberry Base.'
WHERE id = 47
  AND property_id = 'a312c944-e087-4fb9-95e8-739ffe1e9c70';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_tropical_treehouse_haven_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. tropicaltreehousehaven.com / Carretera Costera Sur Km 15 / +52 987 678 9012 and Treehouse qty 5 are not an operator in Cozumel (invented GPS 20.4321 / -86.8765). Do not merge Treetop Cozumel apartments.'
WHERE id = 54
  AND property_id = '4772acec-7be7-4a19-881e-a1bf99055d17';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_tropical_treehouse_haven_holbox_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected as sibling ghost of Cozumel Tropical Treehouse Haven stub (same property_id). Isla Holbox / +52 984 901 2345 / invented GPS 21.123456 / -87.123456 is not an operator. Do not merge Treetop Cozumel.'
WHERE id = 85
  AND property_id = '4772acec-7be7-4a19-881e-a1bf99055d17';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_san_cristobal_treehouse_retreat_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. sancristobaltreehouseretreat.com / Camino a Rancho Nuevo Km 5 / +52 967 901 2345 and Treehouse qty 5 are not an operator. Do not merge El Cielo or other San Cristóbal de las Casas cabins.'
WHERE id = 57
  AND property_id = '015610cc-88e0-418a-a549-84d0f9f926c8';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_riviera_maya_glamping_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. rivieramayaglamping.com / Calle 12 Norte / +52 984 456 7890 and Safari Tent qty 12 / Sage 1088 are not an operator (invented GPS 20.56789 / -87.56789). Do not merge Serenity Luxury Tented Camp Xpu-Ha, Ku Kuk, or Akumal Natura.'
WHERE id = 101
  AND property_id = '940b564a-a848-4087-b783-0e6945fb3707';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_outaouais_treehouses_montebello_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. treetopoutaouais.com / 300 Chemin des Bois-Francs / 819-423-1111 and Treehouse qty 6 are not an operator. Sage pin 45.6501 / -74.9494 copies Fairmont Le Château Montebello (392 Notre Dame, 819-423-6341). Do not merge Fairmont, Parc Omega, HOM Mini Chalets, or Les Refuges Perchés (id 42).'
WHERE id = 41
  AND property_id = '5dca3cce-edd4-4afa-8e70-91c8bfb22961';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_riviera_hobbit_resort_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. rivierahobbitresort.com / Ruta de los Cenotes / +52 998 456 7890 and Hobbit House qty 12 are not an operator in Puerto Morelos. Do not merge Mama Loo.mm or Kali-Tree.'
WHERE id = 155
  AND property_id = '7960368b-5d1b-4236-8a8b-1b706409a4d7';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_dome_oasis_pemberton_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. domeoasis.com / 4321 Pemberton Meadows Road / 604-894-4321 and Dome qty 5 are not an operator. Do not merge Green Water Resort (944 Erickson Rd, cedar cabin village) or Coast Range Alpine Yurt.'
WHERE id = 131
  AND property_id = '3d1c2582-52c9-4ad8-bc85-3668d9021ecf';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_treehouse_getaway_huntsville_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. treehousegetaway.ca / 789 Treehouse Trail / 705-789-9876 and Treehouse qty 7 are not an operator in Huntsville. Do not merge Muskoka peer-to-peer treehouses or Les Refuges Perchés.'
WHERE id = 48
  AND property_id = '4694adbc-dd08-4f9c-95f1-ccb8feb4d2cf';

COMMIT;
