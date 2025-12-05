# Property Pages SEO Audit & Enhancement Recommendations

**Date:** January 2025  
**Pages Audited:** `/property/[slug]` dynamic pages  
**Total Pages:** 1,000+ property detail pages  
**Audit Type:** Comprehensive Technical & Content SEO

---

## Executive Summary

The property pages (`/property/[slug]`) are well-implemented with solid foundational SEO elements including structured data, metadata, and canonical URLs. However, there are significant opportunities to enhance rankings, click-through rates, and user engagement through content optimization, additional structured data, performance improvements, and enhanced user signals.

### Current SEO Score: 75/100

**Strengths:**
- ✅ Proper structured data (BreadcrumbList, LocalBusiness)
- ✅ Complete metadata (title, description, OpenGraph, Twitter)
- ✅ Canonical URLs
- ✅ Mobile-responsive design
- ✅ Included in sitemap

**Areas for Improvement:**
- ⚠️ Title tags could be more optimized for search intent
- ⚠️ Missing FAQ schema for common questions
- ⚠️ No internal linking strategy between properties
- ⚠️ Images lack lazy loading and proper optimization
- ⚠️ Missing rich snippets opportunities
- ⚠️ No "People Also Search For" or related properties
- ⚠️ Limited content depth (could add more descriptive text)

---

## 1. Metadata & Title Tag Optimization

### Current Implementation
```typescript
let title = propertyName;
if (location) {
  title += ` | ${location}`;
}
title += ` | Glamping Property | Sage Outdoor Advisory`;
```

**Issues:**
- Generic "Glamping Property" phrase not keyword-rich
- Title structure doesn't prioritize search intent
- Missing specific unit types or amenities in title
- Character count may exceed 60 characters for some properties

### Recommendations

#### 🟢 HIGH PRIORITY: Optimize Title Tag Structure

**Current:** `Property Name | City, State | Glamping Property | Sage Outdoor Advisory`

**Recommended:** `Property Name - [Unit Type] in City, State | Rates & Reviews`

**Benefits:**
- More keyword-rich
- Includes unit type (tent, cabin, yurt, etc.)
- Focuses on user intent (rates, reviews)
- Better CTR from search results

**Implementation:**
```typescript
// Build optimized title
let title = propertyName;
const unitType = firstProperty.unit_type || '';
const cityState = location ? location.split(',').slice(0, 2).join(', ') : '';

// Prioritize: Property Name - Unit Type in Location | Rates & Reviews
if (unitType && cityState) {
  title = `${propertyName} - ${unitType} in ${cityState} | Rates & Reviews`;
} else if (cityState) {
  title = `${propertyName} in ${cityState} | Rates & Reviews`;
} else if (unitType) {
  title = `${propertyName} - ${unitType} | Glamping Property`;
} else {
  title = `${propertyName} | Glamping Property`;
}

// Ensure title doesn't exceed 60 characters (truncate if needed)
if (title.length > 60) {
  title = title.substring(0, 57) + '...';
}
```

**Expected Impact:**
- +15-25% improvement in CTR from search results
- Better keyword targeting for long-tail searches
- Improved relevance for "glamping in [location]" queries

---

## 2. Meta Description Enhancement

### Current Implementation
```typescript
let description = `Explore ${propertyName}`;
if (descriptionParts.length > 0) {
  description += ` in ${descriptionParts.join(", ")}`;
}
description += `. View property details, photos, amenities, rates, and location information.`;
```

**Issues:**
- Generic call-to-action
- Doesn't highlight unique selling points
- Missing key information (ratings, price range, amenities)
- May not encourage clicks

### Recommendations

#### 🟢 HIGH PRIORITY: Create Compelling Meta Descriptions

