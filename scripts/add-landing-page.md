# How to Add a New Landing Page

## Quick Steps

1. Open `lib/landing-pages.ts`
2. Add a new entry to the `landingPages` object
3. Use this template:

```typescript
"your-slug-here": {
  slug: "your-slug-here",
  title: "Your Page Title | Sage Outdoor Advisory",
  metaDescription: "SEO description (150-160 characters)",
  hero: {
    headline: "Main Headline",
    subheadline: "Supporting subheadline text",
    ctaText: "Schedule Free Consultation",
    ctaLink: "https://sageoutdooradvisory.com/contact-us",
  },
  sections: [
    {
      title: "Section Title",
      content: "Section content paragraph",
      bullets: [
        "Bullet point 1",
        "Bullet point 2",
        "Bullet point 3",
      ],
    },
  ],
  benefits: [
    "Benefit 1",
    "Benefit 2",
    "Benefit 3",
    "Benefit 4",
  ],
  cta: {
    title: "Final CTA Title",
    description: "Final CTA description",
    buttonText: "Schedule Free Consultation",
    buttonLink: "https://sageoutdooradvisory.com/contact-us",
  },
},
```

## Example Slugs

Based on Sage services, here are some suggested slugs:

- `outdoor-resort-feasibility-study`
- `marina-feasibility-study`
- `campground-appraisal`
- `outdoor-resort-appraisal`
- `marina-appraisal`
- `glamping-market-data`
- `rv-resort-market-data`

## After Adding

1. Save the file
2. The page will be available at: `/landing/your-slug-here`
3. Build and deploy to see it live

