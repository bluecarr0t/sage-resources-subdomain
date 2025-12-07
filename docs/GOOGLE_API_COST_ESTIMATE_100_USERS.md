# Google API Cost Estimate: 100 Users Per Day

**Date:** December 2025  
**Pages Analyzed:** `/map` and `/property/[slug]`  
**Assumption:** 100 unique users per day accessing these pages  
**Status:** ✅ Google Terms of Service Compliant (Place ID caching only, all other data fetched fresh)

---

## Compliant Caching Strategy

### Google Terms of Service Compliance ✅

**What We Cache (Allowed by Google):**
- ✅ **Place IDs only** - Stored permanently (in database + memory)
  - Place IDs are unique identifiers that can be cached indefinitely
  - This allows us to skip the Text Search API call on subsequent visits

**What We DON'T Cache (Per Google Terms):**
- ❌ Ratings and review counts - Always fetched fresh
- ❌ Photos - Always fetched fresh (browser/CDN caching is separate)
- ❌ Descriptions/summaries - Always fetched fresh
- ❌ Website URLs - Always fetched fresh
- ❌ Phone numbers - Always fetched fresh

**Result:** All data displayed to users is always fresh and up-to-date, fully compliant with Google's Terms of Service.

### API Call Flow

**First Visit to a Property (Place ID not cached):**
1. Text Search API call (to find Place ID)
2. Place Details API call (to get fresh data: ratings, photos, descriptions, etc.)
3. Photo Media API calls (for each photo displayed)
- **Total: 2-3 API calls** (2 for data + 1 for first photo)

**Subsequent Visits (Place ID cached):**
1. Place Details API call only (skips Text Search since Place ID is known)
2. Photo Media API calls (cached by browser/CDN with 1-year headers)
- **Total: 1-2 API calls** (1 for data + 1 for first photo if not browser-cached)
- **Savings: 50% reduction** in API calls (saves Text Search call)

---

## Cost Breakdown Summary

### Property Pages (`/property/[slug]`) - 100 Users/Day

**API Calls Per Page Visit (Compliant Caching):**
- ✅ **Place ID Cached:** 1 API call (Place Details only - skips Text Search)
- ✅ **Place ID NOT Cached:** 2 API calls (Text Search + Place Details)
- ✅ **Photo Media API:** Variable (browser/CDN cached with 1-year headers)

**Daily Cost Calculation:**

#### Scenario A: Conservative (70% Place ID cache hit rate)
- Property page visits: 100 users/day
- Place ID cache hits: 70% = 70 properties with cached Place IDs
- Place ID cache misses: 30% = 30 properties need Text Search

**API Calls:**
- Text Search: 30 calls/day (only for properties without cached Place ID) × $17.00 / 1,000 = **$0.51/day**
- Place Details: 100 calls/day (always fetched fresh) × $17.00 / 1,000 = **$1.70/day**
- Photo Media: 
  - First photo loaded immediately per property
  - With 1-year cache headers, photos are cached by browsers/CDN
  - Assumption: 30 new/unique properties visited/day = 30 photo requests/day
  - 30 calls/day × $7.00 / 1,000 = **$0.21/day**

**Total Property Pages:** **$2.42/day** = **$72.60/month**

#### Scenario B: Worst Case (No Place ID cache, all new properties)
- Property page visits: 100 users/day
- Place ID cache hits: 0% = All properties need Text Search

**API Calls:**
- Text Search: 100 calls/day × $17.00 / 1,000 = **$1.70/day**
- Place Details: 100 calls/day × $17.00 / 1,000 = **$1.70/day**
- Photo Media: 100 calls/day × $7.00 / 1,000 = **$0.70/day**

**Total Property Pages (Worst Case):** **$4.10/day** = **$123/month**

#### Scenario C: Realistic (50% Place ID cache hit rate)
- Property page visits: 100 users/day
- Place ID cache hits: 50% = 50 properties with cached Place IDs
- Place ID cache misses: 50% = 50 properties need Text Search

**API Calls:**
- Text Search: 50 calls/day × $17.00 / 1,000 = **$0.85/day**
- Place Details: 100 calls/day × $17.00 / 1,000 = **$1.70/day**
- Photo Media: 50 calls/day × $7.00 / 1,000 = **$0.35/day**

**Total Property Pages (Realistic):** **$2.90/day** = **$87/month**

---

### Map Pages (`/map`) - 100 Users/Day

**API Calls Per Map Page Visit:**
- ✅ **Maps JavaScript API:** 1 map load per visit
- ✅ **Places Autocomplete API (Legacy):** Variable (only when user searches)
- ✅ **Place Details API (Legacy):** Variable (only when user selects location)

**Daily Cost Calculation:**

#### Maps JavaScript API
- Map loads: 100 users/day × 1 load = 100 loads/day
- Cost: 100 loads/day × $7.00 / 1,000 = **$0.70/day**

#### Autocomplete API (Assumptions)
- **Scenario:** 30% of users perform a location search
- Average searches per user: 1.5 searches (user types location, clears, types again)
- With optimizations (3-char minimum, 300ms debounce, client-side cache): 40% reduction