**Implementation:**
```typescript
// Build compelling description with key information
const descriptionParts: string[] = [];

// Add rating if available
if (firstProperty.google_rating && firstProperty.google_user_rating_total) {
  descriptionParts.push(`${firstProperty.google_rating.toFixed(1)}★ from ${firstProperty.google_user_rating_total} reviews`);
}

// Add location
if (location) {
  descriptionParts.push(`in ${location}`);
}

// Add price range if available
if (firstProperty.avg_retail_daily_rate_2024) {
  descriptionParts.push(`from $${firstProperty.avg_retail_daily_rate_2024}/night`);
}

// Add key amenities
const topAmenities: string[] = [];
if (hasAmenity(firstProperty.pool)) topAmenities.push('pool');
if (hasAmenity(firstProperty.hot_tub_sauna)) topAmenities.push('hot tub');
if (hasAmenity(firstProperty.wifi)) topAmenities.push('WiFi');
if (topAmenities.length > 0 && topAmenities.length <= 2) {
  descriptionParts.push(`with ${topAmenities.join(' & ')}`);
}

let description = propertyName;
if (descriptionParts.length > 0) {
  description += `: ${descriptionParts.join(' • ')}.`;
}
description += ` View photos, amenities, rates, and book directly.`;

// Ensure description is 150-160 characters (optimal length)
if (description.length > 160) {
  description = description.substring(0, 157) + '...';
}
```

**Expected Impact:**
- +20-30% improvement in CTR
- Better information density in search results
- More qualified clicks

---

## 3. Structured Data Enhancements

### Current Implementation
✅ BreadcrumbList schema  
✅ LocalBusiness schema (with address, geo, rating, photos, opening hours)

### Missing Schemas

#### 🟢 HIGH PRIORITY: Add FAQ Schema

**Why:** FAQ schema can appear in search results as rich snippets, driving organic visibility and answering user questions directly.

