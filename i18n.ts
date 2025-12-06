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
  // Get the locale from the request
  const locale = await requestLocale;
  
  // Validate that the incoming `locale` parameter is valid
  if (!locale || !isValidLocale(locale)) {
    notFound();
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
