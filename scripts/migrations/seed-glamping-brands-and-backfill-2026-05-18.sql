-- Seed glamping_brands + backfill all_glamping_properties.brand_id from legacy chain labels.
-- Apply after create-glamping-brands-2026-05-18.sql via migration seed_glamping_brands_and_backfill_2026_05_18.

INSERT INTO public.glamping_brands (slug, display_name, brand_tier, legacy_chain_key, parent_brand_id)
VALUES
  ('under-canvas', 'Under Canvas', 'portfolio', 'under canvas', NULL),
  ('ulum', 'ULUM', 'sub_brand', 'ulum', (SELECT id FROM public.glamping_brands WHERE slug = 'under-canvas')),
  ('autocamp', 'AutoCamp', 'standalone', 'autocamp', NULL),
  ('postcard-cabins', 'Postcard Cabins', 'standalone', 'postcard cabins', NULL),
  ('huttopia', 'Huttopia', 'standalone', 'huttopia', NULL),
  ('wander-camp', 'Wander Camp', 'standalone', 'wander camp', NULL),
  ('collective-retreats', 'Collective Retreats', 'standalone', 'collective retreats', NULL),
  ('getaway-house', 'Getaway House', 'standalone', 'getaway house', NULL),
  ('getaway', 'Getaway', 'standalone', 'getaway', NULL),
  ('firelight-camps', 'Firelight Camps', 'standalone', 'firelight camps', NULL),
  ('nomadic-resort', 'Nomadic Resort', 'standalone', 'nomadic resort', NULL),
  ('timberline-glamping-co', 'Timberline Glamping Co.', 'standalone', 'timberline glamping co.', NULL),
  ('brush-creek-ranch', 'Brush Creek Ranch', 'standalone', 'brush creek ranch', NULL),
  ('long-live-the-simple-life', 'Long Live the Simple Life', 'standalone', 'long live the simple life', NULL),
  ('rvc-outdoor-destinations', 'RVC Outdoor Destinations', 'standalone', 'rvc outdoor destinations', NULL),
  ('sundance-by-basecamp', 'Sundance by Basecamp', 'standalone', 'sundance by basecamp', NULL),
  ('trailer-inn-lodging', 'Trailer Inn Lodging', 'standalone', 'trailer inn lodging', NULL),
  ('trailer-inn', 'Trailer Inn', 'standalone', 'trailer inn', NULL),
  ('koa-holiday', 'KOA Holiday', 'standalone', 'koa holiday', NULL),
  ('koa', 'KOA', 'standalone', 'koa', NULL),
  ('jellystone-park', 'Jellystone Park', 'standalone', 'jellystone park', NULL),
  ('yogi-bears-jellystone-park', 'Yogi Bear''s Jellystone Park', 'standalone', 'yogi bear''s jellystone park', NULL),
  ('camp-ferncrest', 'Camp Ferncrest', 'portfolio', 'camp ferncrest', NULL)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  brand_tier = EXCLUDED.brand_tier,
  legacy_chain_key = EXCLUDED.legacy_chain_key,
  parent_brand_id = EXCLUDED.parent_brand_id,
  updated_at = now();

-- Fix ULUM parent after under-canvas exists (idempotent).
UPDATE public.glamping_brands child
SET parent_brand_id = parent.id,
    brand_tier = 'sub_brand',
    updated_at = now()
FROM public.glamping_brands parent
WHERE child.slug = 'ulum'
  AND parent.slug = 'under-canvas';

-- Camp Ferncrest: match "Camp Ferncrest%" property names not caught by legacy prefix list.
UPDATE public.glamping_brands
SET legacy_chain_key = 'camp ferncrest'
WHERE slug = 'camp-ferncrest'
  AND legacy_chain_key IS DISTINCT FROM 'camp ferncrest';

-- Backfill brand_id from legacy chain label function.
UPDATE public.all_glamping_properties p
SET brand_id = b.id
FROM public.glamping_brands b
WHERE p.brand_id IS NULL
  AND b.legacy_chain_key IS NOT NULL
  AND lower(public.sage_chain_label_from_property_name(p.property_name)) = b.legacy_chain_key;

-- Camp Ferncrest explicit name prefix (legacy function may not include ferncrest).
UPDATE public.all_glamping_properties p
SET brand_id = b.id
FROM public.glamping_brands b
WHERE b.slug = 'camp-ferncrest'
  AND p.brand_id IS NULL
  AND p.property_name ILIKE 'Camp Ferncrest%';

-- Align siblings: one brand_id per property_id when property_id is set.
WITH canonical AS (
  SELECT
    property_id,
    (mode() WITHIN GROUP (ORDER BY brand_id::text))::uuid AS brand_id
  FROM public.all_glamping_properties
  WHERE property_id IS NOT NULL
    AND brand_id IS NOT NULL
  GROUP BY property_id
)
UPDATE public.all_glamping_properties p
SET brand_id = c.brand_id
FROM canonical c
WHERE p.property_id = c.property_id
  AND p.brand_id IS DISTINCT FROM c.brand_id;
