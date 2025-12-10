# Mobile Performance Improvement Plan

**Date:** December 9, 2025  
**Page:** `/en/map`  
**Current Performance Score:** 39/100 (Mobile)  
**Target Performance Score:** 70-90/100

---

## Executive Summary

The map page (`/en/map`) is experiencing significant performance issues on mobile devices, with a performance score of 39/100. The primary bottlenecks are:

1. **Large JavaScript execution time** (3.4s reduction needed)
2. **Enormous network payloads** (5,754 KiB total)
3. **Slow Largest Contentful Paint** (7.7s - needs to be < 2.5s)
4. **High Total Blocking Time** (1,800ms - needs to be < 200ms)
5. **Render-blocking resources** (370ms savings available)

This document outlines prioritized recommendations to improve the performance score to 70-90/100.

---

## Current Performance Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **Performance Score** | 39 | 70-90 | 🔴 Critical |
| **FCP (First Contentful Paint)** | 1.2s | < 1.8s | 🟡 Needs Improvement |
| **LCP (Largest Contentful Paint)** | 7.7s | < 2.5s | 🔴 Critical |
| **TBT (Total Blocking Time)** | 1,800ms | < 200ms | 🔴 Critical |
| **CLS (Cumulative Layout Shift)** | 0 | < 0.1 | ✅ Good |
| **SI (Speed Index)** | 11.3s | < 3.4s | 🔴 Critical |

---

## Priority 1: Critical Fixes (Highest Impact)

### 1.1 Add Missing Preconnect Hints ⚡
**Impact:** ~610ms LCP improvement  
**Effort:** Low (15 minutes)  
**Priority:** 🔴 Critical

**Issue:** PageSpeed Insights identifies missing preconnect hints for:
- `https://maps.gstatic.com` (310ms savings)
- `https://mdlniwrgrszdhzwxjdal.supabase.co` (300ms savings)

**Current State:** `ResourceHints.tsx` includes preconnect for `maps.googleapis.com` but not `maps.gstatic.com` or Supabase.

**Solution:**
```tsx
// components/ResourceHints.tsx
<link rel="preconnect" href="https://maps.gstatic.com" crossOrigin="anonymous" />
<link rel="preconnect" href="https://mdlniwrgrszdhzwxjdal.supabase.co" crossOrigin="anonymous" />
<link rel="dns-prefetch" href="https://maps.gstatic.com" />
<link rel="dns-prefetch" href="https://mdlniwrgrszdhzwxjdal.supabase.co" />
```

**Expected Impact:**
- LCP improvement: ~610ms
- Faster connection establishment to critical third-party resources
- Better perceived performance

---

### 1.2 Defer Non-Critical CSS ⚡
**Impact:** 370ms render blocking reduction  
**Effort:** Medium (1-2 hours)  
**Priority:** 🔴 Critical

**Issue:** CSS file (`e03f2e23f02c3ed0.css`) is blocking initial render (190ms duration, 8.4 KiB).

**Current State:** CSS is loaded synchronously via `globals.css` import in layout.

**Solution Options:**

**Option A: Inline Critical CSS (Recommended)**
1. Extract above-the-fold critical CSS
2. Inline in `<head>` of layout
3. Load full CSS asynchronously

**Option B: Defer CSS Loading**
```tsx
// In app/[locale]/layout.tsx
<link
  rel="preload"
  href="/_next/static/css/app.css"
  as="style"
  onLoad="this.onload=null;this.rel='stylesheet'"
/>
<noscript>
  <link rel="stylesheet" href="/_next/static/css/app.css" />
</noscript>
```

**Option C: Use Next.js Built-in CSS Optimization**
- Next.js 13+ automatically optimizes CSS, but verify it's working
- Check if CSS is being split properly

**Expected Impact:**
- FCP improvement: ~190ms
- LCP improvement: ~180ms
- Better Time to Interactive

---

