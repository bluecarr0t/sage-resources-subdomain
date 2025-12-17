# Multi-Language Support Audit

**Date:** January 2025  
**Scope:** Guide Pages, Glossary Pages, Landing Pages, and Home Page  
**Supported Locales:** en, es, fr, de

---

## Executive Summary

This audit evaluates the current state of multi-language (i18n) support across the four main page types on the Sage Outdoor Advisory resources subdomain. The evaluation covers:

1. ✅ **Infrastructure** - Code structure to support translations
2. ✅ **Content Translation** - Actual translated content availability
3. ✅ **SEO Implementation** - hreflang tags, metadata, and URL structure
4. ✅ **Page Generation** - Static generation for all locales
5. ⚠️ **User Experience** - Fallback behavior when translations are missing

---

## Overall Status by Page Type

| Page Type | Infrastructure | Content Translations | SEO (hreflang) | Static Generation | Overall Status |
|-----------|---------------|---------------------|----------------|-------------------|----------------|
| **Landing Pages** | ✅ Complete | ✅ Partial | ✅ Complete | ✅ All locales | 🟢 **GOOD** |
| **Guide Pages** | ✅ Complete | ❌ None | ✅ Complete | ⚠️ All locales (wrong config) | 🟡 **PARTIAL** |
| **Glossary Pages** | ⚠️ Partial | ❌ None | ✅ Complete | ✅ English only | 🟡 **PARTIAL** |
| **Home Page** | ❌ None | ❌ None | ✅ Complete | ✅ All locales | 🔴 **MISSING** |

---

## 1. Landing Pages (`/landing/[slug]`)

### Status: 🟢 **GOOD** - Fully Implemented

#### Infrastructure
- ✅ **Function:** `getLandingPage(slug, locale)` in `lib/landing-pages.ts`
- ✅ **Translation Loading:** Dynamically imports translations from `messages/{locale}.json`
- ✅ **Merge Logic:** Merges translated content with base English content
- ✅ **Fallback:** Gracefully falls back to English if translations missing

#### Content Translations
- ✅ **Translation Structure:** `messages/{locale}.json` → `landing.{slugKey}.*`
- ✅ **Coverage:** Translations exist for at least some landing pages in es, fr, de
- ⚠️ **Completeness:** Not all landing pages may have complete translations

#### SEO Implementation
- ✅ **hreflang Tags:** Generated via `generateHreflangAlternates()`
- ✅ **Metadata:** Localized titles, descriptions, OpenGraph locale
- ✅ **URL Structure:** `/en/landing/[slug]`, `/es/landing/[slug]`, etc.
- ✅ **Canonical URLs:** Properly set for each locale

#### Static Generation
- ✅ **Config:** `getAvailableLocalesForContent('landing')` returns all locales
- ✅ **generateStaticParams:** Generates pages for all 4 locales (en, es, fr, de)

#### Code Location
- Page: `app/[locale]/landing/[slug]/page.tsx`
- Data: `lib/landing-pages.ts` (lines 3946-4004)

#### Issues Found
1. ⚠️ **Incomplete Translations:** Not all landing pages have translations for all locales
2. ⚠️ **Translation Verification:** No validation that translations exist before generating pages

#### Recommendations
1. ✅ Add translation coverage report/script
2. ✅ Verify all landing pages have translations in all 4 locales
3. ✅ Consider adding translation completeness validation in `generateStaticParams`

---

## 2. Guide Pages (`/guides/[slug]`)

### Status: 🟡 **PARTIAL** - Infrastructure Ready, No Content Translations

#### Infrastructure
- ✅ **Function:** `getGuide(slug, locale)` in `lib/guides/index.ts`
- ✅ **Translation Loading:** Dynamically imports translations from `messages/{locale}.json`
- ✅ **Merge Logic:** Merges translated content with base English content
- ✅ **Fallback:** Gracefully falls back to English if translations missing

