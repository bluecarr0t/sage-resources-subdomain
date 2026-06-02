import {
  adrChoroplethFill,
  deriveGlampingAdrColorRange,
  legendTickValues,
  normalizeStateAdrChoroplethEntry,
  normalizeStateAdrChoroplethMap,
  stateAdrChoroplethDisplayKind,
} from '@/lib/rv-industry-overview/state-adr-choropleth-display';

describe('state-adr-choropleth-display', () => {
  it('normalizes stale cache entries and parses string meanAdr', () => {
    const entry = normalizeStateAdrChoroplethEntry({
      meanAdr: '220.5',
      nUnits: 74,
    } as never);
    expect(entry.n).toBe(0);
    expect(entry.nUnits).toBe(74);
    expect(entry.meanAdr).toBe(220.5);
    expect(stateAdrChoroplethDisplayKind(entry, 3)).toBe('na');
  });

  it('derives finite glamping color range from qualifying states', () => {
    const map = normalizeStateAdrChoroplethMap({
      TX: { n: 10, nUnits: 100, nProperties: 5, meanAdr: 220 },
      CA: { n: 8, nUnits: 80, nProperties: 4, meanAdr: 350 },
    });
    const { colorLo, colorHi } = deriveGlampingAdrColorRange(map, 3);
    expect(Number.isFinite(colorLo)).toBe(true);
    expect(Number.isFinite(colorHi)).toBe(true);
    expect(colorHi).toBeGreaterThan(colorLo);
    expect(legendTickValues(colorLo, colorHi).every((v) => Number.isFinite(v))).toBe(true);
  });

  it('returns neutral fill when color scale is invalid', () => {
    expect(adrChoroplethFill(220, Number.NaN, 400)).toBe('#e5e7eb');
  });

  it('uses warm yellow → orange → red fills across the ADR range', () => {
    const lo = 150;
    const hi = 400;
    expect(adrChoroplethFill(lo, lo, hi)).toBe('rgb(255,237,101)');
    expect(adrChoroplethFill((lo + hi) / 2, lo, hi)).toBe('rgb(251,146,60)');
    expect(adrChoroplethFill(hi, lo, hi)).toBe('rgb(220,38,38)');
  });
});
