-- Best Western / BWH Hotels — WorldHotels Backdrop glamping collection (May 2026 web research).
-- Sources: bestwestern.com Backdrop brand page, BWH Apr 2026 press release, worldhotels.com,
--   zionwildflower.com, ashevillerivercabins.com, picobonito.com, trade press (TravelAge West, IGB).
-- discovery_source = web_research_2026_05_best_western_backdrop
-- research_status = in_progress for all rows under this brand.
-- Safe to re-run: brand upserts + deduped inserts + idempotent updates on known slugs/ids.

-- ---------------------------------------------------------------------------
-- Brand registry (Best Western portfolio → WorldHotels Backdrop sub-brand)
-- ---------------------------------------------------------------------------
INSERT INTO public.glamping_brands (slug, display_name, brand_tier, legacy_chain_key, parent_brand_id, website_url, notes)
VALUES
  (
    'best-western',
    'Best Western',
    'portfolio',
    'best western',
    NULL,
    'https://www.bestwestern.com/',
    'BWH Hotels parent portfolio (Best Western Hotels & Resorts). Backdrop glamping collection launched Apr 2026.'
  ),
  (
    'worldhotels-backdrop',
    'WorldHotels Backdrop',
    'sub_brand',
    'worldhotels backdrop',
    (SELECT id FROM public.glamping_brands WHERE slug = 'best-western'),
    'https://www.bestwestern.com/en_US/hotels/discover-best-western/brands/worldhotels-backdrop.html',
    'Upscale outdoor / glamping collection within BWH Hotels (WorldHotels). Canvas tents, wagons, riverside cabins, rainforest lodges.'
  )
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  brand_tier = EXCLUDED.brand_tier,
  legacy_chain_key = EXCLUDED.legacy_chain_key,
  parent_brand_id = EXCLUDED.parent_brand_id,
  website_url = EXCLUDED.website_url,
  notes = EXCLUDED.notes,
  updated_at = now();

-- Ensure sub-brand parent after best-western exists.
UPDATE public.glamping_brands child
SET parent_brand_id = parent.id,
    brand_tier = 'sub_brand',
    updated_at = now()
FROM public.glamping_brands parent
WHERE child.slug = 'worldhotels-backdrop'
  AND parent.slug = 'best-western';

-- ---------------------------------------------------------------------------
-- Align existing Zion Wildflower inventory (open; BW Premier / Backdrop member)
-- ---------------------------------------------------------------------------
UPDATE public.all_glamping_properties p
SET
  property_name = 'Zion Wildflower Resort',
  research_status = 'in_progress',
  brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'worldhotels-backdrop'),
  discovery_source = COALESCE(NULLIF(btrim(p.discovery_source), ''), 'web_research_2026_05_best_western_backdrop'),
  url = COALESCE(NULLIF(btrim(p.url), ''), 'https://zionwildflower.com/'),
  address = COALESCE(NULLIF(btrim(p.address), ''), '100 N Kolob Terrace Rd, Virgin, UT 84779'),
  country = 'United States',
  date_updated = '2026-05-21',
  notes = COALESCE(p.notes, '') || E'\n\nWorldHotels Backdrop / Best Western BW Premier collection member (BWH press Apr 2026). Safari tents, covered wagons, private bungalows near Zion NP. Bookable via Best Western Rewards.'
WHERE p.id IN (10072, 10073, 10396, 10407, 10554)
   OR p.slug IN ('wildflower-zion', 'zion-wildflower-resort-glamping-zion-national-park')
   OR p.property_name ILIKE '%zion wildflower%'
   OR (p.city ILIKE 'virgin' AND p.state = 'UT' AND p.url ILIKE '%zionwildflower%');

UPDATE public.all_glamping_properties
SET unit_type = 'Bungalow'
WHERE id = 10554
  AND unit_type IS NULL;

UPDATE public.all_glamping_properties
SET unit_type = 'Canvas Tent'
WHERE id IN (10072, 10073)
  AND (unit_type IS NULL OR unit_type = 'Tiny Home');

