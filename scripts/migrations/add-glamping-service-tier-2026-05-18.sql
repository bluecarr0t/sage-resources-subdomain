-- Glamping service tier: property-level experience classification (luxury / upscale / midscale / rustic).

ALTER TABLE public.all_glamping_properties
  ADD COLUMN IF NOT EXISTS glamping_service_tier text
    CHECK (
      glamping_service_tier IS NULL
      OR glamping_service_tier IN ('luxury', 'upscale', 'midscale', 'rustic')
    ),
  ADD COLUMN IF NOT EXISTS glamping_service_tier_source text
    DEFAULT 'auto'
    CHECK (
      glamping_service_tier_source IS NULL
      OR glamping_service_tier_source IN ('auto', 'manual')
    ),
  ADD COLUMN IF NOT EXISTS glamping_service_tier_notes text;

CREATE INDEX IF NOT EXISTS idx_all_glamping_glamping_service_tier
  ON public.all_glamping_properties (glamping_service_tier)
  WHERE glamping_service_tier IS NOT NULL;

COMMENT ON COLUMN public.all_glamping_properties.glamping_service_tier IS
  'Property-level service tier: luxury | upscale | midscale | rustic. Same value on all sibling site rows.';
COMMENT ON COLUMN public.all_glamping_properties.glamping_service_tier_source IS
  'auto = rule-based classifier; manual = admin override (classifier skips property_id).';
COMMENT ON COLUMN public.all_glamping_properties.glamping_service_tier_notes IS
  'Optional audit note for tier assignment (scoring rationale or manual reason).';
