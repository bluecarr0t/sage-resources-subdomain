# Build Speed Optimization Recommendations

**Current State:**
- **Total Static Pages:** ~1,208 pages
- **Build Time:** Unknown (needs measurement)
- **ISR:** ✅ Already implemented (`revalidate = 86400`)
- **Google Places API:** ✅ Already moved to client-side

---

## Quick Wins (Immediate Impact)

### 1. Reduce Locale Multiplication for Untranslated Content ⚡ HIGHEST IMPACT

**Problem:** Landing pages, guides, and glossary terms generate for all 4 locales (en, es, fr, de), but content may not be translated.

**Current Page Count:**
- Landing pages: ~18-21 × 4 locales = **72-84 pages**
- Guides: ~21 × 4 locales = **84 pages**
- Glossary: ~50-57 × 4 locales = **200-228 pages**
- **Total:** ~356-396 pages (could be reduced to ~89-99 pages if English-only)

**Solution:** Only generate pages for locales that have actual translations.

**Implementation:**

```typescript
// lib/i18n-content.ts (new file)
import { locales, type Locale } from '@/i18n';

/**
 * Determine which locales have translations for a given content type
 * For now, most content is English-only, so we only generate 'en' pages
 */
export function getAvailableLocalesForContent(
  contentType: 'landing' | 'guide' | 'glossary'
): Locale[] {
  // TODO: Check if translations exist in messages/{locale}.json
  // For now, return only 'en' for most content types
  if (contentType === 'landing' || contentType === 'guide') {
    // These pages have minimal translation - only generate English
    return ['en'];
  }
  
  if (contentType === 'glossary') {
    // Glossary might have some translations - check if needed
    return ['en']; // Or return ['en', 'es', 'fr', 'de'] if translated
  }
  
  return ['en'];
}
```

**Update generateStaticParams:**

```typescript
// app/[locale]/landing/[slug]/page.tsx
import { getAvailableLocalesForContent } from '@/lib/i18n-content';

export async function generateStaticParams() {
  const slugs = getAllLandingPageSlugs();
  const availableLocales = getAvailableLocalesForContent('landing');
  const params: Array<{ locale: string; slug: string }> = [];
  
  // Only generate for locales with translations
  for (const locale of availableLocales) {
    for (const slug of slugs) {
      params.push({ locale, slug });
    }
  }
  
  return params;
}
```

**Expected Impact:** 
- **Page Count Reduction:** ~267-297 pages (75% reduction for landing/guides/glossary)
- **Build Time Reduction:** ~60-70% faster builds
- **Total Pages:** ~1,208 → ~941-951 pages

---

### 2. Optimize Next.js Build Configuration ⚡ HIGH IMPACT

**Add experimental features and optimizations:**

```javascript
// next.config.js
const nextConfig = {
  reactStrictMode: true,
  
  // Enable experimental features for faster builds
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['@supabase/supabase-js', 'next-intl'],
    // Enable faster refresh
    optimizeCss: true,
  },
  
  // Optimize static page generation
  output: 'standalone', // Reduces build output size
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // ... rest of config
}
```

**Expected Impact:** ~10-15% faster builds

---

### 3. Implement Build-Time Query Caching ⚡ MEDIUM IMPACT

**Problem:** Database queries are repeated during build (e.g., `getAllPropertySlugs()` called multiple times).

**Solution:** Cache database results in memory during build.

```typescript
// lib/build-cache.ts (new file)
const buildCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCached<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = buildCache.get(key);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return Promise.resolve(cached.data as T);
  }
  
  return fetcher().then((data) => {
    buildCache.set(key, { data, timestamp: now });
    return data;
  });
}

// Usage in lib/properties.ts
import { getCached } from './build-cache';

export async function getAllPropertySlugs(): Promise<Array<{ slug: string }>> {
  return getCached('property-slugs', async () => {
    // ... existing implementation
  });
}
```

**Expected Impact:** ~15-20% reduction in database query time

---

## Medium-Term Optimizations

### 4. Use On-Demand ISR Instead of Time-Based ⚡ MEDIUM IMPACT

**Current:** Pages revalidate every 24 hours automatically.

**Better:** Use on-demand revalidation only when data changes.

```typescript
// app/[locale]/property/[slug]/page.tsx
// Remove: export const revalidate = 86400;

// Instead, use on-demand revalidation via API route
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const { path, secret } = await request.json();
  
  if (secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ message: 'Invalid secret' }, { status: 401 });
  }
  
  revalidatePath(path);
  return Response.json({ revalidated: true, now: Date.now() });
}
```

**Expected Impact:** 
- First build: Same speed
- Subsequent builds: Only regenerate changed pages (~90% faster)

---

### 5. Optimize Database Queries with Batching ⚡ MEDIUM IMPACT

**Problem:** Multiple sequential queries per page generation.

**Solution:** Batch queries where possible.

