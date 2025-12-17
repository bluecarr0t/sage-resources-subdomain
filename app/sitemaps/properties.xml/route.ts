import { NextResponse } from 'next/server';
import { getAllPropertySlugs } from '@/lib/properties';
import { locales } from '@/i18n';

const baseUrl = "https://resources.sageoutdooradvisory.com";

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';

export async function GET() {
  const propertySlugs = await getAllPropertySlugs();
  const urls: string[] = [];
  const propertyDefaultDate = new Date().toISOString();

  // Generate property pages for ALL locales (en, es, fr, de)
  // This enables Google to discover and index all language versions
  for (const item of propertySlugs) {
    for (const locale of locales) {
      urls.push(`  <url>
    <loc>${baseUrl}/${locale}/property/${item.slug}</loc>
    <lastmod>${propertyDefaultDate}</lastmod>
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
