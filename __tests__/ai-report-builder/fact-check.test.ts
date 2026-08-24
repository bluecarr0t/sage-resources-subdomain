/**
 * Fact-check unit tests (acres decimals, ADR context, population phrasing).
 */

import { factCheckExecutiveSummary, factCheckNarrative } from '@/lib/ai-report-builder/fact-check';
import type { EnrichedInput } from '@/lib/ai-report-builder/types';

const base: EnrichedInput = {
  property_name: 'Test',
  city: 'Austin',
  state: 'TX',
  acres: 43.86,
  unit_mix: [],
  benchmarks: [{ unit_category: 'cabin', avg_low_adr: 150, avg_peak_adr: 280, sample_count: 10 }],
  population_2020: 29_145_505,
};

describe('factCheckExecutiveSummary', () => {
  it('does not flag correct decimal acreage', () => {
    const r = factCheckExecutiveSummary(
      'The property comprises approximately 43.86 acres near Austin.',
      base
    );
    expect(r.passed).toBe(true);
  });

  it('flags wrong acreage without mangling decimals into integers', () => {
    const r = factCheckExecutiveSummary(
      'The property comprises approximately 90 acres near Austin.',
      base
    );
    expect(r.passed).toBe(false);
    expect(r.flags[0].expected).toContain('43.86');
  });

  it('does not treat large project costs as ADR mismatches', () => {
    const r = factCheckExecutiveSummary(
      'Total development cost is estimated at $14,440,166. ADR is projected at $200.',
      base
    );
    // $200 is within benchmark range; $14M should not flag as ADR
    expect(r.flags.every((f) => !String(f.claim).includes('14440166'))).toBe(true);
  });
});

describe('factCheckNarrative', () => {
  it('flags a SWOT snippet that invents the wrong city and state', () => {
    const r = factCheckNarrative(
      'Strength: The site is in Denver, CO with strong weekend demand from ski traffic.',
      base
    );
    expect(r.passed).toBe(false);
    expect(r.flags.some((f) => f.claim.includes('Denver') && String(f.expected).includes('Austin'))).toBe(
      true
    );
  });
});
