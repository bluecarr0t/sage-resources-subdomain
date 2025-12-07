# GA4 Cross-Domain Tracking Setup

## ✅ What Was Fixed

The GA4 configuration has been updated to support cross-domain tracking between:
- `resources.sageoutdooradvisory.com` (subdomain)
- `sageoutdooradvisory.com` (main domain)

### Changes Made

1. **Added Cross-Domain Linker Configuration**
   - Configured `linker` parameter to connect both domains
   - This allows GA4 to maintain user sessions across domains

2. **Updated Cookie Settings**
   - Set `cookie_flags: 'SameSite=None;Secure'`
   - Required for cross-domain cookie sharing

## 🔍 How It Works

### Current Setup

- **Subdomain** (`resources.sageoutdooradvisory.com`): Uses GA4 Measurement ID from `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- **Main Domain** (`sageoutdooradvisory.com`): Should use the **SAME** GA4 Measurement ID

### What This Means

✅ **If both domains use the SAME GA4 Measurement ID:**
- All traffic from both domains appears in ONE GA4 property
- User sessions are maintained when navigating between domains
- You'll see traffic from both domains in the same reports
- Traffic source will show correctly (organic, direct, referral, etc.)

❌ **If domains use DIFFERENT GA4 Measurement IDs:**
- Each domain has separate analytics data
- Subdomain traffic won't appear in main domain's GA4
- You'll need separate reports for each domain

## 📋 Required Actions

### 1. Verify GA4 Measurement ID

**Check the subdomain:**
1. Go to Vercel → Project Settings → Environment Variables
2. Verify `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set
3. Note the Measurement ID (format: `G-XXXXXXXXXX`)

**Check the main domain:**
1. View the source code of `sageoutdooradvisory.com`
2. Look for the GA4 script tag: `<script src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX">`
3. Compare the Measurement ID with the subdomain

**If they're different:**
- Decide if you want unified tracking (same ID) or separate tracking (different IDs)
- For unified tracking: Update main domain to use the same Measurement ID as subdomain
- For separate tracking: Keep them separate (but you won't see subdomain traffic in main domain's GA4)

### 2. Update Main Domain GA4 Configuration (If Using Same ID)

If you want unified tracking, the main domain's GA4 configuration should also include cross-domain tracking:

```javascript
gtag('config', 'G-XXXXXXXXXX', {
  // ... other settings ...
  linker: {
    domains: ['sageoutdooradvisory.com', 'resources.sageoutdooradvisory.com']
  },
  cookie_flags: 'SameSite=None;Secure',
});
```

### 3. Verify Cross-Domain Tracking is Working

**Test Steps:**
1. Visit `resources.sageoutdooradvisory.com` in an incognito window
2. Open browser DevTools → Application → Cookies
3. Look for cookies starting with `_ga` and `_ga_`
4. Click a link to `sageoutdooradvisory.com`
5. Check if the same `_ga` cookies are present (they should be)
6. In GA4 DebugView, verify the session continues across domains

**In GA4 Reports:**
1. Go to GA4 → Reports → Acquisition → Traffic acquisition
2. Look for traffic from `resources.sageoutdooradvisory.com` as a source
3. Check that user sessions span both domains

## 📊 What to Expect in GA4 Reports

### Traffic Sources

You should see:
- **Direct**: Users typing URLs directly
- **Organic Search**: Google search results
- **Referral**: Traffic from other websites
- **resources.sageoutdooradvisory.com**: If users navigate from subdomain to main domain (with cross-domain tracking)

### Important Notes

1. **Subdomain as Source**: If users click from subdomain → main domain, it may appear as:
   - A referral source: `resources.sageoutdooradvisory.com`
   - Or part of the same session (if cross-domain tracking works)

2. **Separate Properties**: If using different Measurement IDs:
   - Subdomain traffic only appears in subdomain's GA4 property
   - Main domain traffic only appears in main domain's GA4 property
   - They won't show up in each other's reports

3. **Unified Property**: If using the same Measurement ID:
   - All traffic appears in one GA4 property
   - You can filter by hostname to see traffic per domain
   - Go to: Reports → Engagement → Pages and screens → Add dimension: "Host name"

## 🔧 Troubleshooting

### Subdomain Traffic Not Showing in Main Domain's GA4

**Possible Causes:**
1. ❌ Different GA4 Measurement IDs
   - **Solution**: Use the same Measurement ID on both domains

2. ❌ Main domain doesn't have cross-domain tracking configured
   - **Solution**: Add linker configuration to main domain's GA4 setup

3. ❌ Cookies blocked by browser/ad blockers
   - **Solution**: Test in incognito mode without ad blockers

4. ❌ SSL/HTTPS issues
   - **Solution**: Ensure both domains use HTTPS (required for cross-domain cookies)

### Verify GA4 is Working

**Quick Check:**
1. Visit `resources.sageoutdooradvisory.com`
2. Open browser DevTools → Network tab
3. Filter by "gtag" or "analytics"
4. You should see requests to `https://www.google-analytics.com/g/collect`
5. Check the request payload includes your Measurement ID

**GA4 DebugView:**
1. Go to GA4 → Admin → DebugView
2. Enable debug mode in your browser (or use the debug_mode flag)
3. Navigate your site
4. You should see events in real-time

## 📝 Summary

### Current Status
✅ Subdomain has cross-domain tracking configured
⚠️ Need to verify main domain uses the same GA4 Measurement ID
⚠️ Need to add cross-domain tracking to main domain (if using same ID)

### Next Steps
1. Verify both domains use the same GA4 Measurement ID
2. Add cross-domain tracking to main domain's GA4 configuration
3. Test cross-domain navigation
4. Verify in GA4 DebugView and reports

### Expected Result
- Traffic from both domains appears in the same GA4 property
- User sessions are maintained across domains
- You can see subdomain traffic in main domain's GA4 reports
- Traffic sources are correctly attributed
