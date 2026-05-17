-- Terranova Nirvana (id 11848): web enrichment + sibling SKU rows.
-- Applied via Supabase migration enrich_terranova_nirvana_11848_v2 (prod).

UPDATE public.all_glamping_properties SET
  site_name = 'Mirror glamping dome (primary SKU)',
  phone_number = '+14438470232',
  description = $$Luxury mirror-finish geodesic glamping domes near Page, AZ with red-rock positioning. Operator copy: each dome is marketed with in-unit wellness tech (BEMER PEMF, whole-body red light, Energy Enhancement System / scalar-field install, cold plunge, infrared sauna). Commercial core includes a coffee shop, e-bike rentals, movie nights, and an events amphitheater. Contact page: “Coming early 2026,” Page AZ; public rates/booking engine not live as of web research.$$,
  notes = COALESCE(notes, '') || E'\n\nEnrichment (terranovanirvana.com + contact, May 2026): hello@terranovanirvana.com; no published ADR—seasonal rate columns left null until booking opens.',
  property_food_on_site = 'Yes',
  unit_private_bathroom = 'Yes',
  unit_sauna = 'Yes',
  unit_wifi = 'Yes',
  activities_hiking = 'Yes',
  activities_boating = 'Yes',
  activities_canoeing_kayaking = 'Yes',
  activities_swimming = 'Yes',
  activities_stargazing = 'Yes',
  setting_desert = 'Yes',
  setting_mountainous = 'Yes',
  setting_lake = 'Yes',
  quantity_of_units = 1,
  property_total_sites = 3,
  amenities_raw = 'Per dome (marketing): BEMER PEMF; whole-body red light; EESystem; cold plunge; infrared sauna. Resort: coffee shop; e-bike rentals; amphitheater; movie nights.',
  date_updated = '2026-05-16'
WHERE id = 11848;

INSERT INTO public.all_glamping_properties (
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  lat, lon, url, phone_number, description, notes,
  date_added, date_updated, land_operator_category,
  property_food_on_site, unit_private_bathroom, unit_sauna, unit_wifi,
  activities_hiking, activities_boating, activities_canoeing_kayaking,
  activities_swimming, activities_stargazing,
  setting_desert, setting_mountainous, setting_lake,
  quantity_of_units, property_total_sites, amenities_raw
) VALUES (
  'in_progress', 'Yes', 'Under Construction',
  'Terranova Nirvana', 'Mirror glamping dome (SKU 2)', 'terranova-nirvana-page-az', 'Glamping Resort', 'Geodesic Dome',
  'Sage', 'web_research_terranova_enrichment_2026_05', 'USA', 'AZ', 'Page',
  36.914, -111.456, 'https://terranovanirvana.com/', '+14438470232',
  $$Sibling unit row for Terranova Nirvana; same public positioning as id 11848. Official per-dome names/rates not yet published.$$,
  $$Placeholder SKU for Sage unit-grain modeling—rename when operator publishes unit map.$$,
  '2026-05-16', '2026-05-16', 'private_commercial',
  'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes',
  1, 3,
  'Per dome (marketing): BEMER PEMF; whole-body red light; EESystem; cold plunge; infrared sauna. Resort: coffee shop; e-bike rentals; amphitheater; movie nights.'
);

INSERT INTO public.all_glamping_properties (
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city,
  lat, lon, url, phone_number, description, notes,
  date_added, date_updated, land_operator_category,
  property_food_on_site, unit_private_bathroom, unit_sauna, unit_wifi,
  activities_hiking, activities_boating, activities_canoeing_kayaking,
  activities_swimming, activities_stargazing,
  setting_desert, setting_mountainous, setting_lake,
  quantity_of_units, property_total_sites, amenities_raw
) VALUES (
  'in_progress', 'Yes', 'Under Construction',
  'Terranova Nirvana', 'Mirror glamping dome (SKU 3)', 'terranova-nirvana-page-az', 'Glamping Resort', 'Geodesic Dome',
  'Sage', 'web_research_terranova_enrichment_2026_05', 'USA', 'AZ', 'Page',
  36.914, -111.456, 'https://terranovanirvana.com/', '+14438470232',
  $$Sibling unit row for Terranova Nirvana; same public positioning as id 11848. Official per-dome names/rates not yet published.$$,
  $$Placeholder SKU for Sage unit-grain modeling—rename when operator publishes unit map.$$,
  '2026-05-16', '2026-05-16', 'private_commercial',
  'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes', 'Yes', 'Yes',
  'Yes', 'Yes', 'Yes',
  1, 3,
  'Per dome (marketing): BEMER PEMF; whole-body red light; EESystem; cold plunge; infrared sauna. Resort: coffee shop; e-bike rentals; amphitheater; movie nights.'
);
