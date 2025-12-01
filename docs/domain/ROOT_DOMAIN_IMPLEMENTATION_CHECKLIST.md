# Root Domain Implementation Checklist

## 🎯 Critical: Add Links from Root Domain to Subdomain

This checklist outlines what needs to be implemented on **sageoutdooradvisory.com** (the root domain) to improve SEO for the subdomain.

### ✅ Priority 1: Navigation & Footer (HIGH IMPACT)

#### A. Add to Main Navigation
**Location:** Main navigation menu on root domain

**Options:**
1. **Simple Link:**
   ```html
   <a href="https://resources.sageoutdooradvisory.com">Marketing Resources</a>
   ```

2. **Dropdown Menu:**
   ```
   Resources ▼
   ├─ Marketing Resources → https://resources.sageoutdooradvisory.com
   ├─ Glamping Feasibility → https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study
   ├─ RV Resort Feasibility → https://resources.sageoutdooradvisory.com/landing/rv-resort-feasibility-study
   └─ Campground Feasibility → https://resources.sageoutdooradvisory.com/landing/campground-feasibility-study
   ```

**Anchor Text Options:**
- "Marketing Resources" (branded)
- "Landing Pages" (descriptive)
- "SEO Resources" (keyword-focused)

#### B. Add to Footer
**Location:** Footer section on all pages

**Recommended Structure:**
```html
<div class="footer-section">
  <h4>Marketing Resources</h4>
  <ul>
    <li>
      <a href="https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study">
        Glamping Feasibility Study
      </a>
    </li>
    <li>
      <a href="https://resources.sageoutdooradvisory.com/landing/rv-resort-feasibility-study">
        RV Resort Feasibility Study
      </a>
    </li>
    <li>
      <a href="https://resources.sageoutdooradvisory.com/landing/campground-feasibility-study">
        Campground Feasibility Study
      </a>
    </li>
    <li>
      <a href="https://resources.sageoutdooradvisory.com/landing/glamping-appraisal">
        Glamping Appraisal
      </a>
    </li>
    <li>
      <a href="https://resources.sageoutdooradvisory.com/landing/rv-resort-appraisal">
        RV Resort Appraisal
      </a>
    </li>
    <li>
      <a href="https://resources.sageoutdooradvisory.com">
        View All Landing Pages →
      </a>
    </li>
  </ul>
</div>
```

### ✅ Priority 2: Contextual Content Links (MEDIUM-HIGH IMPACT)

#### A. Service Pages
**Location:** Individual service pages (e.g., `/our-services/feasibility-studies/glamping-resorts/`)

**Add Section:**
```html
<section class="related-resources">
  <h3>Related Marketing Resources</h3>
  <p>
    Learn more about <a href="https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study">
    glamping feasibility studies</a> and how they can help your project succeed.
  </p>
  <ul>
    <li>
      <a href="https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study">
        Complete Guide to Glamping Feasibility Studies
      </a>
    </li>
    <li>
      <a href="https://resources.sageoutdooradvisory.com/landing/how-to-finance-glamping-resort">
        How to Finance a Glamping Resort
      </a>
    </li>
  </ul>
</section>
```

#### B. Blog Posts
**Location:** Blog posts on root domain

**When to Add:**
- When blog post mentions feasibility studies, appraisals, or related topics
- Add 1-2 contextual links per relevant blog post

**Example:**
```markdown
If you're considering a glamping project, our [glamping feasibility study guide]
(https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study) 
provides comprehensive information about the process.
```

#### C. Case Study Pages
**Location:** Client case study pages

**Add Section:**
```html
<section class="related-content">
  <h3>Learn More</h3>
  <p>
    Interested in similar projects? Explore our 
    <a href="https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study">
      glamping feasibility study resources
    </a> or read about 
    <a href="https://resources.sageoutdooradvisory.com/landing/how-to-finance-glamping-resort">
      how to finance glamping resorts
    </a>.
  </p>
</section>
```

### ✅ Priority 3: Create Resources Hub Page (HIGH IMPACT)

#### Create New Page: `/marketing-resources/` or `/landing-pages/`

**Purpose:** Central hub that links to all subdomain landing pages

**Content Structure:**
```html
<h1>Marketing Resources & Landing Pages</h1>
<p>
  Explore our comprehensive collection of landing pages covering feasibility studies, 
  appraisals, and outdoor hospitality consulting services.
</p>

<section>
  <h2>Feasibility Studies</h2>
  <ul>
    <li>
      <a href="https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study">
        Glamping Feasibility Study Guide
      </a>
      <p>Complete guide to glamping feasibility studies...</p>
    </li>
    <li>
      <a href="https://resources.sageoutdooradvisory.com/landing/rv-resort-feasibility-study">
        RV Resort Feasibility Study Guide
      </a>
      <p>Everything you need to know about RV resort feasibility...</p>
    </li>
    <!-- Add all other feasibility study pages -->
  </ul>
</section>

<section>
  <h2>Appraisals</h2>
  <!-- List all appraisal landing pages -->
</section>

<section>
  <h2>Financing & Investment</h2>
  <!-- List financing-related landing pages -->
</section>
```

