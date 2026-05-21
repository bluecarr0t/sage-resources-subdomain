import {
  classifySeoPageSection,
  extractSeoContentSlug,
  stripLocaleFromPathname,
} from '@/lib/seo-page-section';

describe('stripLocaleFromPathname', () => {
  it('removes locale prefix', () => {
    expect(stripLocaleFromPathname('/en/map')).toBe('/map');
    expect(stripLocaleFromPathname('/es/landing/glamping-feasibility-study')).toBe(
      '/landing/glamping-feasibility-study'
    );
  });

  it('leaves non-locale paths unchanged', () => {
    expect(stripLocaleFromPathname('/glamping-market-overview')).toBe(
      '/glamping-market-overview'
    );
  });
});

describe('classifySeoPageSection', () => {
  it('classifies core sections', () => {
    expect(classifySeoPageSection('/en')).toBe('home');
    expect(classifySeoPageSection('/en/map')).toBe('map');
    expect(classifySeoPageSection('/en/map/texas')).toBe('map_location');
    expect(classifySeoPageSection('/en/landing/glamping-feasibility-study')).toBe('landing');
    expect(classifySeoPageSection('/en/guides/feasibility-studies-complete-guide')).toBe('guides');
    expect(classifySeoPageSection('/en/glossary/adr')).toBe('glossary');
    expect(classifySeoPageSection('/en/property/some-resort')).toBe('property');
    expect(classifySeoPageSection('/en/brand/under-canvas')).toBe('brand');
    expect(classifySeoPageSection('/en/glamping/yurts')).toBe('glamping_hub');
    expect(classifySeoPageSection('/glamping-market-overview')).toBe('market_overview');
  });
});

describe('extractSeoContentSlug', () => {
  it('extracts slugs from content paths', () => {
    expect(extractSeoContentSlug('/en/landing/glamping-feasibility-study-texas')).toBe(
      'glamping-feasibility-study-texas'
    );
    expect(extractSeoContentSlug('/en/property/eureka-springs')).toBe('eureka-springs');
  });
});
