-- Luxe Den Resorts (id 11851): web enrichment + sibling SKUs.
-- Applied: enrich_luxe_den_resorts_11851_2026_05_16 + sibling consistency UPDATE (unit_sauna, activities_stargazing, year_site_opened).

UPDATE public.all_glamping_properties SET
  site_name = 'Nordic glass geodesic dome (riverside wellness)',
  address = 'Filer area (near Twin Falls), Snake River Plain — under construction',
  city = 'Filer',
  lat = 42.972,
  lon = -114.608,
  description = $$Planned Nordic-inspired “micro-wellness” geodesic **glass** dome resort along a natural creek on the Snake River Plain (marketed near Twin Falls / Shoshone Falls / Snake River Canyon). Public roadmap: design phase → VIP reservations (2026) → construction late 2026 → **grand opening summer 2027**. Positioning: dark-sky stargazing through glass ceilings, riverside quiet, **private soaking tubs** (creekside), **Finnish sauna** wellness, minimalist Scandinavian interiors, **pet-friendly** (up to two dogs/dome with pet kit + rinse station), group/retreat use-case. $1 VIP waitlist with “30% off launch pricing” messaging—**no published nightly rack rate** as of site pull.$$,
  notes = COALESCE(notes, '') || E'\n\nEnrichment (luxedenresorts.com + /contact, May 2026): location line lists Filer, ID (near Twin Falls); Email/Phone headings present but no numbers shown in static pull—leave phone null. rate_* left null until booking calendar exists.',
  year_site_opened = 2027,
  quantity_of_units = 1,
  unit_private_bathroom = 'Yes',
  unit_hot_tub = 'Yes',
  unit_sauna = 'Yes',
  unit_pets = 'Yes',
  property_waterfront = 'Yes',
  property_sauna = 'Yes',
  activities_hiking = 'Yes',
  activities_biking = 'Yes',
  activities_canoeing_kayaking = 'Yes',
  activities_paddling = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  river_stream_or_creek = 'Yes',
  setting_field = 'Yes',
  property_family_friendly = 'Yes',
  amenities_raw = 'Marketing: Nordic glass geodesic domes; Milky Way / dark-sky framing; creekside private soaking tubs; Finnish sauna; pet program (2 dogs/dome); VIP founding list ($1) + 30% launch-pricing promise; group retreats.',
  date_updated = '2026-05-16'
WHERE id = 11851;

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
  'Luxe Den Resorts',
  'Nordic glass dome (dark-sky flagship)',
  'luxe-den-resorts-twin-falls-id',
  'Glamping Resort', 'Geodesic Dome',
  'Sage', 'web_research_luxe_den_enrichment_2026_05',
  'USA', 'ID', 'Filer',
  'Filer area (near Twin Falls), Snake River Plain — under construction',
  42.972, -114.608, 'https://luxedenresorts.com/',
  $$Sibling SKU emphasizing dark-sky / glass-ceiling stargazing positioning from marketing.$$,
  $$Placeholder unit row; ADR null (no published nightly rates).$$,
  '2026-05-16', '2026-05-16', 'private_commercial',
  NULL,
  NULL, 1,
  NULL, 'Yes', 'Yes', NULL,
  'Yes', NULL, NULL, 'Yes', NULL, NULL,
  'Yes', 'Yes', NULL, NULL,
  'Yes', NULL, 'Yes', 'Yes',
  'Luxe Den sibling row; align counts/rates when operator publishes inventory.'
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
  'Luxe Den Resorts',
  'Nordic glass dome (group / retreat layout)',
  'luxe-den-resorts-twin-falls-id',
  'Glamping Resort', 'Geodesic Dome',
  'Sage', 'web_research_luxe_den_enrichment_2026_05',
  'USA', 'ID', 'Filer',
  'Filer area (near Twin Falls), Snake River Plain — under construction',
  42.972, -114.608, 'https://luxedenresorts.com/',
  $$Sibling SKU for families/friends/corporate retreat positioning from marketing.$$,
  $$Placeholder unit row; ADR null (no published nightly rates).$$,
  '2026-05-16', '2026-05-16', 'private_commercial',
  NULL,
  NULL, 1,
  NULL, 'Yes', 'Yes', NULL,
  'Yes', NULL, NULL, 'Yes', NULL, NULL,
  'Yes', 'Yes', NULL, NULL,
  'Yes', NULL, 'Yes', 'Yes',
  'Luxe Den sibling row; align counts/rates when operator publishes inventory.'
);

-- Align sibling rows with anchor flags not present in the 48-column insert template:
UPDATE public.all_glamping_properties SET
  unit_sauna = 'Yes',
  activities_stargazing = 'Yes',
  year_site_opened = 2027,
  date_updated = '2026-05-16'
WHERE slug = 'luxe-den-resorts-twin-falls-id'
  AND site_name IN (
    'Nordic glass dome (dark-sky flagship)',
    'Nordic glass dome (group / retreat layout)'
  );