**SEO Benefits:**
- Single page with many keyword-rich links to subdomain
- Can rank for "marketing resources" and related terms
- Provides clear site structure for search engines

### ✅ Priority 4: Update Sitemap (MEDIUM IMPACT)

**Location:** Root domain XML sitemap

**Action:** Add subdomain homepage and key landing pages to root domain sitemap

**Example:**
```xml
<url>
  <loc>https://resources.sageoutdooradvisory.com</loc>
  <lastmod>2025-01-XX</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>
<url>
  <loc>https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study</loc>
  <lastmod>2025-01-XX</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.7</priority>
</url>
<!-- Add top 5-10 most important landing pages -->
```

### ✅ Priority 5: Homepage Updates (MEDIUM IMPACT)

#### Add to Homepage
**Location:** Main homepage of root domain

**Options:**

1. **Resources Section:**
   ```html
   <section class="resources">
     <h2>Marketing Resources</h2>
     <p>Explore our comprehensive guides and landing pages:</p>
     <div class="resource-grid">
       <a href="https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study">
         Glamping Feasibility Study Guide
       </a>
       <!-- More resources -->
     </div>
   </section>
   ```

2. **CTA Section:**
   ```html
   <section class="cta">
     <h2>Ready to Get Started?</h2>
     <p>
       Learn more about our services or explore our 
       <a href="https://resources.sageoutdooradvisory.com">marketing resources</a>.
     </p>
   </section>
   ```

## 📋 Implementation Priority

### Week 1 (Critical)
- [ ] Add subdomain link to footer
- [ ] Add subdomain link to navigation (or dropdown)
- [ ] Create `/marketing-resources/` hub page

### Week 2 (High Priority)
- [ ] Add contextual links to service pages
- [ ] Add contextual links to 3-5 key blog posts
- [ ] Update root domain sitemap

### Week 3-4 (Ongoing)
- [ ] Add links to case study pages
- [ ] Continue adding contextual links to new blog posts
- [ ] Monitor and optimize anchor text

## 🎯 Anchor Text Best Practices

### ✅ Good Anchor Text Examples:
- "glamping feasibility study" (exact match keyword)
- "RV resort feasibility study guide" (keyword + descriptive)
- "Learn about our glamping services" (natural, contextual)
- "Sage's feasibility study resources" (branded + keyword)
- "outdoor hospitality consulting" (service-focused)

### ❌ Avoid:
- "click here"
- "read more"
- "this page"
- Generic URLs without descriptive text

## 📊 Expected Results Timeline

### Immediate (Week 1-2):
- Improved crawlability of subdomain
- Better indexing of landing pages
- Initial link equity transfer

### Short-term (1-3 months):
- 20-30% increase in organic traffic to subdomain
- Better keyword rankings
- Improved domain authority signals

### Long-term (3-6 months):
- 50-100% increase in organic traffic
- Top rankings for target keywords
- Strong cross-domain authority

## 🔍 Monitoring

### Track These Metrics:
1. **Google Search Console:**
   - Subdomain indexing status
   - Landing page impressions and clicks
   - Keyword rankings

2. **Analytics:**
   - Traffic from root domain to subdomain
   - Landing page performance
   - Conversion rates

3. **Backlink Tools:**
   - Number of root → subdomain links
   - Link equity transfer
   - Domain authority changes

## ⚠️ Important Notes

1. **Natural Linking:** Don't over-optimize. Links should feel natural and provide value to users.

2. **Quality Over Quantity:** A few well-placed, contextual links are better than many forced links.

3. **Consistent Branding:** Maintain consistent messaging and design between domains.

4. **User Experience:** All links should enhance, not detract from, user experience.

5. **Regular Updates:** Keep the resources hub page updated as new landing pages are added.

## 📝 Template Code Snippets

### Footer Section (WordPress/HTML)
```html
<div class="footer-widget">
  <h4 class="widget-title">Marketing Resources</h4>
  <ul class="footer-links">
    <li>
      <a href="https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study">
        Glamping Feasibility Study
      </a>
    </li>
    <li>
      <a href="https://resources.sageoutdooradvisory.com/landing/rv-resort-feasibility-study">
        RV Resort Feasibility Study
      </a>
    </li>
    <li>
      <a href="https://resources.sageoutdooradvisory.com">
        View All Resources →
      </a>
    </li>
  </ul>
</div>
```

### Contextual Link in Content
```html
<p>
  Our <a href="https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study">
  comprehensive glamping feasibility study guide</a> covers everything you need 
  to know about evaluating glamping resort projects.
</p>
```

### Related Resources Section
```html
<aside class="related-resources">
  <h3>Related Marketing Resources</h3>
  <ul>
    <li>
      <a href="https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study">
        Complete Guide to Glamping Feasibility Studies
      </a>
    </li>
    <li>
      <a href="https://resources.sageoutdooradvisory.com/landing/how-to-finance-glamping-resort">
        How to Finance a Glamping Resort
      </a>
    </li>
  </ul>
</aside>
```

