-- Echo Valley Micro-Resort (id 11850): web enrichment + sibling SKUs.
-- Applied: enrich_echo_valley_micro_resort_11850_2026_05_16 + rate repair UPDATEs on 11858/11859.

UPDATE public.all_glamping_properties SET
  site_name = 'Geodesic dome (boutique micro-unit)',
  description = $$Nature-first micro-resort on ~42 acres in Pittsylvania County (Dry Fork area, Southern Virginia). Official site: phased seasonal events → boutique glamping in luxury geodesic domes → future forest cabins + wellness center (salt cave, sauna, cold plunge, communal gathering barn, herb/flower gardens, farm retail). Press reporting describes up to 15 self-contained geodesic “micro units” with kitchen + bath and sky-view glazing; pricing guidance in local press has cited roughly high-$100s to low-$200s/night (verify). Digital-detox positioning; trails along creeks/meadows/wooded ridges.$$,
  notes = COALESCE(notes, '') || E'\n\nEnrichment (echovalleymicroresort.com + regional press, May 2026): pool + pricing band from news coverage—not repeated verbatim on current homepage; reconcile before publish. No public phone/email on marketing site as of pull.',
  rate_avg_retail_daily_rate = 200,
  property_total_sites = 15,
  quantity_of_units = 1,
  unit_private_bathroom = 'Yes',
  unit_kitchenette = 'Yes',
  unit_air_conditioning = 'Yes',
  unit_campfires = 'Yes',
  property_pool = 'Yes',
  property_sauna = 'Yes',
  property_clubhouse = 'Yes',
  property_food_on_site = 'Yes',
  property_general_store = 'Yes',
  activities_hiking = 'Yes',
  activities_wildlife_watching = 'Yes',
  activities_stargazing = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_historic_sightseeing = 'Yes',
  activities_biking = 'Yes',
  river_stream_or_creek = 'Yes',
  setting_forest = 'Yes',
  setting_field = 'Yes',
  setting_farm = 'Yes',
  property_family_friendly = 'Yes',
  amenities_raw = 'Vision (site + press): up to 15 geodesic micro-units w/ kitchen + bath; communal gathering space; wellness building w/ salt cave, sauna, cold plunge; gardens + small farm retail; trails; seasonal events/markets; optional pool per press—confirm in final permits.',
  date_updated = '2026-05-16'
WHERE id = 11850;

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
  'Echo Valley Micro-Resort',
  'Geodesic dome (standard micro-unit)',
  'echo-valley-micro-resort-dry-fork-va',
  'Glamping Resort', 'Geodesic Dome',
  'Sage', 'web_research_echo_valley_enrichment_2026_05',
  'USA', 'VA', 'Dry Fork',
  'Pittsylvania County (Echo Valley / Carter homestead area)',
  36.895, -79.371, 'https://www.echovalleymicroresort.com/',
  $$Sibling SKU for Echo Valley geodesic micro-units—baseline inventory row until official dome names/floorplans publish.$$,
  $$ADR uses lower end of press band (high $100s–low $200s).$$,
  '2026-05-16', '2026-05-16', 'private_commercial',
  185,
  15, 1,
  'Yes', NULL, 'Yes', NULL,
  'No', 'Yes', NULL, NULL, 'Yes', 'Yes',
  'Yes', 'Yes', NULL, NULL,
  'Yes', 'Yes', 'Yes', 'Yes',
  'Echo Valley sibling; pool/sauna/clubhouse from press—verify final build.'
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
  'Echo Valley Micro-Resort',
  'Geodesic dome (premium / stargazing emphasis)',
  'echo-valley-micro-resort-dry-fork-va',
  'Glamping Resort', 'Geodesic Dome',
  'Sage', 'web_research_echo_valley_enrichment_2026_05',
  'USA', 'VA', 'Dry Fork',
  'Pittsylvania County (Echo Valley / Carter homestead area)',
  36.895, -79.371, 'https://www.echovalleymicroresort.com/',
  $$Sibling SKU emphasizing sky-view glazing / premium dome positioning from regional press.$$,
  $$ADR uses upper end of cited nightly band—replace with operator pricing.$$,
  '2026-05-16', '2026-05-16', 'private_commercial',
  220,
  15, 1,
  'Yes', NULL, 'Yes', NULL,
  'No', 'Yes', NULL, NULL, 'Yes', 'Yes',
  'Yes', 'Yes', NULL, NULL,
  'Yes', 'Yes', 'Yes', 'Yes',
  'Echo Valley sibling; pool/sauna/clubhouse from press—verify final build.'
);

-- Repair ADRs if INSERT misaligned (prod applied this pair after first migration):
-- UPDATE public.all_glamping_properties SET rate_avg_retail_daily_rate = 185 WHERE slug = 'echo-valley-micro-resort-dry-fork-va' AND site_name = 'Geodesic dome (standard micro-unit)';
-- UPDATE public.all_glamping_properties SET rate_avg_retail_daily_rate = 220 WHERE slug = 'echo-valley-micro-resort-dry-fork-va' AND site_name = 'Geodesic dome (premium / stargazing emphasis)';
