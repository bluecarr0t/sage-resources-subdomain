# PageSpeed Optimization Recommendations

**Date:** January 2025  
**URL:** https://resources.sageoutdooradvisory.com/en/map?country=United+States&country=Canada  
**Current Scores:**
- Desktop: 40/100 Performance
- Mobile: 61/100 Performance

## Executive Summary

The map page has significant performance issues, particularly on mobile devices. The primary bottlenecks are:

1. **Total Blocking Time (TBT):** 2,080ms (Desktop) / 290ms (Mobile) - Critical
2. **Largest Contentful Paint (LCP):** 2.0s (Desktop) / 7.1s (Mobile) - Critical on Mobile
3. **JavaScript Execution:** 3.4s (Desktop) / 1.3s (Mobile) - High
4. **Layout Shifts (CLS):** 0.255 (Desktop) - Needs improvement
5. **Unused JavaScript:** 368 KiB - Optimization opportunity

## Core Web Vitals Analysis

### Desktop Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| FCP | 0.2s | <1.8s | ✅ Excellent |
| LCP | 2.0s | <2.5s | ⚠️ Needs Improvement |
| TBT | 2,080ms | <200ms | 🔴 Critical |
| CLS | 0.255 | <0.1 | 🔴 Critical |
| SI | 3.3s | <3.4s | ⚠️ Borderline |

### Mobile Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| FCP | 2.2s | <1.8s | 🔴 Critical |
| LCP | 7.1s | <2.5s | 🔴 Critical |
| TBT | 290ms | <200ms | ⚠️ Needs Improvement |
| CLS | 0 | <0.1 | ✅ Excellent |
| SI | 7.4s | <3.4s | 🔴 Critical |

## Priority 1: Critical Issues (Immediate Action Required)

### 1.1 Reduce Total Blocking Time (TBT) - Desktop: 2,080ms

**Impact:** 🔴 Critical - Blocks user interaction for over 2 seconds

**Root Causes:**
- JavaScript execution time: 3.4s total
- 13 long main-thread tasks detected
- Google Maps JavaScript: 1,601ms CPU time
- Application JavaScript: 2,483ms CPU time

**Recommendations:**

1. **Code Splitting & Lazy Loading**
   ```typescript
   // Lazy load Google Maps only when needed
   const GooglePropertyMap = dynamic(() => import('@/components/GooglePropertyMap'), {
     ssr: false,
     loading: () => <MapSkeleton />
   });
   ```

2. **Defer Non-Critical JavaScript**
   - Move Google Maps initialization to after page load
   - Use `defer` or `async` for non-critical scripts
   - Load map only when user scrolls to map section

3. **Optimize JavaScript Bundle**
   - Current bundle: `2117-0a4b….js` (1,819ms evaluation time)
   - Analyze bundle with `@next/bundle-analyzer`
   - Remove unused dependencies
   - Use dynamic imports for large components

4. **Reduce Main-Thread Work**
   - Break up long tasks using `setTimeout` or `requestIdleCallback`
   - Use Web Workers for heavy computations
   - Optimize React rendering with `React.memo` and `useMemo`

**Expected Impact:** Reduce TBT from 2,080ms to <200ms (90% improvement)

### 1.2 Improve Largest Contentful Paint (LCP) - Mobile: 7.1s

**Impact:** 🔴 Critical - Users wait 7+ seconds to see main content

**Root Causes:**
- Render blocking CSS: 380ms delay
- No preconnect hints for Supabase
- Map tiles loading slowly
- JavaScript blocking render

**Recommendations:**

1. **Add Preconnect Hints**
   ```tsx
   // In app/[locale]/map/layout.tsx or page.tsx
   <head>
     <link rel="preconnect" href="https://mdlniwrgrszdhzwxjdal.supabase.co" />
     <link rel="preconnect" href="https://maps.googleapis.com" />
     <link rel="dns-prefetch" href="https://maps.googleapis.com" />
   </head>
   ```
   **Expected Savings:** 90ms (Supabase) + additional for Maps

2. **Optimize CSS Delivery**
   - Inline critical CSS
   - Defer non-critical CSS
   - Remove render-blocking CSS (current: 190ms on mobile)

3. **Optimize Map Loading**
   - Use `fetchpriority="high"` for LCP image
   - Lazy load map until user interaction
   - Show static map placeholder initially
   - Load map tiles progressively

4. **Optimize API Response**
   - Already optimized to 205KB (excellent!)
   - Consider server-side rendering for initial data
   - Use streaming SSR for faster initial render

**Expected Impact:** Reduce LCP from 7.1s to <2.5s (65% improvement)

### 1.3 Fix Cumulative Layout Shift (CLS) - Desktop: 0.255

**Impact:** 🔴 Critical - Poor user experience, content jumping

**Root Causes:**
- Map container: 0.226 CLS (main culprit)
- Filter section: 0.016 CLS
- Map layers section: 0.007 CLS