-- ---------------------------------------------------------------------------
-- New Backdrop properties + proposed pipeline (deduped insert)
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
  (SELECT id FROM public.glamping_brands WHERE slug = 'worldhotels-backdrop'),
  v.glamping_service_tier,
  v.glamping_service_tier_source,
  v.glamping_service_tier_notes
FROM (
  VALUES
  -- Open: Asheville River Cabins (Backdrop launch property, NC)
  (
    'in_progress', 'Yes', 'Yes',
    'Asheville River Cabins', 'Riverside Cabin',
    'asheville-river-cabins-arden-nc',
    'Glamping Resort', 'Cabin',
    'Sage', 'web_research_2026_05_best_western_backdrop',
    'United States', 'NC', 'Arden',
    '318 Wanderlust Ridge, Arden, NC 28704',
    35.466::numeric, -82.516::numeric,
    'https://www.ashevillerivercabins.com/',
    $$WorldHotels Backdrop riverside cabin resort on the French Broad River near Asheville: ~29 renovated cabins with decks, fire pits, hot tubs (select units), kitchenettes, Zen Tubing, e-bikes, SUP, sauna, and Blue Ridge outdoor access. Listed as an initial Backdrop collection property (BWH Apr 2026); bookable on Best Western / BWH channels.$$,
    $$Sources: bestwestern.com WorldHotels Backdrop; ashevillerivercabins.com; BWH press release Apr 14 2026 (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'upscale', 'manual',
    'Backdrop launch property; riverside cabin glamping-adjacent outdoor hospitality (May 2026).'
  ),
  -- Under construction / coming soon: Lodge at Pico Bonito (Honduras Backdrop)
  (
    'in_progress', 'Yes', 'Under Construction',
    'The Lodge at Pico Bonito', NULL,
    'the-lodge-at-pico-bonito-la-ceiba-hn',
    'Glamping Resort', 'Cabin',
    'Sage', 'web_research_2026_05_best_western_backdrop',
    'Honduras', NULL, 'La Ceiba',
    'KM 175 Aldea El Pino, main entrance to Pico Bonito National Park, La Ceiba, Honduras',
    15.683::numeric, -86.850::numeric,
    'https://www.picobonito.com/',
    $$Rainforest eco-lodge at Pico Bonito National Park (premium king/DD cabins, eco retreat cabins, pool, spa restaurant, birding). Announced as upcoming WorldHotels Backdrop collection member (debut cited May 2026 in trade press); verify Backdrop branding and bookability on BWH when live.$$,
    $$Sources: picobonito.com; TravelAge West May 2026; BWH WorldHotels Backdrop launch (Apr 2026). Status = joining Backdrop collection (not yet fully marketed on BW brand page as open).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'luxury', 'manual',
    'Backdrop pipeline — Honduras rainforest lodge (coming soon to collection, May 2026).'
  ),
  -- Proposed: Vietnam (Phan Thiet)
  (
    'in_progress', 'Yes', 'Proposed Development',
    'WorldHotels Backdrop - Phan Thiet', NULL,
    'worldhotels-backdrop-phan-thiet-vietnam',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_best_western_backdrop',
    'Vietnam', NULL, 'Phan Thiet',
    NULL,
    10.928::numeric, 108.102::numeric,
    'https://www.bestwestern.com/en_US/hotels/discover-best-western/brands/worldhotels-backdrop.html',
    $$Proposed WorldHotels Backdrop coastal glamping location in Phan Thiet, Vietnam — cited in BWH expansion discussions (beach/nature-focused upscale outdoor stays). No confirmed operator site or opening date; coordinates are city-center approximate.$$,
    $$Sources: Asian Hospitality / Latte Luxury News summaries of BWH Backdrop launch; early-stage Vietnam pipeline only (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'upscale', 'manual',
    'Backdrop proposed development — Vietnam (May 2026).'
  ),
  -- Proposed: Africa safari pipeline
  (
    'in_progress', 'Yes', 'Proposed Development',
    'WorldHotels Backdrop - Africa', NULL,
    'worldhotels-backdrop-africa-proposed',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_best_western_backdrop',
    NULL, NULL, NULL,
    NULL,
    NULL::numeric, NULL::numeric,
    'https://www.bestwestern.com/en_US/hotels/discover-best-western/brands/worldhotels-backdrop.html',
    $$Proposed WorldHotels Backdrop safari-style glamping expansion in Africa (destination and operator TBD per BWH early discussions). Placeholder row until a named property and country are announced.$$,
    $$Sources: BWH / WorldHotels Backdrop launch press (Apr 2026); International Glamping Business Apr 2026 (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'luxury', 'manual',
    'Backdrop proposed development — Africa safari pipeline (May 2026).'
  ),
  -- Proposed: Australia safari pipeline
  (
    'in_progress', 'Yes', 'Proposed Development',
    'WorldHotels Backdrop - Australia', NULL,
    'worldhotels-backdrop-australia-proposed',
    'Glamping Resort', 'Safari Tent',
    'Sage', 'web_research_2026_05_best_western_backdrop',
    'Australia', NULL, NULL,
    NULL,
    NULL::numeric, NULL::numeric,
    'https://www.bestwestern.com/en_US/hotels/discover-best-western/brands/worldhotels-backdrop.html',
    $$Proposed WorldHotels Backdrop safari-style glamping expansion in Australia (destination and operator TBD per BWH early discussions). Placeholder row until a named property and region are announced.$$,
    $$Sources: BWH / WorldHotels Backdrop launch press (Apr 2026); trade coverage of Vietnam / Africa / Australia pipeline (May 2026 web research).$$,
    '2026-05-21', '2026-05-21', 'private_commercial',
    'luxury', 'manual',
    'Backdrop proposed development — Australia pipeline (May 2026).'
  )
) AS v(
  research_status, is_glamping_property, is_open,
  property_name, site_name, slug, property_type, unit_type,
  source, discovery_source, country, state, city, address, lat, lon, url,
  description, notes, date_added, date_updated, land_operator_category,
  glamping_service_tier, glamping_service_tier_source, glamping_service_tier_notes
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.all_glamping_properties p
  WHERE lower(btrim(COALESCE(p.slug, ''))) = lower(btrim(v.slug))
     OR (
       public.sage_normalize_property_name_key(p.property_name)
         = public.sage_normalize_property_name_key(v.property_name)
       AND lower(btrim(COALESCE(p.unit_type, ''))) = lower(btrim(COALESCE(v.unit_type, '')))
       AND lower(btrim(COALESCE(p.country, ''))) = lower(btrim(COALESCE(v.country, '')))
       AND COALESCE(upper(btrim(p.state)), '') = COALESCE(upper(btrim(v.state)), '')
     )
);

-- Backfill brand_id on any Zion rows missed by id list (slug/name match).
UPDATE public.all_glamping_properties p
SET
  brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'worldhotels-backdrop'),
  research_status = 'in_progress',
  date_updated = '2026-05-21'
WHERE p.brand_id IS NULL
  AND (
    p.slug IN ('wildflower-zion', 'zion-wildflower-resort-glamping-zion-national-park')
    OR p.property_name ILIKE '%zion wildflower%'
    OR (p.city ILIKE 'virgin' AND p.state = 'UT' AND p.url ILIKE '%zionwildflower%')
  );

-- Align brand_id on newly inserted Backdrop rows (defensive).
UPDATE public.all_glamping_properties p
SET brand_id = b.id, date_updated = '2026-05-21'
FROM public.glamping_brands b
WHERE b.slug = 'worldhotels-backdrop'
  AND p.discovery_source = 'web_research_2026_05_best_western_backdrop'
  AND (p.brand_id IS NULL OR p.brand_id IS DISTINCT FROM b.id);
