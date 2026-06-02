import { applyUnifiedBaseFilters } from '@/lib/comps-unified/apply-filters';
import type { UnifiedFilterOptions } from '@/lib/comps-unified/apply-filters';

function mockQuery() {
  const calls: { method: string; args: unknown[] }[] = [];
  const q: Record<string, unknown> = {};
  for (const method of ['in', 'or', 'eq']) {
    q[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return q;
    };
  }
  return { q, calls };
}

const baseOpts: UnifiedFilterOptions = {
  sources: ['reports', 'all_glamping_properties'],
  expandedStateValues: ['TX'],
  expandedCountryValues: ['USA'],
  unitCategories: [],
  propertyTypes: ['Glamping'],
  isGlampingProperty: ['Yes'],
  sageResearchStatus: 'published',
  exemptReportsFromPropertyTypeFilter: true,
  openStatuses: [],
  keywordFilters: [],
  parsedMinAdr: null,
  parsedMaxAdr: null,
  searchTerms: [],
};

describe('applyUnifiedBaseFilters — reports property_type exempt', () => {
  it('uses OR filter so Past Reports bypass property_type when cohort exempt is set', () => {
    const { q, calls } = mockQuery();
    applyUnifiedBaseFilters(q, baseOpts);
    expect(calls.some((c) => c.method === 'or' && c.args[0] === 'source.eq.reports,property_type.eq.Glamping')).toBe(
      true
    );
    expect(calls.some((c) => c.method === 'in' && c.args[0] === 'property_type')).toBe(false);
  });

  it('uses strict property_type IN when exempt flag is off', () => {
    const { q, calls } = mockQuery();
    applyUnifiedBaseFilters(q, { ...baseOpts, exemptReportsFromPropertyTypeFilter: false });
    expect(calls.some((c) => c.method === 'in' && c.args[0] === 'property_type')).toBe(true);
    expect(calls.some((c) => c.method === 'or')).toBe(false);
  });
});
