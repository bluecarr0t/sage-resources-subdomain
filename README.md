# Sage Outdoor Advisory - Subdomain Marketing Landing Pages

A Next.js application for hosting multiple landing pages on a subdomain of sageoutdooradvisory.com. This project is designed to be easily updated and automatically deployed to Vercel.

## Features

- 🚀 **Multiple Landing Pages**: Easy-to-manage landing pages for different services
- 📝 **Centralized Content Management**: All landing page content in one file (`lib/landing-pages.ts`)
- 🎨 **Modern UI**: Built with Tailwind CSS and responsive design
- ⚡ **Fast Performance**: Next.js 14 with static generation
- 🔄 **Auto-Deploy**: Configured for automatic Vercel deployments

## Project Structure

```
├── app/
│   ├── landing/[slug]/     # Dynamic landing page routes
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page (redirects)
│   └── globals.css         # Global styles
├── components/
│   └── LandingPageTemplate.tsx  # Reusable landing page template
├── lib/
│   └── landing-pages.ts    # Centralized content management
└── vercel.json             # Vercel deployment configuration
```

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

### Building

```bash
npm run build
```

### Available Landing Pages

- `/landing/glamping-feasibility-study`
- `/landing/rv-resort-feasibility-study`
- `/landing/campground-feasibility-study`
- `/landing/glamping-appraisal`
- `/landing/rv-resort-appraisal`

## Adding New Landing Pages

To add a new landing page:

1. Open `lib/landing-pages.ts`
2. Add a new entry to the `landingPages` object with a unique slug
3. The page will automatically be available at `/landing/[your-slug]`

Example:

```typescript
"new-service": {
  slug: "new-service",
  title: "New Service | Sage Outdoor Advisory",
  metaDescription: "Description for SEO",
  hero: {
    headline: "Your Headline",
    subheadline: "Your subheadline",
    ctaText: "Call to Action",
    ctaLink: "https://sageoutdooradvisory.com/contact-us",
  },
  sections: [
    {
      title: "Section Title",
      content: "Section content",
      bullets: ["Bullet 1", "Bullet 2"],
    },
  ],
  benefits: ["Benefit 1", "Benefit 2"],
  cta: {
    title: "CTA Title",
    description: "CTA Description",
    buttonText: "Button Text",
    buttonLink: "https://sageoutdooradvisory.com/contact-us",
  },
},
```

## Vercel Deployment

### Initial Setup

1. Push this repository to GitHub
2. Import the project in Vercel
3. Configure the subdomain in Vercel project settings
4. Add environment variables if needed

### Automatic Deployments

- Push to `main` branch → Production deployment
- Push to other branches → Preview deployments

### Subdomain Configuration

In Vercel:
1. Go to Project Settings → Domains
2. Add your subdomain (e.g., `resources.sageoutdooradvisory.com`)
3. Update DNS records as instructed by Vercel

### SEO instrumentation (Phase 0)

```bash
npm run seo:audit-instrumentation
```

Verifies sitemap, robots, GSC/IndexNow/GA4 env vars, and prints sitemap URL counts. See [docs/seo/PHASE_0_INSTRUMENTATION.md](./docs/seo/PHASE_0_INSTRUMENTATION.md).

### Environment Variables

Add the following environment variables in Vercel (Project Settings → Environment Variables):

#### Required

- `NEXT_PUBLIC_GA_MEASUREMENT_ID` - Your Google Analytics 4 Measurement ID (format: `G-XXXXXXXXXX`)

**To get your GA4 Measurement ID:**
1. Go to [Google Analytics](https://analytics.google.com/)
2. Select your property (or create a new one)
3. Go to Admin → Data Streams
4. Click on your web stream
5. Copy the Measurement ID (starts with `G-`)

**Note:** The `NEXT_PUBLIC_` prefix makes this variable available to the client-side code, which is required for Google Analytics tracking.

**SEO / indexing (recommended):**

- `NEXT_PUBLIC_GOOGLE_VERIFICATION_CODE` — GSC HTML-tag verification (or use `public/google*.html`)
- `INDEXNOW_KEY` — Bing/Yandex indexing (`openssl rand -hex 16`)
- `CRON_SECRET` — Secures `/api/indexnow` daily cron

See [docs/seo/ENV.example](./docs/seo/ENV.example) and [docs/seo/PHASE_0_INSTRUMENTATION.md](./docs/seo/PHASE_0_INSTRUMENTATION.md).

#### Optional (for Redis Caching)

- `REDIS_URL` - Redis connection string (recommended)
- OR separate variables: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

Redis caching improves performance for the map page by caching property data. If not configured, the application will gracefully fall back to direct database queries.

**See [REDIS_SETUP.md](./REDIS_SETUP.md) for detailed Redis Cloud setup instructions.**

## Customization

### Styling

- Global styles: `app/globals.css`
- Tailwind config: `tailwind.config.ts`
- Component styles: Edit `components/LandingPageTemplate.tsx`

### Content

All landing page content is managed in `lib/landing-pages.ts`. This makes it easy to:
- Update content without touching code
- Add new landing pages quickly
- Maintain consistency across pages

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **Vercel** - Deployment platform

## License

Private project for Sage Outdoor Advisory