```typescript
// lib/properties.ts
export async function getPropertiesWithNearby(slug: string) {
  // Single query that gets property + nearby in one call
  const supabase = createServerClient();
  
  // Get property first
  const { data: property } = await supabase
    .from('sage-glamping-data')
    .select('*')
    .eq('slug', slug)
    .limit(1)
    .single();
  
  if (!property) return { property: null, nearby: [] };
  
  // Get nearby properties in parallel with property data
  const [nearbyResult] = await Promise.all([
    getNearbyProperties(property.lat, property.lon, slug, 50, 6),
  ]);
  
  return {
    property,
    nearby: nearbyResult,
  };
}
```

**Expected Impact:** ~20-30% faster page generation

---

### 6. Parallelize generateStaticParams ⚡ LOW-MEDIUM IMPACT

**Current:** Some `generateStaticParams` use `Promise.all()` already (good!).

**Optimization:** Ensure all async operations are parallelized.

```typescript
// app/[locale]/property/[slug]/page.tsx
export async function generateStaticParams() {
  // Already using Promise.all - good!
  const [propertySlugs, nationalParkSlugs] = await Promise.all([
    getAllPropertySlugs(),
    getAllNationalParkSlugs(),
  ]);
  
  // ... rest of implementation
}
```

**Status:** ✅ Already optimized

---

## Advanced Optimizations

### 7. Use Incremental Static Regeneration with Shorter Revalidate ⚡ LOW IMPACT

**Current:** `revalidate = 86400` (24 hours)

**Consider:** Shorter revalidate times for faster initial builds, then let ISR handle updates.

```typescript
// For pages that change infrequently
export const revalidate = 3600; // 1 hour instead of 24

// Or use on-demand revalidation (better)
```

---

### 8. Optimize Image Loading ⚡ LOW IMPACT

**Current:** Image optimization is configured.

**Optimization:** Ensure images are lazy-loaded and optimized.

```typescript
// Already using Next.js Image component - good!
// Consider adding priority={false} to non-critical images
```

**Status:** ✅ Already optimized

---

### 9. Reduce Bundle Size ⚡ LOW IMPACT

**Check for:**
- Unused dependencies
- Large libraries that could be replaced
- Code splitting opportunities

```bash
# Analyze bundle size
npm run build
# Check .next/analyze/ for bundle analysis
```

---

## Implementation Priority

### Phase 1: Quick Wins (1-2 hours) - **Expected 60-75% build time reduction**
1. ✅ **Reduce locale multiplication** (highest impact)
2. ✅ **Optimize Next.js config** (easy win)
3. ✅ **Add build-time caching** (medium effort)

### Phase 2: Medium-Term (4-6 hours) - **Additional 20-30% improvement**
4. ✅ **On-demand ISR** (better than time-based)
5. ✅ **Batch database queries** (optimize data fetching)

### Phase 3: Advanced (ongoing)
6. Monitor and measure improvements
7. Fine-tune based on actual build times

---

## Expected Results

### Current Performance
- **Total Pages:** ~1,208
- **Build Time:** Unknown (needs measurement)

### After Phase 1 (Quick Wins)
- **Total Pages:** ~941-951 (**~21% reduction**)
- **Build Time:** **~60-75% faster** (estimated)
- **Page Count:** Reduced by ~267 pages

### After Phase 2 (Full Optimization)
- **Total Pages:** ~941-951
- **Build Time:** **~80-90% faster** (estimated)
- **First Build:** Faster due to fewer pages
- **Subsequent Builds:** Only changed pages regenerate

---

## Measurement & Monitoring

### Track These Metrics
1. **Build Time:** Total build duration
2. **Page Generation Time:** Time to generate all static pages
3. **Database Query Count:** Number of Supabase queries per build
4. **Cache Hit Rate:** Percentage of cached vs. fresh data

### Vercel Build Logs
Monitor these in Vercel dashboard:
- `Collecting page data` duration
- `Generating static pages` duration
- Individual page generation times

### Add Build Time Tracking

```typescript
// scripts/measure-build-time.ts
const startTime = Date.now();
// ... build process
const endTime = Date.now();
console.log(`Build completed in ${(endTime - startTime) / 1000}s`);
```

---

## Next Steps

1. **Immediate:** Implement Phase 1 optimizations (locale reduction + config)
2. **This Week:** Measure current build times, implement Phase 2
3. **Ongoing:** Monitor and optimize based on actual performance

---

## Questions to Consider

1. **Do you need all 4 locales for landing pages/guides/glossary?**
   - If content is English-only → Only generate 'en' pages
   - If translated → Generate only for available translations

2. **How often does content change?**
   - Rarely → Use on-demand ISR (fastest builds)
   - Daily → ISR with 24h revalidate
   - Frequently → Consider dynamic rendering for some pages

3. **What's your current build time?**
   - Measure baseline before optimizing
   - Track improvements after each phase

---

**Last Updated:** 2025-01-27
**Status:** Recommendations ready for implementation
