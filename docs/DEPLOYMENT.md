# Deployment Guide

## Quick Deploy to Vercel

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. For production deployment:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via GitHub (Recommended)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit: Sage subdomain marketing landing pages"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings
   - Click "Deploy"

3. **Configure Subdomain:**
   - In Vercel project settings → Domains
   - Add your subdomain: `resources.sageoutdooradvisory.com` (or your preferred subdomain)
   - Follow DNS instructions provided by Vercel

### Automatic Deployments

Once connected to GitHub:
- **Main branch** → Production deployment
- **Other branches** → Preview deployments

Every push will automatically trigger a new deployment!

## Environment Variables

If you need environment variables:
1. Go to Vercel Project Settings → Environment Variables
2. Add any required variables
3. Redeploy for changes to take effect

## Custom Domain Setup

1. In Vercel: Project Settings → Domains
2. Add your subdomain (e.g., `resources.sageoutdooradvisory.com`)
3. Update your DNS records:
   - Add a CNAME record pointing to Vercel's domain
   - Or use Vercel's nameservers if managing DNS through Vercel

## Verifying Deployment

After deployment, test these URLs:
- `https://your-subdomain.vercel.app/landing/glamping-feasibility-study`
- `https://your-subdomain.vercel.app/landing/rv-resort-feasibility-study`
- `https://your-subdomain.vercel.app/landing/campground-feasibility-study`
- `https://your-subdomain.vercel.app/landing/glamping-appraisal`
- `https://your-subdomain.vercel.app/landing/rv-resort-appraisal`

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure TypeScript compiles without errors: `npm run build`

### Pages Not Found
- Verify the slug exists in `lib/landing-pages.ts`
- Check that the build completed successfully

### Subdomain Not Working
- Verify DNS records are correct
- Check Vercel domain configuration
- Allow up to 24 hours for DNS propagation

