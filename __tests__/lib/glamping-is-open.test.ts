import {
  excludeClosedGlampingRows,
  isGlampingClosedIsOpenStatus,
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

describe('excludeClosedGlampingRows', () => {
  it('removes closed rows only', () => {
    const rows = [
      { property_name: 'Open Camp', is_open: 'Yes' },
      { property_name: 'Closed Camp', is_open: 'Closed' },
    ];
    expect(excludeClosedGlampingRows(rows)).toEqual([{ property_name: 'Open Camp', is_open: 'Yes' }]);
  });
});
