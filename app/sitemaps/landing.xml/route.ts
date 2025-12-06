import { NextResponse } from 'next/server';
import { getAllLandingPageSlugs, getLandingPage } from '@/lib/landing-pages';
import { locales } from '@/i18n';

const baseUrl = "https://resources.sageoutdooradvisory.com";

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';

export async function GET() {
  const landingPageSlugs = getAllLandingPageSlugs();
  const urls: string[] = [];

  // Generate landing pages for all locales
  for (const locale of locales) {
    for (const slug of landingPageSlugs) {
      const page = getLandingPage(slug);
      const lastModified = page?.lastModified 
        ? new Date(page.lastModified).toISOString()
        : new Date("2025-01-01").toISOString();
      
      urls.push(`  <url>
    <loc>${baseUrl}/${locale}/landing/${slug}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }
  }

  urls.sort((a, b) => a.localeCompare(b));

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  });
}
