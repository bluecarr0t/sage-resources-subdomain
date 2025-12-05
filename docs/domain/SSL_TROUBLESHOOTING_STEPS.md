# SSL Certificate Troubleshooting - Production Issue

## Current Status
- ✅ CNAME record configured: `resources` → `8646cf04426bb807.vercel-dns-016.com`
- ✅ DNS propagated globally (verified with DNS checker)
- ✅ Domain shows "Valid Configuration" in Vercel
- ❌ SSL certificate still shows `*.bluehost.com` instead of Vercel's certificate

## Critical Checks (Do These First)

### 1. Check for Conflicting A Records in Bluehost

**This is the #1 cause of this issue!**

1. Log into Bluehost
2. Go to: Domains → `sageoutdooradvisory.com` → DNS tab
3. Look at the DNS records table
4. **Find any A record with Host Record = `resources`**
5. **DELETE it immediately** - A records take precedence over CNAME and will cause the domain to resolve to Bluehost

**Important Notes:**
- The wildcard `*` A record is **NOT** the problem - you can keep it
- You need to find and delete the **specific** A record for `resources` (Host Record = `resources`)
- If you don't see an A record for `resources` in the list, it might be:
  - On a different page (scroll down)
  - Created automatically by Bluehost
  - Hidden in a collapsed section

**What Vercel is Seeing:**
- Vercel detects: A record `resources` → `50.87.178.63` (Bluehost IP)
- This conflicts with your CNAME: `resources` → `8646cf04426bb807.vercel-dns-016.com`
- **Solution:** Delete the A record, keep only the CNAME

**Why this matters:**
- If there's an A record for `resources`, it will point to Bluehost's IP
- Even if you have a CNAME, the A record wins
- This causes the domain to resolve to Bluehost → Bluehost's SSL certificate is served

### 2. Verify DNS is Actually Resolving to Vercel

Run this command in terminal:
```bash
nslookup resources.sageoutdooradvisory.com
```

**Expected output (Vercel):**
```
Non-authoritative answer:
Name: resources.sageoutdooradvisory.com
Address: [Vercel IP addresses]
```

**Bad output (Bluehost):**
```
Non-authoritative answer:
Name: resources.sageoutdooradvisory.com
Address: [Bluehost IP addresses like 50.87.170.62]
```

**If it shows Bluehost IPs:**
- There's likely a conflicting A record
- Or DNS hasn't fully propagated in your location
- Wait 15-30 minutes and check again

### 3. Force SSL Certificate Regeneration in Vercel

**Option A: Click Refresh (Try This First)**
1. Go to Vercel → Project Settings → Domains
2. Find `resources.sageoutdooradvisory.com`
3. Click the **"Refresh"** button
4. Wait 15-30 minutes
5. Test again in Incognito mode

**Option B: Remove and Re-add Domain (If Refresh Doesn't Work)**
1. Go to Vercel → Project Settings → Domains
2. Click **"Edit"** next to `resources.sageoutdooradvisory.com`
3. Click **"Remove"** or **"Delete"**
4. Wait 2-3 minutes
5. Click **"Add Domain"**
6. Enter: `resources.sageoutdooradvisory.com`
7. Wait 15-30 minutes for SSL certificate to generate

### 4. Clear All Caches

**Browser Cache:**
- Use Incognito/Private mode to test
- Or clear cache: Chrome → Settings → Privacy → Clear browsing data

**DNS Cache (Your Computer):**
```bash
# Mac
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder

# Windows
ipconfig /flushdns

# Linux
sudo systemd-resolve --flush-caches
```

**Test from Different Network:**
- Try from mobile data (not WiFi)
- Rules out local DNS caching issues

### 5. Check SSL Certificate Status

**Use SSL Checker Tools:**
- [SSL Checker](https://www.sslshopper.com/ssl-checker.html#hostname=resources.sageoutdooradvisory.com)
- [SSL Labs](https://www.ssllabs.com/ssltest/analyze.html?d=resources.sageoutdooradvisory.com)

These will show:
- What certificate is actually being served
- Whether it's valid
- When it expires

## Most Likely Causes (In Order)

1. **Conflicting A Record** (80% of cases)
   - Solution: Delete A record for `resources` in Bluehost

2. **Vercel Hasn't Generated Certificate Yet** (15% of cases)
   - Solution: Click "Refresh" in Vercel, wait 30 minutes

3. **Browser/DNS Caching** (5% of cases)
   - Solution: Clear caches, test in Incognito

## Step-by-Step Fix Process

1. ✅ **Check Bluehost DNS records** - Delete any A record for `resources`
2. ✅ **Verify DNS resolution** - Run `nslookup` command
3. ✅ **Click "Refresh" in Vercel** - Force certificate regeneration
4. ✅ **Wait 30 minutes** - Give Vercel time to generate certificate
5. ✅ **Clear browser cache** - Use Incognito mode
6. ✅ **Test again** - Visit `https://resources.sageoutdooradvisory.com`

## If Still Not Working After 1 Hour

1. **Remove domain from Vercel completely**
2. **Wait 5 minutes**
3. **Re-add domain in Vercel**
4. **Wait 30 minutes**
5. **Check Bluehost again** - Make absolutely sure there's NO A record for `resources`
6. **Contact Vercel Support** if still not working

## Verification Commands

**Check DNS:**
```bash
nslookup resources.sageoutdooradvisory.com
dig resources.sageoutdooradvisory.com
```

**Check SSL Certificate:**
```bash
openssl s_client -connect resources.sageoutdooradvisory.com:443 -servername resources.sageoutdooradvisory.com
```

**Expected Certificate Subject:**
```
subject=CN = resources.sageoutdooradvisory.com
```

**Bad Certificate (Current Issue):**
```
subject=CN = *.bluehost.com
```