### 1.3 Optimize Google Maps Loading 🗺️
**Impact:** 1-2s JavaScript execution reduction  
**Effort:** High (4-6 hours)  
**Priority:** 🔴 Critical

**Issues:**
- Google Maps JavaScript: 1,277ms execution time (824ms script evaluation)
- Forced reflows from Maps API (47ms total)
- Maps tiles loading at 512x512 but displayed at 448x448 (wasted bandwidth)
- Maps script blocking main thread

**Current State:**
- `GoogleMapsProvider` loads Maps script immediately
- No lazy loading or code splitting for Maps components
- All Maps libraries loaded upfront

**Solution:**

**1. Lazy Load Google Maps**
```tsx
// components/GoogleMapsProvider.tsx
const { isLoaded, loadError } = useLoadScript({
  googleMapsApiKey: apiKey,
  libraries: GOOGLE_MAPS_LIBRARIES,
  loadingElement: <MapLoadingSkeleton />, // Show skeleton while loading
  // Add loading strategy
});
```

**2. Defer Maps Initialization**
```tsx
// Only load Maps when user interacts or scrolls near map
const [shouldLoadMaps, setShouldLoadMaps] = useState(false);

useEffect(() => {
  // Load on intersection or user interaction
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      setShouldLoadMaps(true);
    }
  });
  
  observer.observe(mapContainerRef.current);
  return () => observer.disconnect();
}, []);
```

**3. Optimize Maps Libraries**
- Only load required libraries (currently loading 'places' - verify if needed on initial load)
- Consider loading 'places' library only when search is used

**4. Use Maps Static API for Initial Render (Advanced)**
- Show static map image initially
- Replace with interactive map on interaction

**Expected Impact:**
- TBT reduction: ~800-1,200ms
- JavaScript execution: ~1-1.5s reduction
- Faster initial page load

---

### 1.4 Reduce JavaScript Bundle Size 📦
**Impact:** 316 KiB unused JS + 3.4s execution time reduction  
**Effort:** High (6-8 hours)  
**Priority:** 🔴 Critical

**Issues:**
- 316 KiB of unused JavaScript
- 3.4s total JavaScript execution time
- Large chunk file: `117-eaf5f….js` (2,534ms execution)

**Current State:**
- Large bundle sizes
- Potential tree-shaking issues
- Legacy JavaScript polyfills (12 KiB wasted)

**Solution:**

**1. Analyze Bundle Composition**
```bash
# Add to package.json scripts
"analyze": "ANALYZE=true next build"
```

**2. Implement Code Splitting**
- Split Google Maps into separate chunk
- Split large components (GooglePropertyMap) into smaller chunks
- Use dynamic imports for below-fold content

**3. Remove Legacy JavaScript**
- Update `next.config.js` to target modern browsers
- Remove unnecessary polyfills
- Use ES6+ features directly

```js
// next.config.js
module.exports = {
  // ... existing config
  compiler: {
    // ... existing
  },
  // Target modern browsers
  browserslist: [
    'chrome >= 87',
    'firefox >= 78',
    'safari >= 14',
    'edge >= 88'
  ],
}
```

**4. Optimize Imports**
- Use named imports instead of default imports where possible
- Verify `optimizePackageImports` is working for all large packages
- Consider replacing heavy dependencies

**5. Lazy Load Heavy Components**
```tsx
// Already done for some components, but verify all heavy components are lazy-loaded
const GooglePropertyMap = dynamic(() => import('./GooglePropertyMap'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});
```

**Expected Impact:**
- Bundle size reduction: ~300-400 KiB
- JavaScript execution: ~2-3s reduction
- TBT improvement: ~1,000-1,500ms

---

## Priority 2: High-Impact Optimizations

### 2.1 Optimize Image Delivery 🖼️
**Impact:** 55 KiB savings  
**Effort:** Medium (2-3 hours)  
**Priority:** 🟡 High

**Issue:**
- Google Maps tiles are 512x512 but displayed at 448x448
- Multiple tile images could be optimized
- No responsive image sizing for map tiles

