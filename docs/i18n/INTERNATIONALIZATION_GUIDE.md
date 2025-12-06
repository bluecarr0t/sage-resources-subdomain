# Internationalization (i18n) Implementation Guide

**Purpose:** Enable multi-language support for Google search and AI chat discovery across different countries.

**Date:** January 2025  
**Framework:** Next.js 14 (App Router)  
**Solution:** `next-intl` (recommended for Next.js App Router)

---

## Executive Summary

This guide implements a complete internationalization system that:
- ✅ Supports multiple languages with proper URL structure (`/en/`, `/es/`, `/fr/`, etc.)
- ✅ Adds hreflang tags for SEO (tells Google which language version to show)
- ✅ Updates sitemap to include all language versions
- ✅ Maintains existing functionality while adding translation support
- ✅ Optimizes for Google search and AI chat discovery in different countries

---

## Table of Contents

1. [Why This Approach](#why-this-approach)
2. [Architecture Overview](#architecture-overview)
3. [Implementation Steps](#implementation-steps)
4. [Translation Management](#translation-management)
5. [SEO Best Practices](#seo-best-practices)
6. [Testing & Validation](#testing--validation)

---

## Why This Approach

### Why `next-intl`?

- **Built for App Router:** Specifically designed for Next.js 13+ App Router
- **Type-safe:** Full TypeScript support with autocomplete
- **SEO-friendly:** Built-in support for hreflang tags and language routing
- **Performance:** Server-side rendering with proper caching
- **Flexible:** Supports both subdirectory (`/en/`, `/es/`) and subdomain routing

### URL Structure Options

**Option 1: Subdirectory (Recommended)**
- `resources.sageoutdooradvisory.com/en/landing/...`
- `resources.sageoutdooradvisory.com/es/landing/...`
- `resources.sageoutdooradvisory.com/fr/landing/...`

**Benefits:**
- Single domain (easier SEO management)
- Shared analytics
- Easier deployment
- Better for AI chat discovery (single domain)

**Option 2: Subdomain**
- `en.resources.sageoutdooradvisory.com`
- `es.resources.sageoutdooradvisory.com`

**Benefits:**
- Clear language separation
- Can use different CDN regions
- More complex setup

**We'll use Option 1 (Subdirectory)** for this implementation.

---

## Architecture Overview

### File Structure

```
app/
├── [locale]/              # New: Language-specific routes
│   ├── layout.tsx         # Locale-aware root layout
│   ├── page.tsx           # Homepage
│   ├── landing/
│   │   └── [slug]/
│   ├── property/
│   │   └── [slug]/
│   ├── guides/
│   └── glossary/
├── layout.tsx             # Root layout (redirects to /en)
└── globals.css

messages/                   # New: Translation files
├── en.json
├── es.json
├── fr.json
└── de.json

i18n.ts                     # New: i18n configuration
middleware.ts               # Updated: Language detection
```

### How It Works

1. **User visits:** `resources.sageoutdooradvisory.com/landing/glamping-feasibility-study`
2. **Middleware detects:** Language preference (browser, cookie, or default)
3. **Redirects to:** `resources.sageoutdooradvisory.com/en/landing/glamping-feasibility-study`
4. **Page renders:** With English content
5. **Metadata includes:** hreflang tags pointing to all language versions

---

## Implementation Steps

### Step 1: Install Dependencies

```bash
npm install next-intl
```

### Step 2: Create i18n Configuration

Create `i18n.ts` in the root directory (see implementation files).

### Step 3: Update Middleware

Update `middleware.ts` to handle language detection and routing.

### Step 4: Restructure App Directory

Move all routes under `app/[locale]/` directory.

### Step 5: Create Translation Files

Create `messages/` directory with language JSON files.

### Step 6: Update Metadata

Add hreflang tags to all page metadata.

### Step 7: Update Sitemap

Include all language versions in sitemap.

---

## Translation Management

### Translation File Structure

```json
// messages/en.json
{
  "common": {
    "siteName": "Sage Outdoor Advisory",
    "cta": {
      "contactUs": "Contact Us",
      "learnMore": "Learn More"
    }
  },
  "landing": {
    "glampingFeasibilityStudy": {
      "title": "Glamping Feasibility Study",
      "description": "...",
      "hero": {
        "headline": "...",
        "subheadline": "..."
      }
    }
  }
}
```

### Best Practices

1. **Organize by feature:** Group translations by page/component
2. **Use keys, not values:** Never hardcode text in components
3. **Context matters:** Include context in key names (`landing.hero.headline`)
4. **Pluralization:** Use `next-intl`'s plural rules
5. **Professional translation:** Use native speakers for quality

### Translation Priority

**Phase 1 (High Priority):**
- English (en) - Default
- Spanish (es) - Large US market
- French (fr) - Canada, Europe
- German (de) - Europe

**Phase 2:**
- Portuguese (pt) - Brazil
- Italian (it) - Europe
- Dutch (nl) - Europe

---

## SEO Best Practices

### 1. Hreflang Tags

Every page must include hreflang tags pointing to all language versions:

```html
<link rel="alternate" hreflang="en" href="https://resources.sageoutdooradvisory.com/en/landing/..." />
<link rel="alternate" hreflang="es" href="https://resources.sageoutdooradvisory.com/es/landing/..." />
<link rel="alternate" hreflang="x-default" href="https://resources.sageoutdooradvisory.com/en/landing/..." />
```

**Why it matters:**
- Tells Google which language version to show users
- Prevents duplicate content issues
- Improves rankings in target countries

### 2. Language-Specific Metadata

Each language version should have:
- Translated title tags
- Translated meta descriptions
- Translated Open Graph tags
- Correct `lang` attribute in HTML

### 3. Sitemap Updates

Include all language versions:
```xml
<url>
  <loc>https://resources.sageoutdooradvisory.com/en/landing/...</loc>
  <xhtml:link rel="alternate" hreflang="en" href="..."/>
  <xhtml:link rel="alternate" hreflang="es" href="..."/>
</url>
```

### 4. Content-Language Header

Set proper `Content-Language` header for each page.

### 5. Canonical URLs

Each language version should have its own canonical URL.

---

## Testing & Validation

### 1. Test Language Switching

- Visit `/en/landing/...` → Should show English
- Visit `/es/landing/...` → Should show Spanish
- Visit `/landing/...` → Should redirect to `/en/landing/...`

### 2. Validate Hreflang Tags

Use Google Search Console's International Targeting report:
- Go to: Search Console → International Targeting
- Check for hreflang errors

### 3. Test SEO Tools

- **Google Rich Results Test:** Validate structured data in all languages
- **Screaming Frog:** Crawl all language versions
- **Ahrefs/SEMrush:** Check hreflang implementation

### 4. Test AI Chat Discovery

- Ask ChatGPT: "Find glamping feasibility studies in Spanish"
- Ask Perplexity: "What is glamping feasibility study?" (in different languages)
- Verify your site appears in results

### 5. Performance Testing

- Ensure no performance degradation
- Check bundle sizes (should be minimal impact)
- Test server-side rendering

---

## Migration Strategy

### Phase 1: Setup (Week 1)
- Install dependencies
- Create configuration files
- Set up translation structure

### Phase 2: Core Pages (Week 2)
- Migrate landing pages
- Migrate property pages
- Add English translations (baseline)

### Phase 3: Additional Pages (Week 3)
- Migrate guides
- Migrate glossary
- Update sitemap

### Phase 4: Translations (Week 4+)
- Translate to Spanish
- Translate to French
- Professional review

### Phase 5: SEO Optimization (Week 5)
- Add hreflang tags
- Update sitemap
- Submit to Google Search Console

---

## Maintenance

### Adding New Languages

1. Add locale to `i18n.ts`
2. Create new translation file in `messages/`
3. Update sitemap generation
4. Test and deploy

### Adding New Content

1. Add keys to English translation file
2. Translate to all languages
3. Update components to use translation keys
4. Test all language versions

### Monitoring

- **Google Search Console:** Monitor international search performance
- **Analytics:** Track language preferences
- **Error Monitoring:** Watch for missing translation keys

---

## Resources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Google Hreflang Guide](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Next.js Internationalization](https://nextjs.org/docs/app/building-your-application/routing/internationalization)

---

## Support

For questions or issues:
1. Check `next-intl` documentation
2. Review Google Search Console for hreflang errors
3. Test with browser language settings
4. Verify translation files are properly formatted

---

**Next Steps:** See implementation files in this directory for code examples.
