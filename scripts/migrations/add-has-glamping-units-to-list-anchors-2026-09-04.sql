-- Derived has_glamping_units on the Sage Data list-anchors view.
-- Safe to re-run. Labels come from lib/admin/has-glamping-units.ts
-- (same taxonomy as the edit-property readout). Not a stored table column.

CREATE OR REPLACE FUNCTION public.is_glamping_inventory_unit_type(p_unit_type text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT
    p_unit_type IS NOT NULL
    AND btrim(p_unit_type) <> ''
    AND lower(btrim(regexp_replace(p_unit_type, '\s+', ' ', 'g'))) = ANY (
      ARRAY[
      'a frame',
      'a-frame',
      'a-frames',
      'aframe',
      'aframes',
      'airstream',
      'airstreams',
      'bell tent',
      'bell tents',
      'bothies',
      'bothy',
      'bubble dome',
      'bubble domes',
      'bubble tent',
      'bubble tents',
      'bungalow',
      'bungalows',
      'cabin',
      'cabin tent',
      'cabin tents',
      'cabins',
      'canvas cabin',
      'canvas cabins',
      'canvas cottage',
      'canvas cottages',
      'canvas lodge tent',
      'cave',
      'cave house',
      'cave houses',
      'caves',
      'chalet',
      'chalets',
      'classic canvas cabin',
      'conestoga',
      'conestoga wagon',
      'conestoga wagons',
      'container home',
      'converted container',
      'cottage',
      'cottages',
      'covered wagon',
      'covered wagons',
      'cube cabin',
      'cube cabins',
      'deluxe tent cabin',
      'deluxe tent cabins',
      'dome',
      'domes',
      'eco cabin',
      'eco cabins',
      'eco pod',
      'eco-pod',
      'eco-pods',
      'family canvas cabin',
      'geodesic dome',
      'geodesic domes',
      'geodome',
      'geodomes',
      'ger',
      'glass cabin',
      'glass cabins',
      'glass house',
      'glass houses',
      'hobbit home',
      'hobbit homes',
      'hobbit house',
      'igloo',
      'igloos',
      'inflatable tent',
      'jupe',
      'jupe tent',
      'jupe tents',
      'jupes',
      'lodge',
      'lodges',
      'lotus belle',
      'lotus tent',
      'lushna',
      'lushna cabin',
      'lushna cabins',
      'luxury safari tent',
      'luxury safari tents',
      'luxury tree house',
      'luxury tree houses',
      'luxury treehouse',
      'luxury treehouses',
      'mirror cabin',
      'mirror cabins',
      'mirror house',
      'mirror houses',
      'mirrored cabin',
      'mirrored cabins',
      'mirrored house',
      'mirrored houses',
      'ööd',
      'ood house',
      'ööd house',
      'ood houses',
      'ööd houses',
      'ood mirror cabin',
      'ood mirror house',
      'other glamping',
      'pod',
      'pods',
      'retro trailer',
      'roulotte',
      'roulottes',
      'safari suite',
      'safari suites',
      'safari tent',
      'safari tents',
      'shepherd hut',
      'shepherd huts',
      'shepherd''s hut',
      'shepherd''s huts',
      'shipping container',
      'silo',
      'stargazing dome',
      'teepee',
      'teepees',
      'tent cabin',
      'tent cabins',
      'tent-cabin',
      'tent-cabins',
      'tentalow',
      'tentalows',
      'tiny home',
      'tiny homes',
      'tiny house',
      'tiny houses',
      'tipi',
      'tipis',
      'tree house',
      'tree houses',
      'tree tent',
      'tree tents',
      'treehouse',
      'treehouses',
      'vintage trailer',
      'vintage trailers',
      'wagon',
      'wagonette',
      'wagonettes',
      'wagons',
      'wall tent',
      'wall tents',
      'yurt',
      'yurts'
      ]::text[]
    );
$$;

COMMENT ON FUNCTION public.is_glamping_inventory_unit_type(text) IS
  'True when unit_type is furnished glamping inventory (yurt, safari tent, dome, …). RV Site / Campsite / hotel SKUs are false.';

CREATE OR REPLACE FUNCTION public.sage_data_property_list_key(
  p_property_id uuid,
  p_slug text,
  p_property_name text,
  p_city text,
  p_state text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT COALESCE(
    p_property_id::text,
    NULLIF(btrim(p_slug), ''),
    lower(btrim(coalesce(p_property_name, ''))) || '|' ||
      lower(btrim(coalesce(p_city, ''))) || '|' ||
      lower(btrim(coalesce(p_state, '')))
  );
$$;

DROP VIEW IF EXISTS public.all_sage_data_list_anchors;

CREATE VIEW public.all_sage_data_list_anchors AS
SELECT DISTINCT ON (
  public.sage_data_property_list_key(
    agp.property_id,
    agp.slug,
    agp.property_name,
    agp.city,
    agp.state
  )
)
  agp.*,
  EXISTS (
    SELECT 1
    FROM public.all_sage_data sib
    WHERE public.sage_data_property_list_key(
            sib.property_id,
            sib.slug,
            sib.property_name,
            sib.city,
            sib.state
          ) = public.sage_data_property_list_key(
            agp.property_id,
            agp.slug,
            agp.property_name,
            agp.city,
            agp.state
          )
      AND public.is_glamping_inventory_unit_type(sib.unit_type)
  ) AS has_glamping_units
FROM public.all_sage_data agp
ORDER BY
  public.sage_data_property_list_key(
    agp.property_id,
    agp.slug,
    agp.property_name,
    agp.city,
    agp.state
  ),
  agp.id;

COMMENT ON VIEW public.all_sage_data_list_anchors IS
  'Deduped admin Sage Data list: one row per logical property (lowest id = anchor). has_glamping_units is derived from sibling unit_types.';

COMMENT ON COLUMN public.all_sage_data_list_anchors.has_glamping_units IS
  'True when any sibling site row has a furnished glamping unit_type. Not stored on all_sage_data.';

GRANT SELECT ON public.all_sage_data_list_anchors TO authenticated;
GRANT SELECT ON public.all_sage_data_list_anchors TO service_role;

NOTIFY pgrst, 'reload schema';
