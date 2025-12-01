# Root Domain → Subdomain Links Implementation Guide

**Purpose:** This guide provides ready-to-use code snippets and instructions for adding links from `sageoutdooradvisory.com` to `resources.sageoutdooradvisory.com` to pass domain authority.

**Priority:** CRITICAL - This is the foundation for the entire domain authority strategy.

---

## 1. Add "Resources" to Main Navigation

### Location: Main site header/navigation component

Add a "Resources" link to your main navigation menu:

```html
<!-- Add this to your main navigation -->
<li>
  <a 
    href="https://resources.sageoutdooradvisory.com" 
    class="nav-link"
    aria-label="Outdoor Hospitality Resources"
  >
    Resources
  </a>
</li>
```

**Recommended placement:** Between "Services" and "About" or after "Services"

**Anchor text options:**
- "Resources" (recommended - natural, branded)
- "Resources & Guides"
- "Learning Resources"

---

## 2. Create `/resources/` Hub Page on Root Domain

### File: Create new page at `/resources/index.html` or `/resources/page.tsx` (depending on your framework)

This is a comprehensive hub page that links to all subdomain content. This single page will pass significant authority to the subdomain.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Outdoor Hospitality Resources | Sage Outdoor Advisory</title>
  <meta name="description" content="Comprehensive guides, glossary terms, and resources for glamping resorts, RV parks, and campgrounds. Expert insights on feasibility studies, appraisals, and outdoor hospitality investment.">
  
  <!-- Open Graph -->
  <meta property="og:title" content="Outdoor Hospitality Resources | Sage Outdoor Advisory">
  <meta property="og:description" content="Comprehensive guides, glossary terms, and resources for outdoor hospitality projects.">
  <meta property="og:url" content="https://sageoutdooradvisory.com/resources/">
  <meta property="og:type" content="website">
  
  <!-- Canonical -->
  <link rel="canonical" href="https://sageoutdooradvisory.com/resources/">
