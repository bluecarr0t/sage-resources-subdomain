# Fix Wildcard A Record Conflict with CNAME

## Problem

Vercel shows "Invalid Configuration" and detects an A record for `resources.sageoutdooradvisory.com` pointing to `50.87.178.63`, even though you only have a CNAME record configured.

**Root Cause:** The wildcard A record `* IN A 50.87.178.63` is matching `resources.sageoutdooradvisory.com` before the CNAME record can take effect.

## Why This Happens

In DNS resolution:
1. Wildcard records (`*`) match any subdomain that doesn't have a more specific record
2. Some DNS resolvers may match the wildcard before checking for CNAME records
3. Vercel's DNS check sees `resources.sageoutdooradvisory.com` resolving to `50.87.178.63` (from wildcard) instead of Vercel's servers

## Solution Options

### Option 1: Remove Wildcard A Record (Recommended if Possible)

If the wildcard A record isn't needed for other subdomains:

1. **Log into Bluehost**
   - Go to Domains → `sageoutdooradvisory.com` → DNS tab

2. **Find and Remove Wildcard A Record**
   - Look for: `*` (or `@` or blank) → `A` → `50.87.178.63`
   - Delete this record

3. **Add Specific A Records for Subdomains That Need It**
   - Only add A records for subdomains that actually need to point to Bluehost
   - Example: `www`, `mail`, `ftp`, etc.

4. **Verify CNAME is Still Present**
   - Ensure `resources` → `CNAME` → `8646CF04426BB807.VERCEL-DNS-016.COM.` exists

5. **Wait for DNS Propagation (15-30 minutes)**

6. **Refresh in Vercel Dashboard**
   - Go to Vercel → Domains → Click "Refresh"
   - Status should change to "Valid Configuration"

### Option 2: Keep Wildcard but Ensure CNAME Priority (If Wildcard is Needed)

If you need the wildcard A record for other subdomains:

1. **Verify CNAME Record Exists and is Correct**
   - In Bluehost DNS, ensure:
     - `resources` → `CNAME` → `8646CF04426BB807.VERCEL-DNS-016.COM.`
   - The CNAME should take precedence, but some DNS resolvers may not respect this

2. **Check DNS Resolution from Multiple Locations**
   - Use [DNS Checker](https://dnschecker.org/#CNAME/resources.sageoutdooradvisory.com)
   - Verify it resolves to Vercel, not Bluehost IP
   - If it shows `50.87.178.63`, the wildcard is winning

3. **If Wildcard is Still Winning:**
   - You may need to remove the wildcard and add specific A records
   - OR contact Bluehost support to ensure CNAME takes precedence over wildcard

### Option 3: Use Explicit A Record Exception (Advanced)

Some DNS providers allow you to create an exception to the wildcard:

1. **Add Explicit A Record for Resources (Temporary)**
   - Add: `resources` → `A` → `[Vercel's IP]` (if Vercel provides one)
   - **Note:** This won't work if Vercel only supports CNAME

2. **OR Add Null/Empty Record**
   - Some DNS providers allow creating a "null" record that prevents wildcard matching
   - Check Bluehost documentation for this feature

## Verification Steps

### 1. Check Current DNS Resolution

```bash
# Check what resources.sageoutdooradvisory.com resolves to
dig resources.sageoutdooradvisory.com +short

# Should show Vercel's CNAME target, not 50.87.178.63
nslookup resources.sageoutdooradvisory.com
```

### 2. Use Online DNS Checkers

- [DNS Checker](https://dnschecker.org/#CNAME/resources.sageoutdooradvisory.com)
- [What's My DNS](https://www.whatsmydns.net/#CNAME/resources.sageoutdooradvisory.com)
- [MXToolbox](https://mxtoolbox.com/SuperTool.aspx?action=cname%3aresources.sageoutdooradvisory.com)

**Expected Result:** Should show `8646CF04426BB807.VERCEL-DNS-016.COM.` or Vercel's IP addresses

**If Wrong:** Shows `50.87.178.63` - wildcard is still winning

### 3. Check in Vercel Dashboard

1. Go to **Vercel → Project Settings → Domains**
2. Click on `resources.sageoutdooradvisory.com`
3. Click **"Refresh"** button
4. Status should change from "Invalid Configuration" to "Valid Configuration"

## Recommended Approach

**Best Solution:** Remove the wildcard A record if possible, and add specific A records only for subdomains that need to point to Bluehost.

**Why:**
- Wildcard records can cause conflicts with CNAME records
- More explicit DNS configuration is easier to manage
- Prevents future conflicts with other subdomains

**If You Must Keep Wildcard:**
- Ensure CNAME records are added BEFORE wildcard records in DNS priority
- Some DNS providers respect record order
- Contact Bluehost support if CNAME isn't taking precedence

## After Fixing

1. **Wait 15-30 minutes** for DNS propagation
2. **Refresh in Vercel Dashboard**
3. **Test HTTPS access:**
   - Visit: `https://resources.sageoutdooradvisory.com`
   - Should show green padlock (Vercel's certificate)
4. **Verify SSL Certificate:**
   - Click padlock → View certificate
   - Should show: `resources.sageoutdooradvisory.com` (not `*.bluehost.com`)

## Troubleshooting

### Still Shows Invalid Configuration After 30 Minutes

1. **Double-check DNS records in Bluehost**
   - Ensure wildcard A record is removed (or CNAME is prioritized)
   - Verify CNAME record is correct

2. **Check DNS propagation globally**
   - Use [DNS Checker](https://dnschecker.org) from multiple locations
   - All locations should show Vercel's CNAME, not Bluehost IP

3. **Clear DNS cache**
   - Your local machine: `sudo dscacheutil -flushcache` (Mac) or `ipconfig /flushdns` (Windows)
   - Browser cache: Use Incognito/Private mode

4. **Contact Bluehost Support**
   - Ask them to verify CNAME record priority over wildcard
   - Request DNS record refresh/rebuild

### Other Subdomains Break After Removing Wildcard

If removing the wildcard breaks other subdomains:

1. **Identify which subdomains need Bluehost IP**
2. **Add specific A records for each:**
   - `www` → `A` → `50.87.178.63`
   - `mail` → `A` → `50.87.178.63`
   - etc.

3. **Keep CNAME for resources:**
   - `resources` → `CNAME` → `8646CF04426BB807.VERCEL-DNS-016.COM.`

## Related Documentation

- [SSL Certificate Fix](./SSL_CERTIFICATE_FIX.md)
- [SSL Certificate Deployment Issues](./SSL_CERTIFICATE_DEPLOYMENT_ISSUES.md)
- [Vercel Domain Documentation](https://vercel.com/docs/concepts/projects/domains)
