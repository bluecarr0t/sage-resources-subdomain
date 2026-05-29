/**
 * Canonical `all_glamping_properties.property_type` values for admin forms
 * (Property Edit modal, /admin/glamping-properties Property Type filter).
 */

export const GLAMPING_PROPERTY_TYPE_FORM_OPTIONS = [
  { value: 'Unknown', msgKey: 'unknown' as const },
  { value: 'Glamping', msgKey: 'glamping' as const },
  { value: 'Outdoor Boutique Hotel', msgKey: 'outdoorBoutiqueHotel' as const },
  { value: 'RV Resort', msgKey: 'rvResort' as const },
  { value: 'RV Park', msgKey: 'rvPark' as const },
  { value: 'Campground', msgKey: 'campground' as const },
  { value: 'Landscape Hotel', msgKey: 'landscapeHotel' as const },
  { value: 'Marina', msgKey: 'marina' as const },
] as const;

export type GlampingPropertyTypeFormValue =
  (typeof GLAMPING_PROPERTY_TYPE_FORM_OPTIONS)[number]['value'];

export const GLAMPING_PROPERTY_TYPE_ALLOWED = new Set<string>(
  GLAMPING_PROPERTY_TYPE_FORM_OPTIONS.map((o) => o.value)
);

export function normalizePropertyTypeForForm(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === '' || !GLAMPING_PROPERTY_TYPE_ALLOWED.has(trimmed)) {
    return 'Unknown';
  }
  return trimmed;
}
