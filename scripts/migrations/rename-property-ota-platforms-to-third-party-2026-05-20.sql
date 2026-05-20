-- Rename platform array column to third_party_platforms (Phase 2 naming).

ALTER TABLE public.all_glamping_properties
  RENAME COLUMN property_ota_platforms TO third_party_platforms;

ALTER INDEX IF EXISTS idx_agp_property_ota_platforms_gin
  RENAME TO idx_agp_third_party_platforms_gin;

COMMENT ON COLUMN public.all_glamping_properties.third_party_platforms IS
  'Active third-party listing platforms for this property (hipcamp, airbnb, booking_com, vrbo). Synced from ota_url_* columns when URLs change.';
