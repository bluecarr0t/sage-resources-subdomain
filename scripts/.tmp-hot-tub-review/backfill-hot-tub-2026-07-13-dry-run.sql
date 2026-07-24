-- Auto-generated hot tub backfill (review before apply)
-- Rows: 1

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  property_hot_tub = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-09] P1 property_total_sites normalized to 45 across 1 sibling rows.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://www.marriott.com/en-us/hotels/indbc-postcard-cabins-brown-county-outdoor-collection-bonvoy/overview/.'
WHERE id = 10467;

-- Auto-generated hot tub backfill (review before apply)
-- Rows: 5

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-09] P1 property_total_sites normalized to 40 across 5 sibling rows.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://postcardcabins.com/los-angeles/.'
WHERE id = 9941;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-09] P1 property_total_sites normalized to 40 across 5 sibling rows.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://postcardcabins.com/los-angeles/.'
WHERE id = 9942;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nHot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://postcardcabins.com/los-angeles/.'
WHERE id = 9943;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nHot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://postcardcabins.com/los-angeles/.'
WHERE id = 9944;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nHot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://postcardcabins.com/los-angeles/.'
WHERE id = 10426;

-- Auto-generated hot tub backfill (review before apply)
-- Rows: 3

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nHot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://www.marriott.com/en-us/hotels/bnadl-postcard-cabins-dale-hollow-outdoor-collection-bonvoy/overview/.'
WHERE id = 10046;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nHot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://www.marriott.com/en-us/hotels/bnadl-postcard-cabins-dale-hollow-outdoor-collection-bonvoy/overview/.'
WHERE id = 10047;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-09] P1 property_total_sites normalized to 50 across 3 sibling rows.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://www.marriott.com/en-us/hotels/bnadl-postcard-cabins-dale-hollow-outdoor-collection-bonvoy/overview/.'
WHERE id = 10530;

-- Auto-generated hot tub backfill (review before apply)
-- Rows: 1

UPDATE public.all_sage_data SET
  unit_hot_tub = 'Yes',
  unit_hot_tub_or_sauna = 'Yes',
  property_hot_tub = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'pipeline_research_2026_06_15; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-09] is_open set from pipeline status to No (user request: clear Under Construction / Proposed Development).

[2026-07-09] Restored is_open=Proposed Development from glamping_pipeline_status_history (was incorrectly set to No).

[2026-07-10] proposed_dev_batch_a_2026_07_10: Operating since Oct 2025 (Hinata Retreat); Charlemont MA glamping cabins on former Warfield House site.

[2026-07-13] ADR from firecrawl: https://www.hinataretreat.com/ (avg $400).

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://www.hinataretreat.com/.'
WHERE id = 12947;

-- Auto-generated hot tub backfill (review before apply)
-- Rows: 3

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  property_hot_tub = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nWorldHotels Backdrop / Best Western BW Premier collection member (BWH press Apr 2026). Safari tents, covered wagons, private bungalows near Zion NP. Bookable via Best Western Rewards.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://zionwildflower.com/.'
WHERE id = 10396;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  property_hot_tub = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nWorldHotels Backdrop / Best Western BW Premier collection member (BWH press Apr 2026). Safari tents, covered wagons, private bungalows near Zion NP. Bookable via Best Western Rewards.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://zionwildflower.com/.'
WHERE id = 10407;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  property_hot_tub = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nWorldHotels Backdrop / Best Western BW Premier collection member (BWH press Apr 2026). Safari tents, covered wagons, private bungalows near Zion NP. Bookable via Best Western Rewards.

Unit type (Jun 2026): Bungalow → Cabin (canonical unit type).

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://zionwildflower.com/.'
WHERE id = 10554;

-- Auto-generated hot tub backfill (review before apply)
-- Rows: 26

UPDATE public.all_sage_data SET
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nHistoric guest ranch near Big Sky; cabin inventory with outdoor adventure packaging—confirm glamping SKU boundaries.

Site enrichment (May 2026): 26 cabins from lonemountainranch.com/cabins + Synxis Hotel=42113. Published per-cabin nightly rates not on marketing site; B&B package category proxies used where noted.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 11666;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. B&B proxy $1050/night.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12019;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. B&B proxy $1100/night.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12020;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. B&B proxy $1050/night.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12021;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. B&B proxy $1000/night.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12022;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. B&B proxy $1000/night.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12023;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. B&B proxy $1050/night.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12024;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. B&B proxy $1000/night.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12025;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. B&B proxy $1050/night.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12026;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. B&B proxy $1100/night.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12027;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. B&B proxy $1100/night.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12028;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. B&B proxy $2300/night.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12029;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. B&B proxy $1100/night.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12030;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. B&B proxy $1100/night.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12031;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. B&B proxy $1100/night.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12032;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. B&B proxy $1050/night.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12033;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. B&B proxy $1050/night.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12034;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. B&B proxy $2300/night.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12035;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. B&B proxy $2300/night.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12036;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. B&B proxy $2300/night.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12037;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. B&B proxy $2300/night.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12038;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. B&B proxy $2300/night.

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12039;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. Group/lodge — request Synxis quote for dates.

[2026-07-09] ADR from tavily: https://www.businesstravelnews.com/Hotels/Big-Sky-MT/Lone-Mountain-Ranch-p3275917 (avg $416.5).

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12040;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. Group/lodge — request Synxis quote for dates.

[2026-07-09] ADR from tavily: https://www.businesstravelnews.com/Hotels/Big-Sky-MT/Lone-Mountain-Ranch-p3275917 (avg $416.5).

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12041;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. Group/lodge — request Synxis quote for dates.

[2026-07-09] ADR from tavily: https://www.businesstravelnews.com/Hotels/Big-Sky-MT/Lone-Mountain-Ranch-p3275917 (avg $416.5).

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12042;

UPDATE public.all_sage_data SET
  unit_hot_tub = 'No',
  unit_hot_tub_or_sauna = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_lonemountainranch_synxis_2026_05; web_research_hot_tub_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\nSynxis https://be.synxis.com/?Hotel=42113&Chain=6063. Group/lodge — request Synxis quote for dates.

[2026-07-09] ADR from tavily: https://www.businesstravelnews.com/Hotels/Big-Sky-MT/Lone-Mountain-Ranch-p3275917 (avg $416.5).

Hot tub research (2026-07-13): see discovery_source web_research_hot_tub_2026_07_13 — https://lonemountainranch.com/cabins/ouzel/.'
WHERE id = 12043;
