-- Patch RPCs still referencing all_glamping_properties after rename to all_sage_data.
-- Dashboard: get_glamping_metrics, get_missing_fields_breakdown
-- Slug trigger lookup + Sage AI: generate_slug_from_property_name, sage_chain_retail_rate_kpis

-- >>> from scripts/add-glamping-metrics-function.sql
CREATE OR REPLACE FUNCTION get_glamping_metrics()
RETURNS JSON AS $$
DECLARE
  result JSON;
  usa_property_count BIGINT;
  usa_unit_count BIGINT;
  total_property_count BIGINT;
  total_unit_count BIGINT;
  status_new_count BIGINT;
  status_in_progress_count BIGINT;
  status_published_count BIGINT;
  caller_uid UUID;
BEGIN
  caller_uid := auth.uid();
  IF caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM managed_users
    WHERE user_id = caller_uid AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COUNT(DISTINCT property_name) INTO usa_property_count
  FROM all_sage_data
  WHERE UPPER(TRIM(COALESCE(country, ''))) IN ('USA', 'US', 'UNITED STATES', 'UNITED STATES OF AMERICA')
    AND LOWER(TRIM(COALESCE(is_glamping_property, ''))) = 'yes'
    AND LOWER(TRIM(COALESCE(is_open, ''))) = 'yes'
    AND LOWER(TRIM(COALESCE(research_status, ''))) = 'published';

  SELECT COALESCE(SUM(quantity_of_units::BIGINT), 0) INTO usa_unit_count
  FROM all_sage_data
  WHERE UPPER(TRIM(COALESCE(country, ''))) IN ('USA', 'US', 'UNITED STATES', 'UNITED STATES OF AMERICA')
    AND LOWER(TRIM(COALESCE(is_glamping_property, ''))) = 'yes'
    AND LOWER(TRIM(COALESCE(is_open, ''))) = 'yes'
    AND LOWER(TRIM(COALESCE(research_status, ''))) = 'published';

  SELECT COUNT(DISTINCT property_name) INTO total_property_count
  FROM all_sage_data
  WHERE LOWER(TRIM(COALESCE(is_glamping_property, ''))) = 'yes'
    AND LOWER(TRIM(COALESCE(is_open, ''))) = 'yes'
    AND LOWER(TRIM(COALESCE(research_status, ''))) = 'published';

  SELECT COALESCE(SUM(quantity_of_units::BIGINT), 0) INTO total_unit_count
  FROM all_sage_data
  WHERE LOWER(TRIM(COALESCE(is_glamping_property, ''))) = 'yes'
    AND LOWER(TRIM(COALESCE(is_open, ''))) = 'yes'
    AND LOWER(TRIM(COALESCE(research_status, ''))) = 'published';

  SELECT COUNT(DISTINCT property_name) INTO status_new_count
  FROM all_sage_data
  WHERE LOWER(TRIM(COALESCE(is_glamping_property, ''))) = 'yes'
    AND LOWER(TRIM(COALESCE(is_open, ''))) = 'yes'
    AND LOWER(TRIM(COALESCE(research_status, ''))) = 'new';

  SELECT COUNT(DISTINCT property_name) INTO status_in_progress_count
  FROM all_sage_data
  WHERE LOWER(TRIM(COALESCE(is_glamping_property, ''))) = 'yes'
    AND LOWER(TRIM(COALESCE(is_open, ''))) = 'yes'
    AND LOWER(TRIM(COALESCE(research_status, ''))) = 'in_progress';

  SELECT COUNT(DISTINCT property_name) INTO status_published_count
  FROM all_sage_data
  WHERE LOWER(TRIM(COALESCE(is_glamping_property, ''))) = 'yes'
    AND LOWER(TRIM(COALESCE(is_open, ''))) = 'yes'
    AND LOWER(TRIM(COALESCE(research_status, ''))) = 'published';

  result := json_build_object(
    'usa_property_count', usa_property_count,
    'usa_unit_count', usa_unit_count,
    'total_property_count', total_property_count,
    'total_unit_count', total_unit_count,
    'research_status_new', status_new_count,
    'research_status_in_progress', status_in_progress_count,
    'research_status_published', status_published_count
  );
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- >>> from scripts/add-missing-fields-breakdown-function.sql
CREATE OR REPLACE FUNCTION get_missing_fields_breakdown()
RETURNS JSON AS $$
DECLARE
  result JSON;
  total_count BIGINT;
  missing_site_name BIGINT;
  missing_rate_avg_retail_daily_rate BIGINT;
  missing_unit_type BIGINT;
  missing_unit_private_bathroom BIGINT;
  missing_url BIGINT;
  missing_description BIGINT;
  caller_uid UUID;
