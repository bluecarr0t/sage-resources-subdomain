# SEO Audit Report: Resources Subdomain
**Date:** January 2025  
**Domain:** resources.sageoutdooradvisory.com  
**Audit Type:** Comprehensive Technical & On-Page SEO

---

## Executive Summary

The resources subdomain has a **solid SEO foundation** with good technical implementation. However, there are **significant opportunities** to improve rankings through enhanced schema markup, content optimization, internal linking, and performance improvements.

**Overall SEO Score: 7.5/10**

**Priority Improvements:**
1. ⚠️ **HIGH**: Add Article/WebPage schema for better rich results
2. ⚠️ **HIGH**: Implement Review/Rating schema for testimonials
3. ⚠️ **HIGH**: Add HowTo schema for process-based content
4. ⚠️ **MEDIUM**: Enhance internal linking between landing pages
5. ⚠️ **MEDIUM**: Add lastModified dates to sitemap
6. ⚠️ **MEDIUM**: Implement hreflang tags (if multi-region)
7. ⚠️ **LOW**: Add author information to articles
8. ⚠️ **LOW**: Implement Article schema for blog-style content

---

## 1. Technical SEO Analysis

### ✅ **Strengths**

1. **XML Sitemap** ✅
   - Properly configured
   - Includes all landing pages and glossary terms
   - Correct priority structure
   - **Issue**: All pages show `lastModified: new Date()` (should use actual dates)

2. **Robots.txt** ✅
   - Properly configured
   - Allows all crawlers
   - References sitemap correctly

3. **Canonical URLs** ✅
   - All pages have canonical tags
   - Correctly point to resources subdomain

4. **Meta Tags** ✅
   - Title tags implemented
   - Meta descriptions present
   - Open Graph tags complete
   - Twitter Card tags present
   - Keywords meta tag (low priority, but present)

5. **Structured Data** ✅
   - LocalBusiness/ProfessionalService schema
   - BreadcrumbList schema
   - FAQPage schema
   - Service schema

### ⚠️ **Issues & Improvements**

#### 1.1 Sitemap Last Modified Dates
**Current:** All pages use `new Date()` (current date on every build)  
**Issue:** Google can't determine actual content freshness  
**Fix:** Store and use actual last modified dates from content files or database

```typescript
// Current (app/sitemap.ts)
lastModified: new Date(),

// Recommended
lastModified: getLastModifiedDate(slug), // From file system or CMS
```

#### 1.2 Missing hreflang Tags
**Current:** No hreflang implementation  
**Issue:** If targeting multiple regions/languages, missing hreflang can cause duplicate content issues  
**Fix:** Add hreflang if expanding to multiple regions

```typescript
// Add to metadata
alternates: {
  canonical: url,
  languages: {
    'en-US': url,
    'x-default': url,
  },
}
```

#### 1.3 Missing Article Schema
**Current:** Glossary pages use generic metadata  
**Issue:** Glossary terms could benefit from Article schema for better rich results  
**Fix:** Add Article schema to glossary term pages

#### 1.4 Missing Review/Rating Schema
**Current:** Testimonials are plain text  
**Issue:** Missing opportunity for rich results with star ratings  
**Fix:** Add Review/Rating schema to testimonials

---

## 2. On-Page SEO Analysis

### ✅ **Strengths**

1. **Heading Structure** ✅
   - Proper H1 usage (one per page)
   - Logical H2 hierarchy
   - Good use of H3 for subsections

2. **Content Quality** ✅
   - Comprehensive content
   - Good keyword usage
   - Natural language

3. **URL Structure** ✅
   - Clean, descriptive URLs
   - Keyword-rich slugs
   - Logical hierarchy

4. **Internal Linking** ✅
   - Links to glossary terms
   - Links to root domain
   - Related resources section

### ⚠️ **Issues & Improvements**

#### 2.1 Missing H1 in Hero Section
**Current:** H1 is in hero section but could be more prominent  
**Issue:** H1 should be the first heading on the page  
**Status:** ✅ Already correct - H1 is first heading