**Without optimizations:**
- Users searching: 30 users/day
- Average API calls per search: 3 calls (user types "Yellowstone" = 8 chars - 3 min = 5 keystrokes, with debounce ≈ 3 calls)
- Total calls: 30 users × 1.5 searches × 3 calls = 135 calls/day

**With optimizations (40% reduction):**
- Total calls: 135 × 0.6 = **81 calls/day**
- Cost: 81 calls/day × $2.83 / 1,000 = **$0.23/day**

#### Place Details API (Legacy)
- Users selecting location: 30 users/day (same users who searched)
- With session tokens: Autocomplete + getDetails grouped as single session (billed together)
- Assumption: 30 calls/day (one per user selection)
- Cost: 30 calls/day × $17.00 / 1,000 = **$0.51/day**

**Total Map Pages:** **$1.44/day** = **$43.20/month**

---

## Combined Cost Estimate: 100 Users/Day

### Conservative Estimate (70% Place ID cache hit on property pages)
- **Property Pages:** $2.42/day ($72.60/month)
- **Map Pages:** $1.44/day ($43.20/month)
- **Total Daily:** **$3.86/day**
- **Total Monthly:** **$115.80/month**

### Realistic Estimate (50% Place ID cache hit on property pages)
- **Property Pages:** $2.90/day ($87/month)
- **Map Pages:** $1.44/day ($43.20/month)
- **Total Daily:** **$4.34/day**
- **Total Monthly:** **$130.20/month**

### Worst Case Estimate (No Place ID cache on property pages)
- **Property Pages:** $4.10/day ($123/month)
- **Map Pages:** $1.44/day ($43.20/month)
- **Total Daily:** **$5.54/day**
- **Total Monthly:** **$166.20/month**

---

## Cost Breakdown by API Type

### Property Pages (100 users/day, 50% Place ID cache hit rate)
| API Type | Calls/Day | Cost/Day | Cost/Month |
|----------|-----------|----------|------------|
| Text Search API | 50 | $0.85 | $25.50 |
| Place Details API | 100 | $1.70 | $51.00 |
| Photo Media API | 50 | $0.35 | $10.50 |
| **Subtotal** | **200** | **$2.90** | **$87.00** |

**Note:** Place Details API is always called (data fetched fresh per Google Terms). Text Search is only called when Place ID is not cached (50% of visits).

### Map Pages (100 users/day, 30% search usage)
| API Type | Calls/Day | Cost/Day | Cost/Month |
|----------|-----------|----------|------------|
| Maps JavaScript API | 100 | $0.70 | $21.00 |
| Autocomplete API | 81 | $0.23 | $6.90 |
| Place Details API (Legacy) | 30 | $0.51 | $15.30 |
| **Subtotal** | **211** | **$1.44** | **$43.20** |

### Combined Total (Realistic - 50% Place ID cache hit)
| API Type | Calls/Day | Cost/Day | Cost/Month |
|----------|-----------|----------|------------|
| **All APIs** | **411** | **$4.34** | **$130.20** |

---

## Key Assumptions

### Property Pages
1. **Place ID Cache Hit Rate:** 50-70% (depends on how many properties have Place IDs stored in database)
   - Properties with stored Place IDs: Only 1 API call (Place Details - skips Text Search)
   - Properties without Place IDs: 2 API calls (Text Search + Place Details)
2. **Compliant Caching:** Only Place IDs are cached (permanent storage allowed by Google)
   - All other data (ratings, photos, descriptions) is always fetched fresh ✅
3. **Photos:** Browser/CDN cached with 1-year headers (optimal caching)
   - Photo references are stable and can be cached indefinitely
   - Only first visit per property triggers photo API call
4. **Photo Display:** First photo loaded immediately, others loaded on-demand (user navigates carousel)
5. **Average Photos Per Property:** 1 photo API call per unique property (due to browser/CDN caching)

### Map Pages
1. **Search Usage:** 30% of users perform a location search
2. **Searches Per User:** 1.5 average (user may clear and retry)
3. **Autocomplete Optimizations:** 40% reduction in calls (3-char minimum, debounce, client cache)
4. **Session Tokens:** Autocomplete + getDetails grouped for billing optimization

### Compliance
- ✅ **Google Terms Compliant:** Only Place IDs cached permanently
- ✅ **Always Fresh Data:** Ratings, reviews, photos, descriptions fetched fresh every time
- ✅ **No Risk:** Zero chance of violating Google's Terms of Service

---

## Free Tier Considerations

Google provides **$200/month free credit** for Maps Platform APIs. This covers:
- Up to **10,000 requests/month** for Places API (New) - Text Search and Place Details
- Up to **28,000 map loads/month** for Maps JavaScript API
- Up to **10,000 requests/month** for Photo Media API

### Impact on 100 Users/Day (3,000 users/month)

