import { NextResponse } from 'next/server';
import { getAllPropertySlugs } from '@/lib/properties';
import { getAllNationalParkSlugs } from '@/lib/national-parks';
import { locales } from '@/i18n';

const baseUrl = "https://resources.sageoutdooradvisory.com";

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';

function generateHreflangTags(path: string): string {
  const hreflangs: string[] = [];
  for (const locale of locales) {
    const localePath = path.replace(/^\/[a-z]{2}(\/|$)/, `/${locale}$1`);
    hreflangs.push(`    <xhtml:link rel="alternate" hreflang="${locale}" href="${baseUrl}${localePath}" />`);
  }
  hreflangs.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}${path.replace(/^\/[a-z]{2}(\/|$)/, '/en$1')}" />`);
  return hreflangs.join('\n');
}

export async function GET() {
  const [propertySlugs, nationalParkSlugs] = await Promise.all([
    getAllPropertySlugs(),
    getAllNationalParkSlugs(),
  ]);
  const urls: string[] = [];
  const defaultDate = new Date().toISOString();

  // Generate property pages for ALL locales (en, es, fr, de) with hreflang
  // This enables Google to discover and index all language versions
  for (const item of propertySlugs) {
    for (const locale of locales) {
      const fullPath = `/${locale}/property/${item.slug}`;
      const hreflangs = generateHreflangTags(fullPath);
      
      urls.push(`  <url>
    <loc>${baseUrl}${fullPath}</loc>
    <lastmod>${defaultDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
${hreflangs}
  </url>`);
    }
  }

  // Generate national park pages for ALL locales (same /property/[slug] route)
  for (const item of nationalParkSlugs) {
    for (const locale of locales) {
      const fullPath = `/${locale}/property/${item.slug}`;
      const hreflangs = generateHreflangTags(fullPath);
      
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
