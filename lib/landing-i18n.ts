/**
 * Landing page locale availability based on real message file translations.
 */
import { defaultLocale, locales, type Locale } from '@/i18n';

type MessagesLanding = Record<string, { title?: string; metaDescription?: string }>;

function slugToTranslationKey(slug: string): string {
  return slug
    .split('-')
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('');
}

function loadLandingMessages(locale: Locale): MessagesLanding {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const messages = require(`../messages/${locale}.json`) as { landing?: MessagesLanding };
  return messages.landing ?? {};
}

const landingByLocale: Partial<Record<Locale, MessagesLanding>> = {};

function getLandingForLocale(locale: Locale): MessagesLanding {
  if (!landingByLocale[locale]) {
    landingByLocale[locale] = loadLandingMessages(locale);
  }
  return landingByLocale[locale]!;
}

/** True when messages/{locale}.json has title + metaDescription for this landing slug. */
export function landingSlugHasLocaleTranslation(slug: string, locale: Locale): boolean {
  if (locale === defaultLocale) return true;
  const key = slugToTranslationKey(slug);
  const entry = getLandingForLocale(locale)[key];
  return Boolean(entry?.title?.trim() && entry?.metaDescription?.trim());
}

/** Locales that should be indexed and listed in hreflang for a landing slug. */
export function getLandingLocalesForSlug(slug: string): Locale[] {
  return locales.filter((locale) => landingSlugHasLocaleTranslation(slug, locale));
}

export function landingSlugUsesEnglishFallback(slug: string, locale: Locale): boolean {
  return locale !== defaultLocale && !landingSlugHasLocaleTranslation(slug, locale);
}
