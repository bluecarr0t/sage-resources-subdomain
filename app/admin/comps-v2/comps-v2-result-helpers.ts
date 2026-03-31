import { candidateTotalUnitsOrSites } from '@/lib/comps-v2/candidate-total-units';
import { normalizeOccupancyToPercent } from '@/lib/comps-v2/comps-summary-stats';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';
import type { QualityTier } from '@/lib/comps-v2/types';
import {
  COMPS_V2_COUNT_KEY_ORDER,
  COMPS_V2_COUNT_KEYS_HIDDEN_FROM_COMPOSITION,
} from '@/app/admin/comps-v2/comps-v2-page-constants';

export type CompsV2ResultsSortColumn =
  | 'property'
  | 'location'
  | 'source'
  | 'mi'
  | 'adr'
  | 'occupancy'
  | 'units'
  | 'tier'
  | 'website';

export function orderedCompsV2CountEntries(counts: Record<string, number>): [string, number][] {
  const orderSet = new Set<string>(COMPS_V2_COUNT_KEY_ORDER);
  const out: [string, number][] = [];
  for (const k of COMPS_V2_COUNT_KEY_ORDER) {
    if (Object.prototype.hasOwnProperty.call(counts, k)) {
      out.push([k, counts[k]!]);
    }
  }
  for (const [k, v] of Object.entries(counts)) {
    if (orderSet.has(k) || COMPS_V2_COUNT_KEYS_HIDDEN_FROM_COMPOSITION.has(k)) continue;
    out.push([k, v]);
  }
  return out;
}

export function formatTierCell(
  tier: string | null | undefined,
  labels: Record<QualityTier, string>
): string {
  if (tier == null || tier === '') return '—';
  if (tier in labels) return labels[tier as QualityTier];
  return tier.length ? tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase() : '—';
}

/** Table cell: market occupancy as % (0–1 decimals normalized like summary stats). */
export function formatOccupancyTableCell(raw: number | null | undefined): string {
  if (raw == null || !Number.isFinite(raw)) return '—';
  const p = normalizeOccupancyToPercent(raw);
  const rounded = Math.round(p * 10) / 10;
  const s = Number.isInteger(rounded) ? String(Math.round(rounded)) : rounded.toFixed(1);
  return `${s}%`;
}

export function formatLocationTableCell(c: CompsV2Candidate): string {
  const city = c.city?.trim() ?? '';
  const st = c.state?.trim() ?? '';
  if (city && st) return `${city}, ${st}`;
  if (city) return city;
  if (st) return st;
  return '—';
}

export function locationSortKey(c: CompsV2Candidate): string {
  return `${c.city ?? ''}|${c.state ?? ''}|${c.location_detail ?? ''}`.toLowerCase();
}

function cmpNumForSort(
  a: number | null | undefined,
  b: number | null | undefined,
  mult: number
): number | null {
  const na = a == null || !Number.isFinite(a);
  const nb = b == null || !Number.isFinite(b);
  if (na && nb) return 0;
  if (na) return 1;
  if (nb) return -1;
  const d = (a as number) - (b as number);
  if (d === 0) return 0;
  return mult * Math.sign(d);
}

export function compareCompsV2ResultRows(
  a: CompsV2Candidate,
  b: CompsV2Candidate,
  col: CompsV2ResultsSortColumn,
  mult: number,
  sourceLabel: (table: string) => string,
  tierLabels: Record<QualityTier, string>
): number {
  switch (col) {
    case 'property':
      return (
        mult *
        a.property_name.localeCompare(b.property_name, undefined, { sensitivity: 'base' })
      );
    case 'location':
      return (
        mult *
        locationSortKey(a).localeCompare(locationSortKey(b), undefined, { sensitivity: 'base' })
      );
    case 'source':
      return (
        mult *
        sourceLabel(a.source_table).localeCompare(sourceLabel(b.source_table), undefined, {
          sensitivity: 'base',
        })
      );
    case 'mi': {
      const c = cmpNumForSort(a.distance_miles, b.distance_miles, mult);
      return c ?? 0;
    }
    case 'adr': {
      const c = cmpNumForSort(a.avg_retail_daily_rate, b.avg_retail_daily_rate, mult);
      return c ?? 0;
    }
    case 'occupancy': {
      const pa =
        a.market_occupancy_rate != null && Number.isFinite(a.market_occupancy_rate)
          ? normalizeOccupancyToPercent(a.market_occupancy_rate)
          : null;
      const pb =
        b.market_occupancy_rate != null && Number.isFinite(b.market_occupancy_rate)
          ? normalizeOccupancyToPercent(b.market_occupancy_rate)
          : null;
      const c = cmpNumForSort(pa, pb, mult);
      return c ?? 0;
    }
    case 'units': {
      const c = cmpNumForSort(
        candidateTotalUnitsOrSites(a),
        candidateTotalUnitsOrSites(b),
        mult
      );
      return c ?? 0;
    }
    case 'tier': {
      const ta = formatTierCell(a.adr_quality_tier, tierLabels);
      const tb = formatTierCell(b.adr_quality_tier, tierLabels);
      return mult * ta.localeCompare(tb, undefined, { sensitivity: 'base' });
    }
    case 'website': {
      const ua = a.url?.trim() ?? '';
      const ub = b.url?.trim() ?? '';
      if (ua === '' && ub === '') return 0;
      if (ua === '') return 1;
      if (ub === '') return -1;
      return mult * ua.localeCompare(ub, undefined, { sensitivity: 'base' });
    }
    default:
      return 0;
  }
}
