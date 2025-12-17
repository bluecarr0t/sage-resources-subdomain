/**
 * i18n Content Availability Helper
 * 
 * Determines which locales have translations for different content types.
 * This helps reduce unnecessary page generation for untranslated content.
 */

import { locales, type Locale } from '@/i18n';

export type ContentType = 'landing' | 'guide' | 'glossary' | 'property' | 'national-park';

/**
 * Determine which locales have translations for a given content type.
 * 
 * Currently, most content is English-only, so we only generate 'en' pages
 * for content types that don't have translations.
 * 
 * TODO: Check if translations exist in messages/{locale}.json files
 * and return only locales that have actual translations.
 */
export function getAvailableLocalesForContent(contentType: ContentType): Locale[] {
  switch (contentType) {
    case 'landing':
      // Landing pages now have translations for all locales
      return [...locales];
    
    case 'guide':
      // Guides now have translations for all locales
      return [...locales];
    
    case 'glossary':
      // Glossary terms might have some translations in the future
      // For now, only generate English pages
      // TODO: Check messages/{locale}.json for glossary translations
      return ['en'];
    
    case 'property':
      // Property pages are data-driven and don't need localization
      // Already optimized to only generate 'en' pages
      return ['en'];
    
    case 'national-park':
      // National park pages are data-driven and don't need localization
      // Already optimized to only generate 'en' pages
      return ['en'];
    
    default:
      // Default to all locales for safety
      return [...locales];
  }
}

/**
 * Check if a specific locale has translations for a content type.
 * 
 * This can be enhanced to check actual translation files.
 */
export function hasLocaleTranslation(
  contentType: ContentType,
  locale: Locale
): boolean {
  const availableLocales = getAvailableLocalesForContent(contentType);
  return availableLocales.includes(locale);
}
