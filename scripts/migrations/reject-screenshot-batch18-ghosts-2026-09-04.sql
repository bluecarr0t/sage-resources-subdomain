-- Reject screenshot stubs that are not the operating lodging property.
-- Do not merge Eastwind Hotels Windham (ids 10018 / 10498), Vintage Hideaway,
-- The Blaeberry Base, Glamping Resorts Ltd, or Hobbit Haven Eco Village (id 159).

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_eastwind_lushna_nature_retreat_dup_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected as a duplicate SKU. Eastwind Windham is already published as Eastwind Hotels Windham: Cabin qty 7 (id 10498) + Tiny Home / Lushna Suite qty 3 (id 10018) = official 10 Lushna units, plus 22 hotel rooms unpublished. Official 5088 Route 23, Windham NY 12496, (518) 734-0553, eastwindhotels.com. This “Eastwind Lushna Nature Retreat” A-Frame qty 26 / total 26 is not a second property. Do not merge or add a third Windham row. Leave rejected Eastwind Hotel & Bar (id 11348) untouched.'
WHERE id = 12948
  AND property_id = '7a4fcd80-a364-4a1c-99e4-0c9d4aa91243';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_ontario_airstream_retreat_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. ontarioairstreamretreat.com / 5678 Retreat Lane / 416-987-6543 and Airstream qty 7 are not an operator (downtown Toronto pin 43.6532 / -79.3832, postal M5V 2T6). Do not merge Vintage Hideaway (Hammond Hill / Rockland).'
WHERE id = 167
  AND property_id = '0f3b2edc-7445-4278-9a3d-63ceeda3b583';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_kootenay_safari_lodge_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. kootenaysafarilodge.com / 444 Mountain View Dr / +1 250-234-5678 and Safari Tent qty 7 / 95 are not an operator in Nelson.'
WHERE id = 98
  AND property_id = '020efce8-5756-4d2d-a08d-90fa2b16a2a8';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_airstream_haven_victoria_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. airstreamhavenvictoria.com / 1213 Haven Street / 250-456-7890 and Airstream qty 6 are not an operator (downtown Victoria pin). Already-rejected Airstream Haven Baja (id 177) is a sibling invented brand. Do not merge Vintage Vacations or peer-to-peer Island Airstreams.'
WHERE id = 169
  AND property_id = 'ff343d6c-0f96-404c-855c-9d273d6ac712';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_oaxaca_treehouse_getaway_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. oaxacatreehousegetaway.com / Camino al Monte, San Agustin Etla / +52 951 345 6789 and Treehouse qty 6 are not an operator (invented GPS 17.1234 / -96.5678).'
WHERE id = 51
  AND property_id = '7d309480-729d-45d3-9df5-c61d542e84a7';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_magic_hobbit_village_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. magichobbitvillage.com / Barrio del Cerrillo / +52 967 567 8901 and Hobbit House qty 7 / 28 are not an operator in San Cristóbal de las Casas. Leave Hobbit Haven Eco Village Mazunte (id 159) untouched.'
WHERE id = 156
  AND property_id = 'e6f47de9-b7a0-47f6-985c-63edca90a144';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_lake_superior_safari_lodge_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. lakesuperiorsafarilodge.com / 654 Lakeshore Rd / +1 807-678-9012 and Safari Tent qty 9 / 223 are not an operator in Thunder Bay.'
WHERE id = 94
  AND property_id = '97af029c-0f05-4d5b-8990-48bb29dd701a';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_lakeside_airstream_resort_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. lakesideairstreamresort.com / 1617 Lakeside Avenue / 250-123-4567 and Airstream qty 9 are not an operator in Kelowna.'
WHERE id = 171
  AND property_id = 'e02fe2fc-41b9-4da4-ac92-d69216f96797';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_yurt_getaway_pei_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. yurtgetawaypei.com / 444 Island Rd / 902-555-1010 and Yurt qty 7 are not an operator (Charlottetown pin, postal C1A 1A1).'
WHERE id = 122
  AND property_id = '0678cd57-8ac4-48a3-bf33-a7dffe78ba8e';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_cave_of_wonders_sma_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. caveofwonders.com / Camino a la Cueva / +52 415 789 0123 and Hobbit House qty 5 / 68 are not an operator in San Miguel de Allende.'
WHERE id = 158
  AND property_id = 'cedbe286-def8-43a3-b0f2-44b86c3edc94';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_jungle_glamping_retreat_tulum_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. jungleglampingretreat.com / Av. Coba Sur / +52 984 234 5678 and Safari Tent qty 8 are not an operator (invented GPS 20.234567 / -87.234567).'
WHERE id = 99
  AND property_id = 'f8e76d4a-9f33-4ba2-87d6-8020a2b640ce';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_hobbit_haven_retreat_golden_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. hobbithavenretreat.com / 123 Hobbit Lane / 555-123-4567 and Hobbit House qty 6 are not an operator in Golden. Do not merge The Blaeberry Base (domes/cabins on Oberg Johnson Road).'
WHERE id = 148
  AND property_id = 'f52081b3-d1f3-4d63-9b02-ae09af6d2894';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_whistler_dome_resort_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. whistlerdomeresort.com / 987 Whistler Road / +1 604-932-9876 and Dome qty 7 / 123 are not an operator in Whistler.'
WHERE id = 136
  AND property_id = 'f81d883f-137a-4d45-a7ef-d012c43c0572';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_yucatan_jungle_treehouses_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. yucatanjungletreehouses.com / Carretera Valladolid-Mérida Km 10 / +52 985 234 5678 and Treehouse qty 8 / 676 are not an operator (invented GPS 20.987654 / -88.987654).'
WHERE id = 86
  AND property_id = 'f9538b32-afac-4f77-bb09-a435d78b78b3';

COMMIT;
