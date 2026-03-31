import type { CompsV2PropertyKind } from '@/lib/comps-v2/types';
import type { ComparableProperty } from '@/lib/ai-report-builder/types';
import { rowPassesGlampingUnitGate } from '@/lib/comps-v2/glamping-unit-classify';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';

const GLAMP_SIDE = new Set(['all_glamping_properties', 'hipcamp']);
const RV_SIDE = new Set(['all_roverpass_data_new', 'campspot']);

function textBlob(c: ComparableProperty, propertyType: string | null): string {
  return [
    c.property_name,
    c.unit_type,
    c.description,
    propertyType,
    c.amenities,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function matchesKind(
  kind: CompsV2PropertyKind,
  c: ComparableProperty,
  text: string,
  sourceTable: string
): boolean {
  const onGlamp = GLAMP_SIDE.has(sourceTable);
  const onRv = RV_SIDE.has(sourceTable);

  switch (kind) {
    case 'glamping':
      if (onRv) return false;
      if (onGlamp) return rowPassesGlampingUnitGate(c as CompsV2Candidate);
      return /\b(glamp|yurt|safari|bell tent|canvas|tentrr|cabins?)\b/i.test(text);
    case 'rv':
      if (onRv) return true;
      return /\b(rv|motorhome|hookup|pull[\s-]?through|sewer|w\/\s*sewage)\b/i.test(text);
    case 'marina':
      return /\b(marina|boat slip|dock|waterfront rv|wet slip)\b/i.test(text);
    case 'landscape_hotel':
      return /\b(landscape hotel|outdoor hotel|boutique hotel|eco[\s-]?resort)\b/i.test(text) || (onGlamp && /\bhotel\b/i.test(text));
    case 'campground':
      if (onRv) return true;
      return /\b(campground|campsite|tent site|primitive)\b/i.test(text);
    default:
      return true;
  }
}

/**
 * If `kinds` is empty, all rows pass. Otherwise a row passes if it matches any selected kind.
 */
export function rowMatchesPropertyKinds(
  c: ComparableProperty,
  kinds: CompsV2PropertyKind[],
  propertyType: string | null
): boolean {
  if (!kinds.length) return true;
  const text = textBlob(c, propertyType);
  return kinds.some((k) => matchesKind(k, c, text, c.source_table));
}
