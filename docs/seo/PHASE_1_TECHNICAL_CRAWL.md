# Phase 1 — Technical & Crawl Wins (Weeks 2–4)

Implementation reference for crawl budget, indexing tiers, i18n hygiene, E-E-A-T schema, and map performance.

## 1. Sitemap & crawl priority

| URL type | Priority | Notes |
|----------|----------|-------|
| Home `/en` | 1.0 | |
| Map `/en/map` | 0.95 | |
| Market overview | 0.9 | Added to `sitemaps/main.xml` |
| Pillar guides | 0.9 | |
| Core landings | 0.9 | 9 service pages |
| State landings | 0.8 | |
| Map state hubs | 0.8 | |
| Property tier A | 0.75 | |
| Property tier B | 0.65 | |
| Tier C | — | Excluded from sitemap |

Helpers: `lib/sitemap-priority.ts`, `lib/sitemap-hreflang.ts`

## 2. Property indexing tiers

Logic: `lib/property-seo-index.ts`

- **Tier A** — location + (description 80+ chars \| rate \| brand \| website)
- **Tier B** — city/state or coordinates only
- **Tier C** — `noindex, follow` — omitted from `sitemaps/properties.xml`

After deploy, compare GSC indexed count vs `npm run seo:audit-instrumentation` property URL count.

## 3. Landing i18n hygiene

Logic: `lib/landing-i18n.ts`

Only **9** landings have real `messages/{es,fr,de}.json` copy. Others are **English-only**:

- Sitemap: only translated locale URLs per slug
- Metadata: `noindex` for `/es/landing/...` when slug has no translation
- Canonical: always `/en/landing/{slug}`
- hreflang: only locales with translations

## 4. E-E-A-T on guides

`generateArticleSchema()` uses `Person` author with `worksFor` Sage Organization. Canonical article URL: `/en/guides/{slug}`.

## 5. Map performance

- Removed server-side national-parks fetch for TouristAttraction JSON-LD on map TTFB
- `app/[locale]/map/loading.tsx` route skeleton
- Single `dynamic()` import of `GooglePropertyMap` (was two separate chunks)

## Verification

```bash
npm test -- __tests__/lib/property-seo-index.test.ts __tests__/lib/landing-i18n.test.ts
npm run seo:audit-instrumentation
```

GSC (manual): URL Inspection on a tier-C property → should show noindex. Resubmit sitemap after deploy.
