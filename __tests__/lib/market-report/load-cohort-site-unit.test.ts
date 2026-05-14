import type { DedupedCohortRow } from '@/lib/market-report/dedupe';
import {
  applyMinSiteUnitCountFilter,
  cohortSiteUnitMetric,
} from '@/lib/market-report/load-cohort';

function row(
  property_total_sites: number | null,
  quantity_of_units: number | null,
): DedupedCohortRow {
  return { property_total_sites, quantity_of_units } as DedupedCohortRow;
}

describe('cohort site/unit metric and min filter', () => {
  it('glamping prefers quantity_of_units over property_total_sites', () => {
    expect(cohortSiteUnitMetric(row(100, 5), 'glamping')).toBe(5);
  });

  it('rv_resort prefers property_total_sites over quantity_of_units', () => {
    expect(cohortSiteUnitMetric(row(20, 99), 'rv_resort')).toBe(20);
  });

  it('applyMinSiteUnitCountFilter is a no-op when minCount is 0', () => {
    const rows = [row(1, null), row(null, 2)];
    expect(applyMinSiteUnitCountFilter(rows, 'glamping', 0)).toEqual(rows);
  });

  it('applyMinSiteUnitCountFilter drops rows below threshold', () => {
    const rows = [row(null, 10), row(null, 2)];
    const out = applyMinSiteUnitCountFilter(rows, 'glamping', 5);
    expect(out).toHaveLength(1);
    expect(cohortSiteUnitMetric(out[0], 'glamping')).toBe(10);
  });
});
