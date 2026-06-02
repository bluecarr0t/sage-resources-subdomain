import type { StateAdrChoroplethEntry } from '@/lib/rv-industry-overview/campspot-rv-map-data';

const EMPTY_ENTRY: StateAdrChoroplethEntry = {
  n: 0,
  nUnits: 0,
  nProperties: 0,
  meanAdr: null,
};

/** Coerce cached or partial choropleth values to finite numbers. */
export function parseStateAdrChoroplethMean(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[$,]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseNonNegativeInt(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }
  if (value == null || value === '') return 0;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Normalize one state entry (handles stale cache shapes). */
export function normalizeStateAdrChoroplethEntry(
  entry: Partial<StateAdrChoroplethEntry> | undefined
): StateAdrChoroplethEntry {
  if (!entry) return { ...EMPTY_ENTRY };
  return {
    n: parseNonNegativeInt(entry.n),
    nUnits: parseNonNegativeInt(entry.nUnits ?? entry.n),
    nProperties: parseNonNegativeInt(entry.nProperties),
    meanAdr: parseStateAdrChoroplethMean(entry.meanAdr),
  };
}

export function normalizeStateAdrChoroplethMap(
  byStateAdr: Record<string, Partial<StateAdrChoroplethEntry> | undefined>
): Record<string, StateAdrChoroplethEntry> {
  const out: Record<string, StateAdrChoroplethEntry> = {};
  for (const [abbr, entry] of Object.entries(byStateAdr)) {
    out[abbr] = normalizeStateAdrChoroplethEntry(entry);
  }
  return out;
}

/** Warm-only scale: yellow (low) → orange → red (high). */
const ADR_CHOROPLETH_WARM_STOPS: ReadonlyArray<{
  t: number;
  rgb: readonly [number, number, number];
}> = [
  { t: 0, rgb: [255, 237, 101] },
  { t: 0.5, rgb: [251, 146, 60] },
  { t: 1, rgb: [220, 38, 38] },
];

function interpolateWarmChoroplethColor(t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  const stops = ADR_CHOROPLETH_WARM_STOPS;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (clamped < a.t) continue;
    if (clamped > b.t && i < stops.length - 2) continue;
    const span = b.t - a.t || 1;
    const u = (clamped - a.t) / span;
    const r = Math.round(a.rgb[0] + u * (b.rgb[0] - a.rgb[0]));
    const g = Math.round(a.rgb[1] + u * (b.rgb[1] - a.rgb[1]));
    const bCh = Math.round(a.rgb[2] + u * (b.rgb[2] - a.rgb[2]));
    return `rgb(${r},${g},${bCh})`;
  }
  const last = stops[stops.length - 1].rgb;
  return `rgb(${last[0]},${last[1]},${last[2]})`;
}

export function deriveGlampingAdrColorRange(
  byStateAdr: Record<string, StateAdrChoroplethEntry>,
  minN: number
): { colorLo: number; colorHi: number } {
  const vals = Object.values(byStateAdr)
    .filter((e) => e.n >= minN)
    .map((e) => e.meanAdr)
    .filter((m): m is number => m != null);
  if (vals.length === 0) return { colorLo: 150, colorHi: 400 };
  const sorted = [...vals].sort((a, b) => a - b);
  const p10 = sorted[Math.max(0, Math.floor((sorted.length - 1) * 0.1))];
  const p90 = sorted[Math.min(sorted.length - 1, Math.ceil((sorted.length - 1) * 0.9))];
  let colorLo = Math.max(50, Math.floor(p10 / 25) * 25);
  let colorHi = Math.max(colorLo + 50, Math.ceil(p90 / 25) * 25);
  if (!Number.isFinite(colorLo) || !Number.isFinite(colorHi) || colorHi <= colorLo) {
    return { colorLo: 150, colorHi: 400 };
  }
  return { colorLo, colorHi };
}

export function legendTickValues(lo: number, hi: number, steps = 5): number[] {
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) {
    return [150, 225, 300, 375, 400];
  }
  if (steps < 2) return [lo, hi];
  const out: number[] = [];
  for (let i = 0; i < steps; i++) {
    const v = Math.round(lo + ((hi - lo) * i) / (steps - 1));
    out.push(Number.isFinite(v) ? v : lo);
  }
  return out;
}

export function adrChoroplethFill(adr: number, lo: number, hi: number): string {
  if (!Number.isFinite(adr) || !Number.isFinite(lo) || !Number.isFinite(hi)) {
    return '#e5e7eb';
  }
  const span = Math.max(1, hi - lo);
  const t = Math.min(1, Math.max(0, (adr - lo) / span));
  return interpolateWarmChoroplethColor(t);
}

export type StateAdrChoroplethDisplayKind = 'ok' | 'insufficient' | 'na';

export function stateAdrChoroplethDisplayKind(
  entry: StateAdrChoroplethEntry,
  minN: number
): StateAdrChoroplethDisplayKind {
  if (entry.n === 0 || entry.meanAdr == null) return 'na';
  if (entry.n < minN) return 'insufficient';
  return 'ok';
}
