import {
  marketReportUrlStateDefaults,
  parseMarketReportUrlState,
  serializeMarketReportUrlState,
  shouldAutoRunFromUrlState,
  urlHasStudyParams,
} from '@/lib/admin/market-report-url-state';

describe('market-report-url-state', () => {
  it('parses local address and radius', () => {
    const q = new URLSearchParams();
    q.set('address', 'Lake Geneva, WI');
    q.set('radius', '75');
    q.set('segment', 'glamping');
    q.set('scope', 'local');
    const state = parseMarketReportUrlState(q);
    expect(state.addressLine).toBe('Lake Geneva, WI');
    expect(state.radiusMiles).toBe(75);
    expect(state.segment).toBe('glamping');
  });

  it('serializes address without double-encoding', () => {
    const state = {
      ...marketReportUrlStateDefaults,
      addressLine: 'Lake Geneva, WI',
      radiusMiles: 75,
    };
    const out = serializeMarketReportUrlState(state);
    expect(out.get('address')).toBe('Lake Geneva, WI');
  });

  it('urlHasStudyParams detects known keys', () => {
    expect(urlHasStudyParams(new URLSearchParams())).toBe(false);
    const q = new URLSearchParams();
    q.set('radius', '50');
    expect(urlHasStudyParams(q)).toBe(true);
  });

  it('shouldAutoRunFromUrlState for national scope', () => {
    expect(
      shouldAutoRunFromUrlState({
        ...marketReportUrlStateDefaults,
        scope: 'national',
        addressLine: '',
      }),
    ).toBe(true);
  });

  it('shouldAutoRunFromUrlState requires address for local', () => {
    expect(
      shouldAutoRunFromUrlState({
        ...marketReportUrlStateDefaults,
        scope: 'local',
        addressLine: '   ',
      }),
    ).toBe(false);
    expect(
      shouldAutoRunFromUrlState({
        ...marketReportUrlStateDefaults,
        scope: 'local',
        addressLine: 'Bend, OR',
      }),
    ).toBe(true);
  });
});
