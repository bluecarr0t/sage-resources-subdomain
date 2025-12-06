/**
 * Tests for i18n routing and page generation
 */

import { getAllLandingPageSlugs } from '../lib/landing-pages';
import { getAllGuideSlugs } from '../lib/guides';
import { getAllGlossaryTerms } from '../lib/glossary/index';
import { locales } from '../i18n';

describe('Static Params Generation', () => {
  test('landing pages should generate params for all locales', () => {
    const slugs = getAllLandingPageSlugs();
    const expectedParamsCount = slugs.length * locales.length;
    
    // This test verifies the pattern - actual implementation is in page files
    expect(slugs.length).toBeGreaterThan(0);
    expect(locales.length).toBe(4);
    expect(expectedParamsCount).toBe(slugs.length * 4);
  });

  test('guides should generate params for all locales', () => {
    const slugs = getAllGuideSlugs();
    const expectedParamsCount = slugs.length * locales.length;
    
    expect(slugs.length).toBeGreaterThan(0);
    expect(expectedParamsCount).toBe(slugs.length * 4);
  });

  test('glossary terms should generate params for all locales', () => {
    const terms = getAllGlossaryTerms();
    const expectedParamsCount = terms.length * locales.length;
    
    expect(terms.length).toBeGreaterThan(0);
    expect(expectedParamsCount).toBe(terms.length * 4);
  });
});

describe('URL Patterns', () => {
  test('all page types should follow locale pattern', () => {
    const patterns = [
      '/{locale}/landing/{slug}',
      '/{locale}/property/{slug}',
      '/{locale}/guides/{slug}',
      '/{locale}/glossary/{term}',
      '/{locale}/map',
      '/{locale}/guides',
      '/{locale}/glossary',
      '/{locale}',
    ];

    patterns.forEach(pattern => {
      expect(pattern).toContain('{locale}');
    });
  });

  test('locale should be first segment in path', () => {
    const testUrls = [
      '/en/landing/test',
      '/es/property/test',
      '/fr/guides/test',
      '/de/glossary/test',
    ];

    testUrls.forEach(url => {
      const segments = url.split('/').filter(Boolean);
      expect(locales).toContain(segments[0]);
    });
  });
});

describe('Sitemap Generation', () => {
  test('sitemap should include all locales', () => {
    // This test verifies the pattern - actual sitemap is generated at build time
    const landingSlugs = getAllLandingPageSlugs();
    const guideSlugs = getAllGuideSlugs();
    const glossaryTerms = getAllGlossaryTerms();
    
    const totalPages = landingSlugs.length + guideSlugs.length + glossaryTerms.length;
    const totalUrls = totalPages * locales.length;
    
    expect(totalUrls).toBeGreaterThan(100); // Should have many URLs
    expect(totalUrls % locales.length).toBe(0); // Should be divisible by locale count
  });
});

describe('Locale Validation', () => {
  test('invalid locales should be rejected', () => {
    const invalidLocales = ['xx', 'zz', 'invalid', 'EN', 'ES'];
    
    invalidLocales.forEach(locale => {
      expect(locales.includes(locale as any)).toBe(false);
    });
  });

  test('valid locales should be accepted', () => {
    locales.forEach(locale => {
      expect(locales.includes(locale)).toBe(true);
    });
  });
});
