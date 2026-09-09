-- Reject screenshot stubs that are not the operating lodging property.
-- Do not merge ChiloChill, Okanagan Glamping Co, Baddeck Domes, Blaeberry Base,
-- Gatineau Park / Borefüge, Treeopia, Cowdray TreeHouse Retreats, Cabot Shores,
-- Punta Mozambique, Aura Eco Glamping, or Les Toits du Monde.

BEGIN;

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_baja_airstream_experience_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. bajaairstreamexperience.com / Carretera Transpeninsular Km 12 / +52 1 612 987 6543 and Airstream qty 8 are not an operator (invented GPS 24.1234 / -110.4567). Do not merge ChiloChill La Ventana or Baja Life La Paz.'
WHERE id = 175
  AND property_id = 'c0773f01-c7d2-420b-a868-4f97cd6c3e12';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_safari_ridge_glamping_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. safariridgeglamping.com / +1 250-123-4567 and Safari Tent qty 10 are not lodging. 2216 Horizon Dr, West Kelowna is Safari Ridge Adventure Park (paintball/laser tag, safariridge.com, 250-769-0239). Do not merge Okanagan Glamping Co or Unique Canvas.'
WHERE id = 89
  AND property_id = '82154189-602d-4b66-b41b-5fe898f5433f';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_cape_breton_safari_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. capebretonsafariexperience.com / 987 Cabot Trail / +1 902-789-0123 and Safari Tent qty 6 are not an operator. Do not merge Baddeck Domes or Baddeck Cabot Trail Campground.'
WHERE id = 95
  AND property_id = '42b3d5e3-690a-4fe3-8462-b41ba44ee51b';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_borealis_dome_experience_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. borealisdomeexperience.com / 5678 Dome Road / +1 250-344-5678 and Dome qty 8 are not an operator in Golden. Do not merge The Blaeberry Base (id 13075, still in_progress) or Alaska Borealis Basecamp.'
WHERE id = 130
  AND property_id = '9b5eeab8-c8ab-46a5-9cc0-d38149fb8cd9';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_yurtopia_gatineau_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. yurtopia.ca / 456 Forest Lane / 819-555-0202 and Yurt qty 7 are not an operator. Do not merge NCC Gatineau Park yurts, Borefüge, or published The Yurtopian Texas rows.'
WHERE id = 114
  AND property_id = 'd33978d4-a0ef-4989-96d1-6b5458d95cb0';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_airstream_haven_baja_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. airstreamhavenbaja.com / Calle Cabo San Lucas / +52 1 624 765 4321 and Airstream qty 10 are not an operator. Do not merge Airstream Haven Victoria (id 169, still in_progress) or Todos Santos Airbnb Airstreams.'
WHERE id = 177
  AND property_id = '1985ceda-7ea2-432e-98b7-da51d2e2dbd7';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_treehouse_retreats_tenbury_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. treehouseretreats.co.uk / Tenbury Wells WR15 8QX / +44 1584 781911 is not an operator. Treeopia is Parsons Hall Farm, Kyre WR15 8RW (treeopia.co.uk, 01885 410549, 2 treehouses). TreeHouse Retreats .com is 4 treehouses on the Cowdray Estate, West Sussex. Do not relocate this stub to either.'
WHERE id = 11285
  AND property_id = '1967bc2f-1d20-4a7e-a85c-3f083639d247';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_yurt_escapes_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. yurtescapes.ca / 222 Coastal Rd / 902-555-0808 and Yurt qty 5 are not an operator. Do not merge Cabot Shores (Indian Brook, 1-866-929-2584).'
WHERE id = 120
  AND property_id = '67b3b675-0c29-4d09-9fca-4485c23a783a';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_eco_safari_tents_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. ecosafaritents.com / Zicatela Beach / +52 958 567 8901 and Safari Tent qty 6 are not an operator (invented GPS 15.123456 / -97.123456). Do not merge Punta Mozambique (2 safari tents, Aguascalientes 448).'
WHERE id = 102
  AND property_id = '516abc57-426d-4299-9bb0-acfa5df11a3e';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_prairie_airstream_escape_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. prairieairstreamescape.com / 1415 Prairie Road / 403-789-0123 and Airstream qty 5 are not an operator. Do not merge peer-to-peer Calgary Airstream rentals or Sundance Kananaskis.'
WHERE id = 170
  AND property_id = '9810a88c-9242-442d-b101-d5e98ebc6b15';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_yurt_haven_sancris_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. yurthavensancristobal.com / Calle Real de Guadalupe 45 / +52 1 967 456 7890 and Yurt qty 9 are not an operator (invented GPS 16.123456 / -92.123456). Do not merge Aura Eco Glamping, Haven Yurts Fredericksburg, or in-progress San Cristóbal Treehouse Retreat (id 57).'
WHERE id = 125
  AND property_id = '93900b41-a3c0-45a1-b979-d9da2cfd2c16';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_hobbiton_hideaway_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected. hobbitonhideaway.com / 654 Hobbiton Trail / 555-567-8901 and Hobbit House qty 5 are not an operator in Mont-Tremblant. Do not merge Les Toits du Monde Hobbit House (Nominingue) or InstantSuites Hideaway chalets.'
WHERE id = 152
  AND property_id = 'bdf0b4c5-b450-4923-869d-d72a323657a5';

UPDATE public.all_sage_data
SET
  research_status = 'rejected',
  is_open = 'Yes',
  discovery_source = 'web_research_hobbiton_hideaway_tulum_ghost_2026_09',
  date_updated = '2026-09-04',
  notes = COALESCE(notes, '') || E'\n\n[2026-09-04] Rejected as sibling ghost of Mont-Tremblant Hobbiton Hideaway stub (same property_id). Calle Hobbiton Tulum / +52 984 123 4567 is not an operator. Do not merge Les Toits du Monde.'
WHERE id = 153
  AND property_id = 'bdf0b4c5-b450-4923-869d-d72a323657a5';

COMMIT;
