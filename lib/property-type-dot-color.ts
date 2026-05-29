import {
  GLAMPING_PROPERTY_TYPE_FORM_OPTIONS,
  normalizePropertyTypeForForm,
  type GlampingPropertyTypeFormValue,
} from '@/lib/glamping-property-types';

/** Earthy dot colors aligned with Sage greens and neutral outdoor palette. */
export const PROPERTY_TYPE_DOT_COLORS: Record<GlampingPropertyTypeFormValue, string> = {
  Glamping: '#5c7a5c',
  'Outdoor Boutique Hotel': '#8b7355',
  'RV Resort': '#6b7d8a',
  'RV Park': '#5a6d78',
  Campground: '#a67c52',
  'Landscape Hotel': '#4a624a',
  Marina: '#4d8a82',
  Unknown: '#a8a29e',
};

/**
 * Resolve dot color for a property_type label (canonical or legacy free text).
 */
export function getPropertyTypeDotColor(propertyType: string | null | undefined): string {
  const raw = (propertyType ?? '').trim();
  if (!raw) return PROPERTY_TYPE_DOT_COLORS.Unknown;

  const normalized = normalizePropertyTypeForForm(raw) as GlampingPropertyTypeFormValue;
  if (normalized !== 'Unknown') {
    return PROPERTY_TYPE_DOT_COLORS[normalized];
  }

  const lower = raw.toLowerCase();
  if (lower.includes('glamping')) return PROPERTY_TYPE_DOT_COLORS.Glamping;
  if (lower.includes('boutique') && lower.includes('hotel')) {
    return PROPERTY_TYPE_DOT_COLORS['Outdoor Boutique Hotel'];
  }
  if (lower.includes('landscape') && lower.includes('hotel')) {
    return PROPERTY_TYPE_DOT_COLORS['Landscape Hotel'];
  }
  if (lower.includes('rv park')) {
    return PROPERTY_TYPE_DOT_COLORS['RV Park'];
  }
  if (/\brv\b/.test(lower) || lower.includes('rv resort')) {
    return PROPERTY_TYPE_DOT_COLORS['RV Resort'];
  }
  if (lower.includes('campground') || lower.includes('camping')) {
    return PROPERTY_TYPE_DOT_COLORS.Campground;
  }
  if (lower.includes('marina')) return PROPERTY_TYPE_DOT_COLORS.Marina;

  return PROPERTY_TYPE_DOT_COLORS.Unknown;
}

/** All canonical types (for docs/tests). */
export const PROPERTY_TYPE_DOT_COLOR_KEYS = GLAMPING_PROPERTY_TYPE_FORM_OPTIONS.map(
  (o) => o.value
);
