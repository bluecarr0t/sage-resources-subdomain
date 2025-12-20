# Google Places API Cost Estimate for Populating google_place_id

**Date:** December 2024  
**Script:** `scripts/populate-google-place-ids.ts`

## API Endpoint Used

**Google Places API Text Search** (`places:searchText`)

## Pricing (as of December 2024)

Based on [Google Maps Platform Pricing](https://developers.google.com/maps/billing-and-pricing/pricing):

| Tier | 0–100,000 Requests | 100,001–500,000 Requests |
|------|-------------------|-------------------------|
| **Basic** | $32.00 per 1,000 | $25.60 per 1,000 |
| **Advanced** | $35.00 per 1,000 | $28.00 per 1,000 |
| **Preferred** | $40.00 per 1,000 | $32.00 per 1,000 |

**Note:** Google provides **$200/month free credit** that is automatically applied to eligible SKUs until February 28, 2025.

## API Calls Per Property

Each property processed requires:
- **1 Text Search API call** (even though we request up to 5 results, it counts as 1 API call)

## Estimated Properties to Process

Based on codebase analysis:
- **Total properties in database:** ~1,300 properties
- **Properties without `google_place_id`:** Unknown (varies based on current state)

For this estimate, we'll assume:
- **Best case:** 500 properties need place_id
- **Typical case:** 1,000 properties need place_id  
- **Worst case:** 1,300 properties need place_id (all properties)

## Cost Calculation

### Scenario 1: 500 Properties

**API Calls:** 500 requests

**Cost (Basic Tier):**
- 500 requests × $32.00 / 1,000 = **$16.00**
- With $200 free credit: **$0.00** (covered by free credit)

**Cost (Advanced Tier):**
- 500 requests × $35.00 / 1,000 = **$17.50**
- With $200 free credit: **$0.00** (covered by free credit)

### Scenario 2: 1,000 Properties (Typical)

**API Calls:** 1,000 requests

**Cost (Basic Tier):**
- 1,000 requests × $32.00 / 1,000 = **$32.00**
- With $200 free credit: **$0.00** (covered by free credit)

**Cost (Advanced Tier):**
- 1,000 requests × $35.00 / 1,000 = **$35.00**
- With $200 free credit: **$0.00** (covered by free credit)

### Scenario 3: 1,300 Properties (Worst Case)

**API Calls:** 1,300 requests

**Cost (Basic Tier):**
- 1,300 requests × $32.00 / 1,000 = **$41.60**
- With $200 free credit: **$0.00** (covered by free credit)

**Cost (Advanced Tier):**
- 1,300 requests × $35.00 / 1,000 = **$45.50**
- With $200 free credit: **$0.00** (covered by free credit)

## Summary

| Properties | API Calls | Cost (Basic) | Cost After Credit |
|-----------|-----------|--------------|-------------------|
| 500 | 500 | $16.00 | **$0.00** ✅ |
| 1,000 | 1,000 | $32.00 | **$0.00** ✅ |
| 1,300 | 1,300 | $41.60 | **$0.00** ✅ |

## Important Notes

### Free Credit Coverage
- **$200/month free credit** covers this entire operation (even at 1,300 properties)
- The free credit is automatically applied until **February 28, 2025**
- After that date, you'll be charged, but costs remain very low ($32-45 for all properties)

### Rate Limiting
The script includes a 100ms delay between requests:
- **1,000 properties** = ~100 seconds (1.7 minutes) of execution time
- **1,300 properties** = ~130 seconds (2.2 minutes) of execution time

This prevents hitting API rate limits and ensures smooth execution.

### Checking Current Status

Before running, you can check how many properties need place_id:

```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) as properties_without_place_id
FROM "all_glamping_properties"
WHERE google_place_id IS NULL;
```

### Recommendation

**✅ Safe to run immediately** - The $200/month free credit covers this operation entirely, so there's no cost risk.

Even after the free credit expires, the cost is minimal:
- ~1,000 properties = $32.00 (one-time cost)
- This is a one-time population, not recurring
- The benefit (reduced API calls in production) far outweighs this small cost

## Next Steps

1. **Check current status:**
   ```sql
   SELECT COUNT(*) FROM "all_glamping_properties" WHERE google_place_id IS NULL;
   ```

2. **Test with dry-run:**
   ```bash
   npx tsx scripts/populate-google-place-ids.ts --dry-run --limit=10
   ```

3. **Test with small batch:**
   ```bash
   npx tsx scripts/populate-google-place-ids.ts --limit=50
   ```

4. **Run full population:**
   ```bash
   npx tsx scripts/populate-google-place-ids.ts
   ```

## Long-term Savings

After populating `google_place_id`:
- **50% reduction** in Google Places API calls (Text Search becomes optional)
- Only Place Details API calls needed (when place_id is cached)
- Estimated monthly savings: **$1,650 - $1,970/month** (per GOOGLE_API_USAGE_AUDIT.md)

This makes the one-time $32-45 cost a very worthwhile investment.
