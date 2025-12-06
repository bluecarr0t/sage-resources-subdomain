# i18n Quick Start Guide

## Installation

```bash
npm install next-intl
```

## Step-by-Step Setup

### 1. Update Middleware

Replace `middleware.ts` with the i18n-enabled version:

```bash
# Backup current middleware
cp middleware.ts middleware.backup.ts

# Use the new middleware
cp middleware-i18n.ts middleware.ts
```

### 2. Restructure App Directory

Move all routes under `app/[locale]/`:

```bash
# Create locale directory structure
mkdir -p app/[locale]

# Move existing routes (example for landing pages)
mv app/landing app/[locale]/landing
mv app/property app/[locale]/property
mv app/guides app/[locale]/guides
mv app/glossary app/[locale]/glossary
mv app/map app/[locale]/map
mv app/partners app/[locale]/partners

# Move root page
mv app/page.tsx app/[locale]/page.tsx
```

### 3. Update Root Layout

Create `app/[locale]/layout.tsx`:

```typescript
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### 4. Update Root Layout (Redirect)

Update `app/layout.tsx` to redirect to default locale:

```typescript
import { redirect } from 'next/navigation';
import { defaultLocale } from '@/i18n';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  redirect(`/${defaultLocale}`);
}
```

### 5. Update Next.js Config

Add to `next.config.js`:

```javascript
const nextConfig = {
  // ... existing config
};

const withNextIntl = require('next-intl/plugin')(
  './i18n.ts'
);

module.exports = withNextIntl(nextConfig);
```

### 6. Test

```bash
npm run dev
```

Visit:
- `http://localhost:3000` → Should redirect to `/en`
- `http://localhost:3000/en/landing/...` → English version
- `http://localhost:3000/es/landing/...` → Spanish version

## Next Steps

1. **Update Page Components:** See `IMPLEMENTATION_EXAMPLE.md`
2. **Add Translations:** Update `messages/*.json` files
3. **Update Sitemap:** Include all language versions
4. **Test SEO:** Validate hreflang tags

## Troubleshooting

### Issue: 404 on all routes
**Solution:** Make sure you moved all routes to `app/[locale]/`

### Issue: Translations not working
**Solution:** Check that `messages/[locale].json` files exist and are valid JSON

### Issue: Middleware errors
**Solution:** Ensure `next-intl` is installed and `i18n.ts` is configured correctly

## Need Help?

See the full guide: `INTERNATIONALIZATION_GUIDE.md`
