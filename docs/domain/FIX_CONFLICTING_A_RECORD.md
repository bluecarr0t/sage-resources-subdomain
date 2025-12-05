# Fix: Conflicting A Record for `resources` Subdomain

## Problem

Vercel shows "Invalid Configuration" and detects a conflicting A record:
- **Type:** A
- **Name:** `resources`
- **Value:** `50.87.178.63` (Bluehost IP)

This A record conflicts with your CNAME record and causes the domain to resolve to Bluehost instead of Vercel.

## Solution: Delete the A Record in Bluehost

### Step-by-Step Instructions

1. **Log into Bluehost**
   - Go to [bluehost.com](https://bluehost.com)
   - Sign in to your account

2. **Navigate to DNS Management**
   - Click **"Domains"** in the left sidebar
   - Find and click on **`sageoutdooradvisory.com`**
   - Click on the **"DNS"** tab

3. **Find the Conflicting A Record**
   - Scroll through the DNS records table
   - Look for a record with:
     - **Type:** `A`
     - **Host Record:** `resources` (exactly this, not `*` or anything else)
     - **Point To:** `50.87.178.63` (or any Bluehost IP)

4. **Delete the A Record**
   - Click the **three dots (⋮)** or **"Edit"** button next to the A record
   - Select **"Delete"** or **"Remove"**
   - Confirm the deletion

5. **Verify Your CNAME Record Exists**
   - You should have a CNAME record:
     - **Type:** `CNAME`
     - **Host Record:** `resources`
     - **Point To:** `8646cf04426bb807.vercel-dns-016.com`
   - If the CNAME is missing, add it back

6. **Wait for DNS Propagation**
   - Changes take 15-30 minutes (up to 4 hours with your TTL)
   - Vercel will automatically detect the change

7. **Refresh in Vercel**
   - Go to Vercel → Project Settings → Domains
   - Click **"Refresh"** next to `resources.sageoutdooradvisory.com`
   - Status should change to "Valid Configuration" within 15-30 minutes

## About the Wildcard `*` Record

**The wildcard `*` A record is NOT the problem!**

- The `*` record applies to subdomains that don't have specific records
- Since you have a CNAME for `resources`, it takes precedence over the wildcard
- You can keep the `*` record - it won't interfere with your `resources` subdomain

**Only delete the specific A record for `resources`.**

## Why This Happens

Bluehost sometimes automatically creates A records for subdomains when:
- You add a subdomain in their control panel
- You enable hosting for a subdomain
- DNS records are auto-generated

These auto-created A records conflict with CNAME records pointing to external services like Vercel.

## Verification

After deleting the A record, verify:

1. **Check DNS Records in Bluehost**
   - Should see: CNAME `resources` → `8646cf04426bb807.vercel-dns-016.com`
   - Should NOT see: A record `resources` → `50.87.178.63`

2. **Check DNS Resolution**
   ```bash
   nslookup resources.sageoutdooradvisory.com
   ```
   - Should show: `8646cf04426bb807.vercel-dns-016.com`
   - Should NOT show: `50.87.178.63`

3. **Check Vercel Status**
   - Should show: "Valid Configuration" (green checkmark)
   - Should NOT show: "Invalid Configuration" (red warning)

## If You've Deleted the A Record But Vercel Still Shows It

If you've already deleted the A record but Vercel still shows "Invalid Configuration":

1. **Wait for DNS Propagation (15-30 minutes)**
   - DNS deletions can take time to propagate globally
   - Vercel's DNS check might be cached
   - Wait 30 minutes after deletion

2. **Click "Refresh" in Vercel Multiple Times**
   - Go to Vercel → Project Settings → Domains
   - Click **"Refresh"** next to `resources.sageoutdooradvisory.com`
   - Wait 5 minutes, then click "Refresh" again
   - Sometimes Vercel needs multiple refreshes to detect changes

3. **Verify DNS Resolution**
   ```bash
   nslookup resources.sageoutdooradvisory.com
   dig resources.sageoutdooradvisory.com
   ```
   - Should show: `8646cf04426bb807.vercel-dns-016.com` (CNAME)
   - Should NOT show: `50.87.178.63` (Bluehost IP)

4. **Check Different DNS Servers**
   - Use [DNS Checker](https://dnschecker.org/#CNAME/resources.sageoutdooradvisory.com)
   - Verify globally that DNS is resolving correctly
   - All locations should show the Vercel CNAME

5. **If Still Not Working After 1 Hour**
   - Remove and re-add the domain in Vercel
   - This forces a fresh DNS check

## If You Can't Find the A Record

If you don't see an A record for `resources` in Bluehost but Vercel still detects it:

1. **Check All Pages**
   - DNS records might be paginated
   - Scroll through all pages of records

2. **Check Different Views**
   - Try switching between "Advanced DNS" and "Simple DNS" views
   - Some records might be hidden in one view

3. **Contact Bluehost Support**
   - They can help locate and delete the record
   - Ask them to remove any A record for `resources.sageoutdooradvisory.com`

4. **Wait and Refresh**
   - Sometimes DNS changes take time to propagate
   - Wait 30 minutes, then click "Refresh" in Vercel again

## Prevention

To prevent this from happening again:

1. **Don't add subdomains in Bluehost's control panel** if they point to Vercel
2. **Only use DNS records** (CNAME) to point subdomains to Vercel
3. **Avoid enabling hosting** for subdomains that use external services

