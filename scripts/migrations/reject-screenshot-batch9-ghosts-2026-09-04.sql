-- Reject screenshot stubs that are not a single operating lodging property.
-- Do not merge nearby parks, hotels, or the real French Coucoo brand.

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_cabanes_grands_chenes_qc_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. cabanesgrandschenes.com / 50 Chemin des Chênes, Saint-Sauveur QC J0R 1R1 with +1 450-227-4666 and Treehouse qty 10 are not a Quebec operator. The real Cabanes des Grands Chênes is Coucoo at 1 rue Jean Cocteau, 60810 Raray, France (25 official cabins; +33 3 44 58 39 08). Do not merge the French park into this QC stub. Do not merge Chimo Refuges or other Laurentian treehouses.'
WHERE id = 44
  AND property_id = '7b7b6fad-7745-431d-b6db-99928fda407c';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_yurt_village_bacalar_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. yurtvillagebacalar.com / Laguna Bacalar Km 12 with +52 1 983 567 8901, coords 18.123456/-88.123456, and Yurt qty 10 are placeholders. Do not merge Our Habitas Bacalar, Hakuna Matata, or other Bacalar stays.'
WHERE id = 126
  AND property_id = 'cec12d9c-f915-4fbe-8869-d4ccce9215c3';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_glamping_aventura_gata_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. glampingaventura.com / Carretera EX-205 Km 21, Gata 10860 with +34 927 673 271 is not an operator. Do not merge Finca Las Cañadas (Villasbuenas de Gata), Lalita Devi, Camping El Merino, or Sierra de Gata youth camps.'
WHERE id = 11206
  AND property_id = 'c661b9ff-8fc9-4863-b1e2-6ea93b6ba656';

COMMIT;
