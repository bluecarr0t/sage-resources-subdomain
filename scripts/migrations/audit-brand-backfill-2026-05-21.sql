-- Brand assignment audit follow-up (2026-05-21).
-- 1) Extend sage_chain_label_from_property_name prefixes
-- 2) Register missing multi-property operators
-- 3) Backfill brand_id from property_name patterns
-- Safe to re-run (upserts + idempotent updates).

-- ---------------------------------------------------------------------------
-- Extend chain label prefixes (keep longest-first order)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sage_chain_label_from_property_name(p_name text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  n              text := btrim(COALESCE(p_name, ''));
  ln             text;
  p              text;
  prefixes       text[] := ARRAY[
    'outdoor collection by marriott bonvoy',
    'collective retreats',
    'postcard cabins',
    'rvc outdoor destinations',
    'sundance by basecamp',
    'trailer inn lodging',
    'worldhotels backdrop',
    'douglas lake ranch',
    'terramor outdoor resort',
    'bliss camps glamping (rocky mountain glamping)',
    'bliss camps',
    'the glamping collective',
    'westgate river ranch resort & rodeo',
    'westgate river ranch',
    'glamping resorts ltd',
    'camp ferncrest',
    'timberline glamping at',
    'ulum',
    'under canvas',
    'wander camp',
    'timberline glamping co.',
    'timberline glamping',
    'getaway house',
    'brush creek ranch',
    'long live the simple life',
    'firelight camps',
    'nomadic resort',
    'autocamp',
    'huttopia',
    'getaway',
    'koa holiday',
    'trailer inn',
    'yogi bear''s jellystone park',
    'jellystone park',
    'koa'
  ];
BEGIN
  IF n = '' THEN
    RETURN '';
  END IF;

  ln := lower(n);

  FOREACH p IN ARRAY prefixes
  LOOP
    IF ln = p
      OR ln LIKE p || ' %'
      OR ln LIKE p || '-%'
      OR ln LIKE p || ' -%'
      OR ln LIKE p || ' –%'
      OR ln LIKE p || ' —%'
    THEN
      RETURN p;
    END IF;
  END LOOP;

  IF strpos(n, ' — ') > 0 THEN
    RETURN lower(btrim(substring(n FROM 1 FOR strpos(n, ' — ') - 1)));
  END IF;
  IF strpos(n, ' – ') > 0 THEN
    RETURN lower(btrim(substring(n FROM 1 FOR strpos(n, ' – ') - 1)));
  END IF;
  IF strpos(n, ' - ') > 0 THEN
    RETURN lower(btrim(split_part(n, ' - ', 1)));
  END IF;

  RETURN lower(n);
END;
$$;

-- ---------------------------------------------------------------------------
-- New brands (multi-property operators found in name audit)
-- ---------------------------------------------------------------------------
INSERT INTO public.glamping_brands (slug, display_name, brand_tier, legacy_chain_key, website_url, notes)
VALUES
  (
    'the-glamping-collective',
    'The Glamping Collective',
    'standalone',
    'the glamping collective',
    NULL,
    'Western NC glamping collective; property names start with "The Glamping Collective".'
  ),
  (
    'bliss-camps',
    'Bliss Camps',
    'standalone',
    'bliss camps',
    NULL,
    'Bliss Camps Glamping (Rocky Mountain Glamping) — multi-site tent/yurt operator.'
  ),
  (
    'terramor-outdoor-resort',
    'Terramor Outdoor Resort',
    'standalone',
    'terramor outdoor resort',
    'https://www.terramoroutdoorresort.com/',
    'Maine luxury outdoor resort brand.'
  ),
  (
    'westgate-river-ranch',
    'Westgate River Ranch',
    'standalone',
    'westgate river ranch',
    NULL,
    'Westgate River Ranch Resort & Rodeo — Florida glamping/ranch resort.'
  ),
  (
    'glamping-resorts-ltd',
    'Glamping Resorts Ltd',
    'standalone',
    'glamping resorts ltd',
    NULL,
    'Canada operator (e.g. Sask Landing, Buffalo Pound Lake).'
  ),
  (
    'douglas-lake-ranch',
    'Douglas Lake Ranch',
    'standalone',
    'douglas lake ranch',
    NULL,
    'British Columbia guest ranch / glamping portfolio.'
  )
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  brand_tier = EXCLUDED.brand_tier,
  legacy_chain_key = EXCLUDED.legacy_chain_key,
  website_url = COALESCE(EXCLUDED.website_url, glamping_brands.website_url),
  notes = EXCLUDED.notes,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Backfill: existing brands (name patterns)
-- ---------------------------------------------------------------------------
UPDATE public.all_glamping_properties p
SET brand_id = b.id,
    updated_at = now()
FROM public.glamping_brands b
WHERE p.brand_id IS NULL
  AND b.slug = 'timberline-glamping-co'
  AND p.property_name ILIKE 'Timberline Glamping at%';

UPDATE public.all_glamping_properties p
SET brand_id = b.id,
    updated_at = now()
FROM public.glamping_brands b
WHERE p.brand_id IS NULL
  AND b.slug = 'timberline-glamping-co'
  AND p.property_name ILIKE 'Timberline Glamping Co.%';

-- Legacy chain key match (published + in_progress)
UPDATE public.all_glamping_properties p
SET brand_id = b.id,
    updated_at = now()
FROM public.glamping_brands b
WHERE p.brand_id IS NULL
  AND b.legacy_chain_key IS NOT NULL
  AND lower(public.sage_chain_label_from_property_name(p.property_name)) = b.legacy_chain_key;

-- ---------------------------------------------------------------------------
-- Backfill: new brands (explicit prefixes)
-- ---------------------------------------------------------------------------
UPDATE public.all_glamping_properties p
SET brand_id = b.id,
    updated_at = now()
FROM public.glamping_brands b
WHERE p.brand_id IS NULL
  AND b.slug = 'the-glamping-collective'
  AND p.property_name ILIKE 'The Glamping Collective%';

UPDATE public.all_glamping_properties p
SET brand_id = b.id,
    updated_at = now()
FROM public.glamping_brands b
WHERE p.brand_id IS NULL
  AND b.slug = 'bliss-camps'
  AND (
    p.property_name ILIKE 'Bliss Camps%'
    OR p.property_name ILIKE 'Bliss Camps Glamping%'
  );

UPDATE public.all_glamping_properties p
SET brand_id = b.id,
    updated_at = now()
FROM public.glamping_brands b
WHERE p.brand_id IS NULL
  AND b.slug = 'terramor-outdoor-resort'
  AND p.property_name ILIKE 'Terramor%';

UPDATE public.all_glamping_properties p
SET brand_id = b.id,
    updated_at = now()
FROM public.glamping_brands b
WHERE p.brand_id IS NULL
  AND b.slug = 'westgate-river-ranch'
  AND p.property_name ILIKE 'Westgate River Ranch%';

UPDATE public.all_glamping_properties p
SET brand_id = b.id,
    updated_at = now()
FROM public.glamping_brands b
WHERE p.brand_id IS NULL
  AND b.slug = 'glamping-resorts-ltd'
  AND p.property_name ILIKE 'Glamping Resorts Ltd%';

UPDATE public.all_glamping_properties p
SET brand_id = b.id,
    updated_at = now()
FROM public.glamping_brands b
WHERE p.brand_id IS NULL
  AND b.slug = 'douglas-lake-ranch'
  AND p.property_name ILIKE 'Douglas Lake Ranch%';

-- Sibling alignment when property_id is set
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
SET brand_id = c.brand_id,
    updated_at = now()
FROM canonical c
WHERE p.property_id = c.property_id
  AND p.brand_id IS DISTINCT FROM c.brand_id;
