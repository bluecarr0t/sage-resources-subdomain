/**
 * Country filter helpers for unified comps (`unified_comps.country`).
 * DB values vary (USA, US, United States, Canada, CA, …); expand canonical
 * selections to all aliases for `.in('country', …)` / RPC `p_countries`.
 */

export function normalizeCountryFilterValue(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const upper = t.toUpperCase();
  if (
    upper === 'US' ||
    upper === 'USA' ||
    /^UNITED STATES$/i.test(t) ||
    /^UNITED STATES OF AMERICA$/i.test(t)
  ) {
    return 'USA';
  }
  if (upper === 'CA' || /^CANADA$/i.test(t)) return 'Canada';
  if (upper === 'MX' || /^MEXICO$/i.test(t)) return 'Mexico';
  return t;
}

export function formatCountryFilterLabel(canon: string): string {
  if (canon === 'USA') return 'United States';
  return canon;
}

export function expandCountryValuesForInQuery(selected: string[]): string[] {
  const out = new Set<string>();
  for (const raw of selected) {
    const canon = normalizeCountryFilterValue(raw);
    if (!canon) continue;
    out.add(canon);
    if (canon === 'USA') {
      for (const v of [
        'USA',
        'US',
        'United States',
        'United States of America',
        'UNITED STATES',
        'UNITED STATES OF AMERICA',
      ]) {
        out.add(v);
      }
    } else if (canon === 'Canada') {
      for (const v of ['Canada', 'CA', 'CANADA']) out.add(v);
    } else if (canon === 'Mexico') {
      for (const v of ['Mexico', 'MX', 'MEXICO']) out.add(v);
    }
  }
  return [...out];
}

export function buildCountryFilterOptions(
  rawCountries: string[]
): { value: string; label: string }[] {
  const seen = new Set<string>();
  const options: { value: string; label: string }[] = [];
  for (const raw of rawCountries) {
    const canon = normalizeCountryFilterValue(raw);
    if (!canon || seen.has(canon)) continue;
    seen.add(canon);
    options.push({ value: canon, label: formatCountryFilterLabel(canon) });
  }
  return options.sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
  );
}

export function parseCountryParamFromUrl(param: string | null): string[] {
  if (!param) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of param.split(',')) {
    const canon = normalizeCountryFilterValue(part);
    if (!canon || seen.has(canon)) continue;
    seen.add(canon);
    out.push(canon);
  }
  return out;
}

/** Default Country filter on /admin/comps (United States). */
export const DEFAULT_SELECTED_COUNTRIES = ['USA'] as const;

/** Parse `country` query param; missing param defaults to United States. */
export function parseCountryFilterFromUrl(param: string | null): string[] {
  if (param === 'all') return [];
  if (param) return parseCountryParamFromUrl(param);
  return [...DEFAULT_SELECTED_COUNTRIES];
}

export function writeCountryFilterToParams(
  params: URLSearchParams,
  countries: string[]
): void {
  if (countries.length === 0) {
    params.set('country', 'all');
  } else {
    params.set('country', countries.join(','));
  }
}
