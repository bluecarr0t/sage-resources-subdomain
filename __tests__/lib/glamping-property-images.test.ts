import {
  buildGlampingPropertyImagePath,
  extensionForMime,
  isAllowedGlampingPropertyImageMime,
  parseGlampingPropertyImageKind,
} from '@/lib/glamping-property-images';

describe('glamping-property-images helpers', () => {
  it('validates allowed mime types', () => {
    expect(isAllowedGlampingPropertyImageMime('image/jpeg')).toBe(true);
    expect(isAllowedGlampingPropertyImageMime('IMAGE/PNG')).toBe(true);
    expect(isAllowedGlampingPropertyImageMime('application/pdf')).toBe(false);
  });

  it('maps mime to extension', () => {
    expect(extensionForMime('image/jpeg')).toBe('jpg');
    expect(extensionForMime('image/webp')).toBe('webp');
  });

  it('parses image kind', () => {
    expect(parseGlampingPropertyImageKind('hero')).toBe('hero');
    expect(parseGlampingPropertyImageKind('  GALLERY ')).toBe('gallery');
    expect(parseGlampingPropertyImageKind('nope')).toBeNull();
  });

  it('builds storage path with property segment and extension', () => {
    const path = buildGlampingPropertyImagePath(42, 'gallery', 'image/png');
    expect(path.startsWith('42/gallery/')).toBe(true);
    expect(path.endsWith('.png')).toBe(true);
    expect(path.split('/').length).toBeGreaterThanOrEqual(3);
  });
});
