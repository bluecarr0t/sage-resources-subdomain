import { NextResponse } from 'next/server';
import { getIndexedPropertySlugEntries, getMaxPropertyUpdatedAt } from '@/lib/properties';
import { getAllNationalParkSlugs } from '@/lib/national-parks';
import { getMostRecentContentDate } from '@/lib/sitemap-dates';
import { getAvailableLocalesForContent } from '@/lib/i18n-content';
import { generateEnOnlyHreflangTags } from '@/lib/sitemap-hreflang';
import { getPropertySitemapPriority } from '@/lib/sitemap-priority';

const baseUrl = "https://resources.sageoutdooradvisory.com";

export const dynamic = 'force-dynamic';

export async function GET() {
  const contentFallback = getMostRecentContentDate();
  const [propertyEntries, nationalParkSlugs, maxPropertyUpdated] = await Promise.all([
    getIndexedPropertySlugEntries(contentFallback),
    getAllNationalParkSlugs(),
    getMaxPropertyUpdatedAt(),
  ]);
  const urls: string[] = [];
  const nationalParkLastmod = maxPropertyUpdated ?? contentFallback;
  const propertyLocales = getAvailableLocalesForContent('property');

  for (const item of propertyEntries) {
    for (const locale of propertyLocales) {
      const fullPath = `/${locale}/property/${item.slug}`;
      const hreflangs = generateEnOnlyHreflangTags(fullPath);
      const priority = getPropertySitemapPriority(item.tier === 'a' ? 'a' : 'b');

      urls.push(`  <url>
    <loc>${baseUrl}${fullPath}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
${hreflangs}
  </url>`);
    }
  }

  for (const item of nationalParkSlugs) {
    for (const locale of propertyLocales) {
      const fullPath = `/${locale}/property/${item.slug}`;
      const hreflangs = generateEnOnlyHreflangTags(fullPath);

      urls.push(`  <url>
    <loc>${baseUrl}${fullPath}</loc>
    <lastmod>${nationalParkLastmod}</lastmod>
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
