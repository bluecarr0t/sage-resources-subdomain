import { NextResponse } from 'next/server';
import { getAllPropertySlugs, getMaxPropertyUpdatedAt } from '@/lib/properties';
import { getAllNationalParkSlugs } from '@/lib/national-parks';
import { getMostRecentContentDate } from '@/lib/sitemap-dates';
import { getAvailableLocalesForContent } from '@/lib/i18n-content';

const baseUrl = "https://resources.sageoutdooradvisory.com";

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';

function generateEnOnlyHreflangTags(path: string): string {
  return `    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}${path}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}${path}" />`;
}

export async function GET() {
  const [propertySlugs, nationalParkSlugs, maxPropertyUpdated] = await Promise.all([
    getAllPropertySlugs(),
    getAllNationalParkSlugs(),
    getMaxPropertyUpdatedAt(),
  ]);
  const urls: string[] = [];
  const defaultDate = maxPropertyUpdated ?? getMostRecentContentDate();

  const propertyLocales = getAvailableLocalesForContent('property');

  // Generate property pages for indexed locales with hreflang
  for (const item of propertySlugs) {
    for (const locale of propertyLocales) {
      const fullPath = `/${locale}/property/${item.slug}`;
      const hreflangs = generateEnOnlyHreflangTags(fullPath);
      
      urls.push(`  <url>
    <loc>${baseUrl}${fullPath}</loc>
    <lastmod>${defaultDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
${hreflangs}
  </url>`);
    }
  }

  // Generate national park pages for indexed locales
  for (const item of nationalParkSlugs) {
    for (const locale of propertyLocales) {
      const fullPath = `/${locale}/property/${item.slug}`;
      const hreflangs = generateEnOnlyHreflangTags(fullPath);
      
      urls.push(`  <url>
    <loc>${baseUrl}${fullPath}</loc>
    <lastmod>${defaultDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
${hreflangs}
  </url>`);
    }
  }

  urls.sort((a, b) => a.localeCompare(b));

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  });
}
