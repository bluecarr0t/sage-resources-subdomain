# Generative Search Optimization (GSO) & SEO Audit 2025

**Date:** March 4, 2025  
**Last Updated:** March 4, 2025 (Post-Implementation Re-Audit)  
**Domain:** resources.sageoutdooradvisory.com  
**Scope:** GSO (AI answer engines) + Traditional SEO  
**Status:** Active Optimization — Phase 1 Complete

---

## Executive Summary

This audit evaluates the Sage Outdoor Advisory resources subdomain for both **traditional SEO** and **Generative Search Optimization (GSO)**. A re-audit was performed after implementing Phase 1 improvements.

### Overall Scores (Post-Implementation)

| Dimension | Previous | Current | Change |
|-----------|----------|---------|--------|
| **Traditional SEO** | 8.4/10 | 8.7/10 | ↑ |
| **GSO / AI Discoverability** | 7.0/10 | 8.0/10 | ↑ |
| **Technical Infrastructure** | 8.5/10 | 9.0/10 | ↑ |
| **Content Structure for AI** | 6.5/10 | 8.0/10 | ↑ |
| **E-E-A-T Signals** | 6.5/10 | 7.0/10 | ↑ |

### Phase 1 Implementation Summary ✅

| Item | Status | Location |
|------|--------|----------|
| Quick Answer sections | ✅ Done | Guides, landing pages, glossary |
| Key Takeaways sections | ✅ Done | Guides, landing pages |
| Change logs + last-updated timestamps | ✅ Done | Guides, landing pages |
| In-line citations + References | ✅ Done | Feasibility guide, glamping landing |
| Property amenities schema | ✅ Enabled | `app/[locale]/property/[slug]/page.tsx` |
| IndexNow integration | ✅ Done | API route, cron, scripts, docs |
| Sitemap lastmod from content | ✅ Done | All sitemaps use real dates |

---

## Part 1: Current State Analysis

### 1.1 Technical SEO Infrastructure ✅ 9.0/10

**Strengths:**
- Next.js 14 App Router with SSR/SSG
- Dynamic sitemap index (6 sitemaps: main, guides, properties, landing, glossary, images)
- **Sitemap `lastmod` uses real content dates** — `getMostRecentContentDate()` from guides/landing; `getMaxPropertyUpdatedAt()` for properties
- Canonical URLs on all pages
- Hreflang alternates for en, es, fr, de
- `robots.txt` with explicit AI bot allow rules (GPTBot, CCBot, PerplexityBot, anthropic-ai, ClaudeBot, Google-Extended, ChatGPT-User, OAI-SearchBot)
- **IndexNow** — API route `/api/indexnow`, Vercel cron daily, submit script, key file prebuild
- `metadataBase` set correctly
- Open Graph and Twitter Card metadata
- Google Search Console verification (env-based)

**Remaining Gaps:**
- Google verification code may be placeholder if env var unset
- IndexNow requires `INDEXNOW_KEY` env var to be set in production

---

### 1.2 Structured Data (JSON-LD) ✅ 8.5/10

**Implemented:**
- Organization, LocalBusiness/ProfessionalService
- BreadcrumbList
- FAQPage (homepage, property pages, glossary, landing, map)
- HowTo (landing pages with steps)
- Article (landing pages)
- ItemList (guides, map, glamping unit types, **Key Takeaways**)
- Dataset (map)
- WebApplication (map)
- DefinedTerm (glossary)
- SpeakableSpecification (landing, glossary)
- LocalBusiness for properties
- **Property amenities schema** — now enabled
- TouristAttraction for national parks

**Remaining Issues:**
- **Person schema missing** — no author/team markup for E-E-A-T
- **Review schema missing** — testimonials displayed but not marked up
- **WebPage schema** with speakable not on all content pages
- **VideoObject schema** — add when video content exists

---

### 1.3 GSO-Specific Assessment ✅ 8.0/10

#### What GSO Requires (2025 Best Practices)

1. **Structure answers for machines first** ✅
   - **Quick Answer blocks** — 50–150 word direct answers at top of guides, landing pages, glossary
   - Lists, tables, glossary stubs for extraction
   - Factual, jargon-free content

2. **Schema for unambiguous parsing** ✅
   - FAQPage, HowTo, Article, ItemList (Key Takeaways)
   - Validate against visible content

3. **Entity-centric, passage-level content** ✅
   - Self-contained answer blocks (H2/H3)
   - Key Takeaways sections
   - References/citations section

4. **Freshness and authority** ✅
   - **Change logs** and **last-updated timestamps** on guides and landing pages
   - **In-line citations** and References section
   - E-E-A-T: organization info, citations

#### Current GSO Strengths

- AI crawlers explicitly allowed
- **Quick Answer sections** on guides, landing pages, glossary
- **Key Takeaways** on feasibility guide and glamping landing
- **Change logs** and **Last updated** timestamps
- **References** section with primary source citations
- FAQ schema on key pages
- Natural language, conversational tone
- Structured headings (H1, H2, H3)
- Multi-language support with hreflang
- Glossary as canonical definitions
- **IndexNow** for Bing/Copilot fast re-indexing

