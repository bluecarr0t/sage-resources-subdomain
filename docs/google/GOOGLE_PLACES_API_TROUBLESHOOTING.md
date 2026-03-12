# Google Places API REQUEST_DENIED - Troubleshooting Guide

## Current Error
```
API Response - Status: REQUEST_DENIED Results: 0
```

## Quick Fix Steps

### Step 1: Enable Places API (Legacy)

The error indicates the **Places API (Legacy)** is not enabled. Here's how to enable it:

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Select your project: **SageAI**

2. **Navigate to APIs & Services:**
   - Click on **"APIs & Services"** in the left sidebar
   - Click on **"Library"**

3. **Search for Places API:**
   - In the search bar, type: **"Places API"**
   - You'll see two options:
     - **"Places API"** (Legacy) ← **Enable this one**
     - **"Places API (New)"** (Different API, not what we're using)

4. **Enable the Legacy Places API:**
   - Click on **"Places API"** (the legacy version)
   - Click the **"Enable"** button
   - Wait a few seconds for it to enable

5. **Verify it's enabled:**
   - Go back to **APIs & Services** → **Library**
   - Search for "Places API" again
   - You should see **"API enabled"** with a green checkmark

### Step 2: Verify API Key Has Access

1. **Go to Credentials:**
   - Navigate to **APIs & Services** → **Credentials**
   - Click on your **Maps Platform API Key**

2. **Check API Restrictions:**
   - Scroll down to **"API restrictions"**
   - Ensure **"Restrict key"** is selected
   - In the **"Select APIs"** list, make sure **"Places API"** is checked ✅
   - If it's not checked, check it and click **"Save"**

### Step 3: Check Billing

The Places API requires billing to be enabled:

1. **Go to Billing:**
   - Navigate to **Billing** in the left sidebar
   - Ensure billing is enabled for your project
   - If not, you'll need to add a payment method

**Note:** Google provides $200/month free credit for Maps Platform APIs, so enabling billing won't necessarily cost you money unless you exceed the free tier.

### Step 4: Wait and Test

1. **Wait 1-2 minutes** after enabling the API (it can take a moment to propagate)

2. **Refresh your browser** on `localhost:3001/en`

3. **Try typing in the search field again** (e.g., "bend")

4. **Check the console:**
   - You should see: `[LocationSearch] API Response - Status: OK Results: X`
   - The dropdown should appear with location suggestions

---

## Verification Checklist

After following the steps above, verify:

- [ ] Places API (Legacy) is enabled in Google Cloud Console
- [ ] API key has "Places API" checked in API restrictions
- [ ] Billing is enabled for the project
- [ ] Waited 1-2 minutes after enabling
- [ ] Refreshed the browser
- [ ] Console shows `Status: OK` instead of `REQUEST_DENIED`
- [ ] Dropdown appears when typing in the search field

---

## Still Getting REQUEST_DENIED?

### Check 1: API Key Restrictions

If you added **Application restrictions** (HTTP referrers), make sure you added:
```
http://localhost:3001/*
```

**Common mistake:** Forgetting to add the development port number.

### Check 2: API Enabled Status

Double-check the API is actually enabled:
1. Go to **APIs & Services** → **Enabled APIs**
2. Look for **"Places API"** in the list
3. If it's not there, go back to **Library** and enable it

### Check 3: Correct Project

Make sure you're enabling the API in the **correct Google Cloud project**:
- Your project should be: **SageAI**
- The API key should be from this same project

### Check 4: API Key Validity

Verify your API key is correct:
1. Check `.env.local` file has: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here`
2. Restart your Next.js dev server after adding/changing the key
3. Check console logs show: `[LocationSearch] API Key loaded: AIza...xyz`

---

## Understanding the Error Messages

### "You're calling a legacy API, which is not enabled for your project"

This means:
- ✅ The code is correct (using `AutocompleteService`)
- ❌ The **Places API (Legacy)** is not enabled in Google Cloud Console
- **Fix:** Enable "Places API" (not "Places API (New)")

### "REQUEST_DENIED"

This can mean:
1. **API not enabled** (most common) → Enable Places API
2. **API key doesn't have access** → Check API restrictions
3. **Billing not enabled** → Enable billing
4. **Application restrictions blocking** → Check HTTP referrers include localhost

---

## Future: Migrating to Places API (New)

The warning suggests migrating to the new Places API. However, this requires:
- Significant code changes
- Different API endpoints
- Different authentication method

**For now:** Enable the legacy Places API to get it working. You can migrate later if needed.

**Current code uses:**
- `AutocompleteService` (legacy)
- `PlacesService` (legacy)

**New API would use:**
- REST API endpoints
- Different request/response format

---

## Quick Reference

**Enable API:**
```
Google Cloud Console → APIs & Services → Library → Search "Places API" → Enable
```

**Check API Key:**
```
Google Cloud Console → APIs & Services → Credentials → Your API Key → API Restrictions
```

**Check Enabled APIs:**
```
Google Cloud Console → APIs & Services → Enabled APIs
```

---

## Need More Help?

If you're still stuck after following these steps:

1. **Check the exact error in console:**
   - Look for the full error message
   - Check the status code (should be `REQUEST_DENIED`)

2. **Verify in Google Cloud Console:**
   - Take a screenshot of your "Enabled APIs" page
   - Take a screenshot of your API key restrictions

3. **Check environment variables:**
   - Verify `.env.local` exists
   - Verify the key is set correctly
   - Restart the dev server

---

**Last Updated:** Based on current error: `REQUEST_DENIED`  
**Component:** `components/LocationSearch.tsx`  
**API Used:** Places API (Legacy) via `AutocompleteService`
