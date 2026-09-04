/**
 * Canonical `all_sage_data.property_type` values for admin forms
 * (Property Edit modal, /admin/glamping-properties Property Type filter).
 */

export const GLAMPING_PROPERTY_TYPE_FORM_OPTIONS = [
  { value: 'Unknown', msgKey: 'unknown' as const },
  { value: 'Glamping', msgKey: 'glamping' as const },
  { value: 'Vacation Rental', msgKey: 'vacationRental' as const },
  { value: 'Outdoor Boutique Hotel', msgKey: 'outdoorBoutiqueHotel' as const },
  { value: 'Ranch & Lodge', msgKey: 'ranchLodge' as const },
  { value: 'Outdoor Resort', msgKey: 'outdoorResort' as const },
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

/** RV product types are never classified as glamping properties. */
export const RV_NON_GLAMPING_PROPERTY_TYPES = ['RV Resort', 'RV Park'] as const;

export function isRvNonGlampingPropertyType(
  propertyType: string | null | undefined
): boolean {
  return (RV_NON_GLAMPING_PROPERTY_TYPES as readonly string[]).includes(
    (propertyType ?? '').trim()
  );
}

/**
 * RV Resort / RV Park always store `is_glamping_property = No`.
 * Other types keep `currentFlag` when set, otherwise default to Yes.
 */
export function glampingFlagForPropertyType(
  propertyType: string | null | undefined,
  currentFlag?: string | null
): 'Yes' | 'No' {
  if (isRvNonGlampingPropertyType(propertyType)) return 'No';
  const trimmed = (currentFlag ?? '').trim();
  return trimmed === 'No' ? 'No' : 'Yes';
}

/** Force `is_glamping_property` to No when the effective type is RV Resort / RV Park. */
export function applyRvPropertyTypeGlampingFlag(
  fields: { property_type?: unknown; is_glamping_property?: unknown },
  currentPropertyType?: string | null
): void {
  const nextType =
    typeof fields.property_type === 'string'
      ? fields.property_type
      : currentPropertyType;
  if (isRvNonGlampingPropertyType(nextType)) {
    fields.is_glamping_property = 'No';
  }
}