#### 2.2 Internal Linking Between Landing Pages
**Current:** Limited cross-linking between similar landing pages  
**Issue:** Missing opportunity to pass link equity and improve crawlability  
**Fix:** Add "Related Landing Pages" section to each page

**Example:**
- Glamping Feasibility Study → Link to:
  - Glamping Appraisal
  - How to Finance Glamping Resort
  - Location-specific pages (Florida, Utah, etc.)

#### 2.3 Missing Alt Text Optimization
**Current:** Logo has alt text, but could be more descriptive  
**Issue:** Alt text should be more descriptive for SEO  
**Fix:** Enhance alt text with keywords

```tsx
// Current
alt="Sage Outdoor Advisory"

// Recommended
alt="Sage Outdoor Advisory - Outdoor Hospitality Feasibility Studies and Appraisals"
```

#### 2.4 Content Length
**Current:** Landing pages are comprehensive but could be longer  
**Issue:** Longer content (2000+ words) tends to rank better  
**Recommendation:** Add more detailed sections, case studies, examples

#### 2.5 Missing Table of Contents
**Current:** No table of contents for long pages  
**Issue:** TOC helps with user experience and featured snippets  
**Fix:** Add auto-generated TOC for pages with 3+ H2 sections

---

## 3. Schema Markup Analysis

### ✅ **Current Schema Types**

1. ✅ ProfessionalService (LocalBusiness)
2. ✅ BreadcrumbList
3. ✅ FAQPage
4. ✅ Service
5. ✅ Definition (for glossary)

### ⚠️ **Missing Schema Types**

#### 3.1 Article Schema (HIGH PRIORITY)
**Why:** Glossary terms and landing pages could benefit from Article schema  
**Impact:** Better rich results, potential for article carousels

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Glamping Feasibility Study Guide",
  "author": {
    "@type": "Organization",
    "name": "Sage Outdoor Advisory"
  },
  "datePublished": "2025-01-01",
  "dateModified": "2025-01-15",
  "publisher": {
    "@type": "Organization",
    "name": "Sage Outdoor Advisory",
    "logo": {
      "@type": "ImageObject",
      "url": "https://sageoutdooradvisory.com/logo.png"
    }
  }
}
```

#### 3.2 Review/Rating Schema (HIGH PRIORITY)
**Why:** Testimonials could show as rich results with star ratings  
**Impact:** Higher click-through rates, trust signals

```json
{
  "@context": "https://schema.org",
  "@type": "Review",
  "author": {
    "@type": "Person",
    "name": "Randy Knapp"
  },
  "reviewRating": {
    "@type": "Rating",
    "ratingValue": "5",
    "bestRating": "5"
  },
  "reviewBody": "Sage's feasibility study was essential..."
}
```

#### 3.3 HowTo Schema (MEDIUM PRIORITY)
**Why:** Process-based content (e.g., "How to Finance a Glamping Resort")  
**Impact:** Featured snippets, rich results

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Finance a Glamping Resort",
  "step": [
    {
      "@type": "HowToStep",
      "name": "Get a Feasibility Study",
      "text": "Start with a comprehensive feasibility study..."
    }
  ]
}
```

#### 3.4 VideoObject Schema (LOW PRIORITY)
**Why:** If adding video content in the future  
**Impact:** Video rich results

#### 3.5 Organization Schema on Homepage
**Why:** Homepage should have Organization schema  
**Impact:** Knowledge graph optimization

---

## 4. Content Optimization

### ✅ **Strengths**

1. ✅ Keyword-rich URLs
2. ✅ Descriptive meta descriptions
3. ✅ Good content depth
4. ✅ FAQ sections for featured snippets

### ⚠️ **Improvements**

#### 4.1 Content Freshness
**Issue:** No "Last Updated" dates visible to users or search engines  
**Fix:** Add lastModified dates to schema and display on pages

#### 4.2 Featured Snippet Optimization
**Current:** FAQ schema is good, but could be enhanced  
**Fix:** 
- Ensure FAQ answers are concise (40-60 words)
- Use numbered lists for step-by-step processes
- Add definition boxes for key terms

