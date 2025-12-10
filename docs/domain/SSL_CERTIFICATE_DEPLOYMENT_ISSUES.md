# SSL Certificate Issues After Deployment

## Problem: Occasional `NET::ERR_CERT_COMMON_NAME_INVALID` After Production Deployments

### Why This Happens

Even when DNS hasn't changed, SSL certificate errors can occur temporarily after deploying to production. This is a **timing issue with Vercel's SSL certificate provisioning**, not a DNS problem.

#### Root Causes

1. **SSL Certificate Provisioning Delay (5-60 minutes)**
   - Vercel automatically provisions/renews SSL certificates via Let's Encrypt after each deployment
   - Certificate generation is asynchronous and not instant
   - During this window, some requests may hit edge locations without a valid certificate

2. **Global CDN Edge Propagation**
   - Vercel uses a global CDN with hundreds of edge locations worldwide
   - Certificate updates must propagate to ALL edge locations
   - Different users may hit different edges, some updated and some not
   - This creates inconsistent behavior where some users see errors while others don't

3. **Certificate Renewal Race Conditions**
   - If a certificate is close to expiration, deployments can trigger renewal
   - Brief gap between old certificate expiration and new certificate activation
   - More likely to happen if you deploy frequently

4. **Let's Encrypt Rate Limiting**
   - Vercel uses Let's Encrypt for free SSL certificates
   - Let's Encrypt has rate limits (50 certificates per registered domain per week)
   - If you hit rate limits, certificate provisioning can be delayed

5. **Deployment-Triggered Certificate Refresh**
   - Vercel may refresh certificates on deployment to ensure they're current
   - The refresh process isn't instant across all global edge locations
   - Creates a temporary window where certificates might be invalid

### Why It's "Occasional"

- **Geographic Location**: Users in different regions hit different CDN edges
- **Timing**: Users who visit immediately after deployment are more likely to see errors
- **Browser Caching**: Browsers cache certificate validation, so repeat visits might not show errors
- **Edge Location State**: Each edge location updates independently

### Solutions & Mitigations

#### 1. Wait for Certificate Propagation (Recommended)
- **Wait 5-15 minutes** after deployment before testing production
- Certificates typically propagate within this window
- Most users won't see errors after this period

#### 2. Check Certificate Status in Vercel Dashboard
1. Go to **Vercel Dashboard → Your Project → Settings → Domains**
2. Click on `resources.sageoutdooradvisory.com`
3. Check the **SSL Certificate** status
4. If it shows "Pending" or "Error", click **Refresh** to force renewal

#### 3. Force Certificate Refresh (If Needed)
If errors persist after 15 minutes:
1. **Vercel Dashboard → Domains → resources.sageoutdooradvisory.com**
2. Click **"..." menu → Remove Domain**
3. Wait 30 seconds
4. Click **Add Domain** and re-add `resources.sageoutdooradvisory.com`
5. Wait 5-10 minutes for certificate to regenerate

⚠️ **Warning**: This will cause brief downtime. Only do this if errors persist.

#### 4. Monitor Certificate Status
- Use [SSL Labs SSL Test](https://www.ssllabs.com/ssltest/) to check certificate status
- Use [SSL Checker](https://www.sslshopper.com/ssl-checker.html) to verify certificate details
- Check certificate expiration dates

#### 5. Stagger Deployments (If Possible)
- Avoid deploying during peak traffic hours
- Deploy during low-traffic periods to minimize user impact
- Consider deploying to preview first, then promoting to production

#### 6. Add Health Check Endpoint
Create a simple health check that verifies SSL is working:
```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    ssl: true 
  });
}
```

### Prevention Strategies

#### 1. Pre-Deployment Certificate Check
Before deploying, verify certificate is valid:
```bash
# Check certificate expiration
openssl s_client -connect resources.sageoutdooradvisory.com:443 -servername resources.sageoutdooradvisory.com < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

#### 2. Monitor Certificate Expiration
- Vercel automatically renews certificates, but monitor expiration dates
- Certificates typically expire after 90 days
- Vercel should auto-renew, but monitor for issues

#### 3. Use Vercel's Certificate Status API
Monitor certificate status programmatically:
- Check Vercel API for domain certificate status
- Set up alerts if certificate status changes

### When to Worry

**Normal (Self-Resolving):**
- ✅ Error appears immediately after deployment
- ✅ Error resolves within 5-15 minutes
- ✅ Only some users see the error
- ✅ Error doesn't persist after 30 minutes

**Concerning (Needs Action):**
- ❌ Error persists for more than 30 minutes
- ❌ All users see the error consistently
- ❌ Certificate shows wrong domain (e.g., `*.bluehost.com`)
- ❌ Certificate status shows "Error" in Vercel dashboard

### Troubleshooting Steps

1. **Check Vercel Dashboard**
   - Go to Project Settings → Domains
   - Verify `resources.sageoutdooradvisory.com` shows "Valid Configuration"
   - Check SSL Certificate status

2. **Verify DNS**
   - Use [DNS Checker](https://dnschecker.org/#CNAME/resources.sageoutdooradvisory.com)
   - Ensure CNAME points to Vercel (not Bluehost)
   - Check for conflicting A records

3. **Test Certificate**
   - Visit: `https://resources.sageoutdooradvisory.com`
   - Click padlock icon → View certificate
   - Should show: `resources.sageoutdooradvisory.com` (not `*.bluehost.com`)

4. **Clear Browser Cache**
   - Use Incognito/Private mode
   - Clear SSL state cache
   - Try different browser

5. **Check Multiple Locations**
   - Use VPN to test from different regions
   - Use [SSL Labs](https://www.ssllabs.com/ssltest/) for global testing

### Best Practices

1. **Deploy During Low Traffic**
   - Reduces impact if certificate issues occur
   - Gives time for propagation before peak hours

2. **Monitor After Deployment**
   - Check SSL status 5-10 minutes after deployment
   - Use monitoring tools to detect certificate errors

3. **Document Known Issues**
   - If this happens frequently, document the pattern
   - Consider reaching out to Vercel support if it's excessive

4. **Set Up Alerts**
   - Monitor for SSL certificate errors
   - Alert if certificate status changes

### Vercel Support

If issues persist:
- Contact Vercel Support
- Provide deployment logs
- Share certificate status from dashboard
- Include error screenshots and timestamps

### Related Documentation

- [SSL Certificate Fix](./SSL_CERTIFICATE_FIX.md)
- [SSL Troubleshooting Steps](./SSL_TROUBLESHOOTING_STEPS.md)
- [Vercel Domain Documentation](https://vercel.com/docs/concepts/projects/domains)
