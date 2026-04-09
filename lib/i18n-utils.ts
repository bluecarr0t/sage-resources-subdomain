import { locales, defaultLocale, type Locale } from '@/i18n';
import { Metadata } from 'next';

/**
 * Build a stable query string for hreflang/canonical URLs (sorted keys and values).
 * Returns `""` or a string starting with `?` so filters match the requested URL for self-referencing hreflang.
 */
export function buildStableHreflangQueryString(
  searchParams: Record<string, string | string[] | undefined> | undefined
): string {
  if (!searchParams) return '';
  const keys = Object.keys(searchParams)
    .filter((k) => {
      const v = searchParams[k];
      if (v === undefined || v === '') return false;
      if (Array.isArray(v)) return v.some((item) => item !== undefined && item !== '');
      return true;
    })
    .sort();

  if (keys.length === 0) return '';

  const pairs: string[] = [];
  for (const key of keys) {
    const raw = searchParams[key];
    const values = Array.isArray(raw) ? raw : [raw];
    const sorted = values
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    for (const v of sorted) {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
    }
  }
  return pairs.length ? `?${pairs.join('&')}` : '';
}

/**
 * Generate hreflang alternates for all language versions of a page
 * This is critical for SEO - tells Google which language version to show users
 *
 * @param queryString - Optional suffix from `buildStableHreflangQueryString` so parameterized URLs
 *   (e.g. /en/map?country=...) include matching rel=alternate hrefs (fixes "no self-referencing hreflang").
 */
export function generateHreflangAlternates(
  pathname: string,
  baseUrl: string = 'https://resources.sageoutdooradvisory.com',
  queryString: string = ''
): Metadata['alternates'] {
  const qs =
    !queryString || queryString === '?'
      ? ''
      : queryString.startsWith('?')
        ? queryString
        : `?${queryString}`;

  const alternates: Metadata['alternates'] = {
    languages: {},
  };

  // Generate alternate URLs for each locale
  // Since we use localePrefix: 'always', all locales should have prefixes
  locales.forEach((locale) => {
    // Replace the locale in the pathname with the target locale
    const localePath = pathname.replace(/^\/[a-z]{2}(\/|$)/, `/${locale}$1`);

    alternates.languages![locale] = `${baseUrl}${localePath}${qs}`;
  });

  // Add x-default (fallback to default locale)
  // x-default should point to the default locale version
  const defaultPath = pathname.replace(/^\/[a-z]{2}(\/|$)/, `/${defaultLocale}$1`);
  alternates.languages!['x-default'] = `${baseUrl}${defaultPath}${qs}`;

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

const GLOSSARY_META_SUFFIX: Record<Locale, (termLower: string) => string> = {
  en: (termLower) =>
    `Learn more about ${termLower} in outdoor hospitality.`,
  de: (termLower) =>
    `Erfahren Sie mehr über ${termLower} in der Outdoor-Hospitality-Branche.`,
  es: (termLower) =>
    `Más información sobre ${termLower} en la hospitalidad al aire libre.`,
  fr: (termLower) =>
    `En savoir plus sur ${termLower} dans l'hospitalité de plein air.`,
};

/**
 * Meta description for glossary term pages: localized closing sentence ensures
 * unique descriptions across locales when definitions fall back to English (Semrush dupes).
 */
export function buildGlossaryTermMetaDescription(
  locale: Locale,
  termLabel: string,
  definition: string
): string {
  const termLower = termLabel.toLowerCase();
  const suffix = GLOSSARY_META_SUFFIX[locale](termLower);
  const base = definition.trim();
  const combined = `${base} ${suffix}`;
  const maxLen = 320;
  if (combined.length <= maxLen) {
    return combined;
  }
  const reserve = suffix.length + 4;
  const maxDef = Math.max(80, maxLen - reserve);
  let truncated = base.slice(0, maxDef);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 40) {
    truncated = truncated.slice(0, lastSpace);
  }
  return `${truncated}… ${suffix}`;
}

/**
 * Get HTML lang attribute value
 */
export function getHtmlLang(locale: Locale): string {
  return locale;
}
