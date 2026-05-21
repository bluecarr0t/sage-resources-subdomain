-- Marriott glamping / Outdoor Collection / luxury safari (May 2026 web research).
-- Sources: marriott.com Outdoor Collection, luxury safari hub, operator sites, trade press.
-- discovery_source = web_research_2026_05_marriott_glamping
-- research_status = in_progress for new rows; existing Postcard / Al Maha keep published, gain brand_id.
-- Postcard Cabins: all 29 US locations already in DB — brand backfill only (no duplicate inserts).
-- Safe to re-run: brand upserts + deduped inserts + idempotent updates.

-- ---------------------------------------------------------------------------
-- Brand registry
-- ---------------------------------------------------------------------------
INSERT INTO public.glamping_brands (slug, display_name, brand_tier, legacy_chain_key, parent_brand_id, website_url, notes)
VALUES
  (
    'marriott',
    'Marriott',
    'portfolio',
    'marriott',
    NULL,
    'https://www.marriott.com/',
    'Marriott Bonvoy portfolio: Outdoor Collection (Postcard Cabins, Trailborn), Autograph safari camps, JW/Ritz luxury safari lodges, Luxury Collection desert tents.'
  ),
  (
    'marriott-outdoor-collection',
    'Outdoor Collection by Marriott Bonvoy',
    'sub_brand',
    'outdoor collection',
    (SELECT id FROM public.glamping_brands WHERE slug = 'marriott'),
    'https://www.marriott.com/brands/outdoor-collection.mi',
    'Marriott Bonvoy outdoor hospitality: Postcard Cabins (~29 US cabin outposts) and Trailborn boutique outdoor hotels.'
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
WHERE child.slug = 'marriott-outdoor-collection'
  AND parent.slug = 'marriott';

-- Nest legacy Postcard Cabins brand under Outdoor Collection
UPDATE public.glamping_brands pc
SET parent_brand_id = oc.id,
    brand_tier = 'sub_brand',
    updated_at = now()
FROM public.glamping_brands oc
WHERE pc.slug = 'postcard-cabins'
  AND oc.slug = 'marriott-outdoor-collection';

-- ---------------------------------------------------------------------------
-- Backfill brand on existing Marriott-affiliated inventory
-- ---------------------------------------------------------------------------
UPDATE public.all_glamping_properties p
SET
  brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'marriott-outdoor-collection'),
  date_updated = '2026-05-21',
  notes = COALESCE(p.notes, '') || E'\n\nOutdoor Collection by Marriott Bonvoy (Postcard Cabins). Brand linked May 2026 web research.'
WHERE p.property_name ILIKE 'Postcard Cabins%'
  AND (p.brand_id IS NULL OR p.brand_id IS DISTINCT FROM (SELECT id FROM public.glamping_brands WHERE slug = 'marriott-outdoor-collection'));

UPDATE public.all_glamping_properties p
SET
  brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'marriott'),
  date_updated = '2026-05-21',
  notes = COALESCE(p.notes, '') || E'\n\nMarriott Luxury Collection — Al Maha desert tented suites. Brand linked May 2026 web research.'
WHERE p.slug = 'al-maha-luxury-collection-dubai-ae'
   OR (p.property_name ILIKE 'Al Maha%' AND p.country = 'United Arab Emirates');

-- Re-open Trailborn Jackson Hole under Marriott Outdoor Collection
UPDATE public.all_glamping_properties p
SET
  research_status = 'in_progress',
  is_open = 'Yes',
  property_name = 'Trailborn Jackson Hole',
  brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'marriott-outdoor-collection'),
  discovery_source = COALESCE(NULLIF(btrim(p.discovery_source), ''), 'web_research_2026_05_marriott_glamping'),
  url = COALESCE(NULLIF(btrim(p.url), ''), 'https://www.marriott.com/en-us/hotels/jactj-trailborn-jackson-hole-outdoor-collection-bonvoy/overview/'),
  address = COALESCE(NULLIF(btrim(p.address), ''), '400 E Snow King Ave, Jackson, WY 83001'),
  country = 'United States',
  date_updated = '2026-05-21',
  notes = COALESCE(p.notes, '') || E'\n\nOutdoor Collection by Marriott Bonvoy (Trailborn). Former Snow King Resort area; alpine resort with mineral spa and Old Timer restaurant (May 2026 web research).'
WHERE p.slug = 'trailborn-jackson-hole-wy'
   OR p.id = 11823;

-- ---------------------------------------------------------------------------
-- New properties (deduped insert)
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
  land_operator_category,
  brand_id,
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
  v.land_operator_category,
  CASE v.brand_id_slug
    WHEN 'marriott-outdoor-collection' THEN (
      SELECT id FROM public.glamping_brands WHERE slug = 'marriott-outdoor-collection'
    )
    ELSE (SELECT id FROM public.glamping_brands WHERE slug = 'marriott')
  END,
  v.glamping_service_tier,
  v.glamping_service_tier_source,
  v.glamping_service_tier_notes
