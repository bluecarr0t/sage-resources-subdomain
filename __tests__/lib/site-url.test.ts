import { buildLocalePropertyPath, buildLocalePropertyUrl, getResourcesSiteOrigin } from '@/lib/site-url';

describe('site-url', () => {
  it('builds property path and absolute URL', () => {
    expect(buildLocalePropertyPath('en', 'kitfox')).toBe('/en/property/kitfox');
    expect(buildLocalePropertyUrl('en', 'kitfox')).toBe(
      `${getResourcesSiteOrigin()}/en/property/kitfox`
    );
  });
});