</head>
<body>
  <main>
    <header class="page-header">
      <h1>Outdoor Hospitality Resources</h1>
      <p class="lead">
        Comprehensive guides, expert insights, and educational resources for glamping resorts, 
        RV parks, campgrounds, and outdoor hospitality investments.
      </p>
    </header>

    <!-- Feasibility Study Guides Section -->
    <section class="resources-section">
      <h2>Feasibility Study Guides</h2>
      <p class="section-intro">
        Learn everything you need to know about feasibility studies for outdoor hospitality projects. 
        These comprehensive guides cover market analysis, financial projections, and investment validation.
      </p>
      
      <div class="resource-grid">
        <!-- Glamping Feasibility Study -->
        <article class="resource-card">
          <h3>
            <a href="https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study">
              Complete Guide to Glamping Feasibility Studies
            </a>
          </h3>
          <p>
            Expert guide to glamping feasibility studies covering market analysis, financial projections, 
            and validation for your glamping resort project. Learn what banks require and how to prepare.
          </p>
          <a 
            href="https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study" 
            class="resource-link"
            aria-label="Read guide to glamping feasibility studies"
          >
            Read Guide →
          </a>
        </article>

        <!-- RV Resort Feasibility Study -->
        <article class="resource-card">
          <h3>
            <a href="https://resources.sageoutdooradvisory.com/landing/rv-resort-feasibility-study">
              RV Resort Feasibility Study Guide
            </a>
          </h3>
          <p>
            Professional guide to RV resort feasibility studies. Learn about market analysis, 
            competitive positioning, revenue projections, and investment validation for RV resorts.
          </p>
          <a 
            href="https://resources.sageoutdooradvisory.com/landing/rv-resort-feasibility-study" 
            class="resource-link"
            aria-label="Read guide to RV resort feasibility studies"
          >
            Read Guide →
          </a>
        </article>

        <!-- Campground Feasibility Study -->
        <article class="resource-card">
          <h3>
            <a href="https://resources.sageoutdooradvisory.com/landing/campground-feasibility-study">
              Campground Feasibility Study Guide
            </a>
          </h3>
          <p>
            Comprehensive guide to campground feasibility studies. Understand market potential, 
            financial viability, and development considerations for campground projects.
          </p>
          <a 
            href="https://resources.sageoutdooradvisory.com/landing/campground-feasibility-study" 
            class="resource-link"
            aria-label="Read guide to campground feasibility studies"
          >
            Read Guide →
          </a>
        </article>
      </div>
    </section>

    <!-- Appraisal Guides Section -->
    <section class="resources-section">
      <h2>Appraisal & Valuation Resources</h2>
      <p class="section-intro">
        Expert resources on property appraisals and valuations for outdoor hospitality properties. 
        Learn about bank-approved appraisals and property valuation methods.
      </p>
      
      <div class="resource-grid">
        <!-- Glamping Appraisal -->
        <article class="resource-card">
          <h3>
            <a href="https://resources.sageoutdooradvisory.com/landing/glamping-appraisal">
              Glamping Property Appraisal Guide
            </a>
          </h3>
          <p>
            Complete guide to glamping property appraisals. Learn about bank-approved valuations, 
            appraisal methods, and what lenders need for glamping property financing.
          </p>
          <a 
            href="https://resources.sageoutdooradvisory.com/landing/glamping-appraisal" 
            class="resource-link"
            aria-label="Read guide to glamping appraisals"
          >
            Read Guide →
          </a>
        </article>

        <!-- RV Resort Appraisal -->
        <article class="resource-card">
          <h3>
            <a href="https://resources.sageoutdooradvisory.com/landing/rv-resort-appraisal">
              RV Resort Appraisal & Valuation Guide
            </a>
          </h3>
          <p>
            Professional guide to RV resort appraisals. Understand property valuation methods, 
            market comparables, and appraisal requirements for RV resort financing.
          </p>
          <a 
            href="https://resources.sageoutdooradvisory.com/landing/rv-resort-appraisal" 
            class="resource-link"
            aria-label="Read guide to RV resort appraisals"
          >
            Read Guide →
          </a>
        </article>
      </div>
    </section>

    <!-- Financing Guides Section -->
    <section class="resources-section">
      <h2>Financing Guides</h2>
      <p class="section-intro">
        Learn how to secure financing for your outdoor hospitality project. Expert guidance on 
        bank loans, feasibility studies, and appraisal requirements.
      </p>
      
      <div class="resource-grid">
        <!-- How to Finance Glamping Resort -->
        <article class="resource-card">
          <h3>
            <a href="https://resources.sageoutdooradvisory.com/landing/how-to-finance-glamping-resort">
              How to Finance a Glamping Resort
            </a>
          </h3>
          <p>
            Complete step-by-step guide to securing financing for your glamping resort project. 
            Learn what banks require, how to prepare, and how to get approved.
          </p>
          <a 
            href="https://resources.sageoutdooradvisory.com/landing/how-to-finance-glamping-resort" 
            class="resource-link"
            aria-label="Read guide to financing glamping resorts"
          >
            Read Guide →
          </a>
        </article>
      </div>
    </section>

    <!-- Location-Specific Resources Section -->
    <section class="resources-section">
      <h2>Location-Specific Resources</h2>
      <p class="section-intro">
        Market-specific guides and resources for outdoor hospitality projects in key states and regions.
      </p>
      
      <div class="resource-grid">
        <!-- Florida Resources -->
        <article class="resource-card">
          <h3>
            <a href="https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study-florida">
              Glamping Feasibility Study - Florida
            </a>
          </h3>
          <p>
            Expert glamping market analysis and feasibility studies for Florida properties. 
            Understand year-round tourism opportunities and market dynamics.
          </p>
          <a 
            href="https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study-florida" 
            class="resource-link"
          >
            Read Guide →
          </a>
        </article>

        <article class="resource-card">
          <h3>
            <a href="https://resources.sageoutdooradvisory.com/landing/rv-resort-feasibility-study-florida">
              RV Resort Feasibility Study - Florida
            </a>
          </h3>
          <p>
            Professional RV resort market analysis for Florida. Learn about snowbird season, 
            year-round demand, and Florida RV market opportunities.
          </p>
          <a 
            href="https://resources.sageoutdooradvisory.com/landing/rv-resort-feasibility-study-florida" 
            class="resource-link"
          >
            Read Guide →
          </a>
        </article>

        <!-- California Resources -->
        <article class="resource-card">
          <h3>
            <a href="https://resources.sageoutdooradvisory.com/landing/rv-resort-appraisal-california">
              RV Resort Appraisal - California
            </a>
          </h3>
          <p>
            Expert RV resort appraisals for California properties. Bank-approved valuations 
            trusted by California lenders for outdoor hospitality financing.
          </p>
          <a 
            href="https://resources.sageoutdooradvisory.com/landing/rv-resort-appraisal-california" 
            class="resource-link"
          >
            Read Guide →
          </a>
        </article>

        <!-- Colorado Resources -->
        <article class="resource-card">
          <h3>
            <a href="https://resources.sageoutdooradvisory.com/landing/glamping-appraisal-colorado">
              Glamping Appraisal - Colorado
            </a>
          </h3>
          <p>
            Specialized glamping property appraisals for Colorado. Understand mountain resort 
            dynamics and property values for Colorado glamping properties.
          </p>
          <a 
            href="https://resources.sageoutdooradvisory.com/landing/glamping-appraisal-colorado" 
            class="resource-link"
          >
            Read Guide →
          </a>
        </article>

        <!-- Additional location pages -->
        <article class="resource-card">
          <h3>
            <a href="https://resources.sageoutdooradvisory.com/landing/rv-resort-feasibility-study-arizona">
              RV Resort Feasibility Study - Arizona
            </a>
          </h3>
          <p>
            Expert analysis for Arizona RV resort projects. Learn about snowbird season, 
            desert market dynamics, and Arizona outdoor hospitality opportunities.
          </p>
          <a 
            href="https://resources.sageoutdooradvisory.com/landing/rv-resort-feasibility-study-arizona" 
            class="resource-link"
          >
            Read Guide →
          </a>
        </article>

        <article class="resource-card">
          <h3>
            <a href="https://resources.sageoutdooradvisory.com/landing/campground-feasibility-study-north-carolina">
              Campground Feasibility Study - North Carolina
            </a>
          </h3>
          <p>
            Professional campground market analysis for North Carolina. Understand mountain 
            and coastal opportunities for NC campground development.
          </p>
          <a 
            href="https://resources.sageoutdooradvisory.com/landing/campground-feasibility-study-north-carolina" 
            class="resource-link"
          >
            Read Guide →
          </a>
        </article>

        <article class="resource-card">
          <h3>
            <a href="https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study-utah">
              Glamping Feasibility Study - Utah
            </a>
          </h3>
          <p>
            Expert glamping market analysis for Utah. Learn about national park proximity, 
            adventure tourism, and Utah glamping resort opportunities.
          </p>
          <a 
            href="https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study-utah" 
            class="resource-link"
          >
            Read Guide →
          </a>
        </article>

        <article class="resource-card">
          <h3>
            <a href="https://resources.sageoutdooradvisory.com/landing/rv-resort-appraisal-texas">
              RV Resort Appraisal - Texas
            </a>
          </h3>
          <p>
            Professional RV resort appraisals for Texas properties. Bank-approved valuations 
            for diverse Texas markets and RV resort properties.
          </p>
          <a 
            href="https://resources.sageoutdooradvisory.com/landing/rv-resort-appraisal-texas" 
            class="resource-link"
          >
            Read Guide →
          </a>
        </article>

        <article class="resource-card">
          <h3>
            <a href="https://resources.sageoutdooradvisory.com/landing/campground-appraisal-florida">
              Campground Appraisal - Florida
            </a>
          </h3>
          <p>
            Expert campground appraisals for Florida properties. Understand year-round tourism 
            and property values for Florida campground properties.
          </p>
          <a 
            href="https://resources.sageoutdooradvisory.com/landing/campground-appraisal-florida" 
            class="resource-link"
          >
            Read Guide →
          </a>
        </article>

        <article class="resource-card">
          <h3>
            <a href="https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study-oregon">
              Glamping Feasibility Study - Oregon
            </a>
          </h3>
          <p>
            Professional glamping market analysis for Oregon. Learn about Pacific Northwest 
            appeal, eco-tourism, and Oregon glamping resort opportunities.
          </p>
          <a 
            href="https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study-oregon" 
            class="resource-link"
          >
            Read Guide →
          </a>
        </article>

        <article class="resource-card">
          <h3>
            <a href="https://resources.sageoutdooradvisory.com/landing/rv-resort-feasibility-study-tennessee">
              RV Resort Feasibility Study - Tennessee
            </a>
          </h3>
          <p>
            Expert RV resort market analysis for Tennessee. Understand music and tourism appeal, 
            natural landscapes, and Tennessee RV resort opportunities.
          </p>
          <a 
            href="https://resources.sageoutdooradvisory.com/landing/rv-resort-feasibility-study-tennessee" 
            class="resource-link"
          >
            Read Guide →
          </a>
        </article>
      </div>
    </section>

    <!-- Glossary Section -->
    <section class="resources-section">
      <h2>Outdoor Hospitality Glossary</h2>
      <p class="section-intro">
        Comprehensive glossary of terms, definitions, and concepts related to outdoor hospitality, 
        feasibility studies, appraisals, and property investment.
      </p>
      
      <div class="cta-box">
        <h3>Browse Our Complete Glossary</h3>
        <p>
          Access definitions for key terms including feasibility studies, appraisals, market analysis, 
          revenue projections, occupancy rates, and more.
        </p>
        <a 
          href="https://resources.sageoutdooradvisory.com/glossary" 
          class="button-primary"
          aria-label="View complete outdoor hospitality glossary"
        >
          View Full Glossary →
        </a>
      </div>

      <!-- Featured Glossary Terms -->
      <div class="resource-grid">
        <article class="resource-card">
          <h3>
            <a href="https://resources.sageoutdooradvisory.com/glossary/feasibility-study">
              What is a Feasibility Study?
            </a>
          </h3>
          <p>
            Learn about feasibility studies, their components, and why they're essential for 
            outdoor hospitality project financing and development.
          </p>
          <a 
            href="https://resources.sageoutdooradvisory.com/glossary/feasibility-study" 
            class="resource-link"
          >
            Read Definition →
          </a>
        </article>

        <article class="resource-card">
          <h3>
            <a href="https://resources.sageoutdooradvisory.com/glossary/appraisal">
              Property Appraisal Explained
            </a>
          </h3>
          <p>
            Understand property appraisals, valuation methods, and how appraisals are used 
            in outdoor hospitality financing and transactions.
          </p>
          <a 
            href="https://resources.sageoutdooradvisory.com/glossary/appraisal" 
            class="resource-link"
          >
            Read Definition →
          </a>
        </article>

        <article class="resource-card">
          <h3>
            <a href="https://resources.sageoutdooradvisory.com/glossary/market-analysis">
              Market Analysis Guide
            </a>
          </h3>
          <p>
            Learn about market analysis, demand forecasting, and competitive research for 
            outdoor hospitality projects.
          </p>
          <a 
            href="https://resources.sageoutdooradvisory.com/glossary/market-analysis" 
            class="resource-link"
          >
            Read Definition →
          </a>
        </article>

        <article class="resource-card">
          <h3>
            <a href="https://resources.sageoutdooradvisory.com/glossary/revenue-projections">
              Revenue Projections Explained
            </a>
          </h3>
          <p>
            Understand revenue projections, financial modeling, and how to forecast income 
            for glamping resorts, RV parks, and campgrounds.
          </p>
          <a 
            href="https://resources.sageoutdooradvisory.com/glossary/revenue-projections" 
            class="resource-link"
          >
            Read Definition →
          </a>
        </article>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <h2>Ready to Get Started?</h2>
      <p>
        Whether you need a feasibility study, property appraisal, or expert guidance on your 
        outdoor hospitality project, Sage Outdoor Advisory is here to help.
      </p>
      <div class="cta-buttons">
        <a 
          href="https://sageoutdooradvisory.com/contact-us/" 
          class="button-primary"
        >
          Schedule Free Consultation
        </a>
        <a 
          href="https://sageoutdooradvisory.com/our-services/" 
          class="button-secondary"
        >
          View Our Services
        </a>
      </div>
    </section>
  </main>

  <!-- JSON-LD Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Outdoor Hospitality Resources",
    "description": "Comprehensive guides, glossary terms, and resources for glamping resorts, RV parks, and campgrounds.",
    "url": "https://sageoutdooradvisory.com/resources/",
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Glamping Feasibility Study Guide",
          "url": "https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "RV Resort Feasibility Study Guide",
          "url": "https://resources.sageoutdooradvisory.com/landing/rv-resort-feasibility-study"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Campground Feasibility Study Guide",
          "url": "https://resources.sageoutdooradvisory.com/landing/campground-feasibility-study"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Glamping Property Appraisal Guide",
          "url": "https://resources.sageoutdooradvisory.com/landing/glamping-appraisal"
        },
        {
          "@type": "ListItem",
          "position": 5,
          "name": "RV Resort Appraisal Guide",
          "url": "https://resources.sageoutdooradvisory.com/landing/rv-resort-appraisal"
        },
        {
          "@type": "ListItem",
          "position": 6,
          "name": "How to Finance a Glamping Resort",
          "url": "https://resources.sageoutdooradvisory.com/landing/how-to-finance-glamping-resort"
        },
        {
          "@type": "ListItem",
          "position": 7,
          "name": "Outdoor Hospitality Glossary",
          "url": "https://resources.sageoutdooradvisory.com/glossary"
        }
      ]
    }
  }
  </script>
