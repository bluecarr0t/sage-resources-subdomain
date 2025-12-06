# Google Maps API Key Security Recommendations

## Overview
This document provides specific security recommendations for your Google Maps API key based on your Next.js application deployment on Vercel.

## Your Application Details
- **Production Domain:** `resources.sageoutdooradvisory.com`
- **Main Domain:** `sageoutdooradvisory.com`
- **Development:** `localhost:3000` (or your dev port)
- **Hosting:** Vercel (with preview deployments)

---

## 🔒 Application Restrictions (CRITICAL)

### Current Status: ❌ None (Not Secure)

**Action Required:** Change to **"Websites (HTTP referrers)"**

### Recommended HTTP Referrers

Add these referrers in your Google Cloud Console:

#### Production Domains
```
https://resources.sageoutdooradvisory.com/*
https://*.sageoutdooradvisory.com/*
```

**Why both?**
- First line: Specific subdomain (most restrictive)
- Second line: Wildcard for any subdomain (if you add more later)

#### Development Environment
```
http://localhost:3000/*
http://localhost:3001/*
http://127.0.0.1:3000/*
http://127.0.0.1:3001/*
```

**Note:** If you use a different port for development, add it here.

#### Vercel Preview Deployments (Optional but Recommended)
```
https://*.vercel.app/*
```

**Why?** Vercel creates preview deployments for every branch/PR. Adding this allows testing before production.

**Alternative (More Secure):** Only add specific preview URLs when needed, then remove them.

---

## 🛡️ API Restrictions (Already Configured ✅)

### Current Status: ✅ Restrict key (Good!)

### Required APIs for Your Application

Based on your `LocationSearch.tsx` component and codebase:

#### Essential APIs (Must Have)
1. **Places API** ⭐
   - Used by: `AutocompleteService` (location search dropdown)
   - Used by: `PlacesService` (place details)
   - **Status:** Already enabled ✅

2. **Maps JavaScript API** ⭐
   - Used by: `useLoadScript` hook
   - Required for loading Google Maps libraries
   - **Status:** Already enabled ✅

#### Recommended APIs (Based on Your Code)
3. **Geocoding API**
   - Used for: Converting addresses to coordinates
   - **Status:** Already enabled ✅

4. **Maps Static API**
   - Used for: Static map images
   - **Status:** Already enabled ✅

5. **Distance Matrix API**
   - Used for: Calculating distances between locations
   - **Status:** Already enabled ✅

#### APIs You Can Remove (If Not Used)
Review these and remove if not needed:
- **Geolocation API** - Only needed if you're using browser geolocation
- Any other APIs not actively used in your codebase

**Best Practice:** Only enable APIs you actually use. This limits potential damage if the key is compromised.

---

## 📋 Step-by-Step Implementation

### Step 1: Add Application Restrictions

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: **APIs & Services** → **Credentials**
3. Click on your **Maps Platform API Key**
4. Under **"Application restrictions"**, select **"Websites (HTTP referrers)"**
5. Click **"Add an item"** and add each referrer:
   ```
   https://resources.sageoutdooradvisory.com/*
   https://*.sageoutdooradvisory.com/*
   http://localhost:3000/*
   http://localhost:3001/*
   ```
6. Click **"Save"**

### Step 2: Verify API Restrictions

1. Still in the API key settings
2. Under **"API restrictions"**, ensure **"Restrict key"** is selected
3. Verify these APIs are enabled:
   - ✅ Places API
   - ✅ Maps JavaScript API
   - ✅ Geocoding API (if used)
   - ✅ Maps Static API (if used)
4. Remove any APIs you don't use
5. Click **"Save"**

### Step 3: Test After Changes

1. **Test Production:**
   ```bash
   # Visit your production site
   https://resources.sageoutdooradvisory.com
   # Try the location search - it should work
   ```

2. **Test Development:**
   ```bash
   # Run your dev server
   npm run dev
   # Visit http://localhost:3000
   # Try the location search - it should work
   ```

3. **Check Console:**
   - Open browser DevTools → Console
   - Look for any API key errors
   - Should see: `[LocationSearch] Google Maps loaded successfully`

---

## ⚠️ Common Issues & Solutions

### Issue: "This API key is not authorized for this request"

**Cause:** HTTP referrer restriction is blocking the request

**Solutions:**
1. Check the exact URL in your browser's address bar
2. Ensure the referrer matches exactly (including `https://` vs `http://`)
3. Check for trailing slashes - `https://example.com/*` vs `https://example.com/`
4. For Vercel previews, add `https://*.vercel.app/*`

### Issue: "REQUEST_DENIED" error

**Cause:** Places API not enabled or API key doesn't have access

**Solutions:**
1. Go to **APIs & Services** → **Library**
2. Search for **"Places API"**
3. Click **"Enable"**
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

---

## 🔐 Additional Security Best Practices

### 1. Rotate API Keys Regularly
- Set a reminder to rotate keys every 6-12 months
- Create new key → Update `.env.local` → Deploy → Delete old key

### 2. Monitor API Usage
- Go to **APIs & Services** → **Dashboard**
- Set up billing alerts in Google Cloud Console
- Monitor for unexpected spikes (could indicate key theft)

### 3. Use Separate Keys for Dev/Prod (Optional but Recommended)
- **Development Key:** Only `localhost` referrers, minimal APIs
- **Production Key:** Only production domains, all required APIs
- This limits damage if dev key is accidentally committed to Git

### 4. Never Commit API Keys to Git
- ✅ Already using `.env.local` (good!)
- ✅ `.env.local` should be in `.gitignore` (verify this)
- ❌ Never commit keys to GitHub, even in private repos

### 5. Set Up Billing Alerts
- Google Cloud Console → Billing → Budgets & alerts
- Set a monthly budget limit
- Get notified if usage spikes unexpectedly

---

## 📊 Quick Reference Checklist

- [ ] Application restrictions set to "Websites (HTTP referrers)"
- [ ] Production domain added: `https://resources.sageoutdooradvisory.com/*`
- [ ] Wildcard domain added: `https://*.sageoutdooradvisory.com/*`
- [ ] Development referrers added: `http://localhost:3000/*` (and 3001 if used)
- [ ] API restrictions enabled (Restrict key)
- [ ] Places API enabled and checked
- [ ] Maps JavaScript API enabled and checked
- [ ] Unused APIs removed from restrictions
- [ ] Tested in production - location search works
- [ ] Tested in development - location search works
- [ ] Billing alerts configured
- [ ] `.env.local` is in `.gitignore`

---

## 🆘 Need Help?

If you encounter issues after applying restrictions:

1. **Check Browser Console:**
   - Look for specific error messages
   - Check the `[LocationSearch]` logs we added

2. **Verify Referrer Format:**
   - Must include protocol (`http://` or `https://`)
   - Must include wildcard `/*` at the end
   - No trailing slashes before the wildcard

3. **Test with Temporary Removal:**
   - Temporarily remove restrictions to isolate the issue
   - Re-add restrictions one at a time to find the problem

4. **Check Google Cloud Console Logs:**
   - APIs & Services → Logs
   - Look for denied requests and their reasons

---

## 📝 Notes

- **HTTP vs HTTPS:** Make sure you use `https://` for production and `http://` for localhost
- **Wildcards:** The `/*` at the end allows all paths on that domain
- **Subdomains:** `*.sageoutdooradvisory.com/*` matches any subdomain
- **Port Numbers:** Include the port number for localhost (e.g., `:3000`)

---

**Last Updated:** Based on your current deployment setup  
**Application:** Sage Outdoor Advisory - Resources Subdomain  
**Framework:** Next.js on Vercel
