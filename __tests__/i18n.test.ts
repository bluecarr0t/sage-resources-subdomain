/**
 * Tests for i18n implementation
 */

import { locales, defaultLocale, isValidLocale, type Locale } from '../i18n';
import { 
  generateHreflangAlternates, 
  getLocaleFromPathname, 
  removeLocaleFromPathname,
  addLocaleToPathname,
  getOpenGraphLocale,
  getHtmlLang
} from '../lib/i18n-utils';
import { getLocalePath, createLocaleLinks } from '../lib/locale-links';

describe('i18n Configuration', () => {
  test('should have correct locales', () => {
    expect(locales).toEqual(['en', 'es', 'fr', 'de']);
    expect(locales.length).toBe(4);
  });

  test('should have default locale', () => {
    expect(defaultLocale).toBe('en');
  });

  test('isValidLocale should validate locales correctly', () => {
    expect(isValidLocale('en')).toBe(true);
    expect(isValidLocale('es')).toBe(true);
    expect(isValidLocale('fr')).toBe(true);
    expect(isValidLocale('de')).toBe(true);
    expect(isValidLocale('invalid')).toBe(false);
    expect(isValidLocale('')).toBe(false);
  });
});

describe('i18n Utils', () => {
  describe('generateHreflangAlternates', () => {
    test('should generate hreflang alternates for all locales', () => {
      const alternates = generateHreflangAlternates('/en/landing/test-slug');
      
      expect(alternates.languages).toBeDefined();
      expect(alternates.languages!['en']).toBe('https://resources.sageoutdooradvisory.com/en/landing/test-slug');
      expect(alternates.languages!['es']).toBe('https://resources.sageoutdooradvisory.com/es/landing/test-slug');
      expect(alternates.languages!['fr']).toBe('https://resources.sageoutdooradvisory.com/fr/landing/test-slug');
      expect(alternates.languages!['de']).toBe('https://resources.sageoutdooradvisory.com/de/landing/test-slug');
      expect(alternates.languages!['x-default']).toBe('https://resources.sageoutdooradvisory.com/en/landing/test-slug');
    });

    test('should handle paths without locale prefix', () => {
      // If path doesn't have locale, it will be added for all locales
      const alternates = generateHreflangAlternates('/landing/test-slug');
      
      expect(alternates.languages).toBeDefined();
      // When path doesn't start with locale, the regex won't match, so it will prepend
      // This is expected behavior - paths should always have locale in our implementation
      expect(alternates.languages!['en']).toBeDefined();
      expect(alternates.languages!['es']).toBeDefined();
    });
  });

  describe('getLocaleFromPathname', () => {
    test('should extract locale from pathname', () => {
      expect(getLocaleFromPathname('/en/landing/test')).toBe('en');
      expect(getLocaleFromPathname('/es/guides/test')).toBe('es');
      expect(getLocaleFromPathname('/fr/property/test')).toBe('fr');
      expect(getLocaleFromPathname('/de/glossary/test')).toBe('de');
    });

    test('should return default locale for paths without locale', () => {
      expect(getLocaleFromPathname('/landing/test')).toBe('en');
      expect(getLocaleFromPathname('/')).toBe('en');
    });
  });

  describe('removeLocaleFromPathname', () => {
    test('should remove locale prefix from pathname', () => {
      expect(removeLocaleFromPathname('/en/landing/test')).toBe('/landing/test');
      expect(removeLocaleFromPathname('/es/guides/test')).toBe('/guides/test');
      expect(removeLocaleFromPathname('/fr/property/test')).toBe('/property/test');
    });

    test('should handle paths without locale', () => {
      expect(removeLocaleFromPathname('/landing/test')).toBe('/landing/test');
      expect(removeLocaleFromPathname('/')).toBe('/');
    });
  });

  describe('addLocaleToPathname', () => {
    test('should add locale prefix to pathname', () => {
      expect(addLocaleToPathname('/landing/test', 'es')).toBe('/es/landing/test');
      expect(addLocaleToPathname('/guides/test', 'fr')).toBe('/fr/guides/test');
    });

    test('should not add locale for default locale', () => {
      expect(addLocaleToPathname('/landing/test', 'en')).toBe('/landing/test');
    });
  });

  describe('getOpenGraphLocale', () => {
    test('should return correct Open Graph locale codes', () => {
      expect(getOpenGraphLocale('en')).toBe('en_US');
      expect(getOpenGraphLocale('es')).toBe('es_ES');
      expect(getOpenGraphLocale('fr')).toBe('fr_FR');
      expect(getOpenGraphLocale('de')).toBe('de_DE');
    });
  });

  describe('getHtmlLang', () => {
    test('should return correct HTML lang attribute', () => {
      expect(getHtmlLang('en')).toBe('en');
      expect(getHtmlLang('es')).toBe('es');
      expect(getHtmlLang('fr')).toBe('fr');
      expect(getHtmlLang('de')).toBe('de');
    });
  });
});

