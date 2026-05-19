import {
  GLAMPING_MARKET_SNAPSHOT_CA_PROVINCE_SELECT,
  GLAMPING_MARKET_SNAPSHOT_US_STATE_SELECT,
} from '@/lib/glamping-market-snapshot-row-select';

describe('glamping market snapshot row select', () => {
  it('includes unit_type so regional aggregates can exclude RV/tent inventory', () => {
    expect(GLAMPING_MARKET_SNAPSHOT_US_STATE_SELECT).toContain('unit_type');
    expect(GLAMPING_MARKET_SNAPSHOT_CA_PROVINCE_SELECT).toContain('unit_type');
  });
});
