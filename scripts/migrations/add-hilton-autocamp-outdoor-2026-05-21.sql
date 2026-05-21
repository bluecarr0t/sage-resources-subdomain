-- Hilton outdoor hospitality: AutoCamp Stays + Outset Collection (May 2026 web research).
-- Sources: hilton.com/en/brands/autocamp-stays/, autocamp.com/locations/, hilton.com Moab/Slackline,
--   stories.hilton.com Outset + Slackline Moab releases, Moab Sun News (Field Station → Slackline).
-- discovery_source = web_research_2026_05_hilton_outdoor
-- AutoCamp: all US sites already in DB — brand hierarchy + Hill Country status + Hilton notes (no Sonoma duplicate).
-- New row: Slackline Moab, Outset Collection by Hilton.
-- Safe to re-run: brand upserts + idempotent updates + deduped insert.

-- ---------------------------------------------------------------------------
-- Brand registry
-- ---------------------------------------------------------------------------
INSERT INTO public.glamping_brands (slug, display_name, brand_tier, legacy_chain_key, parent_brand_id, website_url, notes)
VALUES
  (
    'hilton',
    'Hilton',
    'portfolio',
    'hilton',
    NULL,
    'https://www.hilton.com/',
    'Hilton portfolio outdoor hospitality: AutoCamp Stays (glamping), Outset Collection (adventure boutique hotels).'
  ),
  (
    'hilton-outset-collection',
    'Outset Collection by Hilton',
    'sub_brand',
    'outset collection',
    (SELECT id FROM public.glamping_brands WHERE slug = 'hilton'),
    'https://stories.hilton.com/outset-collection-by-hilton-fact-sheet',
    'Hilton lifestyle brand for independent, story-driven boutique hotels in adventure outposts and outdoor destinations. Debut Oct 2025.'
  )
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  brand_tier = EXCLUDED.brand_tier,
  legacy_chain_key = EXCLUDED.legacy_chain_key,
  parent_brand_id = EXCLUDED.parent_brand_id,
  website_url = EXCLUDED.website_url,
  notes = EXCLUDED.notes,
  updated_at = now();

UPDATE public.glamping_brands child
SET parent_brand_id = parent.id,
    brand_tier = 'sub_brand',
    updated_at = now()
FROM public.glamping_brands parent
WHERE child.slug = 'hilton-outset-collection'
  AND parent.slug = 'hilton';

-- Nest existing AutoCamp brand under Hilton (preserve autocamp slug + brand_id FKs)
UPDATE public.glamping_brands ac
SET parent_brand_id = h.id,
    brand_tier = 'sub_brand',
    legacy_chain_key = 'autocamp',
    website_url = COALESCE(ac.website_url, 'https://autocamp.com/'),
    notes = COALESCE(ac.notes, '') || E' AutoCamp Stays — bookable on Hilton Honors via hilton.com/en/brands/autocamp-stays/ (May 2026).',
    updated_at = now()
FROM public.glamping_brands h
WHERE ac.slug = 'autocamp'
  AND h.slug = 'hilton';

-- ---------------------------------------------------------------------------
-- Backfill Hilton / AutoCamp on existing inventory
-- ---------------------------------------------------------------------------
UPDATE public.all_glamping_properties p
SET
  brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'autocamp'),
  number_of_locations = 9,
  date_updated = '2026-05-21',
  notes = CASE
    WHEN COALESCE(p.notes, '') ILIKE '%Hilton portfolio — AutoCamp Stays%'
      THEN p.notes
    ELSE COALESCE(p.notes, '') || E'\n\nHilton portfolio — AutoCamp Stays sub-brand (bookable on Hilton Honors). Brand linked May 2026 web research.'
  END
WHERE p.property_name ILIKE 'AutoCamp%';

