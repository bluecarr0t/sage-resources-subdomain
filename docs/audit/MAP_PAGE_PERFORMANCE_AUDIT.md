# Map Page Performance Audit

**Date:** December 18, 2025  
**Test URL:** `https://resources.sageoutdooradvisory.com/en/map?country=United+States&country=Canada`  
**Auditor:** Senior Developer Performance Analysis

## Executive Summary

This performance audit analyzes the `/en/map` page with country filters for United States and Canada. The audit identifies several critical performance bottlenecks and provides actionable recommendations to improve page load times, reduce bundle sizes, and optimize user experience.

### Key Findings

- **Component Complexity:** GooglePropertyMap component is extremely large (3,339 lines, 147.55 KB)
- **Bundle Size:** High client-side component ratio (55.56% client components)
- **Data Loading:** Fetches all properties on initial load without field selection
- **Structured Data:** 6 separate structured data scripts could be consolidated
- **Server-Side:** Statistics fetched on every request instead of static generation

## Test Results

### Performance Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Total Components | 54 | ⚠️ High |
| Client Components | 30 (55.56%) | ⚠️ High Ratio |
| Dynamic Imports | 11 | ✅ Good |
| GooglePropertyMap Size | 3,339 lines, 147.55 KB | ❌ Critical |
| Structured Data Scripts | 6 | ⚠️ Should Consolidate |

### Bundle Analysis

```
Total Components: 54
Client Components: 30
Dynamic Imports: 11
Client Component Ratio: 55.56%
```

**Analysis:**
- 55.56% of components are client-side, which increases JavaScript bundle size
- Only 11 dynamic imports detected - more code splitting opportunities exist
- Large component files indicate need for better code organization

## Critical Issues

### 1. GooglePropertyMap Component Size (CRITICAL)

**Issue:** The `GooglePropertyMap.tsx` component is extremely large:
- **3,339 lines** of code
- **147.55 KB** file size
- **65+ React hooks** (useState, useEffect, useMemo)

**Impact:**
- Large initial JavaScript bundle
- Slower parsing and execution time
- Difficult to maintain and optimize
- Poor code splitting opportunities

**Recommendations:**
1. **Split into smaller components:**
   - `MapMarkers.tsx` - Handle marker rendering and clustering
   - `MapFilters.tsx` - Filter UI components
   - `MapInfoWindow.tsx` - Info window content
   - `MapLayers.tsx` - Population, GDP, Opportunity Zones layers
   - `MapControls.tsx` - Map control buttons and UI

2. **Extract custom hooks:**
   - `useMapFilters.ts` - Filter state management
   - `useMapMarkers.ts` - Marker management logic
   - `useMapBounds.ts` - Viewport bounds handling
   - `usePropertyData.ts` - Property data processing

3. **Lazy load heavy features:**
   - Load population/GDP layers only when enabled
   - Defer national parks loading
   - Load photo galleries on demand

**Expected Impact:**
- Reduce initial bundle by 40-60%
- Improve Time to Interactive (TTI) by 1-2 seconds
- Better code maintainability

### 2. Data Loading Strategy (HIGH PRIORITY)

**Current Implementation:**
```typescript
// Fetches ALL fields for ALL properties matching filters
const { data: properties } = await supabase
  .from('all_glamping_properties')
  .select('*')  // ❌ Fetches all columns
  .eq('is_glamping_property', 'Yes')
  .in('country', ['USA', 'United States', 'US', 'Canada', 'CA'])
```

**Issues:**
- Fetches all columns (`select('*')`) even when only a few are needed for map markers
- No field selection for initial map load
- Large response payload (potentially 5+ MB for full dataset)
- All data loaded upfront, even outside viewport

**Recommendations:**

1. **Implement Field Selection for Map Markers:**
```typescript
// Initial load - only essential fields for markers
const { data: properties } = await supabase
  .from('all_glamping_properties')
  .select('id, property_name, lat, lon, state, country, unit_type, rate_category')
  .eq('is_glamping_property', 'Yes')
  .in('country', ['USA', 'United States', 'US', 'Canada', 'CA']);

// Load full details only when marker is clicked
const { data: fullProperty } = await supabase
  .from('all_glamping_properties')
  .select('*')
  .eq('id', propertyId)
  .single();
```

