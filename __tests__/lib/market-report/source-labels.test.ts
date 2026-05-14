import { marketReportFetchTableDisplayName, marketReportQueriedSources, marketReportSourceLabel } from '@/lib/market-report/source-labels';

describe('marketReportSourceLabel', () => {
  it('maps internal table keys to product names', () => {
    expect(marketReportSourceLabel('all_glamping_properties')).toBe('Sage');
    expect(marketReportSourceLabel('all_roverpass_data_new')).toBe('RoverPass');
    expect(marketReportSourceLabel('campspot')).toBe('Campspot');
    expect(marketReportSourceLabel('hipcamp')).toBe('Hipcamp');
  });
});

describe('marketReportQueriedSources', () => {
  it('lists Sage + Hipcamp for glamping (Campspot is RV-only and is excluded)', () => {
    expect(marketReportQueriedSources('glamping', true)).toEqual(['Sage', 'Hipcamp']);
    expect(marketReportQueriedSources('glamping', false)).toEqual(['Sage', 'Hipcamp']);
  });

  it('lists RoverPass and Campspot for RV when a US state is known', () => {
    expect(marketReportQueriedSources('rv_resort', true)).toEqual(['RoverPass', 'Campspot']);
    expect(marketReportQueriedSources('rv_resort', false)).toEqual(['RoverPass']);
  });
});

describe('marketReportFetchTableDisplayName', () => {
  it('maps fetch meta table ids', () => {
    expect(marketReportFetchTableDisplayName('all_glamping_properties')).toBe('Sage');
    expect(marketReportFetchTableDisplayName('campspot')).toBe('Campspot');
    expect(marketReportFetchTableDisplayName('hipcamp')).toBe('Hipcamp');
  });
});
