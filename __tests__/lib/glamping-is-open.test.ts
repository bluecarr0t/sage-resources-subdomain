import {
  bucketGlampingIsOpenForMetrics,
  excludeClosedGlampingRows,
  isGlampingCancelledIsOpenStatus,
  isGlampingClosedIsOpenStatus,
  isGlampingOperatingForAnalytics,
} from '@/lib/glamping-is-open';

describe('isGlampingClosedIsOpenStatus', () => {
  it('treats Closed and legacy No as closed', () => {
    expect(isGlampingClosedIsOpenStatus('Closed')).toBe(true);
    expect(isGlampingClosedIsOpenStatus('No')).toBe(true);
  });

  it('allows operating and pre-opening statuses', () => {
    expect(isGlampingClosedIsOpenStatus('Yes')).toBe(false);
    expect(isGlampingClosedIsOpenStatus('Temporarily closed')).toBe(false);
    expect(isGlampingClosedIsOpenStatus(null)).toBe(false);
    expect(isGlampingClosedIsOpenStatus(undefined)).toBe(false);
  });
});

describe('isGlampingCancelledIsOpenStatus', () => {
  it('treats Cancelled and US spelling canceled as cancelled pipeline outcomes', () => {
    expect(isGlampingCancelledIsOpenStatus('Cancelled')).toBe(true);
    expect(isGlampingCancelledIsOpenStatus('canceled')).toBe(true);
    expect(isGlampingCancelledIsOpenStatus('Closed')).toBe(false);
  });
});

describe('bucketGlampingIsOpenForMetrics', () => {
  it('buckets Cancelled separately from Closed', () => {
    expect(bucketGlampingIsOpenForMetrics('Cancelled')).toBe('cancelled');
    expect(bucketGlampingIsOpenForMetrics('Closed')).toBe('closed');
  });
});

describe('isGlampingOperatingForAnalytics', () => {
  it('excludes Cancelled pipeline projects', () => {
    expect(isGlampingOperatingForAnalytics('Cancelled')).toBe(false);
  });
});

describe('excludeClosedGlampingRows', () => {
  it('removes closed and cancelled rows', () => {
    const rows = [
      { property_name: 'Open Camp', is_open: 'Yes' },
      { property_name: 'Closed Camp', is_open: 'Closed' },
      { property_name: 'Shelved Camp', is_open: 'Cancelled' },
    ];
    expect(excludeClosedGlampingRows(rows)).toEqual([
      { property_name: 'Open Camp', is_open: 'Yes' },
    ]);
  });
});
