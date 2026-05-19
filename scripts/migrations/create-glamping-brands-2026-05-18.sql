-- Glamping brands registry + property brand_id (May 2026).
-- Supports parent_brand_id (e.g. ULUM → Under Canvas portfolio).
-- Apply via Supabase migration create_glamping_brands_2026_05_18.

-- ---------------------------------------------------------------------------
-- brands table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.glamping_brands (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                    text NOT NULL UNIQUE,
  display_name            text NOT NULL,
  parent_brand_id         uuid REFERENCES public.glamping_brands(id) ON DELETE SET NULL,
  brand_tier              text NOT NULL DEFAULT 'standalone'
    CHECK (brand_tier IN ('portfolio', 'sub_brand', 'standalone')),
  legacy_chain_key        text UNIQUE,
  website_url             text,
  reported_location_count integer,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT glamping_brands_no_self_parent
    CHECK (parent_brand_id IS DISTINCT FROM id)
);

CREATE INDEX IF NOT EXISTS glamping_brands_parent_brand_id_idx
  ON public.glamping_brands (parent_brand_id);

CREATE INDEX IF NOT EXISTS glamping_brands_legacy_chain_key_idx
  ON public.glamping_brands (legacy_chain_key)
  WHERE legacy_chain_key IS NOT NULL;

COMMENT ON TABLE public.glamping_brands IS
  'Commercial glamping brand / operator registry. Properties reference leaf brands via brand_id; parent_brand_id defines portfolio trees (e.g. ULUM under Under Canvas).';

-- Prevent parent_brand_id cycles (max depth enforced in app; trigger blocks loops).
CREATE OR REPLACE FUNCTION public.glamping_brands_prevent_cycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  walk_id uuid;
  next_parent uuid;
  depth int := 0;
BEGIN
  IF NEW.parent_brand_id IS NULL THEN
    RETURN NEW;
  END IF;

  walk_id := NEW.parent_brand_id;
  WHILE walk_id IS NOT NULL AND depth < 32 LOOP
    IF walk_id = NEW.id THEN
      RAISE EXCEPTION 'glamping_brands.parent_brand_id would create a cycle (brand id %)', NEW.id;
    END IF;
    SELECT parent_brand_id INTO next_parent
    FROM public.glamping_brands
    WHERE id = walk_id;
    walk_id := next_parent;
    depth := depth + 1;
  END LOOP;

  IF depth >= 32 THEN
    RAISE EXCEPTION 'glamping_brands parent chain exceeds max depth (32)';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS glamping_brands_prevent_cycle_trg ON public.glamping_brands;
CREATE TRIGGER glamping_brands_prevent_cycle_trg
  BEFORE INSERT OR UPDATE OF parent_brand_id ON public.glamping_brands
  FOR EACH ROW
  EXECUTE FUNCTION public.glamping_brands_prevent_cycle();

-- ---------------------------------------------------------------------------
-- property FK
-- ---------------------------------------------------------------------------
ALTER TABLE public.all_glamping_properties
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.glamping_brands(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS all_glamping_properties_brand_id_idx
  ON public.all_glamping_properties (brand_id);

COMMENT ON COLUMN public.all_glamping_properties.brand_id IS
  'Leaf glamping brand for this row (assign ULUM to ULUM Moab, not parent Under Canvas). Sibling rows should share the same brand_id.';

-- ---------------------------------------------------------------------------
-- Rollup helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brand_descendant_ids(p_brand_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH RECURSIVE tree AS (
    SELECT id FROM public.glamping_brands WHERE id = p_brand_id
    UNION ALL
    SELECT b.id
    FROM public.glamping_brands b
    INNER JOIN tree t ON b.parent_brand_id = t.id
  )
  SELECT COALESCE(array_agg(tree.id ORDER BY tree.id), ARRAY[]::uuid[])
  FROM tree;
$$;

CREATE OR REPLACE FUNCTION public.brand_ancestor_ids(p_brand_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH RECURSIVE ancestors AS (
    SELECT id, parent_brand_id FROM public.glamping_brands WHERE id = p_brand_id
    UNION ALL
    SELECT b.id, b.parent_brand_id
    FROM public.glamping_brands b
    INNER JOIN ancestors a ON b.id = a.parent_brand_id
  )
  SELECT COALESCE(array_agg(ancestors.id ORDER BY ancestors.id), ARRAY[]::uuid[])
  FROM ancestors;
$$;

-- Resolve slug → brand ids for rollup (self only, or portfolio including sub-brands).
CREATE OR REPLACE FUNCTION public.brand_ids_for_slug_rollup(
  p_brand_slug text,
  p_include_sub_brands boolean DEFAULT false
)
RETURNS uuid[]
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_include_sub_brands THEN public.brand_descendant_ids(b.id)
    ELSE ARRAY[b.id]
  END
  FROM public.glamping_brands b
  WHERE b.slug = p_brand_slug
  LIMIT 1;
$$;

-- Coalesce brand_id with legacy chain label for analytics during migration.
CREATE OR REPLACE FUNCTION public.sage_property_brand_key(
  p_brand_id uuid,
  p_property_name text
)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT b.slug FROM public.glamping_brands b WHERE b.id = p_brand_id),
    NULLIF(lower(public.sage_chain_label_from_property_name(p_property_name)), '')
  );
$$;

GRANT SELECT ON public.glamping_brands TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.brand_descendant_ids(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.brand_ancestor_ids(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.brand_ids_for_slug_rollup(text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sage_property_brand_key(uuid, text) TO authenticated, service_role;
