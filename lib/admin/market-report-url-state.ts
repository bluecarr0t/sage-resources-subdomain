/**
 * URL serialization for deep-linkable market / enhanced study runs.
 * Multi-county catchment GDP/pop rollups are out of scope for this MVP (Phase 2).
 */

export type MarketReportUrlState = {
  scope: 'local' | 'national';
  addressLine: string;
  radiusMiles: number;
  segment: 'glamping' | 'rv_resort';
  adrMin: string;
  adrMax: string;
  minSiteUnitCount: number;
  anonymize: boolean;
  presenterMode: boolean;
};

const DEFAULTS: MarketReportUrlState = {
  scope: 'local',
  addressLine: '',
  radiusMiles: 50,
  segment: 'glamping',
  adrMin: '',
  adrMax: '',
  minSiteUnitCount: 3,
  anonymize: false,
  presenterMode: false,
};

function parseBool(v: string | null, fallback: boolean): boolean {
  if (v == null || v === '') return fallback;
  return v === '1' || v === 'true' || v === 'yes';
}

function parseIntSafe(v: string | null, fallback: number, min: number, max: number): number {
  if (v == null || v === '') return fallback;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** True when URL contains at least one recognized study query key. */
export function urlHasStudyParams(searchParams: URLSearchParams): boolean {
  const keys = [
    'address',
    'radius',
    'scope',
    'segment',
    'adrMin',
    'adrMax',
    'minUnits',
    'anonymize',
    'present',
  ];
  return keys.some((k) => searchParams.has(k));
}

export function parseMarketReportUrlState(searchParams: URLSearchParams): MarketReportUrlState {
  const scopeRaw = searchParams.get('scope');
  const scope =
    scopeRaw === 'national' || scopeRaw === 'local' ? scopeRaw : DEFAULTS.scope;

  const segmentRaw = searchParams.get('segment');
  const segment =
    segmentRaw === 'rv_resort' || segmentRaw === 'glamping' ? segmentRaw : DEFAULTS.segment;

  const addressRaw = searchParams.get('address');
  const addressLine =
    addressRaw != null && addressRaw.trim() !== '' ? addressRaw.trim() : DEFAULTS.addressLine;

  const radiusMiles = parseIntSafe(searchParams.get('radius'), DEFAULTS.radiusMiles, 1, 250);
  const minSiteUnitCount = parseIntSafe(
    searchParams.get('minUnits'),
    segment === 'rv_resort' ? 30 : 3,
    0,
    100_000,
  );

  return {
    scope,
    addressLine,
    radiusMiles,
    segment,
    adrMin: searchParams.get('adrMin') ?? '',
    adrMax: searchParams.get('adrMax') ?? '',
    minSiteUnitCount,
    anonymize: parseBool(searchParams.get('anonymize'), DEFAULTS.anonymize),
    presenterMode: parseBool(searchParams.get('present'), DEFAULTS.presenterMode),
  };
}

export function serializeMarketReportUrlState(state: MarketReportUrlState): URLSearchParams {
  const p = new URLSearchParams();
  p.set('scope', state.scope);
  p.set('segment', state.segment);
  if (state.scope === 'local') {
    if (state.addressLine.trim()) {
      p.set('address', state.addressLine.trim());
    }
    p.set('radius', String(Math.round(state.radiusMiles)));
  }
  if (state.adrMin.trim()) p.set('adrMin', state.adrMin.trim());
  if (state.adrMax.trim()) p.set('adrMax', state.adrMax.trim());
  if (state.minSiteUnitCount > 0) {
    p.set('minUnits', String(state.minSiteUnitCount));
  }
  if (state.anonymize) p.set('anonymize', '1');
  if (state.presenterMode) p.set('present', '1');
  return p;
}

export function shouldAutoRunFromUrlState(state: MarketReportUrlState): boolean {
  if (state.scope === 'national') return true;
  return state.addressLine.trim().length > 0;
}

export { DEFAULTS as marketReportUrlStateDefaults };
