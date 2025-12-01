# Root Domain Authority Action Plan
**Goal:** Use `resources.sageoutdooradvisory.com` to boost `sageoutdooradvisory.com` domain authority

---

## 🎯 Core Strategy

**The subdomain should:**
1. ✅ Acquire backlinks (easier with educational content)
2. ✅ Pass link equity to root domain (via strategic cross-linking)
3. ✅ Build topical authority (comprehensive content coverage)
4. ✅ Create linkable assets (guides, tools, resources)

---

## 🚀 Immediate Actions (Week 1)

### 1. Root Domain → Subdomain Links (CRITICAL)

**Why:** Pass authority from authoritative root domain to subdomain, which then passes it back

**Actions:**
- [ ] Add "Resources" to root domain main navigation
- [ ] Create `/resources/` hub page on root domain listing all subdomain pages
- [ ] Add subdomain links to root domain footer
- [ ] Add contextual links in root domain blog posts

**Expected Impact:** Subdomain gains authority faster, can then pass more back to root domain

### 2. Enhance Subdomain → Root Domain Linking

**Why:** Direct link equity transfer

**Current Status:** ✅ Good, but can be improved

**Actions:**
- [ ] Add "Related Services" section to each landing page
- [ ] Link to specific service pages (not just homepage)
- [ ] Add service links in glossary definitions
- [ ] Create service-focused CTAs

**Expected Impact:** Direct authority boost to root domain service pages

### 3. Add Organization Schema with sameAs

**Why:** Tell Google the domains are related entities

**File:** `lib/schema.ts`

```typescript
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Sage Outdoor Advisory",
    "url": "https://sageoutdooradvisory.com",
    "sameAs": [
      "https://resources.sageoutdooradvisory.com"
    ],
    "logo": "https://sageoutdooradvisory.com/logo.png"
  };
}
```

**Expected Impact:** Better entity recognition, stronger brand signals

---

## 📈 Content Strategy for Backlinks

### High-Value Linkable Content (Create on Subdomain)

#### 1. Comprehensive Guides (Very Linkable)
- "Complete Guide to Glamping Feasibility Studies" (5000+ words)
- "RV Resort Investment Guide 2025" (4000+ words)
- "Campground Development Playbook" (4000+ words)

**Why:** Long-form, comprehensive guides get linked naturally

#### 2. Interactive Tools (Highly Linkable)
- Glamping ROI Calculator
- RV Resort Investment Calculator
- Feasibility Study Cost Estimator

**Why:** Tools get bookmarked, shared, and linked in roundups

#### 3. Original Research (Very Linkable)
- "2025 Glamping Market Report" (with data)
- "State-by-State RV Resort Analysis"
- "Campground Industry Trends Report"

**Why:** Original data gets cited and linked

#### 4. Comparison Content (Linkable)
- "Glamping vs RV Resort: Which is Right for You?"
- "Feasibility Study vs Appraisal: What's the Difference?"
- "Campground vs RV Park: Investment Comparison"

**Why:** Comparison content ranks well and gets linked

---

## 🔗 Link Building Strategy

### Phase 1: Resource Page Outreach (Easiest Wins)

**Target:** Industry resource pages, directories, link pages

**Process:**
1. Find 100+ resource pages in outdoor hospitality/real estate/glamping
2. Submit subdomain landing pages/guides
3. Get listed with links

**Expected:** 20-30 links in first month

**Tools:**
- Ahrefs: Find resource pages
- Google: "[industry] resources", "[industry] links"
- Competitor backlink analysis

### Phase 2: Guest Posting (Authority Building)

**Target:** Industry blogs, publications, news sites

**Process:**
1. Identify 20-30 target sites
2. Pitch article ideas (link to subdomain resources)
3. Write high-quality guest posts
4. Include links to subdomain content

**Expected:** 5-10 guest posts in 3 months

**Topics:**
- "How to Evaluate a Glamping Investment"
- "The Future of Outdoor Hospitality"
- "Financing Outdoor Hospitality Projects"

### Phase 3: Broken Link Building (Efficient)

**Process:**
1. Find broken links to outdoor hospitality resources
2. Offer subdomain content as replacement
3. Get links to subdomain

**Expected:** 10-15 links in 2 months

### Phase 4: Data-Driven Content (High Authority)

**Process:**
1. Create original research/reports on subdomain
2. Share data with industry publications
3. Get citations and links

**Expected:** 5-10 high-authority links in 3 months

---

## 📊 Cross-Linking Implementation

### Strategic Link Placement

#### From Subdomain to Root Domain:

**Priority 1: Service Pages**
- Every landing page → Relevant service page
- Example: Glamping Feasibility Study → `/our-services/feasibility-studies/glamping-resorts/`

**Priority 2: Conversion Pages**
- Every page → Contact page
- Every page → Service overview page

**Priority 3: Supporting Pages**
- Case studies links
- About page links
- Blog links

#### Anchor Text Strategy:

**40% Branded:**
- "Sage Outdoor Advisory"
- "Sage's services"
- "Sage team"