#### Remaining GSO Gaps

| Gap | Impact | Effort |
|-----|--------|--------|
| **No author bylines** | Missing E-E-A-T for AI training | Low |
| **Quick Answer on more pages** | Only 2 guides + 1 landing have custom quickAnswer; rest use metaDescription fallback | Medium |
| **Key Takeaways on more guides** | Only feasibility guide + glamping landing have keyTakeaways | Low per guide |
| **Citations on more content** | Only feasibility guide + glamping landing have citations | Per-page |

---

### 1.4 Content Structure for AI Extraction ✅ 8.0/10

**Implemented:**
- **Quick Answer blocks** — 50–150 word direct answers at top (guides, landing, glossary)
- **Key Takeaways** — Scannable bullet lists (feasibility guide, glamping landing)
- **References** — Primary source citations with URLs
- **Change log** — Collapsible history of updates
- **Last updated** — Visible date on high-value pages

**Remaining:**
- Expand Quick Answer to more guides (currently 1 guide + 1 landing have custom; others use metaDescription)
- Add Key Takeaways to remaining pillar guides
- Add citations to more guides and landing pages

---

### 1.5 E-E-A-T Signals 🟡 7.0/10

**Present:**
- Organization schema with credentials
- ProfessionalService designation
- Business address and contact
- Comprehensive, detailed content
- **Visible "last updated" dates**
- **Change logs** for transparency
- **In-line citations** and References section

**Missing:**
- Author bylines on guides/articles
- Person schema for team members
- Review schema for testimonials
- Industry affiliations, certifications

---

### 1.6 Performance (SEO/GSO Impact)

From prior audit (unchanged):
- Desktop Performance: 40/100
- Mobile Performance: 61/100
- LCP (mobile): 7.1s (target &lt;2.5s)
- TBT: 2,080ms (critical)
- Google Maps JS contributes ~1,600ms CPU time

**Impact:** Slow pages can reduce crawl depth and AI extraction quality. Performance improvements support both SEO and GSO.

---

## Part 2: Issues & Improvements

### 2.1 Resolved (Phase 1) ✅

| # | Issue | Resolution |
|---|-------|------------|
| 1 | No TL;DR/Quick Answer sections | Added to PillarPageTemplate, LandingPageTemplate, GlossaryTermTemplate |
| 2 | Property amenities schema disabled | Re-enabled in property page |
| 3 | No IndexNow | Implemented API route, cron, scripts, docs |
| 4 | No Key Takeaways | Added type, template, content to feasibility guide + glamping landing |
| 5 | Sitemap lastmod used new Date() | Uses getMostRecentContentDate(), getMaxPropertyUpdatedAt() |
| 6 | No change logs or last-updated | Added changeLog, lastModified display to guides and landing |
| 7 | No in-line citations | Added citations array, References section, in-line [1] in feasibility guide |

### 2.2 Remaining Critical Issues

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 1 | Missing author bylines | All guides, landing pages | Add author name, credentials, short bio |
| 2 | No Review schema for testimonials | Homepage, landing pages | Add Review + AggregateRating schema |
| 3 | IndexNow key not set | Production env | Set INDEXNOW_KEY in Vercel; generate via `openssl rand -hex 16` |

### 2.3 High-Priority Improvements

| # | Improvement | Impact | Effort |
|---|-------------|--------|--------|
| 1 | Add Person schema for authors | E-E-A-T, AI trust | 2–3 hrs |
| 2 | Add Review schema for testimonials | Rich results, trust | 2–3 hrs |
| 3 | Add quickAnswer to more guides | GSO extraction | 1–2 hrs per guide |
| 4 | Add keyTakeaways to more guides | GSO extraction | 1–2 hrs per guide |
| 5 | Add citations to more content | Citation-ready, authority | Per-guide |

### 2.4 Medium-Priority Improvements

| # | Improvement | Impact | Effort |
|---|-------------|--------|--------|
| 1 | Expand FAQ-specific pages | Target question-based queries | 3–4 hrs per page |
| 2 | Add comparison pages ("X vs Y") | Entity coverage, GSO | 4–6 hrs per page |
| 3 | Add VideoObject schema when video exists | Multimodal GSO | 1–2 hrs |
| 4 | Perplexity Publishers Program | Formal citation pathway | 1–2 hrs |
| 5 | Add WebPage + Speakable to more pages | Voice search, assistants | 2–3 hrs |

---

## Part 3: Recommended Future Features

### 3.1 GSO-Specific Features

1. **AI Citation Monitoring**
   - Track brand/site citations across Google AI Overviews, Perplexity, ChatGPT
   - Monitor sentiment when brand is summarized
   - Tools: Geneo, manual spot-checks, or custom scraping

2. **Structured Answer API**
   - Expose FAQ/glossary as machine-readable JSON for AI ingestion
   - Consider `/api/faq` or `/api/glossary` with proper caching

