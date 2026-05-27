import { mapMarkerPropertySyncKey } from '@/components/map/utils/mapMarkerSyncKey';

describe('mapMarkerPropertySyncKey', () => {
  it('is order-independent', () => {
    const a = [{ id: 2 }, { id: 10 }, { id: 1 }];
    const b = [{ id: 1 }, { id: 2 }, { id: 10 }];
    expect(mapMarkerPropertySyncKey(a)).toBe(mapMarkerPropertySyncKey(b));
  });

  it('changes when ids change', () => {
    const one = [{ id: 1 }, { id: 2 }];
    const two = [{ id: 1 }, { id: 3 }];
    expect(mapMarkerPropertySyncKey(one)).not.toBe(mapMarkerPropertySyncKey(two));
  });

  it('returns empty string for no properties', () => {
    expect(mapMarkerPropertySyncKey([])).toBe('');
  });
});
