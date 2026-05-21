/**
 * Landing page locale availability based on real message file translations.
 */
import { defaultLocale, locales, type Locale } from '@/i18n';
import deMessages from '@/messages/de.json';
import enMessages from '@/messages/en.json';
import esMessages from '@/messages/es.json';
import frMessages from '@/messages/fr.json';

type MessagesLanding = Record<string, { title?: string; metaDescription?: string }>;

function slugToTranslationKey(slug: string): string {
  return slug
    .split('-')
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('');
}

const landingByLocale: Record<Locale, MessagesLanding> = {
  en: enMessages.landing ?? {},
  es: esMessages.landing ?? {},
  fr: frMessages.landing ?? {},
  de: deMessages.landing ?? {},
};

function getLandingForLocale(locale: Locale): MessagesLanding {
  return landingByLocale[locale];
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
