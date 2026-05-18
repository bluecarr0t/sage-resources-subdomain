-- Re-align property_id so all rows sharing a slug use the anchor row's property_id (MIN id).
-- Fixes admin list duplicates when sibling INSERTs received gen_random_uuid() per row.
-- Also merges duplicate Camp Ferncrest - Chambers Creek slugs onto one property_id.

-- Canonical property_id = anchor row (lowest id) per non-empty slug.
WITH slug_anchor AS (
  SELECT
    BTRIM(slug::text) AS slug,
    MIN(id) AS anchor_id
  FROM public.all_glamping_properties
  WHERE slug IS NOT NULL AND BTRIM(slug::text) <> ''
  GROUP BY BTRIM(slug::text)
),
canonical AS (
  SELECT sa.slug, agp.property_id AS canonical_property_id
  FROM slug_anchor sa
  JOIN public.all_glamping_properties agp ON agp.id = sa.anchor_id
)
UPDATE public.all_glamping_properties t
SET property_id = c.canonical_property_id
FROM canonical c
WHERE BTRIM(t.slug::text) = c.slug
  AND t.property_id IS DISTINCT FROM c.canonical_property_id;

-- Camp Ferncrest - Chambers Creek: two legacy slugs → one logical property (keep older anchor id 9540).
UPDATE public.all_glamping_properties t
SET
  property_id = (SELECT property_id FROM public.all_glamping_properties WHERE id = 9540),
  slug = 'ferncrest-chambers-creek',
  date_updated = COALESCE(date_updated, '2026-05-18')
WHERE property_name = 'Camp Ferncrest - Chambers Creek'
  AND id IN (9540, 11815);
