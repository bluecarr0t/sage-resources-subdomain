-- ============================================================================
-- Sage AI: top_multi_location_chains — ranked multi-location glamping operators
--
-- Chain label (`sage_chain_label_from_property_name`):
--   1) Longest-match **known brand prefix** (lowercased), so e.g. rows named
--      "Postcard Cabins Big Bear" and "Under Canvas Yosemite" roll up to
--      "postcard cabins" / "under canvas" instead of one group per outpost.
--   2) Else text before spaced em dash / en dash / hyphen (e.g. "Brand — X").
--   3) Else full trimmed name (lowercased).
-- Keep the prefix array ordered **longer strings before shorter** so
-- e.g. "getaway house" wins over "getaway".
--
-- Dedupes physical locations with sage_property_dedupe_key_for_aggregation.
-- Ranks by MAX(reported number_of_locations) in the group.
--
-- Apply in Supabase SQL editor or: psql $DATABASE_URL -f this file
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sage_chain_label_from_property_name(p_name text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  n              text := btrim(COALESCE(p_name, ''));
  ln             text;
  p              text;
  -- Longest prefixes first (multi-word national / regional glamping brands).
  prefixes       text[] := ARRAY[
    'collective retreats',
    'postcard cabins',
    'rvc outdoor destinations',
    'sundance by basecamp',
    'trailer inn lodging',
    -- 'ulum' must precede 'under canvas' so "ULUM Moab" and any future
    -- "ULUM ..." outposts roll up to their own chain rather than to the
    -- Under Canvas core safari-camp brand.
    'ulum',
    'under canvas',
    'wander camp',
    'timberline glamping co.',
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

DROP FUNCTION IF EXISTS public.top_multi_location_chains(integer, numeric, integer, text, text, text);

CREATE OR REPLACE FUNCTION public.top_multi_location_chains(
  p_limit                   integer DEFAULT 10,
  p_min_reported_locations  numeric DEFAULT 2,
  p_min_chain_age_years     integer DEFAULT 5,
  p_country                 text DEFAULT NULL,
  p_is_open                 text DEFAULT NULL,
  p_is_glamping_property    text DEFAULT NULL
)
RETURNS TABLE (
  chain_label                  text,
  reported_brand_locations   numeric,
  earliest_site_year           numeric,
  properties_in_sage           bigint,
  total_glamping_units_in_sage bigint,
  sample_property_name         text,
  sample_city                  text,
  sample_state                 text,
  sample_country               text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT
      g.address,
      g.property_name,
      g.city,
      g.state,
      g.country,
      g.number_of_locations::numeric AS nol,
      g.year_site_opened::numeric    AS yso,
      GREATEST(COALESCE(g.quantity_of_units, 0), 0)::numeric AS qty,
      lower(public.sage_chain_label_from_property_name(g.property_name)) AS chain_key
    FROM all_glamping_properties g
    WHERE g.number_of_locations IS NOT NULL
      AND g.number_of_locations::numeric >= p_min_reported_locations
      AND (p_country IS NULL OR g.country ILIKE '%' || p_country || '%')
      AND (p_is_open IS NULL OR g.is_open = p_is_open)
      AND (p_is_glamping_property IS NULL OR g.is_glamping_property = p_is_glamping_property)
      AND lower(public.sage_chain_label_from_property_name(g.property_name)) <> ''
  ),
  by_property AS (
    SELECT
      public.sage_property_dedupe_key_for_aggregation(
        f.address::text, f.property_name, f.city, f.state, f.country
      ) AS pk,
      MAX(f.chain_key) AS chain_key,
      MAX(f.nol) AS prop_reported_locations,
      MIN(f.yso) AS prop_earliest_year,
      MAX(f.property_name) AS prop_name_sample,
      MAX(f.city) AS prop_city,
      MAX(f.state) AS prop_state,
      MAX(f.country) AS prop_country,
      SUM(f.qty) AS units_at_property
    FROM filtered f
    GROUP BY 1
  ),
  rolled AS (
    SELECT
      b.chain_key,
      MAX(b.prop_reported_locations) AS reported_brand_locations,
      MIN(b.prop_earliest_year) AS earliest_site_year,
      COUNT(*)::bigint AS properties_in_sage,
      COALESCE(SUM(b.units_at_property), 0)::bigint AS total_glamping_units_in_sage,
      MAX(b.prop_name_sample) AS sample_property_name,
      MAX(b.prop_city) AS sample_city,
      MAX(b.prop_state) AS sample_state,
      MAX(b.prop_country) AS sample_country
    FROM by_property b
    GROUP BY b.chain_key
  )
  SELECT
    CASE r.chain_key
      WHEN 'autocamp' THEN 'AutoCamp'
      WHEN 'koa' THEN 'KOA'
      WHEN 'rvc outdoor destinations' THEN 'RVC Outdoor Destinations'
      ELSE initcap(r.chain_key)
    END AS chain_label,
    r.reported_brand_locations,
    r.earliest_site_year,
    r.properties_in_sage,
    r.total_glamping_units_in_sage,
    r.sample_property_name,
    r.sample_city,
    r.sample_state,
    r.sample_country
  FROM rolled r
  WHERE
    (
      p_min_chain_age_years IS NULL
      OR (
        r.earliest_site_year IS NOT NULL
        AND r.earliest_site_year::integer <= EXTRACT(YEAR FROM CURRENT_DATE)::integer - p_min_chain_age_years
      )
    )
  ORDER BY r.reported_brand_locations DESC NULLS LAST, r.properties_in_sage DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
$$;

GRANT EXECUTE ON FUNCTION public.top_multi_location_chains(integer, numeric, integer, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.top_multi_location_chains(integer, numeric, integer, text, text, text) TO service_role;
