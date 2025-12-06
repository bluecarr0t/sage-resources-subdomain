import { NextResponse } from 'next/server';
import { getAllGlossaryTerms } from '@/lib/glossary/index';
import { locales } from '@/i18n';

const baseUrl = "https://resources.sageoutdooradvisory.com";

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';

export async function GET() {
  const glossaryTerms = getAllGlossaryTerms();
  const urls: string[] = [];
  const glossaryDefaultDate = new Date("2025-01-15").toISOString();

  // Generate glossary term pages for all locales
  for (const locale of locales) {
    for (const term of glossaryTerms) {
      urls.push(`  <url>
    <loc>${baseUrl}/${locale}/glossary/${term.slug}</loc>
    <lastmod>${glossaryDefaultDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
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