</body>
</html>
```

### CSS Styling (Add to your stylesheet)

```css
/* Resources Hub Page Styles */
.resources-section {
  margin: 3rem 0;
  padding: 2rem 0;
}

.resources-section h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #1a1a1a;
}

.section-intro {
  font-size: 1.125rem;
  color: #666;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.resource-card {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 1.5rem;
  transition: box-shadow 0.3s ease;
}

.resource-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #00b6a6;
}

.resource-card h3 {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
}

.resource-card h3 a {
  color: #1a1a1a;
  text-decoration: none;
}

.resource-card h3 a:hover {
  color: #00b6a6;
}

.resource-card p {
  color: #666;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.resource-link {
  color: #00b6a6;
  text-decoration: none;
  font-weight: 500;
  display: inline-block;
  margin-top: 0.5rem;
}

.resource-link:hover {
  color: #009688;
  text-decoration: underline;
}

.cta-box {
  background: #f8f9fa;
  border: 2px solid #00b6a6;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  margin: 2rem 0;
}

.cta-section {
  background: #00b6a6;
  color: #fff;
  padding: 3rem 2rem;
  text-align: center;
  border-radius: 8px;
  margin: 3rem 0;
}

.cta-section h2 {
  color: #fff;
  margin-bottom: 1rem;
}