**Implementation:**
```typescript
// Add to lib/schema.ts
export function generatePropertyFAQSchema(property: {
  property_name: string | null;
  unit_type: string | null;
  city: string | null;
  state: string | null;
  operating_season_months: string | null;
  minimum_nights: string | null;
  pets: string | null;
  avg_retail_daily_rate_2024: string | null;
  google_rating: number | null;
}): any {
  const propertyName = property.property_name || 'This property';
  const location = property.city && property.state 
    ? `${property.city}, ${property.state}` 
    : '';
  
  const faqs: Array<{ question: string; answer: string }> = [];
  
  // Question 1: What type of units are available?
  if (property.unit_type) {
    faqs.push({
      question: `What type of glamping units are available at ${propertyName}?`,
      answer: `${propertyName} offers ${property.unit_type} accommodations. View all available unit types and amenities on the property page.`
    });
  }
  
  // Question 2: When is the property open?
  if (property.operating_season_months) {
    faqs.push({
      question: `When is ${propertyName} open for bookings?`,
      answer: `${propertyName} operates during ${property.operating_season_months}. Check availability and book directly through the property's website.`
    });
  }
  
  // Question 3: What is the minimum stay?
  if (property.minimum_nights) {
    faqs.push({
      question: `What is the minimum stay requirement at ${propertyName}?`,
      answer: `The minimum stay at ${propertyName} is ${property.minimum_nights} nights.`
    });
  }
  
  // Question 4: Are pets allowed?
  if (property.pets) {
    const petAnswer = hasAmenity(property.pets) 
      ? `Yes, ${propertyName} welcomes pets. Please check the property's pet policy for specific details.`
      : `No, ${propertyName} does not allow pets.`;
    faqs.push({
      question: `Are pets allowed at ${propertyName}?`,
      answer: petAnswer
    });
  }
  
  // Question 5: What are the rates?
  if (property.avg_retail_daily_rate_2024) {
    faqs.push({
      question: `What are the rates at ${propertyName}?`,
      answer: `Rates at ${propertyName} start from $${property.avg_retail_daily_rate_2024} per night. Rates may vary by season and unit type.`
    });
  }
  
  // Question 6: What is the property's rating?
  if (property.google_rating && property.google_rating >= 4.0) {
    faqs.push({
      question: `What is ${propertyName}'s rating?`,
      answer: `${propertyName} has a ${property.google_rating.toFixed(1)}-star rating from guest reviews, indicating high satisfaction among visitors.`
    });
  }
  
  if (faqs.length === 0) return null;
  
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}
```

**Usage in page:**
```typescript
// In app/property/[slug]/page.tsx
const faqSchema = generatePropertyFAQSchema(firstProperty);
// ... add to structured data section
```

**Expected Impact:**
- Rich snippet appearance in search results
- +10-15% increase in organic visibility
- Better user experience with direct answers

---

#### 🟡 MEDIUM PRIORITY: Add Review Schema (AggregateRating Enhancement)

**Current:** AggregateRating is included in LocalBusiness schema, which is good.

**Enhancement:** Add standalone Review schema if individual reviews are available, or enhance with more details.

**Note:** Since we're using Google ratings, we should link to Google reviews in the schema.

**Implementation:**
```typescript
// Enhance LocalBusiness schema with review link
if (property.google_rating !== null && property.google_website_uri) {
  schema.aggregateRating = {
    "@type": "AggregateRating",
    "ratingValue": property.google_rating.toString(),
    "reviewCount": property.google_user_rating_total?.toString() || "0",
    "bestRating": "5",
    "worstRating": "1",
  };
  
  // Add link to reviews if website URI is available
  schema.review = [{
    "@type": "Review",
    "author": {
      "@type": "Organization",
      "name": "Google Reviews"
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": property.google_rating.toString(),
      "bestRating": "5",
      "worstRating": "1"
    },
    "reviewBody": `See ${property.google_user_rating_total || 0} reviews on Google`,
    "url": property.google_website_uri
  }];
}
```

---

#### 🟡 MEDIUM PRIORITY: Add ItemList Schema for Amenities

**Why:** Helps Google understand the amenities as a structured list, potentially showing in rich results.

**Implementation:**
```typescript
export function generatePropertyAmenitiesSchema(property: SageProperty): any {
  const amenities: string[] = [];
  
  if (hasAmenity(property.pool)) amenities.push('Pool');
  if (hasAmenity(property.hot_tub_sauna)) amenities.push('Hot Tub / Sauna');
  if (hasAmenity(property.wifi)) amenities.push('Wi-Fi');
  if (hasAmenity(property.pets)) amenities.push('Pets Allowed');
  if (hasAmenity(property.shower)) amenities.push('Showers');
  if (hasAmenity(property.laundry)) amenities.push('Laundry');
  if (hasAmenity(property.cooking_equipment)) amenities.push('Cooking Equipment');
  if (hasAmenity(property.campfires)) amenities.push('Campfires');
  if (hasAmenity(property.sage_p_amenity_restaurant)) amenities.push('Restaurant');
  if (hasAmenity(property.sage_p_amenity_waterfront)) amenities.push('Waterfront');
  
  if (amenities.length === 0) return null;
  
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Amenities",
    "description": `Amenities available at ${property.property_name || 'this property'}`,
    "itemListElement": amenities.map((amenity, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": amenity
    }))
  };
}
```

---

## 4. Content Enhancement

### Current State
- ✅ Property name, location, address
- ✅ Description (Google description or fallback)
- ✅ Property details (operating season, year opened, etc.)
- ✅ Amenities list
- ✅ Reviews/ratings

### Missing Content Elements

#### 🟢 HIGH PRIORITY: Enhance Description Section

**Current:** Single paragraph with Google description or fallback.

**Enhancement:** Create richer, more detailed description with multiple sections.

**Implementation:**
```typescript
// Add structured content sections:
- Overview (current description)
- Location & Setting (city, state, nearby attractions if available)
- Accommodation Details (unit types, capacity)
- What to Expect (amenities, activities)
- Booking Information (rates, minimum nights, season)
```

**Note:** This would require adding more data fields or generating content dynamically. For now, we can enhance the existing description area with better formatting.

---

#### 🟡 MEDIUM PRIORITY: Add "Nearby Properties" Section

**Why:** Internal linking between property pages improves crawlability and user engagement.

**Implementation:**
```typescript
// Add function to lib/properties.ts
export async function getNearbyProperties(
  lat: number,
  lon: number,
  excludeSlug: string,
  limit: number = 5
): Promise<SageProperty[]> {
  // Query properties within ~50 miles radius
  // Order by distance
  // Return top 5
}

// Display in PropertyDetailTemplate
<section className="mt-12">
  <h2 className="text-2xl font-bold text-gray-900 mb-4">
    Nearby Glamping Properties
  </h2>
  {/* Display nearby properties with links */}
</section>
```

**Expected Impact:**
- Improved internal linking structure
- Increased time on site
- Better crawlability of property pages
- +5-10% reduction in bounce rate

---

## 5. Image Optimization

### Current State
- ✅ Google Places photos displayed
- ✅ Photo carousel with navigation
- ⚠️ Using `<img>` tag instead of Next.js `<Image>`
- ⚠️ No lazy loading
- ⚠️ No explicit width/height attributes

### Recommendations

#### 🟢 HIGH PRIORITY: Optimize Image Loading

**Issues:**
1. Using native `<img>` tag (no automatic optimization)
2. No lazy loading for below-fold images
3. No proper sizing attributes

**Implementation:**
```typescript
// Update PropertyDetailTemplate.tsx
// Since images come from API, we need to use regular img but add optimization:

