# Subdomain Migration Checklist: marketing → resources

## ✅ Code Changes Completed

All code references have been updated from `marketing.sageoutdooradvisory.com` to `resources.sageoutdooradvisory.com`:

- ✅ `app/sitemap.ts` - Updated baseUrl
- ✅ `app/robots.ts` - Updated baseUrl
- ✅ `app/layout.tsx` - Updated metadataBase and canonical URLs
- ✅ `app/landing/[slug]/page.tsx` - Updated canonical URLs
- ✅ `app/glossary/[term]/page.tsx` - Updated canonical URLs
- ✅ `app/glossary/page.tsx` - Updated schema URLs
- ✅ `lib/schema.ts` - Updated breadcrumb URLs
- ✅ `lib/glossary-schema.ts` - Updated glossary URLs
- ✅ All documentation files updated

## 🔧 Infrastructure Changes Required

### 1. DNS Configuration (CRITICAL)

**Action Required:** Add DNS record for `resources` subdomain

**Steps:**
1. Log into your DNS provider (wherever `sageoutdooradvisory.com` is managed)
2. Add a new CNAME or A record:
   - **Type:** CNAME (or A record if using IP)
   - **Name:** `resources`
   - **Value:** Same as your current `marketing` subdomain (or your hosting provider's instructions)
   - **TTL:** 3600 (or default)

**Example:**
```
resources.sageoutdooradvisory.com → [your hosting provider]
```

**Note:** If you're using Vercel, Netlify, or similar, they may have specific instructions for adding subdomains.

### 2. Hosting/Platform Configuration

#### If using Vercel:
1. Go to your project settings
2. Navigate to "Domains"
3. Add `resources.sageoutdooradvisory.com`
4. Follow DNS verification steps
5. Once verified, you can remove `marketing.sageoutdooradvisory.com` (after setting up redirects)

#### If using Netlify:
1. Go to Site settings → Domain management
2. Add custom domain: `resources.sageoutdooradvisory.com`
3. Follow DNS verification
4. Update build settings if needed

#### If using other hosting:
- Follow your provider's instructions for adding subdomains
- Ensure SSL certificate is generated for the new subdomain

### 3. Set Up 301 Redirects (CRITICAL for SEO)

**Why:** Preserves SEO rankings and link equity from old URLs

**Options:**

#### Option A: Platform-Level Redirects (Recommended)

**Vercel:**
Create or update `vercel.json`:
```json
{
  "redirects": [
    {
      "source": "/(.*)",
      "has": [
        {
          "type": "host",
          "value": "marketing.sageoutdooradvisory.com"
        }
      ],
      "destination": "https://resources.sageoutdooradvisory.com/:path*",
      "permanent": true
    }
  ]
}
```

**Netlify:**
Create or update `_redirects` file in `public/`:
```
https://marketing.sageoutdooradvisory.com/* https://resources.sageoutdooradvisory.com/:splat 301!
```

**Apache (.htaccess):**
```apache
RewriteEngine On
RewriteCond %{HTTP_HOST} ^marketing\.sageoutdooradvisory\.com$ [NC]
RewriteRule ^(.*)$ https://resources.sageoutdooradvisory.com/$1 [R=301,L]
```

**Nginx:**
```nginx
server {
    server_name marketing.sageoutdooradvisory.com;
    return 301 https://resources.sageoutdooradvisory.com$request_uri;
}
```

#### Option B: Application-Level Redirects (Next.js)

Create `middleware.ts` in the root:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  
  if (hostname === 'marketing.sageoutdooradvisory.com') {
    const url = request.nextUrl.clone();
    url.hostname = 'resources.sageoutdooradvisory.com';
    return NextResponse.redirect(url, 301);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/(.*)',
};
```

### 4. Google Search Console Updates

**Action Required:** Add and verify new property

**Steps:**
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add new property: `resources.sageoutdooradvisory.com`
3. Verify ownership (DNS, HTML file, or meta tag)
4. Submit new sitemap: `https://resources.sageoutdooradvisory.com/sitemap.xml`
5. **Keep old property active** for monitoring redirects

**Important:**
- Don't delete the old `marketing.sageoutdooradvisory.com` property
- Monitor both properties for a few months
- Check for crawl errors on the new property

### 5. Analytics Updates

**Google Analytics:**
- Update property settings if using subdomain-specific tracking
- Update any filters or views that reference the old subdomain
- Update goals and conversions if URLs changed

**Other Analytics:**
- Update any tracking scripts or configurations
- Update UTM parameters if you use them
- Update any custom event tracking

### 6. Update External Links (Ongoing)

**Where to Update:**
- [ ] Root domain (`sageoutdooradvisory.com`) - Update all links to subdomain
- [ ] Social media profiles (if linked)
- [ ] Email signatures
- [ ] Business cards/marketing materials
- [ ] Partner websites (if they link to you)
- [ ] Industry directories
- [ ] Press releases or articles

**Note:** The 301 redirects will handle old links, but updating them is still best practice.

### 7. SSL Certificate

**Action:** Ensure SSL certificate is generated for new subdomain

**Most hosting providers:**
- Automatically generate SSL via Let's Encrypt
- May take a few minutes to hours
- Verify HTTPS is working before going live

### 8. Testing Checklist

Before going live, test:

- [ ] New subdomain resolves: `https://resources.sageoutdooradvisory.com`
- [ ] SSL certificate is valid (green padlock)
- [ ] Homepage loads correctly
- [ ] Landing pages load: `/landing/[slug]`
- [ ] Glossary pages load: `/glossary/[term]`
- [ ] Sitemap accessible: `/sitemap.xml`
- [ ] Robots.txt accessible: `/robots.txt`
- [ ] Old subdomain redirects work: `marketing.*` → `resources.*`
- [ ] All internal links work
- [ ] Canonical URLs are correct
- [ ] Schema markup validates
- [ ] Mobile responsive
- [ ] Page speed is acceptable

**Tools:**
- [SSL Checker](https://www.sslshopper.com/ssl-checker.html)
- [Redirect Checker](https://www.redirect-checker.org/)
- [Schema Validator](https://validator.schema.org/)
- [PageSpeed Insights](https://pagespeed.web.dev/)

## 📋 Migration Timeline

### Pre-Migration (Before DNS Change)
- [ ] Code changes committed and deployed to staging
- [ ] Test redirects in staging environment
- [ ] Prepare DNS changes
- [ ] Document current analytics baseline

### Migration Day
- [ ] Deploy code changes to production
- [ ] Add DNS record for `resources` subdomain
- [ ] Set up 301 redirects from `marketing` to `resources`
- [ ] Verify SSL certificate
- [ ] Test all critical pages
- [ ] Submit new sitemap to Google Search Console

### Post-Migration (Week 1)
- [ ] Monitor Google Search Console for errors
- [ ] Check analytics for traffic patterns
- [ ] Verify redirects are working (check server logs)
- [ ] Update root domain links to new subdomain
- [ ] Monitor for any 404 errors

### Post-Migration (Month 1)
- [ ] Review search rankings
- [ ] Check for any ranking drops
- [ ] Update any remaining external links
- [ ] Monitor redirect traffic
- [ ] Review analytics trends

### Post-Migration (Month 3+)
- [ ] Consider removing old `marketing` subdomain DNS (only after confirming all traffic redirected)
- [ ] Archive old Google Search Console property (keep for historical data)
- [ ] Final review of rankings and traffic

## ⚠️ Important Notes

1. **Don't Delete Old Subdomain Immediately**: Keep it active with redirects for at least 3-6 months
2. **Monitor Closely**: Watch for any ranking drops or crawl errors
3. **301 Redirects Are Critical**: Without proper redirects, you'll lose SEO value
4. **Test Everything**: Don't assume redirects work - test them
5. **Keep Documentation**: Document what you changed and when

## 🚨 Common Issues & Solutions

### Issue: Redirects Not Working
**Solution:** Check hosting provider redirect configuration, verify DNS propagation

### Issue: SSL Certificate Not Generated
**Solution:** Wait 24-48 hours, or manually trigger certificate generation in hosting panel

### Issue: Rankings Drop
**Solution:** 
- Verify 301 redirects are working
- Check Google Search Console for crawl errors
- Ensure new sitemap is submitted
- Give it time (can take 2-4 weeks for rankings to stabilize)

### Issue: Mixed Content Warnings
**Solution:** Ensure all internal links use HTTPS, check for hardcoded HTTP URLs

## 📊 Success Metrics

Track these metrics to measure migration success:

- **Traffic:** Should remain stable or increase
- **Rankings:** Should maintain or improve
- **Crawl Errors:** Should be minimal
- **Redirect Traffic:** Should show in analytics
- **Index Coverage:** New subdomain should be indexed

## 🎯 Quick Reference

**Old Subdomain:** `marketing.sageoutdooradvisory.com`  
**New Subdomain:** `resources.sageoutdooradvisory.com`  
**Migration Date:** [Fill in when completed]  
**DNS Provider:** [Fill in]  
**Hosting Provider:** [Fill in]  
**Redirect Method:** [Fill in]

---

**Status:** Code changes complete ✅  
**Next Step:** DNS configuration and redirect setup

