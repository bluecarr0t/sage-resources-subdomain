# Immediate Fix for Photo Loading Issue

## Problem Summary
Photos are failing to load because:
1. **Root Cause**: Photo references in database are **expired** (Google photo references have limited lifespan)
2. **Missing Data**: Many properties (including "Wildhaven Sonoma") don't have `google_place_id` set
3. **Cannot Refresh**: Without Place IDs, we can't fetch fresh photo references from Google

## Immediate Solution (2 Steps)

### Step 1: Populate Missing Google Place IDs

Run this script to find and populate Place IDs for properties:

```bash
# Install dependencies if needed
npm install

# Populate Place IDs (dry run first to see what would change)
npx tsx scripts/populate-google-place-ids.ts --dry-run --limit 10

# If it looks good, run for real
npx tsx scripts/populate-google-place-ids.ts --limit 50

# Once verified, run for all properties
npx tsx scripts/populate-google-place-ids.ts
```

**What this does:**
- Searches Google Places API for each property
- Matches by property name, address, city, state
- Updates `google_place_id` column
- **Cost**: ~$0.03 per property (~$18 for 607 properties)

### Step 2: Refresh Photo References

After Place IDs are populated, refresh the photos:

```bash
# Refresh photos for all properties with Place IDs
python3 scripts/fetch_google_places_extended.py --update-all --delay 0.2
```

**What this does:**
- Fetches fresh photo references from Google
- Updates `google_photos` with current, valid references
- Also updates ratings, reviews, contact info
- **Cost**: ~$0.017 per property (~$10 for 607 properties)
- **Time**: ~2 hours (respects API rate limits)

## Quick Test (Single Property)

Test with Wildhaven Sonoma first:

```bash
# Step 1: Get its Place ID
npx tsx scripts/populate-google-place-ids.ts --dry-run --limit 1

# Step 2: Refresh its photos via API
curl -X POST "http://localhost:3001/api/refresh-photo" \
  -H "Content-Type: application/json" \
  -d '{"propertyName": "Wildhaven Sonoma"}'

# Step 3: Verify photos work
curl "http://localhost:3001/api/test-photo-data?property=Wildhaven%20Sonoma" | python3 -m json.tool
```

## Alternative: Temporary Fallback (If you need immediate visual fix)

While refreshing photos, you can temporarily hide broken photos:

**Option A: Hide broken photos gracefully**
Already implemented - photos show faded state when they fail to load.

**Option B: Use placeholder image**
Update `components/GooglePropertyMap.tsx` to use a fallback image:

```typescript
onError={(e) => {
  const target = e.target as HTMLImageElement;
  target.src = '/images/property-placeholder.jpg'; // Add a placeholder
  target.alt = 'Property image unavailable';
}}
```

## Long-term Solution: Automated Refresh

Set up automated photo reference refresh every 2-3 months:

**Option 1: Vercel Cron Job**
Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-photos",
      "schedule": "0 2 1 */3 *"
    }
  ]
}
```

**Option 2: GitHub Actions**
Create `.github/workflows/refresh-photos.yml`:

```yaml
name: Refresh Google Photos
on:
  schedule:
    - cron: '0 2 1 */3 *'  # First day of every 3rd month at 2 AM
  workflow_dispatch:  # Allow manual trigger

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
      - name: Install dependencies
        run: pip install requests python-dotenv
      - name: Refresh photos
        env:
          NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: python3 scripts/fetch_google_places_extended.py --update-all --delay 0.2
```

## Cost Summary

| Task | API Calls | Cost per Call | Total Cost |
|------|-----------|---------------|------------|
| Populate Place IDs | 607 | $0.032 | ~$19 |
| Refresh Photos | 607 | $0.017 | ~$10 |
| **Total (one-time)** | | | **~$29** |
| **Quarterly refresh** | 607 | $0.017 | **~$10/quarter** |

## Files Modified/Created

- ✅ `app/api/test-photo-data/route.ts` - Test endpoint (can delete after fix)
- ✅ `app/api/refresh-photo/route.ts` - Manual refresh endpoint
- ✅ `PHOTO_REFERENCE_ISSUE_SOLUTION.md` - Documentation
- ✅ `IMMEDIATE_FIX_PHOTOS.md` - This file
- ✅ `app/api/google-places-photo/route.ts` - Enhanced error logging
- ✅ `components/GooglePropertyMap.tsx` - Better error handling

## Next Steps

1. ✅ **Run Step 1**: Populate Place IDs
2. ✅ **Run Step 2**: Refresh photos
3. ✅ **Verify**: Test in browser
4. ✅ **Clean up**: Delete test endpoints
5. ✅ **Automate**: Set up scheduled refresh