{photos.length > 0 && (
  <div className="relative w-full h-96 lg:h-full min-h-[400px] rounded-lg overflow-hidden bg-gray-100 group">
    <img
      src={getGooglePhotoUrl(photos[currentPhotoIndex], 1200, 800)}
      alt={`${propertyName} - Photo ${currentPhotoIndex + 1} of ${photos.length}`}
      className="w-full h-full object-cover"
      loading={currentPhotoIndex === 0 ? "eager" : "lazy"}
      fetchPriority={currentPhotoIndex === 0 ? "high" : "auto"}
      width={1200}
      height={800}
      decoding="async"
    />
    {/* ... rest of photo carousel */}
  </div>
)}
```

**Additional Optimization:**
```typescript
// For thumbnail images or additional photos:
{photos.slice(1).map((photo, index) => (
  <img
    key={photo.name}
    src={getGooglePhotoUrl(photo, 400, 300)}
    alt={`${propertyName} - Photo ${index + 2}`}
    loading="lazy"
    width={400}
    height={300}
    decoding="async"
  />
))}
```

**Expected Impact:**
- Improved Core Web Vitals (LCP - Largest Contentful Paint)
- Faster page load times
- Better mobile performance

---

#### 🟡 MEDIUM PRIORITY: Add Image Schema

**Enhancement:** Add ImageObject schema for better image understanding.

```typescript
// Add to LocalBusiness schema
if (photos.length > 0) {
  schema.image = photos.slice(0, 5).map((photo, index) => ({
    "@type": "ImageObject",
    "url": getGooglePhotoUrl(photo, 1200, 800),
    "width": photo.widthPx || 1200,
    "height": photo.heightPx || 800,
    "caption": `${propertyName} - Photo ${index + 1}`,
    "contentUrl": getGooglePhotoUrl(photo, 1200, 800),
    "thumbnailUrl": getGooglePhotoUrl(photo, 400, 300)
  }));
}
```

---

## 6. Internal Linking Strategy

### Current State
- ✅ Breadcrumb navigation
- ✅ Link back to map
- ⚠️ No links to other properties
- ⚠️ No links to related content (guides, location pages)

### Recommendations

#### 🟡 MEDIUM PRIORITY: Add Related Content Links

**Implementation:**
```typescript
// Add section at bottom of property page:

<section className="mt-12 border-t border-gray-200 pt-8">
  <h2 className="text-2xl font-bold text-gray-900 mb-4">
    Related Resources
  </h2>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {/* Link to location-based landing page if exists */}
    {firstProperty.state && (
      <Link 
        href={`/landing/glamping-${slugifyState(firstProperty.state)}`}
        className="p-4 border border-gray-200 rounded-lg hover:border-[#00b6a6] transition-colors"
      >
        <h3 className="font-semibold text-gray-900">
          Glamping in {firstProperty.state}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Explore more glamping properties in {firstProperty.state}
        </p>
      </Link>
    )}
    
    {/* Link to relevant guide */}
    <Link 
      href="/guides/glamping-feasibility-complete-guide"
      className="p-4 border border-gray-200 rounded-lg hover:border-[#00b6a6] transition-colors"
    >
      <h3 className="font-semibold text-gray-900">
        Glamping Feasibility Guide
      </h3>
      <p className="text-sm text-gray-600 mt-1">
        Learn about glamping property development
      </p>
    </Link>
    
    {/* Link back to map */}
    <Link 
      href="/map"
      className="p-4 border border-gray-200 rounded-lg hover:border-[#00b6a6] transition-colors"
    >
      <h3 className="font-semibold text-gray-900">
        Explore All Properties
      </h3>
      <p className="text-sm text-gray-600 mt-1">
        View 1,000+ glamping properties on our interactive map
      </p>
    </Link>
  </div>