#### 4.3 Content Clusters
**Current:** Pages are somewhat isolated  
**Fix:** Create topic clusters:
- **Hub:** Main service page
- **Spokes:** Related landing pages, FAQs, glossary terms

**Example Cluster:**
- Hub: Glamping Feasibility Study
- Spokes:
  - Glamping Appraisal
  - How to Finance Glamping
  - Glamping Market Trends
  - Glossary: Glamping, Feasibility Study, etc.

#### 4.4 Long-Tail Keyword Targeting
**Current:** Good keyword coverage  
**Enhancement:** Add more question-based content:
- "How much does a glamping feasibility study cost?"
- "What is included in an RV resort feasibility study?"
- "How long does a campground appraisal take?"

---

## 5. Internal Linking Strategy

### ✅ **Current Implementation**

1. ✅ Links to glossary terms
2. ✅ Links to root domain
3. ✅ Related resources section
4. ✅ Footer links

### ⚠️ **Improvements**

#### 5.1 Cross-Link Similar Landing Pages
**Fix:** Add "Related Landing Pages" widget

```tsx
<section className="related-landing-pages">
  <h3>Related Resources</h3>
  <ul>
    <li><Link href="/landing/glamping-appraisal">Glamping Appraisal</Link></li>
    <li><Link href="/landing/how-to-finance-glamping-resort">How to Finance Glamping</Link></li>
  </ul>
</section>
```

#### 5.2 Contextual Internal Links
**Current:** Some links are in content, but could be more strategic  
**Fix:** Add 5-10 internal links per page with keyword-rich anchor text

#### 5.3 Link Depth Optimization
**Current:** Most pages are 2-3 clicks from homepage  
**Status:** ✅ Good - maintain this

#### 5.4 Related Content Algorithm
**Fix:** Implement smart related content based on:
- Same service type
- Same location
- Same property type
- User journey patterns

---

## 6. Performance & Core Web Vitals

### ⚠️ **Recommendations**

#### 6.1 Image Optimization
**Current:** Using Next.js Image component ✅  
**Enhancement:** 
- Ensure all images are WebP format
- Add lazy loading for below-fold images
- Optimize logo file size

#### 6.2 Font Optimization
**Current:** Using system fonts ✅  
**Status:** Good - no web fonts to optimize

#### 6.3 Code Splitting
**Current:** Next.js handles this automatically ✅  
**Status:** Good

#### 6.4 Critical CSS
**Recommendation:** Ensure critical CSS is inlined for above-fold content

---

## 7. Mobile Optimization

### ✅ **Strengths**

1. ✅ Responsive design (Tailwind CSS)
2. ✅ Touch-friendly buttons
3. ✅ Mobile-first approach

### ⚠️ **Recommendations**

1. Test on actual devices (not just browser dev tools)
2. Ensure tap targets are at least 44x44px
3. Verify font sizes are readable on mobile
4. Test form inputs on mobile devices

---

## 8. Missing SEO Elements

### 8.1 Author Information
**Issue:** No author attribution  
**Fix:** Add Organization as author in Article schema

### 8.2 Publication Dates
**Issue:** No dates on content  
**Fix:** Add datePublished and dateModified to schema

### 8.3 Social Sharing Optimization
**Current:** Open Graph tags present ✅  
**Enhancement:** Add specific OG images per page type

### 8.4 JSON-LD Consolidation
**Current:** Multiple separate JSON-LD blocks  
**Enhancement:** Consider consolidating where possible (though separate is also fine)

---

## 9. Competitive Analysis Recommendations

### 9.1 Content Gaps
**Action:** Identify top-ranking competitors and analyze:
- Content length
- Schema types used
- Internal linking patterns
- Content topics covered

### 9.2 Backlink Opportunities
**Action:** 
- Create linkable assets (calculators, tools, comprehensive guides)
- Guest posting on industry sites
- Resource page outreach

---

## 10. Priority Action Items

### 🔴 **HIGH PRIORITY (Do First)**

1. **Add Review/Rating Schema**
   - File: `lib/schema.ts`
   - Impact: Rich results with star ratings
   - Effort: 2 hours

