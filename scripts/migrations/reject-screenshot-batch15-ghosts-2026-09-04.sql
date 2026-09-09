-- Reject screenshot stubs that are not the operating lodging property.
-- Do not merge Vintage Vacations / Shubie, East Sooke Treehouse, Owl's Perch,
-- Wildpod, Bella Baia / Cannaverde, Mama Loo.mm, Northeast Cove, Baddeck Domes,
-- Cabot Shores, Mount Engadine, Hidden Hobbit, or Outaouais Treehouses (id 41).

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_rocky_mountain_airstream_park_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. rockymountainairstreampark.com / 2425 Mountain Road / 403-654-3210 and Airstream qty 8 are not an operator in Banff (T1L 1A1 is a Banff PO-box pattern, not a park). Do not merge Tunnel Mountain, Mount Engadine, or peer-to-peer Rockies Airstreams.'
WHERE id = 174
  AND property_id = 'c1e7e2c6-1d5a-40f5-8390-116a3394426c';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_quebec_vintage_airstream_park_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. quebecairstreampark.com / 91011 Vintage Way / 514-321-0987 and Airstream qty 8 are not an operator in Montreal (H3B 1X8 is downtown office stock). Do not merge Vintage Vacations / Shubie or Tamarak Grove.'
WHERE id = 168
  AND property_id = 'ceeec728-f4ae-46ee-a8be-1a4a1880b2ec';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_hobbit_hideaway_tepoztlan_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. hobbithideaway.com / Camino a Amatlán / +52 739 123 4567 and Hobbit House qty 10 are not an operator in Tepoztlán. Do not merge Casa Hobbit Xico, Hidden Hobbit Beaver Valley, or Tubo Hotel.'
WHERE id = 161
  AND property_id = 'd1455895-e040-4fcd-b126-2d8628f0edd3';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_outaouais_treehouse_village_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. outaouaistreehousevillage.com / 123 Treehouse Lane / 819-555-1234 and Treehouse qty 10 are not an operator in Denholm (J8N 9Z9 is invented). Do not merge Air-Eau-Bois, HOM Mini Chalets, Les Refuges Perchés (id 42), or in-progress Outaouais Treehouses Montebello (id 41).'
WHERE id = 69
  AND property_id = 'd590e39b-d20a-4619-82bd-604d1baeac43';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_sooke_treehouse_resort_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. sooketreehouseresort.com / 456 Forest Rd / 250-555-7890 and Treehouse qty 7 are not an operator. East Sooke Treehouse is 1 unit at 6601 East Sooke Rd (eastsooketreehouse.com, 250-686-5652). Owl''s Perch is the published Airbnb at 2519 Brule Dr (id 10942). Do not relocate this stub to either.'
WHERE id = 71
  AND property_id = 'ac8c9d02-191d-49aa-80bd-4da8b43942c9';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_forest_airstream_lodge_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. forestairstreamlodge.com / 2223 Forest Trail / 613-987-6543 and Airstream qty 7 are not an operator in Ottawa (K1A 0A1 is the Parliament Hill postal code). Do not merge Vintage Hideaway Hammond Hill.'
WHERE id = 173
  AND property_id = '75fcfbfc-54c3-4037-8f07-d7bff8e7d9a9';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_treehouse_retreat_whistler_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. treehouseretreatbc.com / 654 Alpine Rd / 604-555-8765 and Treehouse qty 6 are not an operator in Whistler. Do not merge The Aspens “Treehouse” condo or the Creekside Gondola Way vacation home.'
WHERE id = 75
  AND property_id = '95fb7ab4-0412-4559-9e86-d24e54330fef';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_middle_earth_getaway_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. middleearthgetaway.com / 321 Middle-earth Drive / 555-456-7890 and Hobbit House qty 10 are not an operator in Blue Mountains. Do not merge Hidden Hobbit (Hidden Hideouts, Beaver Valley) or Lothlorien Woods.'
WHERE id = 151
  AND property_id = '2ef441e5-944e-4919-adbf-700d46e2b805';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_riviera_maya_yurt_camp_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. rivieramayayurtcamp.com / Av. 10 Norte / +52 1 984 345 6789 and Yurt qty 8 are not an operator (invented GPS 20.654321 / -87.654321). Do not merge Mama Loo.mm (Ruta de los Cenotes, Puerto Morelos) or Akumal Natura.'