.cta-section p {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.125rem;
  margin-bottom: 2rem;
}

.cta-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.button-primary {
  background: #fff;
  color: #00b6a6;
  padding: 0.75rem 2rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  display: inline-block;
  transition: background 0.3s ease;
}

.button-primary:hover {
  background: #f0f0f0;
}

.button-secondary {
  background: transparent;
  color: #fff;
  border: 2px solid #fff;
  padding: 0.75rem 2rem;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  display: inline-block;
  transition: background 0.3s ease;
}

.button-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
}
```

---

## 3. Add Subdomain Links to Footer

### Location: Site footer component

Add a "Resources" section to your footer:

```html
<!-- Add this to your footer -->
<div class="footer-section">
  <h4>Resources</h4>
  <ul class="footer-links">
    <li>
      <a href="https://resources.sageoutdooradvisory.com">
        All Resources
      </a>
    </li>
    <li>
      <a href="https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study">
        Glamping Feasibility Guide
      </a>
    </li>
    <li>
      <a href="https://resources.sageoutdooradvisory.com/landing/rv-resort-feasibility-study">
        RV Resort Feasibility Guide
      </a>
    </li>
    <li>
      <a href="https://resources.sageoutdooradvisory.com/glossary">
        Glossary
      </a>
    </li>
  </ul>
