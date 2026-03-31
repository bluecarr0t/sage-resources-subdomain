import { COMPS_V2_GAP_FILL_MAX_EXISTING_CANDIDATES } from '@/lib/comps-v2/gap-fill-limits';

export type CompsV2Translate = (key: string, values?: Record<string, string | number>) => string;

export function mergeUniqueErrorStrings(prev: string[], more: readonly string[]): string[] {
  const seen = new Set(prev.map((x) => x.trim()).filter(Boolean));
  const out = [...prev];
  for (const e of more) {
    const s = e.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export function resolveGapFillClientError(
  data: { errorCode?: string; message?: string },
  t: CompsV2Translate
): string {
  switch (data.errorCode) {
    case 'CITY_REQUIRED':
      return t('errorGapFillCityRequired');
    case 'STATE_REQUIRED':
      return t('errorGapFillStateRequired');
    case 'EXISTING_PAYLOAD_TOO_LARGE':
      return t('errorGapFillExistingTooLarge', { max: COMPS_V2_GAP_FILL_MAX_EXISTING_CANDIDATES });
    default:
      return data.message || t('errorGeneric');
  }
}

export function resolveDeepEnrichClientError(
  data: { errorCode?: string; message?: string },
  t: CompsV2Translate
): string {
  switch (data.errorCode) {
    case 'ITEMS_ARRAY_REQUIRED':
      return t('errorEnrichApiItemsRequired');
    case 'MIN_ITEMS_COUNT':
      return t('errorEnrichApiMinItems');
    case 'MAX_ITEMS_COUNT':
      return t('errorEnrichApiMaxItems');
    case 'NO_VALID_ITEMS':
      return t('errorEnrichApiNoValidItems');
    case 'INSUFFICIENT_VALID_ITEMS':
      return t('errorEnrichApiInsufficientValid');
    case 'INTERNAL':
      return t('errorEnrichApiInternal');
    default:
      return data.message || t('errorGeneric');
  }
}