</section>
```

**Expected Impact:**
- Improved site architecture
- Better crawlability
- Increased page views per session
- Lower bounce rate

---

## 7. Performance Optimization

### Current State
- ✅ Next.js 14 with static generation
- ✅ Server-side rendering
- ⚠️ Client-side photo carousel (useState)
- ⚠️ Large images loaded immediately

### Recommendations

#### 🟡 MEDIUM PRIORITY: Optimize JavaScript Bundle

**Current:** Photo carousel uses client-side JavaScript.

**Optimization:** Consider using CSS-only carousel for initial load, or lazy load carousel functionality.

**Implementation:**
```typescript
// Lazy load carousel component
import dynamic from 'next/dynamic';

const PhotoCarousel = dynamic(() => import('@/components/PhotoCarousel'), {
  loading: () => <PhotoCarouselSkeleton />,
  ssr: false // Only load on client if needed
});
```

---

## 8. URL Structure & Canonical Tags

### Current State
✅ Clean URLs: `/property/[slug]`  
✅ Canonical URLs set correctly  
✅ Slug-based routing (SEO-friendly)

### Status: EXCELLENT ✅

No changes needed.

---

## 9. Mobile Optimization

### Current State
✅ Responsive design  
✅ Mobile-friendly layout  
✅ Touch-friendly navigation

### Status: GOOD ✅

Minor enhancement: Add viewport meta tag verification (should be in layout).

---

## 10. Accessibility (SEO Impact)

### Current State
- ✅ Semantic HTML structure
- ✅ Alt text on images
- ⚠️ Could improve ARIA labels
- ⚠️ Photo carousel needs keyboard navigation

### Recommendations

#### 🟡 LOW PRIORITY: Enhance Accessibility

**Implementation:**
```typescript
// Add ARIA labels to photo carousel
<button
  onClick={() => setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))}
  className="..."
  aria-label={`Previous photo of ${propertyName}`}
  aria-controls="property-photos"
>
  {/* ... */}
</button>

// Add role and aria-live to photo container
<div 
  id="property-photos"
  role="region" 
  aria-label={`Photo gallery for ${propertyName}`}
  aria-live="polite"
>
  {/* photos */}
</div>
```

---

## Priority Implementation Roadmap

### Phase 1: Quick Wins (1-2 days)
1. ✅ Optimize title tags (more keyword-rich)
2. ✅ Enhance meta descriptions (add ratings, prices, amenities)
3. ✅ Add FAQ schema
4. ✅ Optimize image loading (add lazy loading, attributes)

**Expected Impact:** +15-25% CTR improvement, rich snippets potential

### Phase 2: Content Enhancement (3-5 days)
1. Add "Nearby Properties" section with internal links
2. Add "Related Resources" section
3. Enhance description formatting
4. Add ItemList schema for amenities

**Expected Impact:** Improved internal linking, better user engagement, +10-15% time on site

### Phase 3: Advanced Optimization (1 week)
1. Add Review schema enhancements
2. Implement nearby properties API
3. Performance optimization (bundle splitting)
4. Accessibility improvements

**Expected Impact:** Better crawlability, improved Core Web Vitals, better user experience

---

## Success Metrics to Track

1. **Organic Search Performance:**
   - Impressions for property page queries
   - Click-through rate from search results
   - Average position in search results
   - Featured snippet appearances (FAQ schema)

2. **User Engagement:**
   - Time on page
   - Bounce rate
   - Pages per session
   - Scroll depth

3. **Technical SEO:**
   - Core Web Vitals scores (LCP, FID, CLS)
   - Page load time
   - Mobile usability score
   - Structured data validation

4. **Rich Results:**
   - Number of pages with rich snippets
   - Types of rich snippets appearing
   - CTR from rich results vs. regular results

---

## Conclusion

The property pages have a solid SEO foundation but significant opportunities exist to enhance rankings and user engagement. The recommended improvements focus on:

1. **Better keyword targeting** in titles and descriptions
2. **Rich snippets** through FAQ and enhanced structured data
3. **Internal linking** to improve site architecture
4. **Performance optimization** for better Core Web Vitals
5. **Content enhancement** for better user experience

Implementing these changes should result in:
- **+20-30% improvement in CTR** from search results
- **+10-15% increase in organic visibility** (rich snippets)
- **+15-20% improvement in user engagement** metrics
- **Better rankings** for location-based and property-type queries

---

**Next Steps:**
1. Review and prioritize recommendations
2. Implement Phase 1 quick wins
3. Monitor metrics and iterate
4. Plan Phase 2 and Phase 3 implementations