3. **Quarterly GSO Review Cadence**
   - Revalidate schema, robots rules, and content structure
   - Update answer blocks for fast-moving facts (e.g., market data)

4. **Entity Graph Expansion**
   - Add more related-entity links
   - Strengthen internal linking between glossary, guides, and properties

### 3.2 Content Features

1. **Case Studies**
   - Client success stories with Review schema
   - Data-backed, citable outcomes

2. **Calculator/Tool Pages**
   - ROI calculator, occupancy estimator
   - Interactive + downloadable data for Perplexity-style citation

3. **Location-Specific Hubs**
   - State/region pages (e.g., "Glamping in Colorado")
   - Expand beyond current ~5 state pages

4. **Industry News / Trend Content**
   - Timely, citable data (e.g., "2025 Glamping Demand Report")
   - Attach datasets or CSVs where appropriate

### 3.3 Technical Features

1. **Resource Hints**
   - Preconnect to third-party domains (Maps, analytics)
   - Minor performance gain, supports faster parsing

2. **Performance Optimization**
   - Defer Google Maps loading
   - Reduce TBT (2,080ms → &lt;200ms target)

---

## Part 4: Platform-Specific Recommendations

### Google AI Overviews
- No special tags; eligibility via indexability + Search Essentials
- Prioritize: succinct Q&A, authoritative glossary, data-backed explainers with clear sourcing
- **Quick Answer and Key Takeaways** now support this

### Perplexity
- Highly factual pages with concise summaries, tables, diagrams
- **References section** supports citation
- Consider [Perplexity Publishers' Program](https://www.perplexity.ai/hub/blog/introducing-the-perplexity-publishers-program)

### Bing/Copilot
- Robust schema + clean sitemaps (in place)
- **IndexNow** implemented for faster update reflection
- Set INDEXNOW_KEY in production to activate

### ChatGPT
- Visibility depends on content quality + crawler access
- **Quick Answer, Key Takeaways, References** improve clarity
- GPTBot already allowed in robots.txt

---

## Part 5: Implementation Priority Matrix (Updated)

| Priority | Action | Status | GSO Impact | SEO Impact |
|----------|--------|--------|------------|------------|
| P0 | Quick Answer blocks | ✅ Done | High | Medium |
| P0 | Key Takeaways | ✅ Done (2 pages) | High | Medium |
| P0 | Change logs + timestamps | ✅ Done | Medium | Low |
| P0 | In-line citations + References | ✅ Done (2 pages) | High | Medium |
| P0 | Property amenities schema | ✅ Enabled | Low | Low |
| P0 | IndexNow | ✅ Implemented | Medium | Low |
| P0 | Sitemap lastmod from content | ✅ Done | Low | Medium |
| P1 | Add author bylines + Person schema | Pending | High | High |
| P1 | Add Review schema for testimonials | Pending | Medium | High |
| P1 | Set INDEXNOW_KEY in production | Pending | Medium | Low |
| P2 | Expand quickAnswer/keyTakeaways/citations to more pages | Pending | High | Medium |
| P2 | Perplexity Publishers Program | Pending | Medium | Low |
| P3 | Case studies with Review schema | Pending | High | High |
| P3 | Performance optimization | Pending | Medium | High |

---

## Part 6: Monitoring & KPIs

### Weekly
- Targeted outreach to authoritative orgs
- Refresh outdated stats; submit IndexNow if applicable
- Fill content gaps with Q&A stubs, tables, glossaries
- Tighten answer blocks, add/correct schema, upgrade sourcing
- Review newly gained or lost citations

### Monthly
- Review robots/WAF logs for AI crawlers
- Expand entity coverage (new glossary entries)
- Analyze KPI trends; failure audit on declining pages

### KPIs to Track
- **Query coverage:** Breadth of questions where site is referenced
- **Sentiment:** Tone when brand is summarized (positive/neutral/negative)
- **Source share:** Proportion among cited domains for target topics
- **Citation rate:** How often pages appear as sources
- **Traditional:** Rankings, CTR, impressions (Search Console)

---

## References

- [Google: AI features and your website (2025)](https://developers.google.com/search/docs/appearance/ai-features)
- [OpenAI GPTBot documentation](https://platform.openai.com/docs/bots)
- [IndexNow (Bing)](https://www.bing.com/indexnow/getstarted)
- [Perplexity Publishers' Program](https://www.perplexity.ai/hub/blog/introducing-the-perplexity-publishers-program)
- [Schema.org Validator](https://validator.schema.org/)
- [GEO Best Practices 2025 (Geneo)](https://geneo.app/blog/geo-best-practices-ai-search-2025/)
- [Internal: INDEXNOW_SETUP.md](../INDEXNOW_SETUP.md)
- [Internal: SEO_AND_AI_DISCOVERY.md](../i18n/SEO_AND_AI_DISCOVERY.md)
- [Internal: COMPREHENSIVE_SEO_AUDIT_2025.md](./COMPREHENSIVE_SEO_AUDIT_2025.md)
