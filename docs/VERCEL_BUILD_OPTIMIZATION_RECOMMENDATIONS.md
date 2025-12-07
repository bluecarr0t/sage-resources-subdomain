# Vercel Build Speed Optimization Recommendations

## Current Build Performance

- **Total Pages**: 1,148 static pages
- **Build Time**: ~2+ minutes for static generation
- **Bottleneck**: Google Places API calls during build time

## Critical Issues Identified

### 1. Google Places API Calls During Build (HIGHEST PRIORITY)

**Problem**: Every property page makes Google Places API calls during both `generateMetadata` and page component rendering. With ~513 property pages, this means:
- ~1,026 API calls per build (2 per page)
- Each API call takes 200-500ms
- Total API time: ~4-8 minutes of blocking I/O

**Current Code**:
```typescript
// app/[locale]/property/[slug]/page.tsx
const googlePlacesData = await getGooglePlacesDataForProperty(...); // Called in generateMetadata
const googlePlacesData = await getGooglePlacesDataForProperty(...); // Called again in page component
```

**Impact**: This is the #1 bottleneck causing slow builds.

### 2. No Incremental Static Regeneration (ISR)

**Problem**: All 1,148 pages are regenerated on every build, even if content hasn't changed.

**Impact**: Unnecessary regeneration of unchanged pages.

### 3. Multiple Database Queries Per Page

**Problem**: Each property page makes multiple database queries:
- `getSlugType(slug)` - 1 query
- `getPropertiesBySlug(slug)` - 1 query  
- `getNearbyProperties(...)` - 1 query
- `getPlaceIdFromDatabase(...)` - 1 query (for Google Places)

**Impact**: Database latency adds up across 1,148 pages.

### 4. Locale Multiplication

**Problem**: Some page types generate for all 4 locales (en, es, fr, de), multiplying page count:
- Landing pages: X pages × 4 locales
- Guides: X pages × 4 locales
- Glossary: X terms × 4 locales

**Impact**: 4x more pages than necessary if content isn't localized.

---

## Optimization Recommendations

### Priority 1: Defer Google Places API Calls (CRITICAL)

**Recommendation**: Move Google Places API calls to client-side or use ISR with on-demand revalidation.

#### Option A: Client-Side Fetching (Recommended for Build Speed)

**Pros**:
- Zero API calls during build
- Build time reduced by 80-90%
- Data always fresh

**Cons**:
- Slight delay on first page load
- Requires loading state

**Implementation**:
```typescript
// app/[locale]/property/[slug]/page.tsx
export default async function PropertyPage({ params }: PageProps) {
  // Remove Google Places API call from server component
  // Pass property data only
  return (
    <PropertyDetailTemplate 
      properties={properties}
      slug={slug}
      propertyName={propertyName}
      // googlePlacesData={null} // Remove this
    />
  );
}

// components/PropertyDetailTemplate.tsx
'use client';
import { useEffect, useState } from 'react';

export default function PropertyDetailTemplate({ properties, ... }) {
  const [googlePlacesData, setGooglePlacesData] = useState(null);
  
  useEffect(() => {
    // Fetch Google Places data client-side
    fetch(`/api/google-places?propertyName=${...}`)
      .then(res => res.json())
      .then(data => setGooglePlacesData(data));
  }, []);
  
  // Rest of component...
}
```

#### Option B: ISR with On-Demand Revalidation

**Pros**:
- Fast builds (no API calls during build)
- Server-rendered content
- Can revalidate on-demand when data changes

**Cons**:
- Requires API route for revalidation
- More complex setup

**Implementation**:
```typescript
// app/[locale]/property/[slug]/page.tsx
export const revalidate = 3600; // Revalidate every hour

export default async function PropertyPage({ params }: PageProps) {
  // During build, skip Google Places API call
  // Only fetch if page is being revalidated
  const googlePlacesData = process.env.VERCEL_ENV === 'production' 
    ? await getGooglePlacesDataForProperty(...) 
    : null;
}
```

#### Option C: Pre-fetch and Store in Database

**Pros**:
- Fast builds (read from database)
- No client-side delay
- Can batch update periodically

**Cons**:
- Data can become stale
- Requires background job to update

**Implementation**:
1. Create background script to fetch Google Places data for all properties
2. Store in database columns: `google_rating`, `google_photos`, etc.
3. Read from database during build instead of API

---

### Priority 2: Implement Incremental Static Regeneration (ISR)

**Recommendation**: Use ISR to only regenerate pages that have changed.

**Implementation**:
```typescript
// app/[locale]/property/[slug]/page.tsx
export const revalidate = 86400; // Revalidate once per day

// Or use on-demand revalidation:
// POST /api/revalidate?path=/property/[slug]
```

**Benefits**:
- Build time: ~2 minutes → ~30 seconds (only changed pages)
- Faster deployments
- Better developer experience

---

### Priority 3: Optimize Database Queries

#### A. Batch Queries

**Current**: Multiple queries per page
```typescript
const slugType = await getSlugType(slug);
const properties = await getPropertiesBySlug(slug);
const nearbyProperties = await getNearbyProperties(...);
```

**Optimized**: Single query with joins
```typescript
// Single query that gets property + nearby properties
const { property, nearby } = await getPropertyWithNearby(slug);
```

#### B. Add Database Indexes

Ensure indexes exist on frequently queried columns:
```sql
CREATE INDEX IF NOT EXISTS idx_slug ON "sage-glamping-data"(slug);
CREATE INDEX IF NOT EXISTS idx_property_name ON "sage-glamping-data"(property_name);
CREATE INDEX IF NOT EXISTS idx_google_place_id ON "sage-glamping-data"(google_place_id);
```

