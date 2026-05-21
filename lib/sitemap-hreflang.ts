import { locales, type Locale } from '@/i18n';

const baseUrl = 'https://resources.sageoutdooradvisory.com';

/** hreflang tags for a subset of locales (landing pages with partial translation). */
export function generateHreflangTagsForLocales(
  pathWithLocale: string,
  availableLocales: readonly Locale[]
): string {
  const hreflangs: string[] = [];
  for (const locale of availableLocales) {
    const localePath = pathWithLocale.replace(/^\/[a-z]{2}(\/|$)/, `/${locale}$1`);
    hreflangs.push(
      `    <xhtml:link rel="alternate" hreflang="${locale}" href="${baseUrl}${localePath}" />`
    );
  }
  const defaultLocale = availableLocales.includes('en')
    ? 'en'
    : availableLocales[0];
  const defaultPath = pathWithLocale.replace(
    /^\/[a-z]{2}(\/|$)/,
    `/${defaultLocale}$1`
  );
  hreflangs.push(
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}${defaultPath}" />`
  );
  return hreflangs.join('\n');
}

/** All configured locales (home, map geo, etc.). */
export function generateHreflangTags(path: string): string {
  return generateHreflangTagsForLocales(path, locales);
}

export function generateEnOnlyHreflangTags(path: string): string {
  return `    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}${path}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}${path}" />`;
}
