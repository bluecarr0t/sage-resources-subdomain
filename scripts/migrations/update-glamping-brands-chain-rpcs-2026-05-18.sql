-- Prefer glamping_brands.brand_id over legacy name-prefix chain labels in Sage AI RPCs.
-- Apply after create-glamping-brands + seed migrations.

CREATE OR REPLACE FUNCTION public.brand_ids_for_slugs_rollup(
  p_brand_slugs text[],
  p_include_sub_brands boolean DEFAULT false
)
RETURNS uuid[]
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT bid), ARRAY[]::uuid[])
  FROM unnest(COALESCE(p_brand_slugs, ARRAY[]::text[])) AS slug
  CROSS JOIN LATERAL unnest(public.brand_ids_for_slug_rollup(slug, p_include_sub_brands)) AS bid;
$$;

GRANT EXECUTE ON FUNCTION public.brand_ids_for_slugs_rollup(text[], boolean) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.top_multi_location_chains(integer, numeric, integer, text, text, text);
DROP FUNCTION IF EXISTS public.top_multi_location_chains(integer, numeric, integer, text, text, text, text, boolean);

CREATE OR REPLACE FUNCTION public.top_multi_location_chains(
  p_limit                   integer DEFAULT 10,
  p_min_reported_locations  numeric DEFAULT 2,
  p_min_chain_age_years     integer DEFAULT 5,
  p_country                 text DEFAULT NULL,
  p_is_open                 text DEFAULT NULL,
  p_is_glamping_property    text DEFAULT NULL,
  p_brand_slug              text DEFAULT NULL,
  p_include_sub_brands      boolean DEFAULT false
)
RETURNS TABLE (
  chain_label                  text,
  brand_slug                   text,
  reported_brand_locations     numeric,
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
  WITH brand_scope AS (
    SELECT unnest(public.brand_ids_for_slug_rollup(p_brand_slug, p_include_sub_brands)) AS brand_id
    WHERE p_brand_slug IS NOT NULL AND btrim(p_brand_slug) <> ''
  ),
  filtered AS (
    SELECT
      g.address,
      g.property_name,
      g.city,
      g.state,
      g.country,
      g.brand_id,
      g.number_of_locations::numeric AS nol,
      g.year_site_opened::numeric    AS yso,
      GREATEST(COALESCE(g.quantity_of_units, 0), 0)::numeric AS qty,
      lower(public.sage_property_brand_key(g.brand_id, g.property_name)) AS chain_key
    FROM all_glamping_properties g
    WHERE g.number_of_locations IS NOT NULL
      AND g.number_of_locations::numeric >= p_min_reported_locations
      AND (p_country IS NULL OR g.country ILIKE '%' || p_country || '%')
      AND (p_is_open IS NULL OR g.is_open = p_is_open)
      AND (p_is_glamping_property IS NULL OR g.is_glamping_property = p_is_glamping_property)
      AND lower(public.sage_property_brand_key(g.brand_id, g.property_name)) <> ''
      AND (
        p_brand_slug IS NULL
        OR btrim(p_brand_slug) = ''
        OR g.brand_id IN (SELECT brand_id FROM brand_scope)
        OR (
          g.brand_id IS NULL
          AND lower(public.sage_property_brand_key(NULL, g.property_name))
            = lower(btrim(p_brand_slug))
        )
      )
  ),
  by_property AS (
    SELECT
      public.sage_property_dedupe_key_for_aggregation(
        f.address::text, f.property_name, f.city, f.state, f.country
      ) AS pk,
      MAX(f.chain_key) AS chain_key,
      MAX(f.brand_id::text) AS brand_id_txt,
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
      (max(b.brand_id_txt))::uuid AS brand_id,
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
    COALESCE(b.display_name, CASE r.chain_key
      WHEN 'autocamp' THEN 'AutoCamp'
      WHEN 'koa' THEN 'KOA'
      WHEN 'rvc outdoor destinations' THEN 'RVC Outdoor Destinations'
      ELSE initcap(r.chain_key)
    END) AS chain_label,
    r.chain_key AS brand_slug,
    r.reported_brand_locations,
    r.earliest_site_year,
    r.properties_in_sage,
    r.total_glamping_units_in_sage,
    r.sample_property_name,
    r.sample_city,
    r.sample_state,
    r.sample_country
  FROM rolled r
  LEFT JOIN public.glamping_brands b
    ON b.id = r.brand_id
    OR (r.brand_id IS NULL AND b.slug = r.chain_key)
    OR (r.brand_id IS NULL AND b.legacy_chain_key = r.chain_key)
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

GRANT EXECUTE ON FUNCTION public.top_multi_location_chains(integer, numeric, integer, text, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.top_multi_location_chains(integer, numeric, integer, text, text, text, text, boolean) TO service_role;

DROP FUNCTION IF EXISTS public.sage_chain_retail_rate_kpis(text[]);
DROP FUNCTION IF EXISTS public.sage_chain_retail_rate_kpis(text[], text[], boolean);

CREATE OR REPLACE FUNCTION public.sage_chain_retail_rate_kpis(
  p_chain_keys text[] DEFAULT ARRAY[
    'postcard cabins',
    'under canvas',
    'autocamp',
    'huttopia',
    'wander camp'
  ]::text[],
  p_brand_slugs text[] DEFAULT NULL,
  p_include_sub_brands boolean DEFAULT false
)
RETURNS TABLE (
  chain_key                    text,
  chain_label                  text,
  brand_slug                   text,
  distinct_properties          bigint,
  total_unit_weight            bigint,
  sku_row_count                bigint,
  avg_rate_in_operating_season numeric,
  peak_summer_rate             numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH scope_brand_ids AS (
    SELECT unnest(public.brand_ids_for_slugs_rollup(p_brand_slugs, p_include_sub_brands)) AS brand_id
    WHERE p_brand_slugs IS NOT NULL AND cardinality(p_brand_slugs) > 0
  ),
  per_row AS (
    SELECT
      lower(public.sage_property_brand_key(g.brand_id, g.property_name)) AS ck,
      g.brand_id,
      public.sage_property_dedupe_key_for_aggregation(
        g.address::text, g.property_name, g.city, g.state, g.country
      ) AS pk,
      GREATEST(COALESCE(g.quantity_of_units, 1), 1)::numeric AS wgt,
      g.season_open_month  AS som,
      g.season_close_month AS scm,
      g.rate_winter_weekday, g.rate_winter_weekend,
      g.rate_spring_weekday, g.rate_spring_weekend,
      g.rate_summer_weekday, g.rate_summer_weekend,
      g.rate_fall_weekday,   g.rate_fall_weekend,
      NULLIF(g.rate_avg_retail_daily_rate, 0)::numeric AS avg_fallback
    FROM all_glamping_properties g
    WHERE (
      (
        p_brand_slugs IS NOT NULL
        AND cardinality(p_brand_slugs) > 0
        AND (
          g.brand_id IN (SELECT brand_id FROM scope_brand_ids)
          OR (
            g.brand_id IS NULL
            AND lower(public.sage_property_brand_key(NULL, g.property_name))
              = ANY (
                ARRAY(SELECT lower(btrim(s)) FROM unnest(p_brand_slugs) AS s)
              )
          )
        )
      )
      OR (
        (p_brand_slugs IS NULL OR cardinality(p_brand_slugs) = 0)
        AND lower(public.sage_property_brand_key(g.brand_id, g.property_name)) = ANY(p_chain_keys)
      )
    )
  ),
  open_flags AS (
    SELECT
      pr.*,
      CASE WHEN pr.som IS NULL AND pr.scm IS NULL THEN true
           ELSE EXISTS (
             SELECT 1 FROM unnest(ARRAY[12,1,2]) AS m
             WHERE CASE
               WHEN pr.scm >= pr.som THEN m BETWEEN pr.som AND pr.scm
               ELSE m >= pr.som OR m <= pr.scm
             END
           )
      END AS open_winter,
      CASE WHEN pr.som IS NULL AND pr.scm IS NULL THEN true
           ELSE EXISTS (
             SELECT 1 FROM unnest(ARRAY[3,4,5]) AS m
             WHERE CASE
               WHEN pr.scm >= pr.som THEN m BETWEEN pr.som AND pr.scm
               ELSE m >= pr.som OR m <= pr.scm
             END
           )
      END AS open_spring,
      CASE WHEN pr.som IS NULL AND pr.scm IS NULL THEN true
           ELSE EXISTS (
             SELECT 1 FROM unnest(ARRAY[6,7,8]) AS m
             WHERE CASE
               WHEN pr.scm >= pr.som THEN m BETWEEN pr.som AND pr.scm
               ELSE m >= pr.som OR m <= pr.scm
             END
           )
      END AS open_summer,
      CASE WHEN pr.som IS NULL AND pr.scm IS NULL THEN true
           ELSE EXISTS (
             SELECT 1 FROM unnest(ARRAY[9,10,11]) AS m
             WHERE CASE
               WHEN pr.scm >= pr.som THEN m BETWEEN pr.som AND pr.scm
               ELSE m >= pr.som OR m <= pr.scm
             END
           )
      END AS open_fall
    FROM per_row pr
  ),
  row_metrics AS (
    SELECT
      ck, brand_id, pk, wgt,
      COALESCE(
        (
          SELECT AVG(v::numeric) FROM unnest(ARRAY[
            CASE WHEN open_winter THEN rate_winter_weekday END,
            CASE WHEN open_winter THEN rate_winter_weekend END,
            CASE WHEN open_spring THEN rate_spring_weekday END,
            CASE WHEN open_spring THEN rate_spring_weekend END,
            CASE WHEN open_summer THEN rate_summer_weekday END,
            CASE WHEN open_summer THEN rate_summer_weekend END,
            CASE WHEN open_fall   THEN rate_fall_weekday   END,
            CASE WHEN open_fall   THEN rate_fall_weekend   END
          ]) AS t(v)
          WHERE v IS NOT NULL AND v::numeric > 0
        ),
        avg_fallback
      ) AS row_in_season_avg,
      CASE
        WHEN rate_summer_weekday IS NOT NULL AND rate_summer_weekend IS NOT NULL
          THEN ((rate_summer_weekday + rate_summer_weekend) / 2.0)
        ELSE COALESCE(rate_summer_weekday, rate_summer_weekend)
      END::numeric AS row_peak
    FROM open_flags
  ),
  per_property AS (
    SELECT
      ck, brand_id, pk,
      SUM(wgt) AS prop_units,
      SUM(row_in_season_avg * wgt) FILTER (WHERE row_in_season_avg IS NOT NULL AND row_in_season_avg > 0)
        / NULLIF(SUM(wgt) FILTER (WHERE row_in_season_avg IS NOT NULL AND row_in_season_avg > 0), 0)
        AS prop_in_season_avg,
      SUM(row_peak * wgt) FILTER (WHERE row_peak IS NOT NULL AND row_peak > 0)
        / NULLIF(SUM(wgt) FILTER (WHERE row_peak IS NOT NULL AND row_peak > 0), 0)
        AS prop_peak,
      COUNT(*) AS prop_sku_rows
    FROM row_metrics
    GROUP BY ck, brand_id, pk
  ),
  per_chain AS (
    SELECT
      ck,
      (min(brand_id::text))::uuid AS brand_id,
      COUNT(*)::bigint AS distinct_properties,
      SUM(prop_units)::bigint AS total_unit_weight,
      SUM(prop_sku_rows)::bigint AS sku_row_count,
      ROUND(
        (SUM(prop_in_season_avg * prop_units) FILTER (WHERE prop_in_season_avg IS NOT NULL)
         / NULLIF(SUM(prop_units) FILTER (WHERE prop_in_season_avg IS NOT NULL), 0))::numeric,
        2
      ) AS avg_rate_in_operating_season,
      ROUND(
        (SUM(prop_peak * prop_units) FILTER (WHERE prop_peak IS NOT NULL)
         / NULLIF(SUM(prop_units) FILTER (WHERE prop_peak IS NOT NULL), 0))::numeric,
        2
      ) AS peak_summer_rate
    FROM per_property
    GROUP BY ck
  )
  SELECT
    pc.ck AS chain_key,
    COALESCE(b.display_name, CASE pc.ck
      WHEN 'autocamp' THEN 'AutoCamp'
      ELSE initcap(pc.ck)
    END) AS chain_label,
    pc.ck AS brand_slug,
    pc.distinct_properties,
    pc.total_unit_weight,
    pc.sku_row_count,
    pc.avg_rate_in_operating_season,
    pc.peak_summer_rate
  FROM per_chain pc
  LEFT JOIN public.glamping_brands b
    ON b.id = pc.brand_id
    OR (pc.brand_id IS NULL AND (b.slug = pc.ck OR b.legacy_chain_key = pc.ck))
  ORDER BY pc.avg_rate_in_operating_season DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.sage_chain_retail_rate_kpis(text[], text[], boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sage_chain_retail_rate_kpis(text[], text[], boolean) TO service_role;
