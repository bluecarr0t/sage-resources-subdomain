-- Treebox brand registry + backfill; normalize flagship chain property types to Glamping.
-- Supports expanded /brands cohort (Glamping Resort + Outdoor Boutique Hotel in app code).
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- Chain label: Treebox
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
    'nightfall camp',
    'paperbark camp',
    'tanja lagoon camp',
    'eco retreat',
    'tathaastu',
    'the bubble retreat',
    'postcard cabins',
    'rvc outdoor destinations',
    'sundance by basecamp',
    'charmed resorts',
    'wildhaven',
    'treebox',
    'trailer inn lodging',
    'worldhotels backdrop',
    'douglas lake ranch',
    'terramor outdoor resort',
    'bliss camps',
    'the glamping collective',
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

  IF ln LIKE 'collective %'
     AND ln NOT LIKE '%elemental collective%'
     AND ln NOT ILIKE '%glamping collective%'
  THEN
    RETURN 'collective retreats';
  END IF;

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
-- Treebox (Ohio multi-location operator)
-- ---------------------------------------------------------------------------
INSERT INTO public.glamping_brands (slug, display_name, brand_tier, legacy_chain_key, website_url, reported_location_count, notes)
VALUES (
  'treebox',
  'Treebox',
  'standalone',
  'treebox',
  'https://www.treeboxstays.com/',
  3,
  'Ohio glamping operator: treehouses and forest havens (Dover, Walnut Creek, Winesburg).'
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  legacy_chain_key = EXCLUDED.legacy_chain_key,
  website_url = COALESCE(EXCLUDED.website_url, glamping_brands.website_url),
  reported_location_count = EXCLUDED.reported_location_count,
  notes = EXCLUDED.notes,
  updated_at = now();

UPDATE public.all_glamping_properties p
SET
  brand_id = (SELECT id FROM public.glamping_brands WHERE slug = 'treebox'),
  number_of_locations = GREATEST(COALESCE(p.number_of_locations, 0), 3),
  updated_at = now()
WHERE p.research_status = 'published'
  AND p.country IN ('United States', 'US', 'USA')
  AND (
    lower(trim(p.property_name)) = 'treebox'
    OR p.property_name ILIKE 'treebox %'
    OR p.url ILIKE '%treeboxstays.com%'
  )
  AND (p.brand_id IS NULL OR p.brand_id IS DISTINCT FROM (SELECT id FROM public.glamping_brands WHERE slug = 'treebox'));

-- ---------------------------------------------------------------------------
-- Normalize property_type for flagship multi-location brands (counts on /brands + snapshot)
-- ---------------------------------------------------------------------------
UPDATE public.all_glamping_properties
SET property_type = 'Glamping', updated_at = now()
WHERE research_status = 'published'
  AND property_type IN ('Glamping Resort', 'Outdoor Boutique Hotel')
  AND (
    property_name ILIKE 'Wildhaven%'
    OR property_name ILIKE 'Trailborn%'
    OR property_name = 'Timberline Glamping at Pine Acres'
    OR property_name = 'Collective Retreats Hudson Valley'
  );
