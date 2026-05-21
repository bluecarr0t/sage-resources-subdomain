import { NextResponse } from 'next/server';
import { getAllLandingPageSlugs, getLandingPageSync } from '@/lib/landing-pages';
import { getLandingLocalesForSlug } from '@/lib/landing-i18n';
import { generateHreflangTagsForLocales } from '@/lib/sitemap-hreflang';
import { getLandingSitemapPriority } from '@/lib/sitemap-priority';

const baseUrl = "https://resources.sageoutdooradvisory.com";

export const dynamic = 'force-dynamic';

export async function GET() {
  const landingPageSlugs = getAllLandingPageSlugs();
  const urls: string[] = [];

  for (const slug of landingPageSlugs) {
    const page = getLandingPageSync(slug);
    const lastModified = page?.lastModified
      ? new Date(page.lastModified).toISOString()
      : new Date("2025-01-01").toISOString();
    const availableLocales = getLandingLocalesForSlug(slug);
    const priority = getLandingSitemapPriority(slug);

    for (const locale of availableLocales) {
      const fullPath = `/${locale}/landing/${slug}`;
      const hreflangs = generateHreflangTagsForLocales(fullPath, availableLocales);

      urls.push(`  <url>
    <loc>${baseUrl}${fullPath}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
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