**30% Service-Focused:**
- "glamping feasibility studies"
- "RV resort appraisals"
- "outdoor hospitality consulting"

**20% Generic:**
- "learn more"
- "our services"
- "contact us"

**10% Exact Match:**
- "feasibility studies"
- "property appraisals"

---

## 🎯 Quick Win: Resources Hub Page

### Create on Root Domain: `/resources/`

**Purpose:**
- Central hub linking to all subdomain content
- Single page with many keyword-rich links
- Can rank for "resources" keywords

**Content Structure:**

```html
<h1>Outdoor Hospitality Resources</h1>

<section>
  <h2>Feasibility Study Guides</h2>
  <ul>
    <li>
      <a href="https://resources.sageoutdooradvisory.com/landing/glamping-feasibility-study">
        Complete Guide to Glamping Feasibility Studies
      </a>
      <p>Comprehensive guide covering market analysis, financial projections, and more...</p>
    </li>
    <!-- More links -->
  </ul>
</section>

<section>
  <h2>Appraisal Resources</h2>
  <!-- Appraisal links -->
</section>

<section>
  <h2>Glossary & Definitions</h2>
  <a href="https://resources.sageoutdooradvisory.com/glossary">View Full Glossary</a>
</section>
```

**SEO Benefits:**
- Many keyword-rich links in one place
- Clear site structure
- Can rank for "outdoor hospitality resources"
- Passes authority to subdomain

---

## 📈 Measurement Plan

### Track These Metrics:

#### Root Domain:
- Domain Authority (Ahrefs/Moz)
- Organic traffic (Google Analytics)
- Keyword rankings (Ahrefs/SEMrush)
- Backlink count (Ahrefs)
- Referring domains (Ahrefs)

#### Subdomain:
- Backlinks acquired
- Organic traffic
- Cross-domain clicks (subdomain → root)
- Rankings for long-tail keywords

#### Cross-Domain Signals:
- Internal link clicks
- Bounce rate from subdomain to root
- Conversion rate from subdomain traffic
- Time on site

### Reporting Schedule:
- **Weekly:** Traffic and rankings
- **Monthly:** Backlink acquisition
- **Quarterly:** Domain Authority changes
- **Quarterly:** Full SEO audit

---

## ✅ 30-Day Quick Start Checklist

### Week 1: Foundation
- [ ] Add subdomain links to root domain navigation
- [ ] Create `/resources/` hub page on root domain
- [ ] Add subdomain links to root domain footer
- [ ] Add Organization schema with sameAs
- [ ] Enhance subdomain → root domain linking

### Week 2: Content
- [ ] Create 1 comprehensive guide (5000+ words)
- [ ] Add 10 more glossary terms
- [ ] Create 3 location-specific landing pages
- [ ] Write 1 guest post pitch

### Week 3: Link Building
- [ ] Submit to 10 resource pages
- [ ] Reach out to 5 broken link opportunities
- [ ] Share content on social media
- [ ] Identify 20 more resource page targets

### Week 4: Optimization
- [ ] Analyze initial results
- [ ] Optimize based on data
- [ ] Plan next month's content
- [ ] Scale successful tactics

---

## 🎯 Expected Results

### 3 Months:
- ✅ 20-30 new backlinks to subdomain
- ✅ 10-15% increase in root domain traffic
- ✅ 2-3 point increase in Domain Authority
- ✅ Strong cross-linking structure

### 6 Months:
- ✅ 50-75 new backlinks to subdomain
- ✅ 25-35% increase in root domain traffic
- ✅ 5-7 point increase in Domain Authority
- ✅ Established topical authority

### 12 Months:
- ✅ 100+ new backlinks to subdomain
- ✅ 50-75% increase in root domain traffic
- ✅ 10-15 point increase in Domain Authority
- ✅ Industry thought leadership

---

## 💡 Key Principles

1. **Quality Over Quantity**
   - 10 quality backlinks > 100 low-quality links
   - Focus on relevant, authoritative sites

2. **Natural Linking**
   - Links should feel natural
   - Focus on user value first
   - SEO follows good UX

3. **Consistent Branding**
   - Same logo, colors, messaging
   - Unified brand experience
   - Strong entity recognition

4. **Long-Term Focus**
   - Domain authority builds over time
   - Be patient and consistent
   - Focus on sustainable growth

---

## 🚨 Critical Success Factors

1. **Root Domain Must Link to Subdomain**
   - This is the foundation
   - Without it, subdomain can't help root domain effectively

2. **Subdomain Must Have Linkable Content**
   - Educational, comprehensive, valuable
   - Not just sales pages

3. **Strategic Cross-Linking**
   - Every subdomain page links to relevant root domain pages
   - Natural, contextual, helpful

4. **Consistent Execution**
   - Regular content creation
   - Ongoing link building
   - Continuous optimization

---

**Next Step:** Start with Week 1 foundation items. The most critical is adding subdomain links to the root domain - this enables everything else.

