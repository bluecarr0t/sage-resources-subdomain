-- One admin-list row per logical property (canonical property_id).
-- Anchor row = lowest id per property_id. Requires column public.all_glamping_properties.property_id.
--
-- If replacing an older view definition, use DROP VIEW first (Postgres cannot rename
-- view output columns in CREATE OR REPLACE when the shape changes).
--
-- PostgREST: public.all_glamping_properties_list_anchors (read-only list surface).

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
