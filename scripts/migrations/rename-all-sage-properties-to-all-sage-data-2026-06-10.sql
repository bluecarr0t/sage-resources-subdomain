-- Rename Sage master data table and list-anchors view.
-- Safe to re-run (no-op if already renamed).

DO $$
BEGIN
  IF to_regclass('public.all_sage_properties') IS NOT NULL
     AND to_regclass('public.all_sage_data') IS NULL THEN
    ALTER TABLE public.all_sage_properties RENAME TO all_sage_data;
  END IF;
END $$;

COMMENT ON TABLE public.all_sage_data IS
  'Sage master inventory: properties, sites, and units — glamping, RV parks/resorts, outdoor boutique hotels, and related outdoor hospitality.';

DROP VIEW IF EXISTS public.all_sage_properties_list_anchors;
DROP VIEW IF EXISTS public.all_sage_data_list_anchors;

CREATE OR REPLACE VIEW public.all_sage_data_list_anchors AS
SELECT DISTINCT ON (
  COALESCE(
    agp.property_id::text,
    NULLIF(btrim(agp.slug), ''),
    lower(btrim(coalesce(agp.property_name, ''))) || '|' ||
      lower(btrim(coalesce(agp.city, ''))) || '|' ||
      lower(btrim(coalesce(agp.state, '')))
  )
)
  agp.*
FROM public.all_sage_data agp
ORDER BY
  COALESCE(
    agp.property_id::text,
    NULLIF(btrim(agp.slug), ''),
    lower(btrim(coalesce(agp.property_name, ''))) || '|' ||
      lower(btrim(coalesce(agp.city, ''))) || '|' ||
      lower(btrim(coalesce(agp.state, '')))
  ),
  agp.id;

COMMENT ON VIEW public.all_sage_data_list_anchors IS
  'Deduped admin Sage Data list: one row per logical property (lowest id = anchor).';

GRANT SELECT ON public.all_sage_data_list_anchors TO authenticated;
GRANT SELECT ON public.all_sage_data_list_anchors TO service_role;

-- unified_comps must be rebuilt (source label + FROM clause). See
-- rebuild-unified-comps-after-sage-data-rename-2026-06-10.sql

DROP MATERIALIZED VIEW IF EXISTS public.unified_comps;