**Recommendations:**

1. **Reserve Space for Map**
   ```tsx
   // Set explicit dimensions for map container
   <div 
     className="w-full h-full" 
     style={{ 
       minHeight: '100vh', 
       height: '100%',
       aspectRatio: '16/9' // Add aspect ratio
     }}
   >
     {/* Map component */}
   </div>
   ```

2. **Add Skeleton Loaders**
   - Show map skeleton with same dimensions as final map
   - Reserve space for filter panels
   - Use `loading="lazy"` with explicit dimensions

3. **Optimize Font Loading**
   ```css
   /* Add font-display: swap to prevent layout shift */
   @font-face {
     font-family: 'YourFont';
     font-display: swap;
   }
   ```

4. **Prevent Dynamic Content Shifts**
   - Set explicit heights for dynamic content
   - Use CSS Grid/Flexbox with fixed dimensions
   - Avoid inserting content above existing content

**Expected Impact:** Reduce CLS from 0.255 to <0.1 (60% improvement)

## Priority 2: High Impact Optimizations

### 2.1 Remove Unused JavaScript (368 KiB)

**Impact:** ⚠️ High - Reduces bundle size and parse time

**Recommendations:**

1. **Analyze Bundle**
   ```bash
   npm run build
   ANALYZE=true npm run build
   ```

2. **Remove Unused Dependencies**
   - Review `package.json` for unused packages
   - Use `depcheck` to find unused dependencies
   - Remove or replace heavy libraries

3. **Tree Shaking**
   - Ensure proper ES module imports
   - Use named imports instead of default imports
   - Configure webpack/Next.js for better tree shaking

4. **Dynamic Imports**
   ```typescript
   // Instead of:
   import HeavyComponent from '@/components/HeavyComponent';
   
   // Use:
   const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'));
   ```

**Expected Impact:** Reduce bundle size by 200-300 KiB, improve parse time

### 2.2 Optimize Google Maps Loading

**Impact:** ⚠️ High - Google Maps is 1,601ms CPU time

**Recommendations:**

1. **Lazy Load Maps**
   ```typescript
   // Only load map when user scrolls near it or clicks
   const [shouldLoadMap, setShouldLoadMap] = useState(false);
   
   useEffect(() => {
     const observer = new IntersectionObserver((entries) => {
       if (entries[0].isIntersecting) {
         setShouldLoadMap(true);
       }
     });
     // Observe map container
   }, []);
   ```

2. **Use Static Map Initially**
   - Show static map image on initial load
   - Replace with interactive map on user interaction
   - Reduces initial JavaScript load

3. **Optimize Map Configuration**
   - Load only required map features
   - Disable unused map controls
   - Use lighter map styles
   - Consider map alternatives for mobile

4. **Defer Map Scripts**
   ```html
   <script 
     src="https://maps.googleapis.com/maps/api/js"
     defer
     async
   />
   ```

**Expected Impact:** Reduce Maps CPU time by 50-70%

### 2.3 Optimize Render-Blocking Resources

**Impact:** ⚠️ High - 80ms (Desktop) / 380ms (Mobile) savings

**Recommendations:**

1. **Inline Critical CSS**
   ```typescript
   // In _document.tsx or layout
   <style dangerouslySetInnerHTML={{ __html: criticalCSS }} />
   ```

2. **Defer Non-Critical CSS**
   ```html
   <link 
     rel="stylesheet" 
     href="/styles.css" 
     media="print" 
     onload="this.media='all'"
   />
   ```

3. **Use CSS-in-JS with Critical Extraction**
   - Extract critical styles at build time
   - Inline critical CSS
   - Load remaining styles asynchronously

**Expected Impact:** Improve FCP by 80-380ms

## Priority 3: Medium Impact Optimizations

### 3.1 Add Resource Hints

**Recommendations:**

```tsx
// In app/[locale]/map/layout.tsx
<head>
  {/* Preconnect to critical origins */}
  <link rel="preconnect" href="https://mdlniwrgrszdhzwxjdal.supabase.co" />
  <link rel="preconnect" href="https://maps.googleapis.com" />
  <link rel="dns-prefetch" href="https://maps.googleapis.com" />
  
  {/* Prefetch critical resources */}
  <link rel="prefetch" href="/api/properties?country=United+States&country=Canada" />
</head>
```

**Expected Impact:** 90ms+ improvement in LCP

### 3.2 Optimize Images

**Impact:** 216 KiB (Desktop) / 180 KiB (Mobile) savings

**Recommendations:**

1. **Use Next.js Image Component**
   ```tsx
   import Image from 'next/image';
   
   <Image
     src="/map-placeholder.jpg"
     alt="Map"
     width={800}
     height={600}
     priority // For LCP images
     placeholder="blur"
   />
   ```