#### Content Translations
- ❌ **Translation Structure:** Expected: `messages/{locale}.json` → `guides.{slugKey}.*`
- ❌ **Coverage:** No guide content translations exist in message files
- ✅ **UI Translations:** Guide index page has UI translations (category names, etc.)

#### SEO Implementation
- ✅ **hreflang Tags:** Generated via `generateHreflangAlternates()`
- ✅ **Metadata:** Uses translated content when available, falls back to English
- ✅ **URL Structure:** `/en/guides/[slug]`, `/es/guides/[slug]`, etc.
- ✅ **Canonical URLs:** Properly set for each locale

#### Static Generation
- ⚠️ **Config Issue:** `getAvailableLocalesForContent('guide')` returns all locales
- ⚠️ **Problem:** This generates pages for all locales, but only English content exists
- ⚠️ **Current Behavior:** Non-English URLs show English content (correct fallback, but misleading)

#### Code Location
- Page: `app/[locale]/guides/[slug]/page.tsx`
- Data: `lib/guides/index.ts` (lines 30-76)

#### Issues Found
1. ❌ **No Content Translations:** Guide content is English-only
2. ⚠️ **Misleading Generation:** Pages generated for all locales show English content
3. ⚠️ **Config Mismatch:** `lib/i18n-content.ts` says guides have translations for all locales, but they don't

#### Recommendations
1. 🔴 **URGENT:** Update `getAvailableLocalesForContent('guide')` to return `['en']` only
2. 🔴 **URGENT:** Or add guide translations to message files
3. ✅ Consider adding translation status check in `getGuide()` to log missing translations
4. ✅ Create translation structure in message files following landing pages pattern

---

## 3. Glossary Pages (`/glossary/[term]`)

### Status: 🟡 **PARTIAL** - UI Translated, Content Not Translated

### 3a. Glossary Index Page (`/glossary`)

#### Infrastructure
- ✅ **Translations:** Uses `getTranslations({ locale, namespace: 'glossary' })`
- ✅ **UI Elements:** Category names, titles, search placeholders translated

#### Content Translations
- ✅ **UI Translations:** Fully translated in `messages/{locale}.json` → `glossary.*`
- ✅ **Coverage:** All 4 locales have glossary UI translations

#### SEO Implementation
- ✅ **hreflang Tags:** Generated via `generateHreflangAlternates()`
- ✅ **Metadata:** Localized metadata
- ✅ **URL Structure:** `/en/glossary`, `/es/glossary`, etc.

#### Static Generation
- ✅ **Config:** `getAvailableLocalesForContent('glossary')` returns `['en']`
- ✅ **generateStaticParams:** Generates pages for all locales (hardcoded in page.tsx)
- ⚠️ **Note:** Index page generates for all locales, but term pages only generate for English

#### Code Location
- Page: `app/[locale]/glossary/page.tsx`

---

### 3b. Glossary Term Pages (`/glossary/[term]`)

#### Infrastructure
- ❌ **Function:** `getGlossaryTerm(term)` in `lib/glossary/utils.ts`
- ❌ **No Locale Support:** Function doesn't accept locale parameter
- ❌ **No Translation Loading:** Always returns English content from static data

#### Content Translations
- ❌ **Translation Structure:** None exists
- ❌ **Coverage:** Glossary term content is English-only
- ❌ **Data Source:** Terms come from TypeScript files, not message files

#### SEO Implementation
- ✅ **hreflang Tags:** Generated via `generateHreflangAlternates()`
- ⚠️ **Metadata Issue:** Titles and descriptions are English-only, even for non-English locales
- ✅ **URL Structure:** `/en/glossary/[term]`, `/es/glossary/[term]`, etc.

#### Static Generation
- ✅ **Config:** `getAvailableLocalesForContent('glossary')` returns `['en']`
- ✅ **generateStaticParams:** Only generates English pages (correct)
- ⚠️ **Issue:** hreflang tags reference non-English URLs that don't exist (404)

