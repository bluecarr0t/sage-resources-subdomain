import { NextResponse } from 'next/server';
import { getAllPublicBrandSlugs } from '@/lib/brand-public-pages';
import { getMostRecentContentDate } from '@/lib/sitemap-dates';
import { getAvailableLocalesForContent } from '@/lib/i18n-content';

const baseUrl = 'https://resources.sageoutdooradvisory.com';

export const dynamic = 'force-dynamic';

function generateEnOnlyHreflangTags(path: string): string {
  return `    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}${path}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}${path}" />`;
}

export async function GET() {
  const slugs = await getAllPublicBrandSlugs();
  const defaultDate = getMostRecentContentDate();
  const brandLocales = getAvailableLocalesForContent('brand');
  const urls: string[] = [];

  for (const item of slugs) {
    for (const locale of brandLocales) {
      const fullPath = `/${locale}/brand/${item.slug}`;
      const hreflangs = generateEnOnlyHreflangTags(fullPath);
      urls.push(`  <url>
    <loc>${baseUrl}${fullPath}</loc>
    <lastmod>${defaultDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.75</priority>
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
