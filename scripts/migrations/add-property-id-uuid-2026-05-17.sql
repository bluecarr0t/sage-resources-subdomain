-- Canonical logical-property identity: duplicated UUID on every all_glamping_properties row.
-- Sibling rows share the same property_id. Anchor for admin list = lowest id per property_id.
-- Applied: add_property_id_uuid_2026_05_17 (Supabase migration name).

ALTER TABLE public.all_glamping_properties
  ADD COLUMN IF NOT EXISTS property_id uuid;

-- One UUID per legacy group (same rule as pre-property_id list view / siblingFilterSpecFromAnchor).
WITH grouped AS (
  SELECT
    id,
    CASE
      WHEN NULLIF(BTRIM(slug::text), '') IS NOT NULL THEN
        's:' || BTRIM(slug::text)
      ELSE
        'n:' || property_name || '|' || COALESCE(city, '') || '|' || COALESCE(state, '')
    END AS gkey
  FROM public.all_glamping_properties
),
uids AS (
  SELECT gkey, gen_random_uuid() AS property_id
  FROM grouped
  GROUP BY gkey
)
UPDATE public.all_glamping_properties t
SET property_id = u.property_id
FROM grouped g
JOIN uids u ON u.gkey = g.gkey
WHERE t.id = g.id
  AND t.property_id IS NULL;

ALTER TABLE public.all_glamping_properties
  ALTER COLUMN property_id SET NOT NULL;

ALTER TABLE public.all_glamping_properties
  ALTER COLUMN property_id SET DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_all_glamping_properties_property_id
  ON public.all_glamping_properties (property_id);

DROP VIEW IF EXISTS public.all_glamping_properties_list_anchors;

CREATE VIEW public.all_glamping_properties_list_anchors AS
SELECT DISTINCT ON (agp.property_id)
  agp.*
FROM public.all_glamping_properties agp
ORDER BY agp.property_id, agp.id;

COMMENT ON VIEW public.all_glamping_properties_list_anchors IS
  'Deduped admin Sage Data list: one row per property_id (lowest id = anchor).';
