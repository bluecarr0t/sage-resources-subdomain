import { GLAMPING_PROPERTY_TYPE_ALLOWED } from '@/lib/glamping-property-types';

/**
 * Canonical unit_type display labels (from glamping-unit-type-normalize PHRASE_CANONICAL).
 * When these appear in property_type, the row is mislabeled and should be Glamping.
 */
export const GLAMPING_UNIT_TYPE_DISPLAY_LABELS: readonly string[] = [
  'A-Frame',
  'Airstream',
  'Beach Cabin',
  'Beach House',
  'Beach Lodge',
  'Bell Tent',
  'Bubble Tent',
  'Bungalow',
  'Cabin',
  'Cabin Tent',
  'Canvas Cabin',
  'Canvas Cottage',
  'Canvas Tent',
  'Cave House',
  'Cave Room',
  'Chalet',
  'Cottage',
  'Covered Wagon',
  'Cube Cabin',
  'Dome',
  'Eco Cabin',
  'Eco Cottage',
  'Eco-house',
  'Eco-pod',
  'Eco-suite',
  'Floating Tent',
  'Glamping Pod',
  'Hut',
  'Igloo',
  'Lodge',
  'Lodge Tent',
  'Luxury Room',
  'Luxury Tent',
  'Mixed Glamping',
  'Mobile Home',
  'Open-air Room',
  'Pod',
  'Roulotte',
  'RV Site',
  "Shepherd's Hut",
  'Safari Tent',
  'Teepee',
  'Tent',
  'Tent Site',
  'Tipi',
  'Tiny Home',
  'Tiny House',
  'Tree Tent',
  'Treehouse',
  'Villa',
  'Wagonette',
  'Wall Tent',
  'Yurt',
] as const;

// Canvas Cabin / Wall Tent / Canvas Tent remain listed so legacy property_type
// mislabels still detect; Wall Tent → Safari Tent; Canvas Tent → null on storage.

/** DB variants where unit taxonomy was stored in property_type. */
export const EXTRA_UNIT_TYPE_AS_PROPERTY_TYPE_LABELS: readonly string[] = [
  'Cabin (Wood or Log)',
  'Modern Tiny Home Cabin',
  'Safari Tent (Poles)',
  'Safari Tent (Timber Framed)',
] as const;

const UNIT_TYPE_AS_PROPERTY_TYPE_SET = new Set<string>([
  ...GLAMPING_UNIT_TYPE_DISPLAY_LABELS,
  ...EXTRA_UNIT_TYPE_AS_PROPERTY_TYPE_LABELS,
]);

const CANONICAL_PROPERTY_TYPES = GLAMPING_PROPERTY_TYPE_ALLOWED;

/**
 * True when property_type holds a unit label instead of a canonical property category.
 */
export function isUnitTypeMislabeledAsPropertyType(
  propertyType: string | null | undefined,
  unitType?: string | null | undefined
): boolean {
  const pt = (propertyType ?? '').trim();
  if (!pt || CANONICAL_PROPERTY_TYPES.has(pt)) return false;

  if (UNIT_TYPE_AS_PROPERTY_TYPE_SET.has(pt)) return true;

  const ut = (unitType ?? '').trim();
  if (ut) {
    if (pt === ut) return true;
    const primaryUnit = ut.split(',')[0]?.trim() ?? '';
    if (primaryUnit && pt === primaryUnit) return true;
  }

  const lower = pt.toLowerCase();
  if (/^safari tent\b/.test(lower)) return true;
  if (/^cabin\s*\(/.test(lower)) return true;
  if (/\b(tent|yurt|dome|treehouse|airstream|tipi|teepee|pod)\s*$/i.test(lower) && pt.length < 48) {
    return true;
  }

  return false;
}