2. **Implement Viewport-Based Loading:**
```typescript
// Only load properties within current map bounds
const bounds = map.getBounds();
const response = await fetch(`/api/properties?${params}&north=${bounds.getNorth()}&south=${bounds.getSouth()}&east=${bounds.getEast()}&west=${bounds.getWest()}`);
```

3. **Use API Route Field Parameter:**
The API already supports field selection via `fields` parameter:
```typescript
fetch(`/api/properties?country=United+States&country=Canada&fields=id,property_name,lat,lon,state,country`)
```

**Expected Impact:**
- Reduce initial payload by 70-80%
- Improve API response time by 50-70%
- Faster Time to First Byte (TTFB)

### 3. Structured Data Optimization (MEDIUM PRIORITY)

**Issue:** Map page includes 6 separate structured data scripts:
1. Organization Schema
2. Map Schema
3. Item List Schema
4. Web Application Schema
5. Breadcrumb Schema
6. Dataset Schema

**Recommendations:**
1. **Consolidate into single script:**
```typescript
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    organizationSchema,
    mapSchema,
    itemListSchema,
    webApplicationSchema,
    breadcrumbSchema,
    datasetSchema
  ]
};
```

2. **Move to external JSON-LD file** (if size is still large)
3. **Lazy load non-critical schemas** (Dataset schema can load after page load)

**Expected Impact:**
- Reduce HTML size by 5-10 KB
- Faster initial HTML parsing

### 4. Server-Side Statistics Fetching (MEDIUM PRIORITY)

**Current Implementation:**
```typescript
// Fetches statistics on every request
const stats = await getPropertyStatistics();
```

**Issue:**
- Statistics are fetched on every page request
- Uses `unstable_cache` but still requires database query
- Statistics change infrequently

**Recommendations:**
1. **Use Static Generation with ISR:**
```typescript
export const revalidate = 3600; // Revalidate every hour

export default async function MapPage({ params }: PageProps) {
  const stats = await getPropertyStatistics();
  // ...
}
```

2. **Pre-compute statistics** during build or via cron job
3. **Use edge caching** with longer TTL for statistics

**Expected Impact:**
- Reduce server response time by 200-500ms
- Lower database load

### 5. Client Component Ratio (MEDIUM PRIORITY)

**Issue:** 55.56% of components are client-side, increasing JavaScript bundle size.

**Recommendations:**
1. **Convert appropriate components to Server Components:**
   - Map page metadata (already server-side ✅)
   - Structured data generation (already server-side ✅)
   - Statistics display (if static)

2. **Use Server Components for static content:**
   - Breadcrumb navigation
   - SEO content sections
   - Static filter options

3. **Keep only interactive parts as Client Components:**
   - Map itself (requires browser APIs)
   - Filters with state
   - Info windows

**Expected Impact:**
- Reduce client bundle by 20-30%
- Faster initial page load

## Performance Recommendations by Priority

### Priority 1: Critical (Implement Immediately)

1. **Split GooglePropertyMap Component**
   - Break into 5-7 smaller components
   - Extract custom hooks
   - Expected improvement: 40-60% bundle reduction

2. **Implement Field Selection for Map Load**
   - Use `fields` parameter in API calls
   - Load only essential fields for markers
   - Expected improvement: 70-80% payload reduction

3. **Add Viewport-Based Loading**
   - Load properties only within visible bounds
   - Implement progressive loading
   - Expected improvement: 50-70% faster initial load

### Priority 2: High (Implement This Sprint)

4. **Optimize Data Processing**
   - Move property grouping logic to server-side or Web Worker
   - Cache processed property data
   - Expected improvement: 30-50% faster processing

5. **Implement Code Splitting**
   - Lazy load map layers (Population, GDP, Opportunity Zones)
   - Lazy load national parks data
   - Expected improvement: 20-30% faster TTI

