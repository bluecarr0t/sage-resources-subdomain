import { NextResponse } from 'next/server';
import { getAllGuideSlugs, getGuide } from '@/lib/guides';
import { locales } from '@/i18n';

const baseUrl = "https://resources.sageoutdooradvisory.com";

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';

export async function GET() {
  const guideSlugs = getAllGuideSlugs();
  const urls: string[] = [];

  // Generate guide pages for all locales
  for (const locale of locales) {
    for (const slug of guideSlugs) {
      const guide = getGuide(slug);
      const isPillarPage = slug.endsWith("-complete-guide");
      const lastModified = guide?.lastModified 
        ? new Date(guide.lastModified).toISOString()
        : new Date("2025-01-15").toISOString();
      
      urls.push(`  <url>
    <loc>${baseUrl}/${locale}/guides/${slug}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${isPillarPage ? '0.9' : '0.8'}</priority>
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
