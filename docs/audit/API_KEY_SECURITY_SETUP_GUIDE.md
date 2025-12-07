# API Key Security Setup Guide

**Date:** December 2025  
**Status:** ✅ Complete Implementation Guide  
**Priority:** 🔴 CRITICAL - Must Complete Before Production

---

## Overview

This guide provides step-by-step instructions to secure your Google Maps API key by implementing HTTP referrer restrictions and API restrictions in Google Cloud Console.

**Why This Matters:**
- Without restrictions, your API key can be used by anyone who finds it
- Unrestricted keys can lead to unauthorized usage and unexpected costs
- Proper restrictions protect your API key even if it's exposed in client-side code

---

## Prerequisites

- Google Cloud Console access
- Admin access to your Google Cloud project
- Your production domain: `resources.sageoutdooradvisory.com`

---

## Step 1: Verify Current API Key Status

### Run Security Verification Script

```bash
# Install dependencies if needed
npm install

# Run verification script
npx tsx scripts/verify-api-key-restrictions.ts
```

This script will check:
- ✅ API key is set in `.env.local`
- ✅ `.env.local` is in `.gitignore` (not committed to Git)
- ✅ API key can make requests (basic connectivity test)

**Expected Output:**
```
✅ PASS API Key Exists
   API key is set (AIzaSy...)

✅ PASS Environment File Security
   .env.local is in .gitignore

✅ PASS API Connectivity
   API key is valid and can make requests
```

---

## Step 2: Configure HTTP Referrer Restrictions

### 2.1 Navigate to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **SageAI** (or your project name)
3. Navigate to: **APIs & Services** → **Credentials**

### 2.2 Edit Your API Key

1. Find your **Maps Platform API Key** in the credentials list
2. Click on the key name to edit it
3. Scroll down to **"Application restrictions"**

### 2.3 Set HTTP Referrer Restrictions

1. Select **"HTTP referrers (websites)"**
2. Click **"Add an item"** for each referrer below:

#### Production Domains (Required)
```
https://resources.sageoutdooradvisory.com/*
https://*.sageoutdooradvisory.com/*
```

#### Development Environment (Required)
```
http://localhost:3000/*
http://localhost:3001/*
http://127.0.0.1:3000/*
http://127.0.0.1:3001/*
```

#### Vercel Preview Deployments (Optional but Recommended)
```
https://*.vercel.app/*
```

**Important Notes:**
- Include the protocol (`https://` or `http://`)
- Include the wildcard `/*` at the end
- No trailing slash before the wildcard
- Case-sensitive (use lowercase)

### 2.4 Save Changes

1. Click **"Save"** at the bottom
2. Wait 1-2 minutes for changes to propagate

---

## Step 3: Verify API Restrictions

### 3.1 Check API Restrictions

Still in the API key settings:

1. Scroll to **"API restrictions"**
2. Ensure **"Restrict key"** is selected (not "Don't restrict key")
3. Under **"Select APIs"**, verify these are checked:

#### Required APIs
- ✅ **Places API** (New)
- ✅ **Places API** (Legacy) - for autocomplete
- ✅ **Maps JavaScript API**
- ✅ **Places API (Photo Media)** - for photos

#### Optional APIs (Only if Used)
- ⚠️ **Geocoding API** - only if you use geocoding
- ⚠️ **Maps Static API** - only if you use static maps
- ⚠️ **Distance Matrix API** - only if you use distance calculations

#### Remove Unused APIs
- ❌ Remove any APIs you don't actively use
- This limits potential damage if the key is compromised

### 3.2 Save API Restrictions

1. Click **"Save"** at the bottom
2. Changes take effect immediately

---

## Step 4: Test Your Restrictions

### 4.1 Test Production Domain

1. Deploy to production (or use existing deployment)
2. Visit: `https://resources.sageoutdooradvisory.com`
3. Test the location search functionality
4. Open browser DevTools → Console
5. Look for any API errors

**Expected:** Location search should work without errors

### 4.2 Test Development Environment

1. Run your dev server:
   ```bash
   npm run dev
   ```
2. Visit: `http://localhost:3000`
3. Test the location search functionality
4. Check browser console for errors

**Expected:** Location search should work without errors

### 4.3 Test from Unauthorized Domain (Security Test)

1. Try accessing your API key from a different domain
2. The API should return a 403 Forbidden error
3. This confirms restrictions are working ✅

---

## Step 5: Verify Restrictions Are Working

### 5.1 Check Browser Console

In development mode, you should see security info:

```
🔐 API Key Security Info
  Environment: development
  Secure Environment: ✅ Yes
  API Key Valid: ✅ Yes
  Current Domain: localhost
  Protocol: http:
```

### 5.2 Check for Warnings

If you see warnings like:
```
⚠️ Unknown domain: example.com. Ensure this domain is added to API key restrictions.
```

This means the current domain is not in your referrer list. Add it to Google Cloud Console.

### 5.3 Run Verification Script Again

```bash
npx tsx scripts/verify-api-key-restrictions.ts
```

All checks should pass:
```
✅ PASS API Key Exists
✅ PASS Environment File Security
✅ PASS API Connectivity
```

---

## Step 6: Set Up Monitoring & Alerts

### 6.1 Enable Billing Alerts

1. Go to **Google Cloud Console** → **Billing**
2. Click **"Budgets & alerts"**
3. Create a new budget:
   - **Amount:** Set based on your expected usage
   - **Alert threshold:** 50%, 90%, 100%
   - **Email notifications:** Your email