</div>
```

**Alternative: Simple single link**

```html
<div class="footer-section">
  <h4>Resources</h4>
  <ul class="footer-links">
    <li>
      <a href="https://resources.sageoutdooradvisory.com">
        Outdoor Hospitality Resources →
      </a>
    </li>
  </ul>
</div>
```

---

## 4. Add Contextual Links in Blog Posts

### Strategy: Add relevant subdomain links in existing and new blog posts

**Where to add links:**
- In blog post introductions mentioning feasibility studies
- When discussing appraisals or valuations
- When explaining industry terms
- In "Related Resources" sections at the end of posts

**Example blog post snippet:**

```html
<!-- In a blog post about glamping investment -->
<p>
  Before investing in a glamping resort, it's essential to conduct a comprehensive 
  <a href="https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study">
    glamping feasibility study
  </a> to validate market potential and financial viability. 
  Learn more about 
  <a href="https://resources.sageoutdooradvisory.com/glossary/feasibility-study">
    what a feasibility study includes
  </a> and how it can help secure financing for your project.
</p>
```

**Anchor text best practices:**
- Use natural, descriptive anchor text
- Link to relevant, specific pages (not just homepage)
- Mix branded and keyword-rich anchor text
- Don't over-optimize - keep it natural

---

## 5. Add Links to Service Pages

### Location: Service pages (e.g., `/our-services/feasibility-studies/glamping-resorts/`)

Add contextual links to relevant subdomain resources:

```html
<!-- On glamping feasibility study service page -->
<section class="related-resources">
  <h2>Learn More About Glamping Feasibility Studies</h2>
  <p>
    Explore our comprehensive guides and resources to understand glamping feasibility studies:
  </p>
  <ul>
    <li>
      <a href="https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study">
        Complete Guide to Glamping Feasibility Studies
      </a>
    </li>
    <li>
      <a href="https://resources.sageoutdooradvisory.com/glossary/feasibility-study">
        What is a Feasibility Study?
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

