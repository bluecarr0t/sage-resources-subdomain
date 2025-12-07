# Subdomain → Root Domain Linking Enhancements

**Date:** January 2025  
**Status:** ✅ Complete

---

## Summary

Enhanced subdomain → root domain linking to improve direct link equity transfer and boost authority to root domain service pages. All improvements are implemented and active.

---

## ✅ Completed Enhancements

### 1. Related Services Section on Landing Pages

**What:** Added a new "Related Services" section to each landing page that links to specific service pages on the root domain (not just homepage).

**Implementation:**
- Added `relatedServices` field to `LandingPageContent` interface
- Created service-focused sections with 3 service cards per landing page
- Each service card includes:
  - Service name (linked to specific service page)
  - Service description
  - "Learn More" link
  - "View All Services" CTA button

**Files Modified:**
- `lib/landing-pages.ts` - Added `relatedServices` to 6 main landing pages:
  - `glamping-feasibility-study` → Links to glamping feasibility, glamping appraisal, RV resort feasibility
  - `rv-resort-feasibility-study` → Links to RV resort feasibility, RV resort appraisal, campground feasibility
  - `campground-feasibility-study` → Links to campground feasibility, campground appraisal, RV resort feasibility
  - `glamping-appraisal` → Links to glamping appraisal, glamping feasibility, RV resort appraisal
  - `rv-resort-appraisal` → Links to RV resort appraisal, RV resort feasibility, glamping appraisal
  - `how-to-finance-glamping-resort` → Links to glamping feasibility, glamping appraisal, all services

- `components/LandingPageTemplate.tsx` - Added "Related Services" section component

**Example Service Links:**
- `https://sageoutdooradvisory.com/our-services/feasibility-studies/glamping-resorts/`
- `https://sageoutdooradvisory.com/our-services/appraisals/glamping-resorts/`
- `https://sageoutdooradvisory.com/our-services/feasibility-studies/rv-resorts/`
- `https://sageoutdooradvisory.com/appraisal-rv-parks/`
- `https://sageoutdooradvisory.com/our-services/feasibility-studies/campgrounds/`

**Impact:** Direct authority boost to specific service pages instead of just homepage.

---

### 2. Enhanced Service Links in Glossary Definitions

**What:** Updated key glossary terms to include specific service page links instead of generic service links.

**Implementation:**
- Enhanced `internalLinks` in glossary terms:
  - `feasibility-study` → Now includes links to:
    - Glamping Feasibility Study Services
    - RV Resort Feasibility Study Services
    - Campground Feasibility Study Services
    - All Feasibility Study Services
  
  - `appraisal` → Now includes links to:
    - Glamping Property Appraisal Services
    - RV Resort Appraisal Services
    - All Appraisal Services

**Files Modified:**
- `lib/glossary.ts` - Enhanced service links in key terms

**Impact:** More targeted link equity to specific service pages from glossary content.

---

### 3. Service-Focused CTAs

**What:** Enhanced CTAs throughout landing pages to include service-focused links.

**Implementation:**
- CTA sections now include:
  - Primary CTA: "Schedule Free Consultation" (contact page)
  - Secondary CTA: "Learn More About Our Services" (services page)
  - Related Services section with specific service links
  - "View All Services" button in Related Services section

**Files Modified:**
- `components/LandingPageTemplate.tsx` - Enhanced CTA section

**Impact:** Multiple conversion paths and better service page discovery.

---

### 4. Organization Schema with sameAs (Verified)

**What:** Organization schema already implemented to tell Google the domains are related entities.

**Status:** ✅ Already Complete

**Implementation:**
- `generateOrganizationSchema()` function in `lib/schema.ts`
- Integrated into all landing pages via `LandingPageTemplate.tsx`
- Includes `sameAs` property linking to subdomain

**Code:**
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

**Impact:** Better entity recognition and stronger brand signals for both domains.

---

## 📊 Expected Impact

### Immediate (Week 1-2):
- Increased clicks from subdomain to root domain service pages
- Better internal link flow to specific service pages
- Improved user journey from resources to services

### Short-term (Month 1-3):
- Direct authority boost to root domain service pages
- Improved rankings for service page keywords
- 10-15% increase in service page traffic
- Better conversion rates from subdomain traffic

### Long-term (3-6 months):
- Stronger service page rankings
- Increased service page conversions
- Better overall domain authority distribution
- Improved cross-domain authority flow

---

## 📈 Metrics to Track

### Service Page Metrics:
- Organic traffic to specific service pages
- Clicks from subdomain to service pages (Google Analytics)
- Service page conversion rates
- Rankings for service-specific keywords

### Subdomain Metrics:
- Cross-domain click-through rate
- Bounce rate from subdomain to root domain
- Time on site after clicking to root domain
- Conversion rate from subdomain traffic

### Cross-Domain Metrics:
- Internal link clicks (subdomain → root service pages)
- Service page engagement metrics
- Conversion funnel from resources to services

---

## 🎯 Key Improvements

1. **Specific Service Links** - Links now go to specific service pages, not just homepage
2. **Multiple Link Points** - Related Services section, glossary links, and CTAs all link to services
3. **Natural Anchor Text** - Service-focused, descriptive anchor text (not over-optimized)
4. **User Value** - Links are contextual and helpful to users
5. **SEO Value** - Passes authority to specific service pages

---

## 📝 Files Modified

### Core Files:
- ✅ `lib/landing-pages.ts` - Added `relatedServices` field and data
- ✅ `components/LandingPageTemplate.tsx` - Added Related Services section
- ✅ `lib/glossary.ts` - Enhanced service links in key terms
- ✅ `components/GlossaryTermTemplate.tsx` - Fixed color consistency

### Schema Files:
- ✅ `lib/schema.ts` - Organization schema (already implemented)

---

## ✅ Implementation Checklist

- [x] Add `relatedServices` field to `LandingPageContent` interface
- [x] Add Related Services data to 6 main landing pages
- [x] Create Related Services section component in template
- [x] Enhance glossary terms with specific service links
- [x] Verify Organization schema is implemented
- [x] Test all service links are working
- [x] Verify mobile responsiveness
- [x] Check color consistency (teal branding)

---

## 🚀 Next Steps

1. **Monitor Results:**
   - Track service page traffic in Google Analytics
   - Monitor cross-domain click-through rates
   - Track service page rankings

2. **Optimize Based on Data:**
   - Identify which service links get most clicks
   - Adjust Related Services based on performance
   - Add more service links to high-traffic glossary terms

3. **Scale:**
   - Add Related Services to location-based landing pages
   - Enhance more glossary terms with service links
   - Create service-focused content on subdomain

---

## 📚 Related Documentation

- `ROOT_DOMAIN_AUTHORITY_ACTION_PLAN.md` - Overall strategy
- `ROOT_DOMAIN_IMPLEMENTATION_GUIDE.md` - Root domain implementation
- `ROOT_DOMAIN_LINKS_IMPLEMENTATION_SUMMARY.md` - Root domain links summary

---

**Status:** ✅ All enhancements complete and ready for monitoring

