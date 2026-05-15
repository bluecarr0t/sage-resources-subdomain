import { buildSummarySnapshot, parseBullets } from '@/lib/market-report/insights-llm';
import type { MarketSummarySection } from '@/lib/market-report/types';

describe('parseBullets', () => {
  it('parses dashed bullets and trims surrounding whitespace', () => {
    const raw = `- First bullet text.\n- Second bullet text.\n- Third bullet text.`;
    expect(parseBullets(raw)).toEqual([
      'First bullet text.',
      'Second bullet text.',
      'Third bullet text.',
    ]);
  });

  it('handles asterisk and unicode bullet prefixes', () => {
    const raw = `* Alpha\n• Beta\n- Gamma`;
    expect(parseBullets(raw)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('drops blank lines and markdown headings', () => {
    const raw = `# Heading\n\n- Real bullet one\n\n- Real bullet two\n---\n`;
    expect(parseBullets(raw)).toEqual(['Real bullet one', 'Real bullet two']);
  });

  it('caps output at 5 bullets even if the model returns more', () => {
    const raw = Array.from({ length: 8 }, (_, i) => `- bullet ${i + 1}`).join('\n');
    const out = parseBullets(raw);
    expect(out).toHaveLength(5);
    expect(out[0]).toBe('bullet 1');
    expect(out[4]).toBe('bullet 5');
  });

  it('returns an empty array for an empty or whitespace-only response', () => {
    expect(parseBullets('')).toEqual([]);
    expect(parseBullets('   \n  \n')).toEqual([]);
  });

  it('preserves text after a bullet prefix even with multiple spaces', () => {
    expect(parseBullets('-   Spaced bullet')).toEqual(['Spaced bullet']);
  });
});

describe('buildSummarySnapshot', () => {
  const baseSummary = (): MarketSummarySection => ({
    distinctListingCount: 10,
    inventoryRowCount: 12,
    radiusMiles: 50,
    segment: 'glamping',
    sourceCounts: [],
    sourceBreakdown: [],
    topStates: [{ state: 'TX', count: 5 }],
    totalSites: null,
    topUnitTypesWithAdr: [
      { unit_type: 'Yurt', count: 3, unitCount: null, meanAdr: 200, medianAdr: 200, details: [] },
    ],
  });

  it('does not throw when demandDrivers is missing majorAndLargeCities (legacy shape)', () => {
    const demandDrivers = {
      nationalParks: { count: 1, top: [{ name: 'Park A', state: 'TX', distance_miles: 10 }], radiusMiles: 100 },
      skiResorts: { count: 0, top: [], radiusMiles: 100 },
      wineries: { count: 0, top: [], radiusMiles: 50 },
      majorOutdoorSites: { count: 0, top: [], radiusMiles: 50 },
    } as unknown as MarketSummarySection['demandDrivers'];

    const snap = buildSummarySnapshot({
      segment: 'glamping',
      scope: 'local',
      addressLine: 'Austin, TX',
      radiusMiles: 50,
      adrMin: null,
      adrMax: null,
      summary: { ...baseSummary(), demandDrivers },
    });
    const dd = snap.demand_drivers as Record<string, unknown>;
    expect(dd.major_large_cities_count).toBe(0);
    expect(dd.top_cities).toEqual([]);
    expect(dd.top_parks).toEqual(['Park A']);
  });

  it('uses empty arrays when topStates or sourceBreakdown are missing', () => {
    const summary = { ...baseSummary(), topStates: undefined as unknown as MarketSummarySection['topStates'] };
    const snap = buildSummarySnapshot({
      segment: 'glamping',
      scope: 'national',
      addressLine: '',
      radiusMiles: 0,
      adrMin: null,
      adrMax: null,
      summary,
    });
    expect(snap.top_states).toEqual([]);
    expect(snap.sources).toEqual([]);
  });
});
