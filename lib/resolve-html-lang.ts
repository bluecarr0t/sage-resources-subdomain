import { defaultLocale, locales, type Locale } from '@/i18n';

/**
 * Prefer the URL locale segment (middleware `x-locale` or next-intl's
 * `x-next-intl-locale`) over the NEXT_LOCALE cookie so crawlers and first-time
 * visitors get the correct `<html lang>` for the path they requested.
 */
export function resolveHtmlLang(
  headerLocale: string | null | undefined,
  cookieLocale: string | null | undefined
): Locale {
  if (headerLocale && locales.includes(headerLocale as Locale)) {
    return headerLocale as Locale;
  }
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }
  return defaultLocale;
}
