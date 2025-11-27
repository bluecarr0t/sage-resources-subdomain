# Google Search Console Setup Guide for Subdomains

## ⚠️ Quick Answer: If You Have a CNAME Record

**If your subdomain uses a CNAME record pointing to Vercel (which is common):**
- ❌ **You CANNOT use DNS/TXT record verification** (DNS conflict)
- ✅ **Use HTML meta tag verification instead** (recommended, works perfectly with CNAME)
- ✅ Already added to your `app/layout.tsx` - just add your verification code

**Important:** When adding the property in Google Search Console:
- ✅ Select **"URL prefix"** (gives you HTML meta tag option)
- ❌ Don't select **"Domain"** (only gives DNS options that won't work with your CNAME)

**The error "CNAME record already exists" is normal** - it means you need to use a different verification method (HTML tag).

---

## 🔑 Key Point: Subdomains Are Separate Properties

**Important:** Subdomains are treated as **separate properties** in Google Search Console. This means:
- `resources.sageoutdooradvisory.com` = **Separate property** (must verify separately)
- `sageoutdooradvisory.com` = **Separate property** (if you have one)
- They do **NOT** share data or verification
- You need to add and verify the subdomain independently

---

## 📋 Step-by-Step: Adding Your Subdomain to Google Search Console

### Step 1: Access Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Sign in with your Google account

### Step 2: Add New Property

1. Click the **property selector** dropdown (top left, shows your current property)
2. Click **"Add Property"**
3. ⚠️ **IMPORTANT:** Select **"URL prefix"** (NOT "Domain")
   - **"URL prefix"** = Gives you multiple verification options including HTML meta tag ✅
   - **"Domain"** = Only gives DNS verification (TXT/CNAME) which won't work with your CNAME ❌
4. Enter your subdomain URL: `https://resources.sageoutdooradvisory.com`
5. Click **"Continue"**

**If you accidentally selected "Domain" and only see TXT/CNAME options:**
- Click **"Back"** or **"Cancel"**
- Start over and make sure to select **"URL prefix"** this time
- With "URL prefix", you'll see HTML tag, HTML file, Google Analytics, and DNS options

### Step 3: Verify Ownership

You'll be presented with several verification methods. **If you selected "URL prefix", you should see multiple options including:**
- HTML tag (meta tag) ⭐ **Use this one if you have CNAME**
- HTML file upload
- Google Analytics
- Google Tag Manager
- DNS record

**If you only see TXT/CNAME options, you selected "Domain" instead of "URL prefix" - go back and change it!**

Choose the easiest for your setup:

#### Option A: HTML File Upload (Easy if you have server access)

1. Download the HTML verification file from Google Search Console
2. Upload it to your site's root directory (public folder in Next.js)
3. Make sure it's accessible at: `https://resources.sageoutdooradvisory.com/google[random-string].html`
4. Click **"Verify"** in Search Console

**For Next.js/Vercel:**
- Place the file in your `public/` folder
- It will automatically be accessible at the root URL
- Redeploy if necessary

#### Option B: HTML Tag (Meta Tag) - ⭐ **RECOMMENDED if you have a CNAME record**

**Why this is best for Vercel/subdomains with CNAME:**
- ✅ Works with existing CNAME records (no DNS conflict)
- ✅ No DNS propagation wait time
- ✅ Easy to add in Next.js
- ✅ Verification happens immediately after deployment

**Steps:**

1. In Google Search Console, choose **"HTML tag"** verification method
2. Copy the verification code (the part inside `content="..."`)
   - Example: If Google shows `<meta name="google-site-verification" content="ABC123xyz" />`, copy `ABC123xyz`
3. Add it to your Next.js app in `app/layout.tsx`:

```tsx
export const metadata: Metadata = {
  // ... your existing metadata
  verification: {
    google: "ABC123xyz", // Replace with your actual verification code
  },
}
```

