-- Reject screenshot stubs that are not the operating lodging property.
-- Do not merge Les Refuges Perchés (id 42), La Station Baraque de Fraiture,
-- La Petite Baraque, or Clayoquot / Tofino safari camps.

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_refuge_du_faubourg_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. refugedufaubourg.com / 1000 Chemin des Pionniers / +1 819-688-3628 and Treehouse qty 7 / 223 are not an operator in St-Faustin-Lac-Carré. Real nearby treehouses are Les Refuges Perchés, 5000 Chemin du Lac-Caribou (id 42, leave untouched). Do not merge.'
WHERE id = 43
  AND property_id = '86cbcc7b-26e6-4c53-8d06-f028337f437c';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_oaxaca_yurt_retreat_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. oaxacayurtretreat.com / Camino a San Agustin 123 / +52 1 951 234 5678 and Yurt qty 7 are not an operator (invented GPS 17.123456 / -96.123456).'
WHERE id = 123
  AND property_id = 'eccf67b2-eaf0-48fc-8ab1-dcf3601aa3d6';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_glamping_sainte_marguerite_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. glampingsaintemarguerite.com / 1234 Chemin des Pionniers / +1 450-228-1234 and Dome qty 7 / 34 are not an operator in Sainte-Marguerite-du-Lac-Masson.'
WHERE id = 129
  AND property_id = 'a05203b2-301b-4155-863c-78432c667dd6';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_vancouver_island_safari_getaway_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. vancouverislandsafarigetaway.com / 321 Beachside Dr / +1 250-567-8901 and Safari Tent qty 7 / 560 are not an operator in Tofino. Do not merge Clayoquot Wilderness Lodge or other Tofino camps.'
WHERE id = 93
  AND property_id = '78e8c6e8-7f2d-409b-bf36-3361303616f7';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_yurtland_tofino_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. yurtlandbc.com / 654 Ocean Breeze Rd / 250-555-0505 and Yurt qty 8 are not an operator in Tofino.'
WHERE id = 117
  AND property_id = 'd882430d-0b07-45a6-9b27-856a87685925';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_yurt_retreat_tremblant_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. yurtretreat.ca / 987 Alpine Rd / 819-555-0606 and Yurt qty 9 are not an operator in Mont-Tremblant.'
WHERE id = 118
  AND property_id = '9e7904ef-669c-4345-84c3-4060d311b86c';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_guerrero_treehouse_getaway_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. guerrerotreehousegetaway.com / Playa la Ropa / +52 755 456 7890 and Treehouse qty 6 are not an operator in Zihuatanejo.'
WHERE id = 60
  AND property_id = '4c1b011f-04db-4c71-ad68-8c58531a5f4d';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_oaxaca_safari_haven_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. oaxacasafarihaven.com / Ruta 175 / +52 951 345 6789 and Safari Tent qty 7 are not an operator (invented GPS 17.123456 / -96.123456).'
WHERE id = 100
  AND property_id = '94107c1e-a50e-4db6-8adb-a86add2080cf';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_hobbit_haven_eco_village_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. hobbithavenecovillage.com / Camino a Mazunte / +52 958 901 2345 and Hobbit House qty 11 / 38 are not an operator in Mazunte. Sibling Hobbit Haven Retreat Golden (id 148) already rejected.'
WHERE id = 159
  AND property_id = 'ee22c02a-7146-4e7b-a1b0-7b0780b5fd6d';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_algonquin_safari_lodge_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. algonquinsafarilodge.com / 123 Forest Rd / +1 705-234-5678 and Safari Tent qty 8 / 178 are not an operator in Huntsville. Do not merge Algonquin Outfitters / park camps.'
WHERE id = 90
  AND property_id = 'fc8429ee-67a4-48de-87a6-6f5112b75ffb';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_glamping_de_la_baraque_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. glampingdelabaraque.be / Baraque de Fraiture 3 / +32 80 41 88 78 is not a glamping operator. That phone/address is La Station ski area (info@la-station.be). Do not merge La Petite Baraque guesthouse or peer-to-peer Ardennes cabins. Sage Safari Tent / 160 invented.'
WHERE id = 10968
  AND property_id = '97abf4cf-420e-4595-b7f4-bc44dc806950';

COMMIT;
