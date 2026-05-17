-- Prospect and Refuge (id 11853): web enrichment + sibling SKUs.
-- Applied: enrich_prospect_and_refuge_11853_2026_05_16 + sibling consistency UPDATE (flags not in 48-column INSERT).

UPDATE public.all_glamping_properties SET
  site_name = 'Luxury safari-style tent (gorge deck + campfire)',
  description = $$Boutique glamping marketed for the **Tennessee River Gorge** near Chattanooga—positioned between “return to nature” and a **boutique-hotel** level of comfort. Copy highlights **private outdoor decks**, **campfires under starlit skies**, forest soundscape, and access to **state parks**, **boating/fishing on the Tennessee River**, **Jeep-style adventure rentals**, and **Chattanooga dining** as part of the experience mix (romantic, family, or solitary retreat framing). Browser title references **Spring 2025** while the landing page still reads **pre-launch / “coming soon”**—**verify operational status, exact parcel, inventory counts, and published nightly rates** before go-live data.$$,
  notes = COALESCE(notes, '') || E'\n\nEnrichment (prospectandrefugeresorts.com homepage only, May 2026): /contact and /about returned 404—no phone or rate table in static pull. year_site_opened left null (2025 appears in <title> but site still pre-booking).',
  quantity_of_units = 1,
  unit_private_bathroom = 'Yes',
  unit_patio = 'Yes',
  unit_campfires = 'Yes',
  activities_hiking = 'Yes',
  activities_fishing = 'Yes',
  activities_boating = 'Yes',
  activities_canoeing_kayaking = 'Yes',
  activities_paddling = 'Yes',
  activities_off_roading_ohv = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_stargazing = 'Yes',
  activities_historic_sightseeing = 'Yes',
  river_stream_or_creek = 'Yes',
  property_waterfront = 'Yes',
  property_has_rentals = 'Yes',
  setting_forest = 'Yes',
  setting_canyon = 'Yes',
  setting_mountainous = 'Yes',
  property_family_friendly = 'Yes',
  amenities_raw = 'Homepage marketing: Tennessee River Gorge; luxury tent glamping + boutique-hotel positioning; private deck; campfire/stargazing; nearby state parks; Tennessee River boating/fishing; Jeep adventure framing; Chattanooga dining/city access.',
  date_updated = '2026-05-16'
WHERE id = 11853;

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
  'Prospect and Refuge',
  'Luxury safari-style tent (stargazing + night deck)',
  'prospect-and-refuge-chattanooga-tn',
  'Glamping Resort', 'Safari Tent',
  'Sage', 'web_research_prospect_refuge_enrichment_2026_05',
  'USA', 'TN', 'Chattanooga',
  'Tennessee River Gorge (pre-opening; exact parcel TBD)',
  35.220, -85.321, 'https://www.prospectandrefugeresorts.com/',
  $$Sibling SKU emphasizing starlit sky / night-deck experience from homepage copy.$$,
  $$Placeholder unit row; ADR null (no published nightly rates).$$,
  '2026-05-16', '2026-05-16', 'private_commercial',
  NULL,
  NULL, 1,
  NULL, 'Yes', NULL, NULL,
  NULL, NULL, NULL, NULL, 'Yes', NULL,
  'Yes', NULL, 'Yes', 'Yes',
  'Yes', 'Yes', NULL, 'Yes',
  'Prospect & Refuge sibling; reconcile when booking opens.'
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
  'Prospect and Refuge',
  'Luxury safari-style tent (river + adventure base)',
  'prospect-and-refuge-chattanooga-tn',
  'Glamping Resort', 'Safari Tent',
  'Sage', 'web_research_prospect_refuge_enrichment_2026_05',
  'USA', 'TN', 'Chattanooga',
  'Tennessee River Gorge (pre-opening; exact parcel TBD)',
  35.220, -85.321, 'https://www.prospectandrefugeresorts.com/',
  $$Sibling SKU emphasizing Tennessee River boating/fishing + Jeep/outdoor adventure positioning from homepage copy.$$,
  $$Placeholder unit row; ADR null (no published nightly rates).$$,
  '2026-05-16', '2026-05-16', 'private_commercial',
  NULL,
  NULL, 1,
  NULL, 'Yes', NULL, NULL,
  NULL, NULL, NULL, NULL, 'Yes', NULL,
  'Yes', NULL, 'Yes', 'Yes',
  'Yes', 'Yes', NULL, 'Yes',
  'Prospect & Refuge sibling; reconcile when booking opens.'
);

-- Align sibling rows with anchor flags not present in the 48-column insert template:
UPDATE public.all_glamping_properties SET
  unit_private_bathroom = 'Yes',
  unit_patio = 'Yes',
  activities_boating = 'Yes',
  activities_paddling = 'Yes',
  activities_off_roading_ohv = 'Yes',
  activities_scenic_drives = 'Yes',
  activities_stargazing = 'Yes',
  activities_historic_sightseeing = 'Yes',
  setting_canyon = 'Yes',
  setting_mountainous = 'Yes',
  property_has_rentals = 'Yes',
  date_updated = '2026-05-16'
WHERE slug = 'prospect-and-refuge-chattanooga-tn'
  AND site_name IN (
    'Luxury safari-style tent (stargazing + night deck)',
    'Luxury safari-style tent (river + adventure base)'
  );