#### C. Use Connection Pooling

Ensure Supabase connection pooling is configured for build-time queries.

---

### Priority 4: Reduce Locale Multiplication

**Recommendation**: Only generate pages for locales that have actual translated content.

**Current**:
```typescript
// Generates 4 pages per guide/landing page
for (const locale of locales) {
  for (const slug of slugs) {
    params.push({ locale, slug });
  }
}
```

**Optimized**:
```typescript
// Only generate for locales that have translations
const availableLocales = getAvailableLocalesForContent(slug);
for (const locale of availableLocales) {
  params.push({ locale, slug });
}
```

**Impact**: Reduces page count by 50-75% if most content is English-only.

---

### Priority 5: Parallelize Page Generation

**Recommendation**: Use Vercel's parallel page generation (already enabled, but optimize).

**Current**: Pages generated sequentially
**Optimized**: Ensure no blocking operations prevent parallelization

**Implementation**:
- Remove synchronous operations
- Use `Promise.all()` for independent operations
- Avoid shared state that requires sequential processing

---

### Priority 6: Cache Database Queries During Build

**Recommendation**: Cache database results in memory during build to avoid duplicate queries.

**Implementation**:
```typescript
// lib/build-cache.ts
const buildCache = new Map<string, any>();

export async function getCachedProperty(slug: string) {
  if (buildCache.has(slug)) {
    return buildCache.get(slug);
  }
  const property = await getPropertiesBySlug(slug);
  buildCache.set(slug, property);
  return property;
}
```

---

### Priority 7: Optimize Metadata Generation

**Recommendation**: Simplify metadata generation or move to static files.

**Current**: Complex metadata generation with API calls
**Optimized**: 
- Use static metadata where possible
- Cache metadata generation results
- Defer non-critical metadata (OG images, etc.)

---

## Implementation Priority

### Phase 1: Quick Wins (1-2 hours)
1. ✅ **Defer Google Places API calls** (Option A - Client-side)
   - **Expected Impact**: 80-90% build time reduction
   - **Build Time**: ~2 min → ~20-30 seconds

2. ✅ **Add database indexes**
   - **Expected Impact**: 20-30% query time reduction

### Phase 2: Medium Effort (4-6 hours)
3. ✅ **Implement ISR with revalidate**
   - **Expected Impact**: 70-80% build time reduction for unchanged pages
   - **Build Time**: ~30 sec → ~10-15 seconds (after first build)

4. ✅ **Optimize database queries (batching)**
   - **Expected Impact**: 30-40% query time reduction

### Phase 3: Long-term (1-2 days)
5. ✅ **Pre-fetch Google Places data to database**
   - **Expected Impact**: Zero API calls during build
   - **Build Time**: ~10-15 sec → ~5-10 seconds

6. ✅ **Reduce locale multiplication**
   - **Expected Impact**: 50-75% page count reduction

---

## Expected Results

### Current Performance
- Build Time: ~2+ minutes
- Pages: 1,148
- API Calls: ~1,026 per build
- Database Queries: ~3,000+ per build

### After Phase 1 (Quick Wins)
- Build Time: **~20-30 seconds** (85% reduction)
- Pages: 1,148
- API Calls: **0 per build** (100% reduction)
- Database Queries: ~2,000 per build (33% reduction)

### After Phase 2 (ISR + Optimizations)
- Build Time: **~10-15 seconds** (first build), **~5 seconds** (subsequent builds)
- Pages: 1,148 (but only changed pages regenerate)
- API Calls: 0 per build
- Database Queries: ~1,200 per build (60% reduction)

### After Phase 3 (Full Optimization)
- Build Time: **~5-10 seconds** (first build), **~2-3 seconds** (subsequent builds)
- Pages: ~300-600 (50-75% reduction with locale optimization)
- API Calls: 0 per build
- Database Queries: ~600 per build (80% reduction)

---

## Monitoring & Measurement

### Track These Metrics
1. **Build Time**: Total build duration
2. **Page Generation Time**: Time to generate all static pages
3. **API Call Count**: Number of Google Places API calls per build
4. **Database Query Count**: Number of Supabase queries per build
5. **Cache Hit Rate**: Percentage of cached vs. fresh data

### Vercel Build Logs
Monitor these in Vercel dashboard:
- `Collecting page data` duration
- `Generating static pages` duration
- Individual page generation times

---

## Additional Recommendations

### 1. Use Vercel's Build Cache
Ensure `.next/cache` is properly cached between builds.

### 2. Optimize Image Loading
- Use Next.js Image optimization
- Implement lazy loading for non-critical images
- Consider using CDN for static assets

### 3. Reduce Bundle Size
- Code splitting
- Tree shaking
- Remove unused dependencies

### 4. Consider Edge Runtime
For pages that don't need Node.js APIs, use Edge Runtime for faster cold starts.

---

## Next Steps

1. **Immediate**: Implement Priority 1 (Defer Google Places API calls)
2. **This Week**: Implement Priority 2 (ISR)
3. **Next Week**: Implement Priority 3-4 (Query optimization, locale reduction)
4. **Ongoing**: Monitor and measure improvements

---

## Questions to Consider

1. **Do you need Google Places data at build time?**
   - If no → Move to client-side (fastest builds)
   - If yes → Pre-fetch to database (fast builds, fresh data)

2. **How often does property data change?**
   - Daily → ISR with 24h revalidate
   - Weekly → ISR with 7d revalidate
   - Rarely → Static generation with on-demand revalidation

3. **Do you need all locales?**
   - If content is English-only → Only generate 'en' locale
   - If translated → Generate only for available translations