**Current State:**
- Maps tiles loaded at full resolution
- No control over tile size/quality

**Solution:**

**1. Request Appropriate Tile Sizes**
- Google Maps API allows specifying tile size
- Request tiles at display size (256x256 or 512x512 based on zoom)
- Use `devicePixelRatio` to request appropriate resolution

**2. Implement Tile Caching**
- Cache map tiles in browser
- Use Service Worker for offline tile caching (advanced)

**3. Optimize Other Images**
- Ensure all images use Next.js Image component
- Use WebP/AVIF formats
- Implement responsive images

**Expected Impact:**
- Network payload reduction: ~55 KiB
- Faster map rendering
- Better mobile data usage

---

### 2.2 Improve Cache Strategy 💾
**Impact:** 3 KiB + faster repeat visits  
**Effort:** Low (30 minutes)  
**Priority:** 🟡 High

**Issue:**
- Google Maps API script has 30-minute cache TTL
- Should use longer cache for static resources

**Solution:**

**1. Configure Cache Headers**
```js
// next.config.js or middleware
headers: async () => [
  {
    source: '/api/js',
    headers: [
      {
        key: 'Cache-Control',
        value: 'public, max-age=31536000, immutable',
      },
    ],
  },
]
```

**2. Use Service Worker for Aggressive Caching (Advanced)**
- Cache static assets
- Cache API responses with appropriate TTL

**Expected Impact:**
- Faster repeat visits
- Reduced server load
- Better user experience

---

### 2.3 Reduce Main-Thread Blocking ⏱️
**Impact:** TBT reduction, better interactivity  
**Effort:** High (4-6 hours)  
**Priority:** 🟡 High

**Issue:**
- 13 long tasks found (>50ms each)
- 5.2s total main-thread work
- Script evaluation: 3,316ms

**Solution:**

**1. Break Up Long Tasks**
```tsx
// Use scheduler API or setTimeout to break up work
import { unstable_scheduleCallback } from 'scheduler';

// Break up property processing
const processPropertiesInChunks = (properties, chunkSize = 100) => {
  const chunks = [];
  for (let i = 0; i < properties.length; i += chunkSize) {
    chunks.push(properties.slice(i, i + chunkSize));
  }
  
  chunks.forEach((chunk, index) => {
    unstable_scheduleCallback(() => {
      processChunk(chunk);
    });
  });
};
```

**2. Use Web Workers for Heavy Computation**
- Move property filtering/processing to Web Worker
- Keep UI thread responsive

**3. Defer Non-Critical JavaScript**
- Load analytics and non-critical scripts after page load
- Use `defer` or `async` attributes

**4. Optimize React Rendering**
- Use `React.memo` for expensive components
- Implement virtual scrolling for large lists
- Use `useMemo` and `useCallback` appropriately

**Expected Impact:**
- TBT reduction: ~500-800ms
- Better Time to Interactive
- Smoother user interactions

---

## Priority 3: Medium-Impact Optimizations

### 3.1 Optimize Network Dependency Chain 🔗
**Impact:** 511ms critical path reduction  
**Effort:** Medium (2-3 hours)  
**Priority:** 🟢 Medium

**Issue:**
- Critical path latency: 511ms
- CSS blocks HTML render
- Sequential resource loading

**Solution:**
1. Preload critical resources
2. Parallelize resource loading where possible
3. Reduce dependency chain length

**Expected Impact:**
- Faster initial render
- Better perceived performance

---

### 3.2 Improve LCP Element Discovery 🎯
**Impact:** Faster LCP  
**Effort:** Low (1 hour)  
**Priority:** 🟢 Medium

**Issue:**
- LCP element (map tile) not discoverable immediately
- Lazy loading applied incorrectly
- Missing `fetchpriority="high"` on LCP element

