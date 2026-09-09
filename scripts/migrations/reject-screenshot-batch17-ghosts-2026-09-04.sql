-- Reject screenshot stubs that are not the operating lodging property.
-- Do not merge Poderi Arcangelo, Waldhisli / Seelbach / Tented Village,
-- Spartaco Eco Retreat, Bungalowpark Hoenderloo / Blendinn, or Slow Cabins
-- brand (id 10994). Leave Glamp Outdoor Camp Alkmaar (id 11103) and
-- Tented Village Glamping Schwarzwald (id 11011) untouched.

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_glamping_canonica_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. glampingcanonica.com / Località Canonica, 53037 / +39 0577 941 419 and Safari Tent / total 10 / 200 are not an operator in San Gimignano. Real San Gimignano glamping is Poderi Arcangelo, Località Capezzano 26 (3 suites: Olivo, Quercia Tree House, Lavanda; +39 0577 944404). Do not merge.'
WHERE id = 11048
  AND property_id = 'e9449d61-dc60-4595-9270-575896f7abcb';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_glamping_schwarzwald_seebach_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. glamping-schwarzwald.de / Am Stadtwald 4, 77889 Seebach / +49 7842 123456 and Safari Tent / total 5 / 150 are not an operator (invented sequential phone). Do not merge Waldhisli Oberkirch, Baumhaus Dörfle Seelbach, or Tented Village Glamping Schwarzwald (id 11011).'
WHERE id = 11009
  AND property_id = 'ace59ed2-abbb-4366-82f1-c5c04df3807d';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_sardinia_yurt_retreat_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. sardiniayurtretreat.com / Via delle Rose, 07026 Olbia / +39 0789 654321 and Yurt / total 5 / 150 are not an operator (invented sequential phone). Do not merge Spartaco Eco Retreat (5 accommodations between Olbia and Arzachena) or Essenza Sardegna.'
WHERE id = 11064
  AND property_id = 'cf4921c6-034a-43c0-9f27-8004fc5ddac3';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'No',
  discovery_source = 'web_research_glamp_outdoor_camp_veluwe_closed_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. 2020 pop-up at Krimweg 140 Hoenderloo with CampSolutions / Bungalowpark Hoenderloo; dismantled after that season. +31 6 12345678 and Safari Tent / total 10 / 150 are invented. Do not merge Bungalowpark Hoenderloo, Blendinn, or Glamp Outdoor Camp Alkmaar (id 11103).'
WHERE id = 11082
  AND property_id = '8e172697-48f7-4ad0-ae72-0f8f1594f4db';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_slow_cabins_brussels_treehouse_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. “Treehouse Glamping by Slow Cabins” / Various locations near Brussels / +32 2 588 23 60 is not an operator SKU. Slow Cabins (slowcabins.be) rents off-grid movable cabins at secret Flemish / Dutch countryside locations — not treehouses in Brussels. Leave brand-level Slow Cabins (id 10994) untouched. Do not invent a cabin count.'
WHERE id = 10987
  AND property_id = 'a113b3ea-265d-486d-bebd-c641bf102537';

COMMIT;
