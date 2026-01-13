# Photo Reference Issue - Root Cause & Solution

## Problem
Photos failing to load with error:
```
"The photo resource in the request is invalid. Please retrieve it from Places API endpoints."
```

## Root Cause
Google Places API photo references **expire** after a certain period (typically a few months). The photo references stored in your Supabase database are outdated and no longer valid.

## Verification
Tested the photo reference directly with Google's API:
- **Legacy API (photo_reference)**: 400 Bad Request
- **New API (photo name)**: 400 Bad Request with message: "The photo resource in the request is invalid"

Example expired photo reference:
```
places/ChIJr8RBtmERhIAR1SkvI-PJIao/photos/AZLasHqtOjH7LyZOta7EDR8SVyYPId7lm6QMhUbEo70I_fRHNPqam_GDL8f0Sw6zz2rhoG1NOYXUXFdbX0A3NKynHMqPg1IvnZnnkMrh7Ej00OIyKEY79DSAcpHhcH126b66isHdG1QRQVd70pg2U_Kss2BHsy62AAxRoa1LiRDCNN0yLeBiVR5LW5uxYAFoAlWRnruDD_DXA5WEb8jc1igBt6apAOFpYxcj6d-IW-dEqxHOaqG3sBjO4bRenY-l3iM8GmD45LAhL1ZQ4rPuJhitBbjeA07Y8awL1uAQJwD3iMiP4A
```

## Solution

### Option 1: Refresh All Properties (Recommended)
Re-fetch Google Places data for ALL properties to get fresh photo references:

```bash
# Update all properties with fresh Google data
python3 scripts/fetch_google_places_extended.py --update-all --delay 0.2

# This will:
# - Fetch fresh place details from Google Places API
# - Update google_photos with current, valid photo references
# - Update other Google data (ratings, reviews, etc.)
# - Take ~1-2 hours for 600+ properties (respects API rate limits)
```

### Option 2: Refresh Specific Properties
If you want to refresh only properties with invalid photos:

```bash
# Update properties that need refresh (those with existing data)
python3 scripts/fetch_google_places_extended.py --delay 0.2
```

### Option 3: Refresh Single Property (Testing)
For testing, refresh just one property:

```bash
python3 scripts/fetch_google_places_extended.py --limit 1 --update-all --delay 0.2
```

## Verification After Refresh

1. **Test a specific property:**
   ```bash
   curl "http://localhost:3001/api/test-photo-data?property=Wildhaven%20Sonoma" | python3 -m json.tool
   ```

2. **Check the test results:**
   - `legacyApi.ok` should be `true`
   - `newApiEncoded.ok` or `newApiUnencoded.ok` should be `true`

3. **Test in browser:**
   - Open the map
   - Click a marker
   - Photos should load without errors

## Prevention: Scheduled Refresh

Set up a cron job or scheduled task to refresh photo references every 2-3 months:

```bash
# Add to crontab (runs first day of every 3rd month at 2 AM)
0 2 1 */3 * cd /path/to/project && python3 scripts/fetch_google_places_extended.py --update-all --delay 0.2 >> /var/log/photo-refresh.log 2>&1
```

## Technical Details

### Why Photo References Expire
- Google requires fresh API calls to maintain current data
- Prevents stale/outdated photos from being displayed
- Part of Google's Terms of Service compliance
- References typically valid for 2-6 months

### What Gets Updated
When you run the refresh script, these fields are updated:
- `google_photos` (JSONB) - Fresh photo references
- `google_rating` - Current rating
- `google_user_rating_total` - Current review count
- `google_phone_number` - Updated contact info
- `google_website_uri` - Updated website
- Other amenity and categorization fields

### API Usage
- ~1-2 API calls per property
- Cost: ~$0.017 per property (Places Details API)
- For 607 properties: ~$10-12 total cost
- Respects rate limits with configurable delay

## Files Involved

- **Refresh Script**: `scripts/fetch_google_places_extended.py`
- **API Route**: `app/api/google-places-photo/route.ts`
- **Test Endpoint**: `app/api/test-photo-data/route.ts`
- **Map Component**: `components/GooglePropertyMap.tsx`
- **Database Table**: `all_glamping_properties` (Supabase)

## Next Steps

1. ✅ Run the refresh script (Option 1 recommended)
2. ✅ Verify photos load correctly
3. ✅ Set up scheduled refresh (every 2-3 months)
4. ✅ Clean up test endpoint after verification
