import {
  RESOURCES_ATTRIBUTION,
  attributeRootDomainContactHrefsInHtml,
  getResourcesAttributionParamsFromUrl,
  getUtmContentFromUrl,
  isRootDomainContactUrl,
  normalizeResourcesUtmContent,
  resourcesContactUsUrl,
  withResourcesAttribution,
} from '@/lib/root-domain-attribution';

describe('normalizeResourcesUtmContent', () => {
  it('strips locale prefixes and normalizes paths', () => {
    expect(normalizeResourcesUtmContent('/en/guides/foo')).toBe('/guides/foo');
    expect(normalizeResourcesUtmContent('/de/landing/bar')).toBe('/landing/bar');
    expect(normalizeResourcesUtmContent('guides/foo')).toBe('/guides/foo');
    expect(normalizeResourcesUtmContent('/')).toBe('/');
  });

  it('drops query/hash and truncates long paths', () => {
    expect(normalizeResourcesUtmContent('/guides/foo?x=1#y')).toBe('/guides/foo');
    const long = `/guides/${'a'.repeat(200)}`;
    expect(normalizeResourcesUtmContent(long).length).toBe(120);
  });
});

describe('isRootDomainContactUrl', () => {
  it('matches contact-us variants on the root domain', () => {
    expect(isRootDomainContactUrl('https://sageoutdooradvisory.com/contact-us')).toBe(true);
    expect(isRootDomainContactUrl('https://sageoutdooradvisory.com/contact-us/')).toBe(true);
    expect(isRootDomainContactUrl('https://www.sageoutdooradvisory.com/contact-us-2/')).toBe(
      true
    );
  });

  it('rejects non-contact and non-root URLs', () => {
    expect(isRootDomainContactUrl('https://sageoutdooradvisory.com/shop/')).toBe(false);
    expect(isRootDomainContactUrl('https://resources.sageoutdooradvisory.com/contact-us/')).toBe(
      false
    );
    expect(isRootDomainContactUrl('/contact-us/')).toBe(false);
  });
});

describe('withResourcesAttribution', () => {
  it('tags contact URLs with resources UTMs', () => {
    const tagged = withResourcesAttribution(
      'https://sageoutdooradvisory.com/contact-us/',
      '/en/guides/feasibility'
    );
    const params = getResourcesAttributionParamsFromUrl(tagged);
    expect(params).toEqual({
      utm_source: RESOURCES_ATTRIBUTION.utm_source,
      utm_medium: RESOURCES_ATTRIBUTION.utm_medium,
      utm_campaign: RESOURCES_ATTRIBUTION.utm_campaign,
      utm_content: '/guides/feasibility',
    });
  });

  it('leaves non-contact URLs unchanged', () => {
    const url = 'https://sageoutdooradvisory.com/shop/';
    expect(withResourcesAttribution(url, '/guides/foo')).toBe(url);
  });

  it('preserves unrelated query params while overwriting utm_*', () => {
    const tagged = withResourcesAttribution(
      'https://sageoutdooradvisory.com/contact-us/?ref=nav&utm_source=old',
      '/partners'
    );
    const url = new URL(tagged);
    expect(url.searchParams.get('ref')).toBe('nav');
    expect(url.searchParams.get('utm_source')).toBe(RESOURCES_ATTRIBUTION.utm_source);
    expect(url.searchParams.get('utm_content')).toBe('/partners');
  });
});

describe('resourcesContactUsUrl', () => {
  it('returns the canonical attributed contact URL', () => {
    expect(resourcesContactUsUrl('/glossary/glamping')).toContain(
      'utm_content=%2Fglossary%2Fglamping'
    );
  });
});

describe('attributeRootDomainContactHrefsInHtml', () => {
  it('rewrites double- and single-quoted contact hrefs', () => {
    const html = `
      <a href="https://sageoutdooradvisory.com/contact-us/">A</a>
      <a href='https://sageoutdooradvisory.com/contact-us/'>B</a>
      <a href="https://sageoutdooradvisory.com/shop/">C</a>
    `;
    const out = attributeRootDomainContactHrefsInHtml(html, '/landing/glamping');
    expect(out).toContain('utm_source=resources_subdomain');
    expect(out).toContain('utm_content=%2Flanding%2Fglamping');
    expect(out).toContain('https://sageoutdooradvisory.com/shop/');
    expect(out.match(/utm_source=resources_subdomain/g)?.length).toBe(2);
  });
});

describe('getUtmContentFromUrl', () => {
  it('reads utm_content from attributed URLs', () => {
    const url = resourcesContactUsUrl('/map');
    expect(getUtmContentFromUrl(url)).toBe('/map');
    expect(getUtmContentFromUrl('https://example.com')).toBeNull();
  });
});