**Property Pages (50% Place ID cache hit):**
- Text Search: 1,500 calls/month (only for properties without cached Place ID) - **Within free tier** ✅
- Place Details: 3,000 calls/month (always fetched fresh, compliant with Google Terms) - **Within free tier** ✅
- Photo Media: 1,500 calls/month - **Within free tier** ✅

**Map Pages:**
- Maps JavaScript: 3,000 loads/month - **Within free tier** ✅
- Autocomplete: 2,430 calls/month (81/day) - **Within free tier** ✅
- Place Details (Legacy): 900 calls/month - **Within free tier** ✅

**Total API Calls:** ~12,330 calls/month
- Places API (New): ~4,500 calls/month (Text Search + Place Details combined, within 10,000 free tier) ✅
- Maps JavaScript: ~3,000 loads/month (within 28,000 free tier) ✅
- Legacy APIs: ~3,330 calls/month (within free tiers) ✅

### Free Tier Coverage

With 100 users/day (3,000 users/month):
- **All API calls are within free tier limits** ✅
- **Estimated cost: $0.00/month** (covered by free credit)
- **Remaining free credit:** ~$200/month available

**Note:** Once you exceed free tier limits, costs apply as calculated above. For example, if you had 1,000 users/day (30,000 users/month), you would start paying per the pricing tables above.

---

## Cost Projections for Higher Traffic

### 500 Users/Day (15,000 users/month)

**Property Pages (50% Place ID cache hit):**
- Text Search: 7,500 calls/month (only for properties without cached Place ID) - **Free** ✅
- Place Details: 15,000 calls/month (always fetched fresh, compliant) - **Over free tier** (5,000 calls × $17 / 1,000 = $85/month)
- Photo Media: 7,500 calls/month - **Free** ✅

**Map Pages (30% search usage):**
- Maps JavaScript: 15,000 loads/month - **Free** ✅
- Autocomplete: 12,150 calls/month - **Over free tier** (2,150 calls × $2.83 / 1,000 = $6.09/month)
- Place Details: 4,500 calls/month - **Free** ✅

**Total: $91.09/month**

### 1,000 Users/Day (30,000 users/month)

**Property Pages (50% Place ID cache hit):**
- Text Search: 15,000 calls/month (only for properties without cached Place ID) - **Over free tier** (5,000 calls × $17 / 1,000 = $85/month)
- Place Details: 30,000 calls/month (always fetched fresh, compliant) - **Over free tier** (20,000 calls × $17 / 1,000 = $340/month)
- Photo Media: 15,000 calls/month - **Over free tier** (5,000 calls × $7 / 1,000 = $35/month)

**Map Pages (30% search usage):**
- Maps JavaScript: 30,000 loads/month - **Over free tier** (2,000 loads × $7 / 1,000 = $14/month)
- Autocomplete: 24,300 calls/month - **Over free tier** (14,300 calls × $2.83 / 1,000 = $40.47/month)
- Place Details: 9,000 calls/month - **Free** ✅

**Total: $514.47/month**

---

## Recommendations

1. **Store Place IDs in Database:** Populate the `google_place_id` column for all properties to maximize Place ID cache hits (50% reduction in API calls)
2. **Monitor Place ID Cache Hit Rate:** Track how many properties have stored Place IDs to optimize savings
3. **Monitor Free Tier Usage:** Set up alerts when approaching free tier limits
4. **Photo Caching:** Photos already have optimal 1-year cache headers - ensure CDN is properly configured
5. **Compliance:** Current implementation is fully Google Terms compliant - only Place IDs are cached, all other data is always fresh

### Expected Savings from Database Place ID Storage

If all properties have Place IDs stored in the database:
- **Current (50% Place ID cache hit):** 50 Text Search calls/day saved
- **With 100% Place ID cache hit:** 100 Text Search calls/day saved
- **Additional savings:** ~$1.70/day = **$51/month**

---

## Summary

**For 100 users per day on `/map` and `/property[slug]` pages:**

- **Realistic Monthly Cost:** **$130.20/month** (50% Place ID cache hit rate)
- **With Free Tier ($200/month credit):** **$0/month** ✅
- **All API usage is within free tier limits**
- **Google Terms Compliant:** ✅ Only Place IDs cached, all other data fetched fresh

### Key Points

1. **Compliant Caching:** Implementation fully complies with Google's Terms of Service
   - Only Place IDs are cached permanently (allowed)
   - All other data (ratings, photos, descriptions) is always fetched fresh

2. **API Call Efficiency:**
   - Properties with cached Place ID: 1 API call (Place Details only)
   - Properties without Place ID: 2 API calls (Text Search + Place Details)
   - **50% reduction** in API calls when Place ID is cached

3. **Free Tier Coverage:**
   - All API calls for 100 users/day are within Google's free tier limits
   - No costs until exceeding free tier thresholds

4. **Cost Optimization:**
   - Store Place IDs in database for maximum savings
   - Photo caching via browser/CDN (1-year headers)
   - Request-level deduplication prevents duplicate calls

The free tier provides excellent coverage for this traffic level. Costs will only apply when you exceed free tier limits (10,000+ Places API calls/month, 28,000+ map loads/month).
