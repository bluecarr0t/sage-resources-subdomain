-- Tallgrass Retreat / Ferncrest Elkhorn River (id 11849): web enrichment + sibling SKUs.
-- Primary migration: enrich_tallgrass_retreat_11849_2026_05_16 (Supabase).
-- If sibling ADRs did not persist, run the two UPDATEs at the bottom.

UPDATE public.all_glamping_properties SET
  site_name = 'Geodesic dome (private hot tub)',
  description = $$Ferncrest Elkhorn River — locally owned Ferncrest-network glampground on the Elkhorn River outside Neligh, NE (operators Shannon & Jonathan). Marketing: climate-controlled geodesic domes with cotton linens, outdoor seating and fire pits, some domes with private hot tubs; modern shared bathhouse with private full/half baths; communal sauna and cold plunge; camp store; firewood policy (purchase on-site). Cowboy Trail access; river recreation. Opening summer 2026; insider email list and 10% pre-register offer on site.$$,
  notes = COALESCE(notes, '') || E'\n\nEnrichment (tallgrassretreat.com FAQ + home, May 2026): typical nightly band ~$200–$400+ per FAQ; rate_avg set to 300 USD as mid-estimate until booking engine publishes. Trade press has cited ~12 domes in an early phase—property_total_sites=12 for modeling; verify count. No published phone—phone_number left null.',
  rate_avg_retail_daily_rate = 300,
  property_total_sites = 12,
  quantity_of_units = 1,
  property_general_store = 'Yes',
  property_waterfront = 'Yes',
  property_sauna = 'Yes',
  property_hot_tub = 'Yes',
  unit_hot_tub = 'Yes',
  unit_air_conditioning = 'Yes',
  unit_wifi = 'Yes',
  unit_pets = 'Yes',
  unit_campfires = 'Yes',
  unit_mini_fridge = 'Yes',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_fishing = 'Yes',
  activities_canoeing_kayaking = 'Yes',
  river_stream_or_creek = 'Yes',
  setting_forest = 'Yes',
  setting_field = 'Yes',
  property_family_friendly = 'Yes',
  amenities_raw = 'Dome: climate control, cotton linens, fire pit + seating, cooler; some units private hot tub + mini fridge. Shared: bathhouse (private stalls), communal sauna + cold plunge, camp store, Wi‑Fi (light browsing per FAQ). Cowboy Trail adjacency; Elkhorn River.',
  date_updated = '2026-05-16'
WHERE id = 11849;

-- Sibling rows (ids assigned by DB; adjust WHERE if re-running on a copy).
INSERT INTO public.all_glamping_properties (
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  address, lat, lon, url,
  description, notes,
  date_added, date_updated, land_operator_category,
  rate_avg_retail_daily_rate,
  property_total_sites, quantity_of_units,
  property_general_store, property_waterfront, property_sauna, property_hot_tub,
  unit_hot_tub, unit_air_conditioning, unit_wifi, unit_pets, unit_campfires, unit_mini_fridge,
  activities_hiking, activities_biking, activities_fishing, activities_canoeing_kayaking,
  river_stream_or_creek, setting_forest, setting_field, property_family_friendly,
  amenities_raw
) VALUES (
  'in_progress', 'Yes', 'Under Construction',
  'Tallgrass Retreat (Ferncrest Elkhorn River)',
  'Geodesic dome (standard)',
  'tallgrass-retreat-ferncrest-elkhorn-river-neligh-ne',
  'Glamping Resort', 'Geodesic Dome',
  'Sage', 'web_research_tallgrass_enrichment_2026_05',
  'USA', 'NE', 'Neligh',
  'Elkhorn River / Cowboy Trail corridor (under construction)',
  42.128, -98.030, 'https://tallgrassretreat.com/',
  $$Sibling SKU: FAQ positions some domes without private hot tubs—focused on prairie quiet + shared bathhouse/sauna/cold plunge and camp store.$$,
  $$Placeholder unit row for Sage grain—rename when official dome map/rates publish.$$,
  '2026-05-16', '2026-05-16', 'private_commercial',
  275,
  12, 1,
  'Yes', 'Yes', 'Yes', 'Yes',
  'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes',
  'Dome: climate control, cotton linens, fire pit + seating, cooler; mini fridge per FAQ. Shared bathhouse/sauna/cold plunge; camp store; light Wi‑Fi. Cowboy Trail; Elkhorn River.'
);

INSERT INTO public.all_glamping_properties (
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  address, lat, lon, url,
  description, notes,
  date_added, date_updated, land_operator_category,
  rate_avg_retail_daily_rate,
  property_total_sites, quantity_of_units,
  property_general_store, property_waterfront, property_sauna, property_hot_tub,
  unit_hot_tub, unit_air_conditioning, unit_wifi, unit_pets, unit_campfires, unit_mini_fridge,
  activities_hiking, activities_biking, activities_fishing, activities_canoeing_kayaking,
  river_stream_or_creek, setting_forest, setting_field, property_family_friendly,
  amenities_raw
) VALUES (
  'in_progress', 'Yes', 'Under Construction',
  'Tallgrass Retreat (Ferncrest Elkhorn River)',
  'Geodesic dome (larger group)',
  'tallgrass-retreat-ferncrest-elkhorn-river-neligh-ne',
  'Glamping Resort', 'Geodesic Dome',
  'Sage', 'web_research_tallgrass_enrichment_2026_05',
  'USA', 'NE', 'Neligh',
  'Elkhorn River / Cowboy Trail corridor (under construction)',
  42.128, -98.030, 'https://tallgrassretreat.com/',
  $$Sibling SKU: FAQ references domes designed for larger groups and higher weekend/holiday pricing—modeled with private hot tub more likely on premium group units.$$,
  $$Placeholder unit row; ADR set higher than mid-band as illustrative—replace with operator pricing.$$,
  '2026-05-16', '2026-05-16', 'private_commercial',
  340,
  12, 1,
  'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes',
  'Dome: climate control, cotton linens, fire pit + seating, cooler; mini fridge; optional private hot tub (per FAQ mix). Shared bathhouse/sauna/cold plunge; camp store; light Wi‑Fi.'
);

-- Repair ADR if INSERT misaligned (prod follow-up):
-- UPDATE public.all_glamping_properties SET rate_avg_retail_daily_rate = 275 WHERE slug = 'tallgrass-retreat-ferncrest-elkhorn-river-neligh-ne' AND site_name = 'Geodesic dome (standard)';
-- UPDATE public.all_glamping_properties SET rate_avg_retail_daily_rate = 340 WHERE slug = 'tallgrass-retreat-ferncrest-elkhorn-river-neligh-ne' AND site_name = 'Geodesic dome (larger group)';