BEGIN
  caller_uid := auth.uid();
  IF caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM managed_users
    WHERE user_id = caller_uid AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE site_name IS NULL OR TRIM(COALESCE(site_name, '')) = '') AS mn_site_name,
    COUNT(*) FILTER (WHERE rate_avg_retail_daily_rate IS NULL) AS mn_rate,
    COUNT(*) FILTER (WHERE unit_type IS NULL OR TRIM(COALESCE(unit_type, '')) = '') AS mn_unit_type,
    COUNT(*) FILTER (WHERE unit_private_bathroom IS NULL OR TRIM(COALESCE(unit_private_bathroom, '')) = '') AS mn_bathroom,
    COUNT(*) FILTER (WHERE url IS NULL OR TRIM(COALESCE(url, '')) = '') AS mn_url,
    COUNT(*) FILTER (WHERE description IS NULL OR TRIM(COALESCE(description, '')) = '') AS mn_desc
  INTO
    total_count,
    missing_site_name,
    missing_rate_avg_retail_daily_rate,
    missing_unit_type,
    missing_unit_private_bathroom,
    missing_url,
    missing_description
  FROM all_sage_data
  WHERE LOWER(TRIM(COALESCE(is_glamping_property, ''))) = 'yes'
    AND LOWER(TRIM(COALESCE(is_open, ''))) = 'yes'
    AND LOWER(TRIM(COALESCE(research_status, ''))) = 'published';

  result := json_build_object(
    'total_count', total_count,
    'missing_site_name', missing_site_name,
    'missing_rate_avg_retail_daily_rate', missing_rate_avg_retail_daily_rate,
    'missing_unit_type', missing_unit_type,
    'missing_unit_private_bathroom', missing_unit_private_bathroom,
    'missing_url', missing_url,
    'missing_description', missing_description
  );
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- >>> slug trigger: lookup existing slug from all_sage_data
CREATE OR REPLACE FUNCTION generate_slug_from_property_name()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.slug IS NULL OR NEW.slug = '') AND NEW.property_name IS NOT NULL AND NEW.property_name != '' THEN
    NEW.slug := LOWER(TRIM(NEW.property_name));
    NEW.slug := REPLACE(NEW.slug, 'à', 'a');
    NEW.slug := REPLACE(NEW.slug, 'á', 'a');
    NEW.slug := REPLACE(NEW.slug, 'â', 'a');
    NEW.slug := REPLACE(NEW.slug, 'ã', 'a');
    NEW.slug := REPLACE(NEW.slug, 'ä', 'a');
    NEW.slug := REPLACE(NEW.slug, 'å', 'a');
    NEW.slug := REPLACE(NEW.slug, 'ā', 'a');
    NEW.slug := REPLACE(NEW.slug, 'è', 'e');
    NEW.slug := REPLACE(NEW.slug, 'é', 'e');
    NEW.slug := REPLACE(NEW.slug, 'ê', 'e');
    NEW.slug := REPLACE(NEW.slug, 'ë', 'e');
    NEW.slug := REPLACE(NEW.slug, 'ē', 'e');
    NEW.slug := REPLACE(NEW.slug, 'ì', 'i');
    NEW.slug := REPLACE(NEW.slug, 'í', 'i');
    NEW.slug := REPLACE(NEW.slug, 'î', 'i');
    NEW.slug := REPLACE(NEW.slug, 'ï', 'i');
    NEW.slug := REPLACE(NEW.slug, 'ī', 'i');
    NEW.slug := REPLACE(NEW.slug, 'ò', 'o');
    NEW.slug := REPLACE(NEW.slug, 'ó', 'o');
    NEW.slug := REPLACE(NEW.slug, 'ô', 'o');
    NEW.slug := REPLACE(NEW.slug, 'õ', 'o');
    NEW.slug := REPLACE(NEW.slug, 'ö', 'o');
    NEW.slug := REPLACE(NEW.slug, 'ø', 'o');
    NEW.slug := REPLACE(NEW.slug, 'ō', 'o');
    NEW.slug := REPLACE(NEW.slug, 'ù', 'u');
    NEW.slug := REPLACE(NEW.slug, 'ú', 'u');
    NEW.slug := REPLACE(NEW.slug, 'û', 'u');
    NEW.slug := REPLACE(NEW.slug, 'ü', 'u');
    NEW.slug := REPLACE(NEW.slug, 'ū', 'u');
    NEW.slug := REPLACE(NEW.slug, 'ç', 'c');
    NEW.slug := REPLACE(NEW.slug, 'ñ', 'n');
    NEW.slug := REPLACE(NEW.slug, 'ý', 'y');
    NEW.slug := REPLACE(NEW.slug, 'ÿ', 'y');
    NEW.slug := REGEXP_REPLACE(NEW.slug, '[^\w\s-]', '', 'g');
    NEW.slug := REGEXP_REPLACE(NEW.slug, '\s+', '-', 'g');
    NEW.slug := REGEXP_REPLACE(NEW.slug, '-+', '-', 'g');
    NEW.slug := TRIM(NEW.slug);

    IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
      SELECT slug INTO NEW.slug
      FROM all_sage_data
      WHERE property_name = NEW.property_name
        AND slug IS NOT NULL
        AND slug != ''
        AND id != COALESCE(NEW.id, 0)
      LIMIT 1;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_slug_from_property_name() IS
'Auto-generates slug from property_name if slug is NULL. Ensures records with same property_name share the same slug. Uses all_sage_data.';

-- >>> from scripts/migrations/sage-chain-retail-rate-kpis-rpc.sql
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
      ck, pk, wgt,
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
      ck, pk,
      SUM(wgt) AS prop_units,
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
