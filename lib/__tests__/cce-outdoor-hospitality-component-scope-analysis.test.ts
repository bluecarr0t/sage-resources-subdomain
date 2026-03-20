/**
 * Analyzes outdoor-hospitality component scope behavior and documents improvement targets.
 * Run: npx jest lib/__tests__/cce-outdoor-hospitality-component-scope-analysis.test.ts
 */

import {
  rowPassesOutdoorHospitalityComponentScope,
  rowPassesOutdoorHospitalityComponentScopeStrict,
  COMPONENT_SCOPE_SUSPICIOUS_KEYWORDS,
} from '@/lib/cce-outdoor-hospitality-scope';

/** Representative rows from Marshall & Swift–style extraction (section / item shapes). */
const FIXTURE_ROWS: { section_name: string | null; item_name: string | null }[] = [
  { section_name: 'AERATORS', item_name: 'Single phase pump, 1/2 HP' },
  { section_name: 'AND PUBLIC BUILDINGS', item_name: 'police stations.' },
  { section_name: 'WALL COSTS', item_name: 'Concrete block, 8"' },
  { section_name: 'DOORS', item_name: 'Hollow metal, single' },
  { section_name: 'AIR TERMINAL UNITS', item_name: '1,500' },
  { section_name: 'ROOFING', item_name: 'Asphalt shingles' },
  { section_name: 'SEGREGATED COST METHOD', item_name: 'Add for skylight' },
  { section_name: null, item_name: 'Orphan item' },
  { section_name: 'FLOOR FINISHES', item_name: null },
  {
    section_name: 'WASTEWATER TREATMENT',
    item_name: 'Primary clarifier, 50 MG',
  },
  {
    section_name: 'MECHANICAL',
    item_name: 'Cooling tower, induced draft',
  },
];

describe('rowPassesOutdoorHospitalityComponentScope', () => {
  it('excludes known off-scope sections from user reports', () => {
    expect(
      rowPassesOutdoorHospitalityComponentScope('AERATORS', 'Single phase pump, 1/2 HP')
    ).toBe(false);
    expect(
      rowPassesOutdoorHospitalityComponentScope('AND PUBLIC BUILDINGS', 'police stations.')
    ).toBe(false);
    expect(rowPassesOutdoorHospitalityComponentScope('AIR TERMINAL UNITS', '1,000')).toBe(
      false
    );
  });

  it('keeps typical shell / finish sections', () => {
    expect(
      rowPassesOutdoorHospitalityComponentScope('WALL COSTS', 'Concrete block, 8"')
    ).toBe(true);
    expect(
      rowPassesOutdoorHospitalityComponentScope('DOORS', 'Hollow metal, single')
    ).toBe(true);
    expect(
      rowPassesOutdoorHospitalityComponentScope('ROOFING', 'Asphalt shingles')
    ).toBe(true);
  });

  it('excludes rows with null section or null item (matches PostgREST chained .not ilike)', () => {
    expect(rowPassesOutdoorHospitalityComponentScope(null, 'x')).toBe(false);
    expect(rowPassesOutdoorHospitalityComponentScope('', 'x')).toBe(false);
    expect(rowPassesOutdoorHospitalityComponentScope('FLOOR FINISHES', null)).toBe(false);
    expect(rowPassesOutdoorHospitalityComponentScope('FLOOR FINISHES', '')).toBe(false);
  });

  it('excludes utilities, segregated index, wastewater, and cooling-tower item lines', () => {
    expect(
      rowPassesOutdoorHospitalityComponentScope('SEGREGATED COST METHOD', 'Add for skylight')
    ).toBe(false);
    expect(
      rowPassesOutdoorHospitalityComponentScope('WASTEWATER TREATMENT', 'Primary clarifier')
    ).toBe(false);
    expect(
      rowPassesOutdoorHospitalityComponentScope('MECHANICAL', 'Cooling tower, induced draft')
    ).toBe(false);
  });
});

describe('rowPassesOutdoorHospitalityComponentScopeStrict', () => {
  it('requires allowlist match on section after standard filters', () => {
    expect(
      rowPassesOutdoorHospitalityComponentScopeStrict('WALL COSTS', 'Concrete block')
    ).toBe(true);
    expect(
      rowPassesOutdoorHospitalityComponentScopeStrict('MECHANICAL', 'Small exhaust fan')
    ).toBe(false);
  });
});

describe('outdoor hospitality component scope — aggregate analysis on fixtures', () => {
  it('reports pass rate and flags suspicious keywords in passing rows', () => {
    const passing = FIXTURE_ROWS.filter((r) =>
      rowPassesOutdoorHospitalityComponentScope(r.section_name, r.item_name)
    );
    const failing = FIXTURE_ROWS.length - passing.length;

    const suspiciousHits = passing.filter((r) => {
      const blob = `${r.section_name ?? ''} ${r.item_name ?? ''}`.toUpperCase();
      return COMPONENT_SCOPE_SUSPICIOUS_KEYWORDS.some((k) => blob.includes(k));
    });

    expect(passing.length).toBe(3);
    expect(failing).toBe(8);
    expect(suspiciousHits.length).toBe(0);

    // eslint-disable-next-line no-console
    console.log('[component scope analysis — fixture sample]', {
      total: FIXTURE_ROWS.length,
      inScope: passing.length,
      excluded: failing,
      suspiciousInScope: suspiciousHits.map((r) => ({
        section: r.section_name,
        item: r.item_name?.slice(0, 80),
      })),
    });
  });
});
