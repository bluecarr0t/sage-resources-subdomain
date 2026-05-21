import {
  appendPreservedMapViewParams,
  getMapEmbedParam,
  getMapLayerParam,
  isMapClientWorkOnlyLayer,
  isMapEmbedMode,
} from '@/lib/map-embed-mode';

describe('map-embed-mode', () => {
  it('detects embed=1', () => {
    expect(isMapEmbedMode({ embed: '1' })).toBe(true);
  });

  it('detects embed=true and embed=yes', () => {
    expect(isMapEmbedMode({ embed: 'true' })).toBe(true);
    expect(isMapEmbedMode({ embed: 'yes' })).toBe(true);
  });

  it('rejects missing or invalid embed values', () => {
    expect(isMapEmbedMode(undefined)).toBe(false);
    expect(isMapEmbedMode({})).toBe(false);
    expect(isMapEmbedMode({ embed: '0' })).toBe(false);
    expect(isMapEmbedMode({ embed: 'false' })).toBe(false);
  });

  it('reads first value when embed is an array', () => {
    expect(getMapEmbedParam({ embed: ['1', '0'] })).toBe('1');
    expect(isMapEmbedMode({ embed: ['1', '0'] })).toBe(true);
  });

  it('detects layer=client-work', () => {
    expect(isMapClientWorkOnlyLayer({ layer: 'client-work' })).toBe(true);
    expect(isMapClientWorkOnlyLayer({ layer: 'client_work' })).toBe(true);
    expect(isMapClientWorkOnlyLayer({ layer: 'glamping' })).toBe(false);
  });

  it('reads first value when layer is an array', () => {
    expect(getMapLayerParam({ layer: ['client-work', 'other'] })).toBe('client-work');
  });

  it('copies embed and layer into URLSearchParams for filter sync', () => {
    const source = new URLSearchParams('embed=1&layer=client-work&state=CA');
    const target = new URLSearchParams('state=CA');
    appendPreservedMapViewParams(target, source);
    expect(target.get('embed')).toBe('1');
    expect(target.get('layer')).toBe('client-work');
    expect(target.get('state')).toBe('CA');
  });
});