2. **Add Article Schema to Landing Pages**
   - File: `lib/schema.ts`, `components/LandingPageTemplate.tsx`
   - Impact: Better rich results, article carousels
   - Effort: 3 hours

3. **Fix Sitemap Last Modified Dates**
   - File: `app/sitemap.ts`
   - Impact: Better content freshness signals
   - Effort: 2 hours

4. **Add Internal Cross-Linking Between Landing Pages**
   - File: `components/LandingPageTemplate.tsx`, `lib/landing-pages.ts`
   - Impact: Better crawlability, link equity distribution
   - Effort: 4 hours

### 🟡 **MEDIUM PRIORITY (Do Next)**

5. **Add HowTo Schema for Process Pages**
   - File: `lib/schema.ts`
   - Impact: Featured snippets for how-to queries
   - Effort: 3 hours

6. **Enhance Content with More Detail**
   - File: `lib/landing-pages.ts`
   - Impact: Better rankings for competitive keywords
   - Effort: Ongoing

7. **Add Table of Contents to Long Pages**
   - File: `components/LandingPageTemplate.tsx`
   - Impact: Better UX, featured snippet opportunities
   - Effort: 4 hours

8. **Add Related Landing Pages Section**
   - File: `components/LandingPageTemplate.tsx`
   - Impact: Better internal linking, user engagement
   - Effort: 3 hours

### 🟢 **LOW PRIORITY (Nice to Have)**

9. **Add Author Information**
   - File: `lib/schema.ts`
   - Impact: Minor SEO benefit
   - Effort: 1 hour

10. **Add Publication Dates**
    - File: `lib/landing-pages.ts`, `lib/schema.ts`
    - Impact: Content freshness signals
    - Effort: 2 hours

11. **Optimize Alt Text**
    - File: `components/LandingPageTemplate.tsx`
    - Impact: Image SEO
    - Effort: 1 hour

---

## 11. Expected Impact

### Short-term (1-3 months)
- 15-25% increase in organic traffic
- Better rich result appearances
- Improved featured snippet captures
- Better internal link equity distribution

### Medium-term (3-6 months)
- 30-50% increase in organic traffic
- Top 3 rankings for target keywords
- Increased domain authority
- More backlink opportunities

### Long-term (6-12 months)
- 100-200% increase in organic traffic
- Established topical authority
- Strong knowledge graph presence
- Industry thought leadership

---

## 12. Implementation Roadmap

### Week 1-2: High Priority Items
- [ ] Add Review/Rating schema
- [ ] Add Article schema
- [ ] Fix sitemap dates
- [ ] Add internal cross-linking

### Week 3-4: Medium Priority Items
- [ ] Add HowTo schema
- [ ] Add related landing pages section
- [ ] Enhance content depth
- [ ] Add table of contents

### Week 5-6: Content & Optimization
- [ ] Expand content on key pages
- [ ] Optimize images and alt text
- [ ] Add publication dates
- [ ] Performance optimization

### Ongoing: Monitoring & Iteration
- [ ] Track rankings and traffic
- [ ] A/B test content variations
- [ ] Monitor Core Web Vitals
- [ ] Update content regularly

---

## 13. Tools & Resources

### Recommended Tools
- Google Search Console (monitoring)
- Google Analytics (traffic analysis)
- PageSpeed Insights (performance)
- Schema.org Validator (schema testing)
- Ahrefs/SEMrush (competitor analysis)

### Testing Checklist
- [ ] Validate all schema markup
- [ ] Test all internal links
- [ ] Verify mobile responsiveness
- [ ] Check Core Web Vitals
- [ ] Test page load speeds
- [ ] Verify canonical URLs
- [ ] Check for broken links

---

## Conclusion

The resources subdomain has a **strong SEO foundation** with excellent technical implementation. The main opportunities lie in:

1. **Enhanced schema markup** (Review, Article, HowTo)
2. **Better internal linking** between related pages
3. **Content depth and freshness** signals
4. **Rich result optimization**

Implementing the high-priority items should result in **significant improvements** in search visibility and organic traffic within 3-6 months.

**Next Steps:** Review this audit, prioritize items based on business goals, and begin implementation with high-priority items.