#### Code Location
- Page: `app/[locale]/glossary/[term]/page.tsx`
- Data: `lib/glossary/utils.ts` (lines 20-22)

#### Issues Found
1. ❌ **No Translation Infrastructure:** `getGlossaryTerm()` doesn't support locale
2. ❌ **No Content Translations:** Term definitions, examples, FAQs are English-only
3. ⚠️ **hreflang Tags Point to Non-Existent Pages:** Tags reference `/es/glossary/[term]`, `/fr/glossary/[term]`, etc., but only `/en/glossary/[term]` exists
4. ⚠️ **Metadata Always English:** Title and description metadata are English even for non-English locales

#### Recommendations
1. 🔴 **URGENT:** Either:
   - Option A: Remove hreflang tags for glossary term pages (generate only English)
   - Option B: Implement translation infrastructure for glossary terms
2. ✅ If implementing translations, create translation structure similar to guides/landing pages
3. ✅ Add locale parameter to `getGlossaryTerm(term, locale?)`
4. ✅ Consider moving glossary term content to message files or creating a translation merge system
5. ✅ Update `generateMetadata` to use locale-aware content

---

## 4. Home Page (`/`)

### Status: 🔴 **MISSING** - No Translation Support

#### Infrastructure
- ❌ **No Translation Loading:** Hard-coded English text throughout component
- ❌ **No Translation Structure:** No home page translations in message files

#### Content Translations
- ❌ **Translation Structure:** None exists
- ❌ **Coverage:** All content is hard-coded English
- ❌ **Examples of Hard-coded Text:**
  - "Your Complete Glamping Resource"
  - "600+ properties, expert guides, and industry resources..."
  - "Comprehensive Guides"
  - "Featured Glossary Terms"
  - "Explore Landing Pages"
  - All section titles and descriptions

#### SEO Implementation
- ✅ **hreflang Tags:** Generated via `generateHreflangAlternates()`
- ⚠️ **Metadata Issue:** Metadata is hard-coded English for all locales
- ✅ **URL Structure:** `/en`, `/es`, `/fr`, `/de`
- ⚠️ **Problem:** Non-English URLs show English content (misleading for SEO)

#### Static Generation
- ✅ **Config:** Generates pages for all 4 locales
- ⚠️ **Problem:** All locale versions show identical English content

#### Code Location
- Page: `app/[locale]/page.tsx`
- Lines with hard-coded text: 265-270, 329-334, 362, 413, 456, 487, 515

#### Issues Found
1. ❌ **No Translation Infrastructure:** All content is hard-coded
2. ❌ **No Content Translations:** Home page content is English-only
3. ⚠️ **Misleading SEO:** hreflang tags suggest translated content, but none exists
4. ⚠️ **Poor UX:** Users visiting `/es` or `/fr` see English content
5. ❌ **Metadata Always English:** Title, description, OpenGraph content always English

#### Recommendations
1. 🔴 **URGENT:** Create translation namespace for home page: `messages/{locale}.json` → `home.*`
2. 🔴 **URGENT:** Extract all hard-coded text to translation keys
3. 🔴 **URGENT:** Use `getTranslations({ locale, namespace: 'home' })` throughout component
4. ✅ Update metadata generation to use translated content
5. ✅ Consider creating a translation completeness checker

---

## Detailed Findings by Category

### Translation Infrastructure Comparison

| Page Type | Locale-Aware Data Function | Translation Source | Fallback Behavior |
|-----------|---------------------------|-------------------|-------------------|
| Landing Pages | ✅ `getLandingPage(slug, locale)` | `messages/{locale}.json` | ✅ English fallback |
| Guide Pages | ✅ `getGuide(slug, locale)` | `messages/{locale}.json` | ✅ English fallback |
| Glossary Index | ✅ `getTranslations('glossary')` | `messages/{locale}.json` | ✅ Error handling |
| Glossary Terms | ❌ `getGlossaryTerm(term)` | ❌ None (static TypeScript) | ❌ None |
| Home Page | ❌ None | ❌ None | ❌ None |

