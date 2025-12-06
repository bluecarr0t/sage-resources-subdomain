# i18n Implementation Example

This document shows how to update existing pages to support multiple languages.

## Example: Updating Landing Page

### Before (Current Implementation)

```typescript
// app/landing/[slug]/page.tsx
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = getLandingPage(params.slug);
  const url = `https://resources.sageoutdooradvisory.com/landing/${page.slug}`;
  
  return {
    title: page.title,
    description: page.metaDescription,
    openGraph: {
      locale: "en_US",
      // ...
    },
  };
}
```

### After (With i18n Support)

```typescript
// app/[locale]/landing/[slug]/page.tsx
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { generateHreflangAlternates, getOpenGraphLocale } from '@/lib/i18n-utils';

interface PageProps {
  params: {
    locale: string;
    slug: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = params;
  const page = getLandingPage(slug);
  const t = await getTranslations({ locale, namespace: 'landing' });
  
  const pathname = `/${locale}/landing/${slug}`;
  const url = `https://resources.sageoutdooradvisory.com${pathname}`;
  
  return {
    title: page.title, // Or use t('glampingFeasibilityStudy.title')
    description: page.metaDescription,
    openGraph: {
      locale: getOpenGraphLocale(locale as Locale),
      url,
      // ...
    },
    alternates: {
      canonical: url,
      ...generateHreflangAlternates(pathname),
    },
  };
}

export default function LandingPage({ params }: PageProps) {
  const { locale, slug } = params;
  const page = getLandingPage(slug);
  const t = useTranslations('common');
  
  return (
    <html lang={locale}>
      <body>
        <LandingPageTemplate 
          content={page}
          translations={{
            contactUs: t('cta.contactUs'),
            learnMore: t('cta.learnMore'),
          }}
        />
      </body>
    </html>
  );
}
```

## Key Changes

### 1. Route Structure
- **Before:** `app/landing/[slug]/page.tsx`
- **After:** `app/[locale]/landing/[slug]/page.tsx`

### 2. Metadata Updates
- Add `locale` parameter to `generateMetadata`
- Use `generateHreflangAlternates()` for SEO
- Use `getOpenGraphLocale()` for Open Graph locale

### 3. Component Updates
- Use `useTranslations()` hook for client components
- Use `getTranslations()` for server components
- Pass translations as props to components

### 4. HTML Lang Attribute
- Set `lang={locale}` on `<html>` tag

## Migration Checklist

For each page type:

- [ ] Move route to `app/[locale]/` directory
- [ ] Add `locale` to `params` type
- [ ] Update `generateMetadata` to include hreflang
- [ ] Add translation keys to all language files
- [ ] Replace hardcoded strings with translation keys
- [ ] Test all language versions
- [ ] Update sitemap generation

## Testing

```bash
# Test English version
curl http://localhost:3000/en/landing/glamping-feasibility-study

# Test Spanish version
curl http://localhost:3000/es/landing/glamping-feasibility-study

# Test automatic redirect
curl http://localhost:3000/landing/glamping-feasibility-study
# Should redirect to /en/landing/...
```

## Common Patterns

### Using Translations in Components

```typescript
// Server Component
import { getTranslations } from 'next-intl/server';

export default async function MyComponent({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return <button>{t('cta.contactUs')}</button>;
}

// Client Component
'use client';
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('common');
  return <button>{t('cta.contactUs')}</button>;
}
```

### Language Switcher Component

```typescript
'use client';
import { usePathname, useRouter } from 'next/navigation';
import { locales, localeNames } from '@/i18n';

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  
  const switchLanguage = (locale: string) => {
    const newPath = pathname.replace(/^\/[a-z]{2}\//, `/${locale}/`);
    router.push(newPath);
  };
  
  return (
    <select onChange={(e) => switchLanguage(e.target.value)}>
      {locales.map((locale) => (
        <option key={locale} value={locale}>
          {localeNames[locale]}
        </option>
      ))}
    </select>
  );
}
```
