import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// Supported locales
export const locales = ['en', 'es', 'fr', 'de'] as const;
export type Locale = (typeof locales)[number];

// Default locale
export const defaultLocale: Locale = 'en';

// Locale display names (for language switcher)
export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
};

// Locale metadata for SEO
export const localeMetadata: Record<Locale, { name: string; nativeName: string; region: string }> = {
  en: {
    name: 'English',
    nativeName: 'English',
    region: 'US',
  },
  es: {
    name: 'Spanish',
    nativeName: 'Español',
    region: 'ES',
  },
  fr: {
    name: 'French',
    nativeName: 'Français',
    region: 'FR',
  },
  de: {
    name: 'German',
    nativeName: 'Deutsch',
    region: 'DE',
  },
};

// Validate locale
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

// Get locale from request
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;

  // For routes outside [locale] (e.g. /admin, /login), requestLocale is undefined.
  // Use defaultLocale so those routes work instead of triggering 404.
  if (!requested) {
    return {
      locale: defaultLocale,
      messages: (await import(`./messages/${defaultLocale}.json`)).default,
    };
  }

  // Invalid locale (e.g. /xx/...) should 404
  if (!isValidLocale(requested)) {
    notFound();
  }

  return {
    locale: requested,
    messages: (await import(`./messages/${requested}.json`)).default,
  };
});