### 6.2 Monitor API Usage

1. Go to **APIs & Services** → **Dashboard**
2. Review daily API usage
3. Look for unexpected spikes (could indicate key theft)

### 6.3 Set Up Usage Quotas (Optional)

1. Go to **APIs & Services** → **Quotas**
2. Set daily quotas for each API
3. This prevents runaway costs if key is compromised

---

## Troubleshooting

### Issue: "This API key is not authorized for this request"

**Cause:** HTTP referrer restriction is blocking the request

**Solutions:**
1. Check the exact URL in your browser's address bar
2. Ensure the referrer matches exactly (including `https://` vs `http://`)
3. Check for trailing slashes - `https://example.com/*` vs `https://example.com/`
4. For Vercel previews, add `https://*.vercel.app/*`
5. Wait 1-2 minutes after adding referrers (propagation delay)

### Issue: "REQUEST_DENIED" error

**Cause:** Places API not enabled or API key doesn't have access

**Solutions:**
1. Go to **APIs & Services** → **Library**
2. Search for **"Places API"**
3. Click **"Enable"** (enable both "Places API" and "Places API (New)")
4. Go back to **Credentials** → Your API key
5. Under **API restrictions**, ensure **Places API** is checked

### Issue: Works in production but not in development

**Cause:** `localhost` referrers not added

**Solution:** Add development referrers:
```
http://localhost:3000/*
http://localhost:3001/*
http://127.0.0.1:3000/*
```

### Issue: Works locally but not on Vercel preview

**Cause:** Vercel preview domain not in referrer list

**Solution:** Add Vercel preview referrer:
```
https://*.vercel.app/*
```

**Note:** This is less secure but necessary for preview deployments. Consider using a separate API key for previews.

---

## Security Best Practices

### 1. ✅ Use Separate Keys for Dev/Prod (Recommended)

**Benefits:**
- Limits damage if dev key is accidentally committed
- Can have different restrictions for each environment
- Easier to rotate keys independently

**Implementation:**
1. Create two API keys in Google Cloud Console
2. Dev key: Only `localhost` referrers, minimal APIs
3. Prod key: Only production domains, all required APIs
4. Use environment variables to switch between them

### 2. ✅ Rotate API Keys Regularly

**Schedule:** Every 6-12 months

**Process:**
1. Create new API key in Google Cloud Console
2. Update `.env.local` with new key
3. Deploy to production
4. Verify everything works
5. Delete old API key

### 3. ✅ Never Commit API Keys to Git

**Current Status:** ✅ `.env.local` is in `.gitignore`

**Verification:**
```bash
# Check if .env.local is in .gitignore
grep -q ".env.local" .gitignore && echo "✅ Protected" || echo "❌ NOT PROTECTED"
```

### 4. ✅ Monitor for Unusual Activity

**Signs of Key Theft:**
- Sudden spike in API usage
- Requests from unexpected domains
- Unusual API endpoints being called
- Billing alerts triggered unexpectedly

**Action:** If detected, rotate the key immediately

### 5. ✅ Use Minimal API Permissions

**Principle:** Only enable APIs you actually use

**Current Required APIs:**
- Places API (New)
- Places API (Legacy)
- Maps JavaScript API
- Places API (Photo Media)

**Remove if not used:**
- Geocoding API
- Maps Static API
- Distance Matrix API
- Any other unused APIs

---

## Quick Reference Checklist

### Initial Setup
- [ ] API key created in Google Cloud Console
- [ ] API key added to `.env.local`
- [ ] `.env.local` verified in `.gitignore`
- [ ] HTTP referrer restrictions configured
- [ ] API restrictions configured
- [ ] Tested in production
- [ ] Tested in development
- [ ] Billing alerts configured

### Ongoing Maintenance
- [ ] Monitor API usage monthly
- [ ] Review billing alerts
- [ ] Rotate API keys every 6-12 months
- [ ] Review and remove unused APIs
- [ ] Update referrers when adding new domains

---

## Verification Commands

### Check API Key Security
```bash
npx tsx scripts/verify-api-key-restrictions.ts
```

### Verify .gitignore
```bash
grep ".env.local" .gitignore
```

### Test API Key (Manual)
```bash
# Test from command line (replace YOUR_API_KEY)
curl -X POST \
  'https://places.googleapis.com/v1/places:searchText' \
  -H 'Content-Type: application/json' \
  -H 'X-Goog-Api-Key: YOUR_API_KEY' \
  -H 'X-Goog-FieldMask: places.id' \
  -d '{"textQuery": "test", "maxResultCount": 1}'
```

---

## Additional Resources

- [Google Maps Platform API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)
- [Restricting API Keys](https://cloud.google.com/docs/authentication/api-keys#restricting_keys)
- [API Key Security Guide](https://cloud.google.com/docs/authentication/api-keys#securing_api_keys)
- Project Documentation: `docs/GOOGLE_MAPS_API_KEY_SECURITY.md`
- Compliance Audit: `docs/audit/GOOGLE_API_COMPLIANCE_AUDIT.md`

---

## Support

If you encounter issues:

1. **Check Browser Console:** Look for specific error messages
2. **Verify Referrer Format:** Must match exactly (protocol, domain, wildcard)
3. **Check Google Cloud Console Logs:** APIs & Services → Logs
4. **Test with Temporary Removal:** Temporarily remove restrictions to isolate issues
5. **Review Troubleshooting Section:** Above for common issues

---

**Last Updated:** December 2025  
**Status:** ✅ Complete  
**Next Review:** March 2026