**Solution:**
1. Identify LCP element (likely first map tile or hero image)
2. Add `fetchpriority="high"` to LCP element
3. Ensure LCP element is not lazy-loaded
4. Preload LCP image if possible

**Expected Impact:**
- LCP improvement: ~500ms-1s
- Better Core Web Vitals score

---

### 3.3 Optimize Structured Data Loading 📊
**Impact:** Minor render improvement  
**Effort:** Low (30 minutes)  
**Priority:** 🟢 Medium

**Issue:**
- Multiple inline JSON-LD scripts in page
- Could be deferred or loaded asynchronously

**Solution:**
1. Move structured data to separate script with `type="application/ld+json"` and `async`
2. Or keep inline but ensure it doesn't block render (it shouldn't, but verify)

**Expected Impact:**
- Minor render improvement
- Better SEO (structured data still works)

---

## Implementation Roadmap

### Phase 1: Quick Wins (Week 1)
**Target:** 39 → 50-55 performance score

1. ✅ Add missing preconnect hints (1.1)
2. ✅ Defer non-critical CSS (1.2)
3. ✅ Improve cache strategy (2.2)

**Estimated Time:** 2-3 hours  
**Expected Improvement:** +10-15 points

---

### Phase 2: Critical Optimizations (Week 2-3)
**Target:** 50-55 → 65-70 performance score

1. ✅ Optimize Google Maps loading (1.3)
2. ✅ Reduce JavaScript bundle size (1.4)
3. ✅ Optimize image delivery (2.1)

**Estimated Time:** 12-16 hours  
**Expected Improvement:** +15-20 points

---

### Phase 3: Fine-Tuning (Week 4)
**Target:** 65-70 → 75-85 performance score

1. ✅ Reduce main-thread blocking (2.3)
2. ✅ Optimize network dependency chain (3.1)
3. ✅ Improve LCP element discovery (3.2)

**Estimated Time:** 8-10 hours  
**Expected Improvement:** +10-15 points

---

## Measurement & Validation

### Before/After Comparison
After each phase, run PageSpeed Insights and compare:
- Performance score
- Core Web Vitals (FCP, LCP, TBT, CLS, SI)
- Network payload size
- JavaScript execution time

### Tools
- **PageSpeed Insights:** Primary measurement tool
- **Chrome DevTools Performance:** Detailed profiling
- **Lighthouse CI:** Automated testing
- **WebPageTest:** Real-world testing

### Success Criteria
- **Minimum:** Performance score ≥ 70
- **Target:** Performance score ≥ 85
- **Stretch:** Performance score ≥ 90

---

## Technical Considerations

### Browser Compatibility
- Target modern browsers (Chrome 87+, Firefox 78+, Safari 14+, Edge 88+)
- Graceful degradation for older browsers if needed

### User Experience
- Maintain functionality while improving performance
- Ensure map remains interactive and responsive
- Test on real mobile devices (not just emulation)

### Monitoring
- Set up performance monitoring (e.g., Vercel Analytics, Google Analytics)
- Track Core Web Vitals in production
- Alert on performance regressions

---

## Additional Recommendations

### Long-Term Optimizations
1. **Consider Alternative Map Solutions**
   - Evaluate Mapbox or Leaflet for lighter weight
   - Static map images for initial load
   - Progressive enhancement approach

2. **Implement Service Worker**
   - Cache static assets
   - Cache map tiles
   - Offline support

3. **Server-Side Rendering Optimization**
   - Ensure proper SSR for above-fold content
   - Stream HTML for faster FCP

4. **CDN Optimization**
   - Use CDN for static assets
   - Optimize CDN cache headers

---

## Notes

- All optimizations should be tested on real mobile devices
- Monitor for any regressions in functionality
- Consider A/B testing for major changes
- Document any breaking changes or trade-offs

---

## References

- [PageSpeed Insights Report](https://pagespeed.web.dev/)
- [Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Google Maps API Best Practices](https://developers.google.com/maps/documentation/javascript/best-practices)
