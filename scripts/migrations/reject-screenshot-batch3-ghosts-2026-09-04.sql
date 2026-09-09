-- Reject screenshot stubs that are not a single operating lodging property.

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Closed',
  discovery_source = 'web_research_harptree_court_closed_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. harptreecourt.co.uk/treehouse.html is dead. Harptree Court is a private residence (sold 2020). Canopy & Stars remnant is not an operator lodging business. Do not merge a Bath/Bristol hotel. City Bristol was wrong (East Harptree).'
WHERE id = 11242
  AND property_id = 'db2f800a-3073-4a1c-b224-e344264b9a35';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_mexico_canada_ghost_stubs_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. veracruztreehouseresort.com is unregistered. Phone +52 229 012 3456 is sequential placeholder. Do not merge Picocanoa or Coco Aventura.'
WHERE id = 58
  AND property_id = '01687df5-746d-478a-9d7e-c2babc73d986';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_mexico_canada_ghost_stubs_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. canopybynature.com is unregistered. Phone +1 250-555-2345 and 789 Canopy Rd are placeholders. Do not merge Moonraker / Fir & Feather, Golden.'
WHERE id = 73
  AND property_id = '3d2079fe-2287-4c36-bcf0-c82283ca9faa';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_mexico_canada_ghost_stubs_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. shiresrestglamping.com is unregistered. 555-234-5678 and 456 Shire Road are placeholders. Do not merge Hobbiton NZ, Shuswap Shire, or Hazelnut Inn.'
WHERE id = 149
  AND property_id = 'bd878388-8724-41cc-9487-bff03b39ea95';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_glamping_flims_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. glampingflims.ch has no DNS. Phone +41 81 911 11 11 is a placeholder. Do not merge TCS Camping Flims (Via Prau la Selva 4, +41 81 911 15 75).'
WHERE id = 11215
  AND property_id = '2c0e824f-e8e1-4684-bd28-e2ea0c11e6a9';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_mexico_canada_ghost_stubs_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. jungletreehouseretreat.com is unregistered. Phone +52 984 234 5678 and lat/lon 20.654321,-87.654321 are placeholders. Do not merge Casa Kabil or Ajal Tulum.'
WHERE id = 78
  AND property_id = '70f8c38f-9ca2-4d35-a07b-04d641bf67ec';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_mexico_canada_ghost_stubs_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. rivieramayatreehouseresort.com is unregistered. Sequential phones and fake decimals (20.3456 / 20.987654). Same unused domain on Akumal + Puerto Morelos siblings. Do not merge Secrets Akumal, Ajal, or Playa Viva.'
WHERE property_id = '9a4164f2-f223-444e-a9d8-df9b8ecef0fb'
  AND id IN (52, 80);

COMMIT;