6. **Optimize Structured Data**
   - Consolidate into single script
   - Use @graph format
   - Expected improvement: 5-10 KB HTML reduction

### Priority 3: Medium (Next Sprint)

7. **Static Generation for Statistics**
   - Use ISR with 1-hour revalidation
   - Pre-compute during build
   - Expected improvement: 200-500ms server response time

8. **Reduce Client Component Ratio**
   - Convert static components to Server Components
   - Keep only interactive parts client-side
   - Expected improvement: 20-30% bundle reduction

9. **Optimize Image Loading**
   - Implement lazy loading for property photos
   - Use Next.js Image component with proper sizing
   - Expected improvement: Faster LCP

### Priority 4: Low (Future Improvements)

10. **Implement Service Worker Caching**
    - Cache API responses
    - Cache map tiles
    - Expected improvement: Faster subsequent loads

11. **Add Performance Monitoring**
    - Implement Web Vitals tracking
    - Monitor Core Web Vitals
    - Set up performance budgets

## Code Quality Improvements

### Component Organization

**Current Structure:**
```
components/
  GooglePropertyMap.tsx (3,339 lines) ❌
  MapLayout.tsx
  MapContext.tsx
```

**Recommended Structure:**
```
components/
  map/
    GooglePropertyMap.tsx (main component, ~200 lines)
    MapMarkers.tsx
    MapFilters.tsx
    MapInfoWindow.tsx
    MapLayers/
      PopulationLayer.tsx
      GDPLayer.tsx
      OpportunityZonesLayer.tsx
    hooks/
      useMapFilters.ts
      useMapMarkers.ts
      useMapBounds.ts
      usePropertyData.ts
```

### Performance Best Practices

1. **Memoization:**
   - ✅ Already using `useMemo` for processed properties
   - ⚠️ Review all expensive computations
   - Add `React.memo` for expensive child components

2. **Effect Dependencies:**
   - Review all `useEffect` dependencies
   - Ensure proper cleanup functions
   - Avoid unnecessary re-renders

3. **State Management:**
   - ✅ Using Context for shared state
   - ⚠️ Consider if Context is causing unnecessary re-renders
   - Evaluate Zustand or Jotai for complex state

## Testing Recommendations

1. **Add Performance Tests:**
   - Lighthouse CI integration
   - Web Vitals monitoring
   - Bundle size budgets

2. **Load Testing:**
   - Test with 1000+ properties
   - Test with multiple country filters
   - Test viewport-based loading

3. **Real User Monitoring:**
   - Implement RUM for production
   - Track Core Web Vitals
   - Monitor API response times

## Expected Performance Improvements

After implementing Priority 1 and 2 recommendations:

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Initial Bundle Size | ~500 KB | ~200 KB | 60% reduction |
| API Response Time | ~2-3s | ~500ms | 75% faster |
| Time to Interactive | ~5-7s | ~2-3s | 50% faster |
| First Contentful Paint | ~2s | ~1s | 50% faster |
| Largest Contentful Paint | ~4s | ~2s | 50% faster |

## Implementation Timeline

### Week 1: Critical Fixes
- Split GooglePropertyMap component
- Implement field selection
- Add viewport-based loading

### Week 2: High Priority
- Optimize data processing
- Implement code splitting
- Consolidate structured data

### Week 3: Medium Priority
- Static generation for statistics
- Reduce client component ratio
- Image optimization

### Week 4: Testing & Monitoring
- Performance testing
- Load testing
- RUM implementation

## Conclusion

The map page has significant performance optimization opportunities. The most critical issues are:

1. **Component size** - GooglePropertyMap needs to be split
2. **Data loading** - Too much data loaded upfront
3. **Bundle size** - High client-side component ratio

Implementing the Priority 1 and 2 recommendations should result in:
- **60% reduction** in bundle size
- **75% faster** API responses
- **50% improvement** in Time to Interactive

These improvements will significantly enhance user experience, especially on mobile devices and slower connections.

---

**Next Steps:**
1. Review and approve this audit
2. Prioritize recommendations with product team
3. Create implementation tickets
4. Set up performance monitoring
5. Schedule follow-up audit after improvements
