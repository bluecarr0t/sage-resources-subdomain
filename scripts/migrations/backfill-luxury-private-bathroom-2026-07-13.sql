-- Luxury unit_private_bathroom corrections (2026-07-13)

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'OpenAI Research - Popular North America; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. Treehouse Utopia — luxury treehouses with private bathrooms.'
WHERE id = 4;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_05_28; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. Lost Horizon safari tent — luxury inventory with private bathroom.'
WHERE id = 9539;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→No. Treebones yurt — shared heated restrooms; not ensuite (treebonesresort.com).'
WHERE id = 9554;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. Treebones Autonomous Tent — en suite bathroom (treebonesresort.com).'
WHERE id = 9555;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→No. El Capitan Canyon Safari Tent — shared bathroom/shower buildings (site amenity list).'
WHERE id = 9559;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→No. El Capitan Canyon Adventure Yurt — bathhouse nearby, not ensuite (elcapitancanyon.com).'
WHERE id = 9560;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. El Capitan Canyon Cedar Cabin — private bathroom in cabin (elcapitancanyon.com).'
WHERE id = 9561;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_sauna_2026_05_27; web_research_hot_tub_2026_05_27; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→No. Alpenglow Luxury Camping Glacier View Tent — shared showers/flush toilets common area.'
WHERE id = 9572;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_sauna_2026_05_27; web_research_hot_tub_2026_05_27; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→No. Alpenglow Luxury Camping Mountain View Tent — shared showers/flush toilets common area.'
WHERE id = 9573;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_sauna_2026_05_27; web_research_hot_tub_2026_05_28; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. Borealis Basecamp igloos/cubes — en suite full baths (borealisbasecamp.net FAQ).'
WHERE id = 9574;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_sauna_2026_05_27; web_research_hot_tub_2026_05_28; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. Borealis Basecamp igloos/cubes — en suite full baths (borealisbasecamp.net FAQ).'
WHERE id = 9575;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_sauna_2026_05_27; web_research_hot_tub_2026_05_28; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. Orca Island Cabins luxury yurts — ensuite private bathroom with hot shower (orcaislandcabins.com).'
WHERE id = 9578;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: No→Yes. Sonoma Zipline / Treehouse Adventures — in-unit composting toilet + sink (sonomacounty.com). Corrected No→Yes.'
WHERE id = 9865;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_05_28; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. Onera Fredericksburg units — private bathroom listed on every SKU (stayonera.com).'
WHERE id = 10067;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_05_28; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. Onera Fredericksburg units — private bathroom listed on every SKU (stayonera.com).'
WHERE id = 10068;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_05_28; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. Onera Fredericksburg units — private bathroom listed on every SKU (stayonera.com).'
WHERE id = 10069;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_05_27; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. Zion Ponderosa Tiny Home — private bathroom in unit (vacation-home listing).'
WHERE id = 10075;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_05_28; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. Onera Fredericksburg units — private bathroom listed on every SKU (stayonera.com).'
WHERE id = 10262;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_sauna_2026_05_27; web_research_hot_tub_2026_05_27; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: No→Yes. Lakedale Canvas Cottage — private bathroom with shower (lakedale.com). Corrected No→Yes.'
WHERE id = 10302;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: No→Yes. Treebones Autonomous Tent — en suite bathroom (treebonesresort.com). Corrected No→Yes.'
WHERE id = 10311;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Cloudbeds booking engine (Jun 19–22, 2026, Standard Rate); web_research_hot_tub_2026_05_28; manual_hot_tub_text_batch6_2026_07_13; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. The Glamping Collective luxury domes/glass cabins — private ensuite bathrooms (brand standard).'
WHERE id = 10346;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Cloudbeds booking engine (Jun 19–22, 2026, Standard Rate); web_research_hot_tub_2026_05_28; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. The Glamping Collective luxury domes/glass cabins — private ensuite bathrooms (brand standard).'
WHERE id = 10347;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_05_28; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. Onera Fredericksburg units — private bathroom listed on every SKU (stayonera.com).'
WHERE id = 10369;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: No→Yes. El Capitan Canyon cabins — private ensuite bathroom (elcapitancanyon.com). Corrected No→Yes.'
WHERE id = 10422;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Cloudbeds booking engine (Jun 19–22, 2026, Standard Rate); web_research_hot_tub_2026_05_28; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. The Glamping Collective luxury domes/glass cabins — private ensuite bathrooms (brand standard).'
WHERE id = 10490;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Cloudbeds booking engine (Jun 19–22, 2026, Standard Rate); web_research_hot_tub_2026_05_28; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. The Glamping Collective luxury domes/glass cabins — private ensuite bathrooms (brand standard).'
WHERE id = 10491;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'No',
  date_updated = '2026-07-13',
  discovery_source = 'Sage; web_research_hot_tub_2026_05_27; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→No. Zion Ponderosa glamping tents — shared shower house / restrooms near tents (zionponderosa.com).'
WHERE id = 10626;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Glamping.com; web_research_hot_tub_2026_05_28; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. The Green O — ultra-luxury lodging with private bathrooms.'
WHERE id = 10840;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'market_report_coverage_gap_joshua_tree_250mi; web_research_hot_tub_2026_05_28; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. Rimrock Ranch Airstream — in-unit private bathroom (luxury Airstream inventory).'
WHERE id = 11577;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Cloudbeds booking engine (Jun 19–22, 2026, Standard Rate); manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. The Glamping Collective luxury domes/glass cabins — private ensuite bathrooms (brand standard).'
WHERE id = 11598;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Cloudbeds booking engine (Jun 19–22, 2026, Standard Rate); manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. The Glamping Collective luxury domes/glass cabins — private ensuite bathrooms (brand standard).'
WHERE id = 11599;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Cloudbeds booking engine (Jun 19–22, 2026, Standard Rate); manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. The Glamping Collective luxury domes/glass cabins — private ensuite bathrooms (brand standard).'
WHERE id = 11600;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'Cloudbeds booking engine (Jun 19–22, 2026, Standard Rate); manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: null→Yes. The Glamping Collective luxury domes/glass cabins — private ensuite bathrooms (brand standard).'
WHERE id = 11601;

UPDATE public.all_sage_data SET
  unit_private_bathroom = 'Yes',
  date_updated = '2026-07-13',
  discovery_source = 'web_research_westgateresorts_2026_05; web_research_sauna_2026_05_27; manual_luxury_private_bathroom_2026_07_13',
  notes = COALESCE(notes, '') || E'\n\n[2026-07-13] unit_private_bathroom: No→Yes. Westgate River Ranch Luxury Glamping — full private bathroom with walk-in shower (westgateresorts.com). Corrected No→Yes.'
WHERE id = 12059;