FROM (
  VALUES
  -- Outdoor Collection: Trailborn (US)
  (
    'in_progress', 'Yes', 'Yes',
    'Trailborn Highlands', NULL,
    'trailborn-highlands-nc',
    'Glamping Resort', 'Cabin',
    'Sage', 'web_research_2026_05_marriott_glamping',
    'United States', 'NC', 'Highlands',
    '96 Log Cabin Ln, Highlands, NC 28741',
    35.053::numeric, -83.197::numeric,
    'https://www.marriott.com/en-us/hotels/avlhb-trailborn-highlands/overview/',
    $$Trailborn Highlands — Outdoor Collection boutique hotel in the Blue Ridge Mountains with garden rooms, Nordic spa, Highlands Supper Club, and curated fly-fishing / hiking excursions. Bookable on Marriott Bonvoy.$$,
    $$Sources: marriott.com avlhb; trailborn.com (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'marriott-outdoor-collection', 'upscale', 'manual',
    'Trailborn Outdoor Collection — NC mountains (May 2026).'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'Trailborn Surf & Sound', NULL,
    'trailborn-surf-and-sound-nc',
    'Glamping Resort', 'Cabin',
    'Sage', 'web_research_2026_05_marriott_glamping',
    'United States', 'NC', 'Wrightsville Beach',
    '10 Heekin Ave, Wrightsville Beach, NC 28480',
    34.210::numeric, -77.796::numeric,
    'https://www.marriott.com/en-us/hotels/ilmss-trailborn-surf-and-sound-outdoor-collection-bonvoy/overview/',
    $$Trailborn Surf & Sound — Outdoor Collection beach resort on Wrightsville Beach with surf lessons, pool, La Duna Paradiso dining, and complimentary beach cruisers. Marriott Bonvoy.$$,
    $$Sources: marriott.com ilmss; trailborn.com (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'marriott-outdoor-collection', 'upscale', 'manual',
    'Trailborn Outdoor Collection — NC coast (May 2026).'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'Trailborn Grand Canyon', NULL,
    'trailborn-grand-canyon-az',
    'Glamping Resort', 'Cabin',
    'Sage', 'web_research_2026_05_marriott_glamping',
    'United States', 'AZ', 'Williams',
    '235 N Grand Canyon Blvd, Williams, AZ 86046',
    35.249::numeric, -112.191::numeric,
    'https://www.marriott.com/en-us/hotels/flgwb-trailborn-grand-canyon/overview/',
    $$Trailborn Grand Canyon — Outdoor Collection Route 66 motor lodge in Williams, AZ gateway to Grand Canyon South Rim; pool, hot tub, Miss Kitty''s steakhouse, and curated canyon excursions. Marriott Bonvoy.$$,
    $$Sources: marriott.com flgwb; trailborn.com (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'marriott-outdoor-collection', 'upscale', 'manual',
    'Trailborn Outdoor Collection — Grand Canyon gateway (May 2026).'
  ),
  (
    'in_progress', 'Yes', 'Under Construction',
    'Trailborn Mendocino Hillside', NULL,
    'trailborn-mendocino-hillside-ca',
    'Glamping Resort', 'Cabin',
    'Sage', 'web_research_2026_05_marriott_glamping',
    'United States', 'CA', 'Mendocino',
    '10701 Palette Dr, Mendocino, CA 95460',
    39.307::numeric, -123.799::numeric,
    'https://www.marriott.com/en-us/hotels/stsmh-trailborn-mendocino-hillside-outdoor-collection-bonvoy/overview/',
    $$Trailborn Mendocino Hillside — Outdoor Collection hillside retreat between redwoods and Pacific cliffs; Marriott listing cited reservations coming soon / pre-opening (May 2026). Verify open date on marriott.com.$$,
    $$Sources: marriott.com stsmh; trailborn.com Mendocino (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'marriott-outdoor-collection', 'upscale', 'manual',
    'Trailborn Outdoor Collection — Mendocino pipeline (May 2026).'
  ),
  -- Autograph Collection safari (Tanzania) — unit tiers: Standard, Deluxe, VIP, Family tents + two-bedroom villa
  (
    'in_progress', 'Yes', 'Yes',
    'Mapito Safari Camp, Serengeti', NULL,
    'mapito-safari-camp-serengeti-tz',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_marriott_glamping',
    'Tanzania', NULL, 'Serengeti',
    'Ikoma Region, Robanda, Serengeti ecosystem, Tanzania',
    -2.179::numeric, 34.681::numeric,
    'https://www.marriott.com/en-us/hotels/jrosk-mapito-safari-camp-serengeti-autograph-collection/overview/',
    $$Mapito Safari Camp — first Autograph Collection safari camp in the Serengeti (opened 2025): ~15 tented suites (Standard, Deluxe, VIP, Family) plus two-bedroom villa; retractable stargazing roofs, telescopes, pool, The Boma restaurant, migration-corridor game drives. Cash rates often cited from ~$800/night; verify on Marriott.$$,
    $$Sources: mapitosafaricamp.com; Marriott press Sep 2025; marriott.com jrosk (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'marriott', 'luxury', 'manual',
    'Marriott Autograph Collection safari — Serengeti (May 2026).'
  ),
  -- JW / Ritz luxury safari (Kenya)
  (
    'in_progress', 'Yes', 'Yes',
    'JW Marriott Masai Mara Lodge', NULL,
    'jw-marriott-masai-mara-lodge-ke',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_marriott_glamping',
    'Kenya', NULL, 'Masai Mara',
    'Talek River, Masai Mara National Reserve, Narok County, Kenya',
    -1.406::numeric, 35.118::numeric,
    'https://www.marriott.com/en-us/hotels/nbomj-jw-marriott-masai-mara-lodge/overview/',
    $$JW Marriott Masai Mara Lodge — luxury canvas tent suites on the Talek River with private decks, indoor/outdoor showers, and jacuzzis; elevated safari camp design with game drives and JW Garden experiences. Marriott luxury safari portfolio (Kenya).$$,
    $$Sources: marriott.com nbomj; Marriott luxury safari hub (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'marriott', 'luxury', 'manual',
    'JW Marriott luxury safari — Masai Mara (May 2026).'
  ),
  (
    'in_progress', 'Yes', 'Yes',
    'The Ritz-Carlton, Masai Mara Safari Camp', NULL,
    'ritz-carlton-masai-mara-safari-camp-ke',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_marriott_glamping',
    'Kenya', NULL, 'Masai Mara',
    'Sand River, Masai Mara National Reserve, Kenya',
    -1.553::numeric, 35.148::numeric,
    'https://www.marriott.com/en-us/hotels/kevmc-the-ritz-carlton-masai-mara-safari-camp/overview/',
    $$The Ritz-Carlton, Masai Mara Safari Camp — brand''s first safari camp (opened Aug 2025): 20 tented suites plus Presidential Suite on Sand River with plunge pools, all-inclusive game drives, Canon photo gear, and Maasai cultural programming. Rates often cited from ~$2,600–3,500+ per person/night.$$,
    $$Sources: Marriott press Aug 2025; Travel Weekly; onemileatatime (May 2026 web research). Verify marriott.com hotel code.$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'marriott', 'luxury', 'manual',
    'Ritz-Carlton luxury safari — Masai Mara (May 2026).'
  ),
  (
    'in_progress', 'Yes', 'Under Construction',
    'JW Marriott Mount Kenya Rhino Reserve Safari Camp', NULL,
    'jw-marriott-mount-kenya-rhino-reserve-ke',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_marriott_glamping',
    'Kenya', NULL, 'Solio',
    'Solio Game Reserve, Laikipia County, Kenya',
    -0.420::numeric, 37.020::numeric,
    'https://www.marriott.com/en-us/hotels/nbomj-jw-marriott-masai-mara-lodge/overview/',
    $$JW Marriott Mount Kenya Rhino Reserve Safari Camp — 19 tented suites in Solio rhino sanctuary opening July 2026 (reservations cited from ~$4,446/night). Spa by JW, plunge pools, rhino-focused game drives. Update URL when dedicated marriott.com property page is live.$$,
    $$Sources: The Points Guy Apr 2026; shore.africa; Marriott Africa safari announcements (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'marriott', 'luxury', 'manual',
    'JW Marriott safari pipeline — Mount Kenya / Solio (opens Jul 2026).'
  )
) AS v(
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city, address, lat, lon, url,
  description, notes, date_added, date_updated, land_operator_category,
  brand_id_slug, glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.all_glamping_properties p
  WHERE lower(btrim(COALESCE(p.slug, ''))) = lower(btrim(v.slug))
     OR (
       public.sage_normalize_property_name_key(p.property_name)
         = public.sage_normalize_property_name_key(v.property_name)
       AND COALESCE(lower(btrim(p.site_name)), '') = COALESCE(lower(btrim(v.site_name)), '')
       AND lower(btrim(COALESCE(p.unit_type, ''))) = lower(btrim(COALESCE(v.unit_type, '')))
       AND lower(btrim(COALESCE(p.country, ''))) = lower(btrim(COALESCE(v.country, '')))
       AND COALESCE(upper(btrim(p.state)), '') = COALESCE(upper(btrim(v.state)), '')
     )
);

-- Align brand_id on rows from this discovery batch
UPDATE public.all_glamping_properties p
SET brand_id = COALESCE(
  (SELECT id FROM public.glamping_brands WHERE slug = 'marriott-outdoor-collection'),
  p.brand_id
),
date_updated = '2026-05-21'
WHERE p.discovery_source = 'web_research_2026_05_marriott_glamping'
  AND p.property_name ILIKE 'Trailborn%'
  AND p.brand_id IS NULL;

UPDATE public.all_glamping_properties p
SET brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'marriott'),
    date_updated = '2026-05-21'
WHERE p.discovery_source = 'web_research_2026_05_marriott_glamping'
  AND (
    p.property_name ILIKE '%Mapito%'
    OR p.property_name ILIKE '%Masai Mara%'
    OR p.property_name ILIKE '%Mount Kenya%'
  )
  AND p.brand_id IS NULL;
