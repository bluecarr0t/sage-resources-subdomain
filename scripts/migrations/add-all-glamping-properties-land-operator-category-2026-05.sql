-- Land tenure / operator class (not folded into property_type).
-- Apply in Supabase SQL editor (or psql). Safe to re-run for COMMENT / constraint refresh patterns.

ALTER TABLE public.all_glamping_properties
  ADD COLUMN IF NOT EXISTS land_operator_category text;

COMMENT ON COLUMN public.all_glamping_properties.land_operator_category IS
  'Tenure/operator: private_commercial (default retail glamping), state_park, federal_public, other_public. NULL = unset (treated as private_commercial for map + private comps).';

ALTER TABLE public.all_glamping_properties
  DROP CONSTRAINT IF EXISTS all_glamping_properties_land_operator_category_check;

ALTER TABLE public.all_glamping_properties
  ADD CONSTRAINT all_glamping_properties_land_operator_category_check
  CHECK (
    land_operator_category IS NULL
    OR land_operator_category IN (
      'private_commercial',
      'state_park',
      'federal_public',
      'other_public'
    )
  );
