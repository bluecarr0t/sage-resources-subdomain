/**
 * Tests for i18n metadata generation
 */

import { generateHreflangAlternates, getOpenGraphLocale } from '../lib/i18n-utils';
import { locales } from '../i18n';

describe('Metadata Generation', () => {
  describe('Hreflang Tags', () => {
    test('should include all supported locales', () => {
      const alternates = generateHreflangAlternates('/en/landing/test');
      const languages = alternates.languages || {};
      
      locales.forEach(locale => {
        expect(languages[locale]).toBeDefined();
        expect(typeof languages[locale]).toBe('string');
        expect(languages[locale]).toContain('https://');
      });
    });

    test('should include x-default', () => {
      const alternates = generateHreflangAlternates('/en/landing/test');
      const languages = alternates.languages || {};
      
      expect(languages['x-default']).toBeDefined();
      expect(languages['x-default']).toContain('/en/');
    });

    test('should use correct base URL', () => {
      const alternates = generateHreflangAlternates('/en/landing/test');
      const languages = alternates.languages || {};
      
      Object.values(languages).forEach(url => {
        expect(url).toContain('resources.sageoutdooradvisory.com');
      });
    });

    test('should maintain path structure across locales', () => {
      const testPath = '/en/landing/glamping-feasibility-study';
      const alternates = generateHreflangAlternates(testPath);
      const languages = alternates.languages || {};
      
      locales.forEach(locale => {
        const url = languages[locale];
        expect(url).toContain('/landing/glamping-feasibility-study');
        expect(url).toContain(`/${locale}/`);
      });
    });
  });

  describe('Open Graph Locale', () => {
    test('should return correct locale codes for all locales', () => {
      const expected = {
        en: 'en_US',
        es: 'es_ES',
        fr: 'fr_FR',
        de: 'de_DE',
      };

      locales.forEach(locale => {
        expect(getOpenGraphLocale(locale)).toBe(expected[locale]);
      });
    });

    test('should return locale codes in correct format', () => {
      locales.forEach(locale => {
        const ogLocale = getOpenGraphLocale(locale);
        expect(ogLocale).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
      });
    });
  });

  describe('Canonical URLs', () => {
    test('should generate correct canonical URLs', () => {
      const testCases = [
        { path: '/en/landing/test', expected: '/en/landing/test' },
        { path: '/es/property/test', expected: '/es/property/test' },
        { path: '/fr/guides/test', expected: '/fr/guides/test' },
      ];

      testCases.forEach(({ path, expected }) => {
        const alternates = generateHreflangAlternates(path);
        // Canonical is set separately in metadata, but hreflang should match path
        expect(alternates.languages?.[path.split('/')[1]]).toContain(expected);
      });
    });
  });
});

describe('SEO Requirements', () => {
  test('all locales should have hreflang tags', () => {
    const alternates = generateHreflangAlternates('/en/landing/test');
    const languages = alternates.languages || {};
    
    // Should have 4 locales + x-default = 5 total
    expect(Object.keys(languages).length).toBe(5);
  });

  test('hreflang URLs should be absolute', () => {
    const alternates = generateHreflangAlternates('/en/landing/test');
    const languages = alternates.languages || {};
    
    Object.values(languages).forEach(url => {
      expect(url).toMatch(/^https:\/\//);
    });
  });

  test('hreflang URLs should be unique', () => {
    const alternates = generateHreflangAlternates('/en/landing/test');
    const languages = alternates.languages || {};
    const urls = Object.values(languages);
    
    const uniqueUrls = new Set(urls);
    // x-default may point to the same URL as the default locale, which is valid
    // So we check that we have at least 4 unique URLs (one per locale)
    expect(uniqueUrls.size).toBeGreaterThanOrEqual(4);
    // And that we have exactly 5 entries (4 locales + x-default)
    expect(urls.length).toBe(5);
  });
});