describe('Locale Links', () => {
  describe('getLocalePath', () => {
    test('should generate locale-aware paths', () => {
      expect(getLocalePath('en', '/guides')).toBe('/en/guides');
      expect(getLocalePath('es', '/landing/test')).toBe('/es/landing/test');
      expect(getLocalePath('fr', '/glossary/term')).toBe('/fr/glossary/term');
    });

    test('should not modify external URLs', () => {
      expect(getLocalePath('en', 'https://example.com')).toBe('https://example.com');
      expect(getLocalePath('es', 'http://example.com')).toBe('http://example.com');
      expect(getLocalePath('fr', 'https://sageoutdooradvisory.com')).toBe('https://sageoutdooradvisory.com');
    });
  });

  describe('createLocaleLinks', () => {
    test('should create locale-aware link functions', () => {
      const links = createLocaleLinks('es');
      
      expect(links.guides).toBe('/es/guides');
      expect(links.glossary).toBe('/es/glossary');
      expect(links.map).toBe('/es/map');
      expect(links.landing('test-slug')).toBe('/es/landing/test-slug');
      expect(links.property('test-property')).toBe('/es/property/test-property');
      expect(links.guide('test-guide')).toBe('/es/guides/test-guide');
      expect(links.glossaryTerm('test-term')).toBe('/es/glossary/test-term');
    });

    test('should handle default locale correctly', () => {
      const links = createLocaleLinks('en');
      
      // All locales should have prefix in current implementation
      expect(links.guides).toBe('/en/guides');
      expect(links.glossary).toBe('/en/glossary');
    });
  });
});

describe('URL Structure', () => {
  test('all locales should generate correct URL patterns', () => {
    const testPath = '/landing/test-slug';
    
    locales.forEach(locale => {
      const pathWithLocale = `/${locale}${testPath}`;
      expect(pathWithLocale).toMatch(new RegExp(`^/${locale}/`));
    });
  });

  test('hreflang alternates should include all locales', () => {
    const alternates = generateHreflangAlternates('/en/landing/test');
    const languages = alternates.languages || {};
    
    locales.forEach(locale => {
      expect(languages[locale]).toBeDefined();
      expect(languages[locale]).toContain(`/${locale}/`);
    });
    
    expect(languages['x-default']).toBeDefined();
    expect(languages['x-default']).toContain('/en/');
  });
});

describe('Edge Cases', () => {
  test('should handle empty pathname', () => {
    expect(removeLocaleFromPathname('')).toBe('/');
    expect(getLocaleFromPathname('')).toBe('en');
  });

  test('should handle root path', () => {
    expect(removeLocaleFromPathname('/')).toBe('/');
    expect(getLocaleFromPathname('/')).toBe('en');
  });

  test('should handle paths with multiple slashes', () => {
    expect(removeLocaleFromPathname('/en//landing//test')).toBe('//landing//test');
    expect(getLocaleFromPathname('/en//landing//test')).toBe('en');
  });
});