### SEO Implementation Status

| Page Type | hreflang Tags | Localized Metadata | Localized URLs | Issues |
|-----------|--------------|-------------------|----------------|--------|
| Landing Pages | ✅ Yes | ✅ Yes | ✅ Yes | None |
| Guide Pages | ✅ Yes | ⚠️ Partial (uses translated if exists) | ✅ Yes | Metadata may be English if translation missing |
| Glossary Index | ✅ Yes | ✅ Yes | ✅ Yes | None |
| Glossary Terms | ⚠️ Yes | ❌ No | ⚠️ Partial (only en generated) | hreflang points to non-existent pages |
| Home Page | ⚠️ Yes | ❌ No | ✅ Yes | hreflang suggests translations that don't exist |

### Static Generation Status

| Page Type | Locales Generated | Expected Behavior | Actual Behavior | Status |
|-----------|------------------|------------------|-----------------|--------|
| Landing Pages | en, es, fr, de | All locales | ✅ All locales with translations | ✅ Correct |
| Guide Pages | en, es, fr, de | Only locales with translations | ⚠️ All locales (showing English) | ⚠️ Incorrect config |
| Glossary Index | en, es, fr, de | All locales | ✅ All locales with UI translations | ✅ Correct |
| Glossary Terms | en only | Only locales with translations | ✅ English only | ✅ Correct |
| Home Page | en, es, fr, de | Only locales with translations | ⚠️ All locales (showing English) | ⚠️ Should be en only |

---

## Critical Issues Summary

### 🔴 Critical (Fix Immediately)

1. **Glossary Term Pages - Broken hreflang Tags**
   - Issue: hreflang tags reference `/es/glossary/[term]`, `/fr/glossary/[term]`, etc., but these pages don't exist
   - Impact: SEO issues, potential 404s, misleading search engines
   - Fix: Either remove hreflang tags or implement translation infrastructure

2. **Home Page - No Translation Support**
   - Issue: Home page generates for all locales but shows English content for all
   - Impact: Poor UX, misleading SEO, wasted build time
   - Fix: Add translation infrastructure and extract hard-coded text

3. **Guide Pages - Incorrect Generation Config**
   - Issue: Pages generated for all locales but only English content exists
   - Impact: Misleading URLs, wasted build time
   - Fix: Update `getAvailableLocalesForContent('guide')` to return `['en']` OR add translations

### 🟡 Important (Fix Soon)

4. **Glossary Terms - No Translation Infrastructure**
   - Issue: Cannot translate glossary term content
   - Impact: Glossary terms always in English, even for non-English locales
   - Fix: Implement locale-aware `getGlossaryTerm()` function

5. **Metadata - Not Always Localized**
   - Issue: Some pages show English metadata for non-English locales
   - Impact: Poor SEO, misleading search results
   - Fix: Ensure all metadata uses translated content or proper fallbacks

### 🟢 Minor (Nice to Have)

6. **Translation Verification**
   - Issue: No validation that translations exist before generating pages
   - Impact: Potential for incomplete translations in production
   - Fix: Add translation completeness checks

7. **Build Optimization**
   - Issue: Generating pages for locales without translations wastes build time
   - Impact: Slower builds, unnecessary deployments
   - Fix: Implement proper locale availability checks

---

## Recommendations by Priority

### Priority 1: Fix Critical SEO Issues

1. **Glossary Term Pages:**
   - **Option A (Quick Fix):** Update `generateMetadata` to only include hreflang tags for English
   - **Option B (Proper Fix):** Implement translation infrastructure for glossary terms
   - **Recommended:** Option A for immediate fix, Option B for long-term

2. **Home Page:**
   - Extract all hard-coded text to `messages/{locale}.json` → `home.*`
   - Use `getTranslations({ locale, namespace: 'home' })` throughout
   - Update metadata to use translated content

