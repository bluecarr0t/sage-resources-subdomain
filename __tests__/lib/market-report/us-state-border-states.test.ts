import { anchorUsStatesForRegionalDemandFetch } from '@/lib/market-report/us-state-border-states';

describe('anchorUsStatesForRegionalDemandFetch', () => {
  it('includes Oregon and neighboring states for OR anchor', () => {
    const s = anchorUsStatesForRegionalDemandFetch('OR');
    expect(s).not.toBeNull();
    expect(s).toContain('OR');
    expect(s).toContain('WA');
    expect(s).toContain('CA');
    expect(s).toContain('ID');
    expect(s).toContain('NV');
  });

  it('returns null for unknown codes', () => {
    expect(anchorUsStatesForRegionalDemandFetch('XX')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(anchorUsStatesForRegionalDemandFetch('')).toBeNull();
    expect(anchorUsStatesForRegionalDemandFetch(null)).toBeNull();
  });
});
