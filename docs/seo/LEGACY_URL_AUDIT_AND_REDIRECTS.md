# Legacy URL audit — canonical `/en/` pattern

This document maps URL patterns that historically shipped **without** a `/{locale}/` prefix or that created **duplicate indexed URLs** vs the canonical Next.js + `next-intl` structure (`localePrefix: 'always'`).

## Redirect policy (301)

| Legacy or duplicate pattern | Canonical target |
|----------------------------|------------------|
| `/guides`, `/guides/*` | `/en/guides`, `/en/guides/*` |
| `/glossary`, `/glossary/*` | `/en/glossary`, `/en/glossary/*` |
| `/property`, `/property/*` | `/en/property`, `/en/property/*` |
| `/partners` | `/en/partners` |
| `/map`, `/map/*` (no locale) | `/en/map` (query string preserved) |
| `/de|es|fr/glamping/*` | `/en/glamping/*` (English body + SEO consolidation) |

Implemented in [`middleware.ts`](../../middleware.ts). Query strings are preserved on redirects.

## Sitemap / hreflang alignment

- **Glossary term URLs:** sitemap lists **`en` only** (matches [`getAvailableLocalesForContent('glossary')`](../../lib/i18n-content.ts)).
- **Property URLs:** sitemap lists **`en` only** (matches `getAvailableLocalesForContent('property')`).
- **Glamping hub URLs** (national parks index, per-park pages, unit-type pages): sitemap lists **`en` only** (`getAvailableLocalesForContent('glamping')`).

## Post-deploy verification (GSC)

1. **Page indexing:** watch “Crawled — currently not indexed” / “Duplicate without user-selected canonical” for `/guides` and `/fr/glamping`.
2. **Removals:** legacy URLs should drop while `/en/` impressions consolidate (short-term flux is normal).
3. **Sitemaps:** validate `https://resources.sageoutdooradvisory.com/sitemap.xml` child sitemaps contain only intended locales per content type.