3. **Guide Pages:**
   - Update `lib/i18n-content.ts`: `getAvailableLocalesForContent('guide')` → return `['en']`
   - OR add guide translations to message files

### Priority 2: Implement Missing Infrastructure

4. **Glossary Terms Translation Support:**
   - Add locale parameter to `getGlossaryTerm(term, locale?)`
   - Create translation structure in message files: `messages/{locale}.json` → `glossary.terms.{termSlug}.*`
   - Update `lib/glossary/utils.ts` to load and merge translations
   - Update `getAvailableLocalesForContent('glossary')` to check for actual translations

### Priority 3: Improve Developer Experience

5. **Translation Validation:**
   - Create script to check translation completeness
   - Add build-time warnings for missing translations
   - Document translation structure for each content type

6. **Better Fallback Handling:**
   - Improve logging when translations are missing
   - Add development warnings for incomplete translations
   - Consider redirecting non-English URLs to English if no translation exists

---

## Translation Structure Reference

### Current Translation Namespaces

```
messages/{locale}.json
├── common.*           ✅ UI elements, navigation, CTAs
├── landing.*          ✅ Landing page content
├── guides.*           ⚠️  UI only (category names), not content
├── glossary.*         ⚠️  UI only (categories, titles), not term content
├── map.*              ✅ Map page UI
├── locationSearch.*   ✅ Location search UI
└── home.*             ❌ MISSING - needs to be created
```

### Recommended Structure for Missing Translations

```json
// messages/{locale}.json
{
  "home": {
    "hero": {
      "headline": "...",
      "subheadline": "...",
      "ctaText": "..."
    },
    "sections": {
      "guides": {
        "title": "...",
        "description": "..."
      },
      "glossary": {
        "title": "...",
        "description": "..."
      },
      "landingPages": {
        "title": "...",
        "description": "..."
      }
    },
    "stats": {
      "properties": "...",
      "guides": "...",
      "glossary": "..."
    }
  },
  "guides": {
    // Add guide content translations here
    "{slugKey}": {
      "title": "...",
      "metaDescription": "...",
      "hero": { ... },
      "sections": [ ... ],
      "faqs": [ ... ]
    }
  },
  "glossary": {
    // Add term content translations here
    "terms": {
      "{termSlug}": {
        "term": "...",
        "definition": "...",
        "extendedDefinition": "...",
        "examples": [ ... ],
        "faqs": [ ... ]
      }
    }
  }
}
```

---

## Testing Recommendations

1. **Manual Testing:**
   - Visit each page type in all 4 locales
   - Verify content is translated (or falls back gracefully)
   - Check browser DevTools → Network → HTML response for hreflang tags
   - Verify metadata in page source

2. **Automated Testing:**
   - Create test to verify hreflang tags point to existing pages
   - Validate translation completeness for each content type
   - Check that metadata is localized when translations exist

3. **SEO Testing:**
   - Use Google Search Console to verify hreflang implementation
   - Test URL structure in different locales
   - Verify canonical URLs are correct

---

## Next Steps

1. **Immediate (This Week):**
   - Fix glossary term hreflang tags (Option A - quick fix)
   - Fix guide pages generation config
   - Create home page translation structure

2. **Short Term (This Month):**
   - Add home page translations
   - Implement glossary term translation infrastructure
   - Add translation validation/checking

3. **Long Term (Next Quarter):**
   - Complete all guide translations
   - Complete all glossary term translations
   - Add automated translation completeness checks
   - Consider adding more locales (Portuguese, Italian, etc.)

---

## Conclusion

The multi-language infrastructure is **partially implemented** with good foundations for landing pages, but **significant gaps** exist for guide pages, glossary terms, and the home page. The most critical issues are:

1. Glossary term pages have broken hreflang tags pointing to non-existent pages
2. Home page has no translation support despite generating for all locales
3. Guide pages generate for all locales but only have English content

**Overall Grade: C+** - Infrastructure exists, but implementation is incomplete and some critical SEO issues need immediate attention.
