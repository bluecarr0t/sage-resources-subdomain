-- Derived 0–100 closeness to a full professionalized glamping property.
-- Safe to re-run. Recreates the list-anchors view so SELECT * includes the column.

ALTER TABLE public.all_sage_data
  ADD COLUMN IF NOT EXISTS glamping_professionalization_score smallint;

COMMENT ON COLUMN public.all_sage_data.glamping_professionalization_score IS
  'Derived 0–100 score: how close the property is to a full professionalized glamping operation (sibling unit mix + amenities + listing completeness + operations).';

CREATE INDEX IF NOT EXISTS idx_all_sage_data_professionalization_score
  ON public.all_sage_data (glamping_professionalization_score);

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
