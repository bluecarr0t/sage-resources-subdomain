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