2. **Optimize Image Formats**
   - Use WebP/AVIF formats
   - Provide fallbacks for older browsers
   - Use responsive images with `srcset`

3. **Lazy Load Non-Critical Images**
   ```tsx
   <Image loading="lazy" ... />
   ```

**Expected Impact:** Reduce image payload by 50-70%

### 3.3 Optimize Font Loading

**Impact:** 10ms savings

**Recommendations:**

```css
@font-face {
  font-family: 'YourFont';
  font-display: swap; /* Prevents layout shift */
  src: url('/fonts/font.woff2') format('woff2');
}
```

**Expected Impact:** Prevent font-related layout shifts

### 3.4 Reduce Forced Reflows

**Impact:** 34ms (Desktop) / 10ms (Mobile) from Google Maps

**Recommendations:**

1. **Batch DOM Reads/Writes**
   ```typescript
   // Bad: Multiple reflows
   element.style.width = '100px';
   const width = element.offsetWidth; // Reflow
   element.style.height = '200px';
   const height = element.offsetHeight; // Reflow
   
   // Good: Batch reads, then writes
   const width = element.offsetWidth; // Read
   const height = element.offsetHeight; // Read
   element.style.width = '100px'; // Write
   element.style.height = '200px'; // Write
   ```

2. **Use `requestAnimationFrame`**
   ```typescript
   requestAnimationFrame(() => {
     // DOM updates
   });
   ```

**Expected Impact:** Reduce forced reflows by 50-80%

## Priority 4: Code Quality & Best Practices

### 4.1 Fix Browser Console Errors

**Issue:** Vector Map fallback error

**Recommendation:**
- Check WebGL support before loading vector maps
- Provide proper fallback handling
- Suppress non-critical errors

### 4.2 Improve Cache Headers

**Impact:** 3 KiB (Desktop) / 16 KiB (Mobile) savings

**Recommendations:**

```typescript
// In API routes
headers: {
  'Cache-Control': 'public, max-age=31536000, immutable',
}
```

### 4.3 Remove Legacy JavaScript

**Impact:** 12 KiB savings

**Recommendations:**
- Update to modern JavaScript
- Remove polyfills for unsupported browsers
- Use modern syntax (ES6+)

## Implementation Roadmap

### Phase 1: Critical Fixes (Week 1)
1. ✅ Add preconnect hints
2. ✅ Fix CLS with explicit map dimensions
3. ✅ Lazy load Google Maps
4. ✅ Optimize CSS delivery

**Expected Result:** 
- Desktop: 40 → 60-70
- Mobile: 61 → 75-85

### Phase 2: High Impact (Week 2)
1. ✅ Remove unused JavaScript
2. ✅ Optimize bundle splitting
3. ✅ Add image optimization
4. ✅ Reduce main-thread work

**Expected Result:**
- Desktop: 60-70 → 75-85
- Mobile: 75-85 → 85-90

### Phase 3: Polish (Week 3)
1. ✅ Fine-tune resource hints
2. ✅ Optimize font loading
3. ✅ Fix console errors
4. ✅ Improve cache headers

**Expected Result:**
- Desktop: 75-85 → 85-95
- Mobile: 85-90 → 90-95

## Monitoring & Validation

### Metrics to Track

1. **Core Web Vitals**
   - FCP: Target <1.8s
   - LCP: Target <2.5s
   - TBT: Target <200ms
   - CLS: Target <0.1

2. **Performance Metrics**
   - Total JavaScript size
   - Main-thread blocking time
   - Time to Interactive (TTI)

3. **User Experience**
   - Bounce rate
   - Time on page
   - User engagement metrics

### Testing Tools

1. **PageSpeed Insights** - Regular monitoring
2. **Chrome DevTools** - Performance profiling
3. **WebPageTest** - Detailed waterfall analysis
4. **Lighthouse CI** - Automated testing in CI/CD

## Quick Wins (Can Implement Today)

1. ✅ Add preconnect hints (5 minutes)
2. ✅ Set explicit map dimensions (10 minutes)
3. ✅ Add `font-display: swap` (5 minutes)
4. ✅ Defer non-critical CSS (15 minutes)
5. ✅ Add `fetchpriority="high"` to LCP image (5 minutes)

**Total Time:** ~40 minutes  
**Expected Improvement:** +10-15 points on both Desktop and Mobile

## Conclusion

The map page has significant performance issues, particularly on mobile devices. The primary focus should be on:

1. **Reducing Total Blocking Time** - Critical for user interaction
2. **Improving LCP on Mobile** - Critical for perceived performance
3. **Fixing Layout Shifts** - Critical for user experience

With the recommended optimizations, we can expect:
- **Desktop:** 40 → 85-95 (2x improvement)
- **Mobile:** 61 → 90-95 (50% improvement)

The optimizations are prioritized by impact and implementation difficulty, allowing for incremental improvements while working toward the target scores.