---

## 6. Implementation Checklist

- [ ] Add "Resources" link to main navigation
- [ ] Create `/resources/` hub page with all subdomain links
- [ ] Add "Resources" section to footer
- [ ] Add contextual links to 5-10 existing blog posts
- [ ] Add resource links to service pages
- [ ] Test all links are working
- [ ] Verify links open in same tab (not new window)
- [ ] Check mobile responsiveness of `/resources/` page
- [ ] Submit `/resources/` page to Google Search Console

---

## 7. Expected Impact

**Immediate (Week 1-2):**
- Subdomain receives initial authority boost from root domain
- `/resources/` page starts ranking for "outdoor hospitality resources"
- Increased internal link flow to subdomain

**Short-term (Month 1-3):**
- Subdomain pages start ranking for long-tail keywords
- Increased organic traffic to subdomain
- Better cross-domain authority flow

**Long-term (3-6 months):**
- Subdomain builds its own authority
- Can pass more authority back to root domain
- Improved rankings for both domains

---

## 8. Monitoring & Measurement

**Track these metrics:**
- Organic traffic to `/resources/` page (Google Analytics)
- Clicks from root domain to subdomain (Google Analytics)
- Subdomain organic traffic growth
- Rankings for "outdoor hospitality resources" keyword
- Domain Authority changes (Ahrefs/Moz)

**Reporting:**
- Weekly: Traffic and click-through rates
- Monthly: Rankings and authority metrics
- Quarterly: Full cross-domain analysis

---

## Questions or Issues?

If you need help implementing any of these changes, contact the development team or refer to the main action plan document: `ROOT_DOMAIN_AUTHORITY_ACTION_PLAN.md`

