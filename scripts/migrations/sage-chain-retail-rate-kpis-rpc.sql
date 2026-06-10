-- ============================================================================
-- Sage AI: chain-level retail rate KPIs (end-user friendly, v2)
--
-- Property-first roll-up using `season_open_month` / `season_close_month` so
-- avg ADR only includes seasons the property is actually open in, and peak
-- is strictly defined as the summer (Jun–Aug) average — no calendar blending,
-- no fallback-to-max.
--
-- Definitions
--   * Open seasons per property (calendar buckets):
--       winter = {12,1,2}  spring = {3,4,5}  summer = {6,7,8}  fall = {9,10,11}
--     A season is "open" iff at least one of its 3 months sits inside the
--     property's [season_open_month .. season_close_month] window (inclusive,
--     calendar-wraps when close < open). NULL/NULL window → treat as open
--     all four seasons (year-round).
--   * row.eff_avg = mean of every non-null positive `rate_*_(weekday|weekend)`
--     **whose season is in the property's open seasons**. If no rate cells
--     match (e.g. row only has winter cells but the camp is closed in winter),
--     fall back to `rate_avg_retail_daily_rate` when positive, else NULL.
--   * row.peak    = mean(rate_summer_weekday, rate_summer_weekend) when either
--     is set; else NULL (do NOT fall back to other seasons — peak is summer
--     by definition).
--   * Property roll-up: unit-weighted (using `quantity_of_units`, default 1)
--     mean of row metrics across its SKU rows.
--   * Chain roll-up: unit-weighted mean of property metrics across deduped
--     physical properties (`sage_property_dedupe_key_for_aggregation`),
--     weighted by total units per property.
-- ============================================================================

DROP FUNCTION IF EXISTS public.sage_chain_retail_rate_kpis(text[]);

CREATE OR REPLACE FUNCTION public.sage_chain_retail_rate_kpis(
  p_chain_keys text[] DEFAULT ARRAY[
    'postcard cabins',
    'under canvas',
    'autocamp',
    'huttopia',
    'wander camp'
  ]::text[]
)
RETURNS TABLE (
  chain_key                    text,
  chain_label                  text,
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
  WITH per_row AS (
    SELECT
      lower(public.sage_chain_label_from_property_name(g.property_name)) AS ck,
      public.sage_property_dedupe_key_for_aggregation(
        g.address::text, g.property_name, g.city, g.state, g.country
      ) AS pk,
      GREATEST(COALESCE(g.quantity_of_units, 1), 1)::numeric AS wgt,
      g.season_open_month  AS som,
      g.season_close_month AS scm,
      NULLIF(public.safe_numeric(g.rate_winter_weekday), 0)::numeric AS rate_winter_weekday,
      NULLIF(public.safe_numeric(g.rate_winter_weekend), 0)::numeric AS rate_winter_weekend,
      NULLIF(public.safe_numeric(g.rate_spring_weekday), 0)::numeric AS rate_spring_weekday,
      NULLIF(public.safe_numeric(g.rate_spring_weekend), 0)::numeric AS rate_spring_weekend,
      NULLIF(public.safe_numeric(g.rate_summer_weekday), 0)::numeric AS rate_summer_weekday,
      NULLIF(public.safe_numeric(g.rate_summer_weekend), 0)::numeric AS rate_summer_weekend,
      NULLIF(public.safe_numeric(g.rate_fall_weekday), 0)::numeric AS rate_fall_weekday,
      NULLIF(public.safe_numeric(g.rate_fall_weekend), 0)::numeric AS rate_fall_weekend,
      NULLIF(public.safe_numeric(g.rate_avg_retail_daily_rate::text), 0)::numeric AS avg_fallback
    FROM all_sage_data g
    WHERE lower(public.sage_chain_label_from_property_name(g.property_name))
        = ANY(p_chain_keys)
  ),
  -- For each row, compute open-season flags from [som..scm] (NULL = year-round).
  open_flags AS (
    SELECT
      pr.*,
      -- year-round when both NULL
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
      ck, pk, wgt,
      -- in-season avg (only cells whose season is open)
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
      -- strict peak = mean of summer cells when either set, else NULL
      CASE
        WHEN rate_summer_weekday IS NOT NULL AND rate_summer_weekend IS NOT NULL
          THEN ((rate_summer_weekday + rate_summer_weekend) / 2.0)
        ELSE COALESCE(rate_summer_weekday, rate_summer_weekend)
      END::numeric AS row_peak
    FROM open_flags
  ),
  per_property AS (
    SELECT
      ck, pk,
      SUM(wgt) AS prop_units,
      -- unit-weighted property avg (only rows with a value contribute)
      SUM(row_in_season_avg * wgt) FILTER (WHERE row_in_season_avg IS NOT NULL AND row_in_season_avg > 0)
        / NULLIF(SUM(wgt) FILTER (WHERE row_in_season_avg IS NOT NULL AND row_in_season_avg > 0), 0)
        AS prop_in_season_avg,
      SUM(row_peak * wgt) FILTER (WHERE row_peak IS NOT NULL AND row_peak > 0)
        / NULLIF(SUM(wgt) FILTER (WHERE row_peak IS NOT NULL AND row_peak > 0), 0)
        AS prop_peak,
      COUNT(*) AS prop_sku_rows
    FROM row_metrics
    GROUP BY ck, pk
  ),
  per_chain AS (
    SELECT
      ck,
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
    CASE pc.ck
      WHEN 'autocamp' THEN 'AutoCamp'
      ELSE initcap(pc.ck)
    END AS chain_label,
    pc.distinct_properties,
    pc.total_unit_weight,
    pc.sku_row_count,
    pc.avg_rate_in_operating_season,
    pc.peak_summer_rate
  FROM per_chain pc
  ORDER BY pc.avg_rate_in_operating_season DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.sage_chain_retail_rate_kpis(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sage_chain_retail_rate_kpis(text[]) TO service_role;