WHERE id = 124
  AND property_id = '3bdeaa77-42a8-435e-bd70-6d2bd9924d0d';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_agricampeggio_terra_di_fuoco_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. agricampeggioterrafuoco.it / Via G. Amendola / +39 089 877 777 and Safari Tent 140/160 are not an operator in Maiori. Real Maiori camps are Bella Baia / Amalfi Coast Glamping (Via Diego Taiani 26, +39 333 7737595) and Cannaverde (Via Diego Taiani 22bis). Tenuta Terra di Fuoco is a Vesuvius agriturismo in Terzigno, not this stub. Do not relocate.'
WHERE id = 11061
  AND property_id = '04c182b3-1c4d-42c2-b54f-a86053e13e56';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_enchanted_earth_retreat_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. enchantedearthretreat.com / 789 Enchanted Way / 555-345-6789 and Hobbit House qty 8 are not an operator in Tofino. Do not merge published Wildpod (id 10723) or Pacific Rim National Park lodging.'
WHERE id = 150
  AND property_id = '972e66a3-6019-458b-b716-e6280c0396a3';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_enchanted_earth_retreat_playa_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected as sibling ghost of Tofino Enchanted Earth Retreat stub (same property_id). Carretera Federal 307 / +52 984 234 5678 is not an operator in Playa del Carmen. Do not merge Wildpod.'
WHERE id = 154
  AND property_id = '972e66a3-6019-458b-b716-e6280c0396a3';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_seaside_airstream_retreat_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. seasideairstreamretreat.com / 2021 Seaside Drive / 902-654-3210 and Airstream qty 6 are not an operator in Halifax (B3H 1A1 is a South End postal pattern). Do not merge Vintage Vacations at Shubie Campground (30 John Brenton Dr, Dartmouth) or Martinique Airstream Hipcamp.'
WHERE id = 172
  AND property_id = '88db6465-85d0-4a94-9653-08a02b6397ec';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_dome_glamping_retreat_cape_breton_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. domeglampingretreat.com / 456 Highland Road / 902-567-4567 and Dome qty 6 are not an operator (B1A 1A1 is a Glace Bay postal pattern). Do not merge published Northeast Cove Geodomes (id 13074), Baddeck Domes, Archer''s Edge, or Cabot Shores.'
WHERE id = 134
  AND property_id = '1239f238-ca50-48b5-8117-7c84435527c4';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_rocky_mountain_domes_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. rockymountaindomes.com / 321 Mountain View Drive / 403-678-3210 and Dome qty 9 are not an operator in Canmore. Rocky Mountain Escape Dome is Rock Lake Provincial Park (Jasper/Willmore), not Canmore. Do not merge Mount Engadine, Skyridge, or The Blaeberry Base.'
WHERE id = 135
  AND property_id = '8d8983d4-f1a2-41b9-a9c6-f3c797c3b956';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_riviera_maya_airstream_retreat_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. rivieramayaairstreamretreat.com / Avenida 5 / +52 1 984 876 5432 and Airstream qty 7 are not an operator (invented GPS 20.6543 / -87.1234). Do not merge Paamul or peer-to-peer Riviera Maya trailers.'
WHERE id = 176
  AND property_id = 'adf1e6b4-2ed6-43c8-969f-d999c3e5755a';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_pacific_rim_domes_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. pacificrimdomes.com / 654 Pacific Rim Highway / 250-725-6543 and Dome qty 5 are not an operator in Tofino. Do not merge published Wildpod (6 waterfront domes, 150 Grice Bay / 174 West St).'
WHERE id = 137
  AND property_id = '68154d15-269d-4122-9285-2995d6e18157';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_yurt_adventure_banff_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. yurtadventure.com / 111 Rocky Rd / 403-555-0707 and Yurt qty 15 are not an operator in Banff. Do not merge Mount Engadine Lodge''s request-only yurt or Tunnel Mountain.'
WHERE id = 119
  AND property_id = '6120b48c-9767-4add-b0fd-1082833c431d';

COMMIT;