-- Hill Country: pipeline site (Q2 2026 opening per autocamp.com / trade press)
UPDATE public.all_glamping_properties p
SET
  is_open = 'Under Construction',
  url = COALESCE(NULLIF(btrim(p.url), ''), 'https://autocamp.com/locations/hill-country/'),
  address = COALESCE(NULLIF(btrim(p.address), ''), '7041 N State Hwy 16, Fredericksburg, TX 78624'),
  discovery_source = COALESCE(NULLIF(btrim(p.discovery_source), ''), 'web_research_2026_05_hilton_outdoor'),
  date_updated = '2026-05-21',
  notes = COALESCE(p.notes, '') || E'\n\nAutoCamp Hill Country — opening Q2 2026 (Fredericksburg TX Hill Country). Hilton AutoCamp Stays when live.'
WHERE p.property_name = 'AutoCamp Hill Country';

-- Russian River: Hilton lists as AutoCamp Sonoma (same address)
UPDATE public.all_glamping_properties p
SET
  notes = COALESCE(p.notes, '') || E'\n\nAlso marketed on Hilton as AutoCamp Sonoma (14120 Old Cazadero Rd, Guerneville CA).'
WHERE p.property_name = 'AutoCamp Russian River'
  AND COALESCE(p.notes, '') NOT ILIKE '%AutoCamp Sonoma%';

-- ---------------------------------------------------------------------------
-- New: Slackline Moab, Outset Collection by Hilton
-- ---------------------------------------------------------------------------
INSERT INTO public.all_glamping_properties (
  research_status,
  is_glamping_property,
  is_open,
  property_name,
  site_name,
  slug,
  property_type,
  unit_type,
  source,
  discovery_source,
  country,
  state,
  city,
  address,
  lat,
  lon,
  url,
  description,
  notes,
  date_added,
  date_updated,
  quantity_of_units,
  land_operator_category,
  brand_id,
  number_of_locations,
  glamping_service_tier,
  glamping_service_tier_source,
  glamping_service_tier_notes
)
SELECT
  v.research_status,
  v.is_glamping_property,
  v.is_open,
  v.property_name,
  v.site_name,
  v.slug,
  v.property_type,
  v.unit_type,
  v.source,
  v.discovery_source,
  v.country,
  v.state,
  v.city,
  v.address,
  v.lat,
  v.lon,
  v.url,
  v.description,
  v.notes,
  v.date_added,
  v.date_updated,
  v.quantity_of_units,
  v.land_operator_category,
  (SELECT id FROM public.glamping_brands WHERE slug = 'hilton-outset-collection'),
  v.number_of_locations,
  v.glamping_service_tier,
  v.glamping_service_tier_source,
  v.glamping_service_tier_notes
FROM (
  VALUES
  (
    'in_progress', 'Yes', 'Yes',
    'Slackline Moab, Outset Collection by Hilton', 'Adventure-Ready Guest Room',
    'slackline-moab-outset-collection-by-hilton',
    'Outdoor Boutique Hotel', 'Hotel Room',
    'Sage', 'web_research_2026_05_hilton_outdoor',
    'United States', 'UT', 'Moab',
    '889 N Main St, Moab, UT 84532',
    38.5736::numeric, -109.5498::numeric,
    'https://www.hilton.com/en/hotels/cnymaid-slackline-moab/',
    $$Slackline Moab — debut Outset Collection by Hilton property near Arches and Canyonlands. 138 adventure-ready guest rooms, gear storage, Little Station Coffee + Kitchen, gear shop, pool, EV charging, guided hiking/biking/stargazing. Former Field Station Moab (AutoCamp Hospitality Group, 2023) before Hilton Outset rebrand.$$,
    $$Sources: hilton.com cnymaid; stories.hilton.com Slackline Moab release; Moab Sun News Nov 2025 Field Station rebrand (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 138,
    'private_commercial', 1,
    'upscale', 'manual',
    'Outset Collection debut — Moab adventure basecamp (May 2026).'
  )
) AS v(
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city, address, lat, lon,
  url, description, notes, date_added, date_updated,
  quantity_of_units, land_operator_category, number_of_locations,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.all_glamping_properties existing
  WHERE existing.slug = v.slug
     OR existing.property_name = v.property_name
);