4. **Deploy to Vercel:**
   ```bash
   git add app/layout.tsx
   git commit -m "Add Google Search Console verification"
   git push
   ```
   (Or commit via your normal workflow)

5. Wait for deployment to complete (usually 1-2 minutes on Vercel)
6. **Click "Verify"** in Google Search Console

**Your layout.tsx already has the verification field ready** - just replace `REPLACE-WITH-YOUR-GOOGLE-VERIFICATION-CODE` with your actual code from Google.

**Troubleshooting:**
- If verification fails, make sure:
  - The site is deployed and accessible
  - The meta tag is visible in the page source (View Page Source → search for "google-site-verification")
  - You copied only the code, not the full HTML tag

#### Option C: DNS Record (⚠️ **NOT compatible with CNAME records**)

**⚠️ IMPORTANT:** You **cannot** use DNS verification if you have a CNAME record for your subdomain.

**Why DNS won't work with CNAME:**
- DNS rules: A hostname can only have ONE record type at a time
- Your subdomain has a CNAME pointing to Vercel (required for hosting)
- You cannot add a TXT record to the same hostname that has a CNAME
- Error you'll see: *"CNAME record already exists, please remove the CNAME record first"*

**If you don't have a CNAME (unlikely for Vercel):**
1. Choose **"DNS record"** verification method
2. Google will provide a TXT record to add to your DNS
3. Go to your DNS provider
4. Add the TXT record:
   - **Type:** TXT
   - **Name/Host:** `resources` (for `resources.sageoutdooradvisory.com`)
   - **Value:** The verification string provided by Google
   - **TTL:** 3600 (or default)
5. Wait for DNS propagation (can take 24-48 hours)
6. Click **"Verify"** in Search Console

**Recommendation:** Use **HTML meta tag (Option B)** instead - it's faster and works with your current setup.

#### Option D: Google Analytics (If you already have GA set up)

1. If you have Google Analytics installed on the subdomain
2. Select **"Google Analytics"** verification
3. Ensure you have "Edit" permissions on the GA property
4. Click **"Verify"**

---

### Step 4: Submit Your Sitemap

After verification is complete:

1. In Google Search Console, go to **"Sitemaps"** in the left sidebar
2. Enter your sitemap URL: `https://resources.sageoutdooradvisory.com/sitemap.xml`
3. Click **"Submit"**
4. Google will start crawling your sitemap (may take a few days)

**Your current sitemap includes:**
- Homepage
- Glossary index (`/glossary`)
- All landing pages (`/landing/[slug]`)
- All glossary terms (`/glossary/[term]`)

---

### Step 5: Request Indexing (Optional but Recommended)

For faster indexing of key pages:

1. Use the **"URL Inspection"** tool (top search bar)
2. Enter important URLs like:
   - `https://resources.sageoutdooradvisory.com`
   - `https://resources.sageoutdooradvisory.com/glossary`
   - Key landing pages
3. Click **"Request Indexing"** for each important page

**Note:** Google limits how many pages you can request indexing per day, so prioritize your most important pages.

---

## 🔄 Subdomain vs Root Domain: Key Differences

| Aspect | Root Domain | Subdomain |
|--------|-------------|-----------|
| **Property** | Separate GSC property | Separate GSC property |
| **Verification** | Must verify independently | Must verify independently |
| **Sitemap** | Submit root domain sitemap | Submit subdomain sitemap |
| **Data** | Separate analytics data | Separate analytics data |
| **Indexing** | Indexed separately | Indexed separately |
| **Search Results** | Can appear together | Can appear together |

**What This Means:**
- You'll need to monitor **both** properties separately
- Each has its own crawl stats, coverage reports, and search performance
- You can see which domain ranks better for which keywords
- They can both rank for the same keywords (Google treats them as related but separate)

---

## 📊 After Verification: What to Monitor

### Initial Setup (First Week)

1. **Coverage Report** - Check for crawl errors
   - Go to **"Pages"** → **"Coverage"**
   - Look for any errors (404s, blocked by robots.txt, etc.)
   - Fix any critical issues

