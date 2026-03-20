import type { SiteTypeConfig } from '@/lib/site-design/types';

const MAX_SITES_QUERY_LENGTH = 1500;

export interface SiteDesignUrlState {
  activePreset: 'standard' | 'goldenValley' | 'bigRig' | '';
  grossAcres: number | '';
  usablePct: number | '';
  roadWidth: number | '';
  blockEfficiency: number | '';
  operatingNights: number | '';
  operatingExpenseRatio: number | '';
  capRate: number | '';
  autoFillRemainingLand: boolean;
  siteTypes: SiteTypeConfig[];
}

export interface BuildSiteDesignUrlParamsResult {
  params: URLSearchParams;
  didOmitSites: boolean;
}

export function parseSitesFromUrl(s: string | null): SiteTypeConfig[] | null {
  if (!s?.trim()) return null;
  try {
    const parsed = JSON.parse(s) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter(
        (row): row is Record<string, unknown> =>
          row != null &&
          typeof row === 'object' &&
          typeof row.id === 'string' &&
          typeof row.name === 'string' &&
          typeof row.width === 'number' &&
          typeof row.depth === 'number' &&
          typeof row.adr === 'number' &&
          typeof row.occupancy === 'number' &&
          typeof row.devCost === 'number'
      )
      .map((row) => ({
        id: String(row.id),
        name: String(row.name),
        width: Number(row.width),
        depth: Number(row.depth),
        adr: Number(row.adr),
        occupancy: Number(row.occupancy),
        count: row.count === '' || row.count == null ? '' : Math.max(0, Math.round(Number(row.count))),
        devCost: Number(row.devCost),
      }));
  } catch {
    return null;
  }
}

export function buildSiteDesignUrlParams(state: SiteDesignUrlState): BuildSiteDesignUrlParamsResult {
  const p = new URLSearchParams();
  if (state.activePreset) {
    p.set('preset', state.activePreset);
    return { params: p, didOmitSites: false };
  }

  if (state.grossAcres !== '') p.set('acres', String(state.grossAcres));
  if (state.usablePct !== '') p.set('usable', String(state.usablePct));
  if (state.roadWidth !== '') p.set('road', String(state.roadWidth));
  if (state.blockEfficiency !== '') p.set('efficiency', String(state.blockEfficiency));
  if (state.operatingNights !== '') p.set('nights', String(state.operatingNights));
  if (state.operatingExpenseRatio !== '') p.set('opex', String(state.operatingExpenseRatio));
  if (state.capRate !== '') p.set('cap', String(state.capRate));
  if (!state.autoFillRemainingLand) p.set('autofill', '0');

  let didOmitSites = false;
  if (state.siteTypes.length > 0) {
    const serializedSites = JSON.stringify(
      state.siteTypes.map((s) => ({
        id: s.id,
        name: s.name,
        width: s.width,
        depth: s.depth,
        adr: s.adr,
        occupancy: s.occupancy,
        count: s.count,
        devCost: s.devCost,
      }))
    );
    if (serializedSites.length <= MAX_SITES_QUERY_LENGTH) {
      p.set('sites', serializedSites);
    } else {
      didOmitSites = true;
    }
  }

  return { params: p, didOmitSites };
}
