import {
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
});