2. **Sitemap Status** - Ensure sitemap is processing
   - Go to **"Sitemaps"**
   - Check that your sitemap shows "Success" status
   - Monitor how many URLs were discovered

3. **Mobile Usability** - Check mobile-friendliness
   - Go to **"Mobile Usability"**
   - Fix any mobile issues

4. **Page Speed** - Monitor Core Web Vitals
   - Go to **"Core Web Vitals"**
   - Address any performance issues

### Ongoing Monitoring (Monthly)

- **Search Performance** - Track which keywords bring traffic
- **Coverage Issues** - Fix any new errors
- **Links** - Monitor external links pointing to your subdomain
- **Index Status** - Track how many pages are indexed

---

## 🔗 Connecting Subdomain and Root Domain

While they're separate properties, you can help Google understand they're related:

1. **Cross-Link Between Domains** (Already in your strategy!)
   - Link from root domain to subdomain
   - Link from subdomain back to root domain
   - This helps establish the relationship

2. **Consistent Branding**
   - Use the same logo, branding, and design elements
   - Maintain consistent navigation

3. **Use Same Google Analytics Property** (Optional)
   - If helpful, you can track both in the same GA property
   - This doesn't affect Search Console, but provides unified analytics

---

## ⚠️ Common Issues & Solutions

### Issue: "Property not verified"
**Solution:** 
- Double-check your verification method worked
- **For HTML tag:** 
  - Ensure meta tag is in the `<head>` and visible in page source (View Page Source → search for "google-site-verification")
  - Make sure the site is deployed and accessible
  - Verify you copied only the code, not the full HTML tag wrapper
- **For DNS:** Wait longer for DNS propagation (can take up to 48 hours)
  - **Note:** If you have a CNAME record, DNS verification won't work - use HTML tag instead

### Issue: "CNAME record already exists" when trying DNS verification
**Solution:**
- This happens because you can't have both CNAME and TXT records on the same hostname
- **Use HTML meta tag verification instead** (Option B) - it works perfectly with CNAME records
- This is the recommended method for Vercel/subdomain setups

### Issue: "Sitemap couldn't be fetched"
**Solution:**
- Verify `https://resources.sageoutdooradvisory.com/sitemap.xml` is publicly accessible
- Check robots.txt doesn't block `/sitemap.xml`
- Ensure sitemap is properly formatted XML

### Issue: "No data yet"
**Solution:**
- Normal! Google needs time to crawl and index
- Can take 1-4 weeks for data to appear
- Use "Request Indexing" to speed up for important pages

### Issue: "Crawl errors"
**Solution:**
- Check your `robots.txt` file isn't blocking important pages
- Verify all URLs in sitemap are accessible
- Fix any 404 errors

---

## ✅ Quick Checklist

- [ ] Added `resources.sageoutdooradvisory.com` as new property in GSC
- [ ] Verified ownership (DNS, HTML tag, or file upload)
- [ ] Submitted sitemap: `https://resources.sageoutdooradvisory.com/sitemap.xml`
- [ ] Requested indexing for homepage and key pages
- [ ] Set up email notifications for important issues
- [ ] Bookmarked the GSC property for regular monitoring

---

## 📚 Additional Resources

- [Google Search Console Help](https://support.google.com/webmasters)
- [Subdomain Best Practices](https://developers.google.com/search/docs/advanced/crawling/managing-multi-regional-sites)
- [Sitemap Guidelines](https://developers.google.com/search/docs/advanced/sitemaps/overview)

---

## 🎯 Next Steps After Setup

1. **Wait for Initial Crawl** (1-7 days)
2. **Monitor Coverage Report** for any issues
3. **Review Search Performance** after 2-4 weeks
4. **Optimize Based on Data** - see which pages/keywords perform best
5. **Regular Maintenance** - check monthly for issues

---

**Last Updated:** January 2025  
**Subdomain:** `resources.sageoutdooradvisory.com`

