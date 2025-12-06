import { locales, defaultLocale, type Locale } from '@/i18n';
import { Metadata } from 'next';

/**
 * Generate hreflang alternates for all language versions of a page
 * This is critical for SEO - tells Google which language version to show users
 */
export function generateHreflangAlternates(
  pathname: string,
  baseUrl: string = 'https://resources.sageoutdooradvisory.com'
): Metadata['alternates'] {
  const alternates: Metadata['alternates'] = {
    languages: {},
  };

  // Generate alternate URLs for each locale
  // Since we use localePrefix: 'always', all locales should have prefixes
  locales.forEach((locale) => {
    // Replace the locale in the pathname with the target locale
    const localePath = pathname.replace(/^\/[a-z]{2}(\/|$)/, `/${locale}$1`);
    
    alternates.languages![locale] = `${baseUrl}${localePath}`;
  });

  // Add x-default (fallback to default locale)
  // x-default should point to the default locale version
  const defaultPath = pathname.replace(/^\/[a-z]{2}(\/|$)/, `/${defaultLocale}$1`);
  alternates.languages!['x-default'] = `${baseUrl}${defaultPath}`;

  return alternates;
}

/**
 * Get the current locale from a pathname
 */
export function getLocaleFromPathname(pathname: string): Locale {
  const match = pathname.match(/^\/([a-z]{2})(\/|$)/);
  if (match && isValidLocale(match[1])) {
    return match[1];
  }
  return defaultLocale;
}

/**
 * Remove locale prefix from pathname
 */
export function removeLocaleFromPathname(pathname: string): string {
  return pathname.replace(/^\/[a-z]{2}(\/|$)/, '/') || '/';
}

/**
 * Add locale prefix to pathname
 */
export function addLocaleToPathname(pathname: string, locale: Locale): string {
  if (locale === defaultLocale) {
    return pathname;
  }
  return `/${locale}${pathname}`;
}

/**
 * Type guard for locale validation
 */
function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Get Open Graph locale code for a given locale
 */
export function getOpenGraphLocale(locale: Locale): string {
  const localeMap: Record<Locale, string> = {
    en: 'en_US',
    es: 'es_ES',
    fr: 'fr_FR',
    de: 'de_DE',
  };
  return localeMap[locale];
}

/**
 * Get HTML lang attribute value
 */
export function getHtmlLang(locale: Locale): string {
  return locale;
}
