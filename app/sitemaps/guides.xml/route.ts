import { NextResponse } from 'next/server';
import { getAllGuideSlugs, getGuideSync } from '@/lib/guides';
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
  const guideSlugs = getAllGuideSlugs();
  const urls: string[] = [];

  // Generate guide pages for all locales with hreflang
  for (const slug of guideSlugs) {
    const guide = getGuideSync(slug);
    const isPillarPage = slug.endsWith("-complete-guide");
    const lastModified = guide?.lastModified 
      ? new Date(guide.lastModified).toISOString()
      : new Date("2025-01-15").toISOString();
    
    for (const locale of locales) {
      const fullPath = `/${locale}/guides/${slug}`;
      const hreflangs = generateHreflangTags(fullPath);
      
      urls.push(`  <url>
    <loc>${baseUrl}${fullPath}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${isPillarPage ? '0.9' : '0.8'}</priority>
${hreflangs}
  </url>`);
    }
  }

  // Sort: pillar pages first, then alphabetically
  urls.sort((a, b) => {
    const aIsPillar = a.includes("-complete-guide");
    const bIsPillar = b.includes("-complete-guide");
    if (aIsPillar && !bIsPillar) return -1;
    if (!aIsPillar && bIsPillar) return 1;
    return a.localeCompare(b);
  });

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
