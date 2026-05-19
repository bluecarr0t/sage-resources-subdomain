-- Recreate list-anchors view so new table columns (e.g. glamping_service_tier) are exposed
-- and one row is shown per logical property (property_id, else slug, else name+city+state).

DROP VIEW IF EXISTS public.all_glamping_properties_list_anchors;

CREATE VIEW public.all_glamping_properties_list_anchors AS
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
FROM public.all_glamping_properties agp
ORDER BY
  COALESCE(
    agp.property_id::text,
    NULLIF(btrim(agp.slug), ''),
    lower(btrim(coalesce(agp.property_name, ''))) || '|' ||
      lower(btrim(coalesce(agp.city, ''))) || '|' ||
      lower(btrim(coalesce(agp.state, '')))
  ),
  agp.id;

COMMENT ON VIEW public.all_glamping_properties_list_anchors IS
  'Deduped admin Sage Data list: one row per logical property (lowest id = anchor).';

GRANT SELECT ON public.all_glamping_properties_list_anchors TO authenticated;
GRANT SELECT ON public.all_glamping_properties_list_anchors TO service_role;
