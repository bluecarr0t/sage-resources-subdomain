import { NextResponse } from 'next/server';
import { getAllGlossaryTerms } from '@/lib/glossary/index';
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
  const glossaryTerms = getAllGlossaryTerms();
  const urls: string[] = [];
  const glossaryDefaultDate = new Date("2025-01-15").toISOString();

  // Generate glossary term pages for all locales with hreflang
  for (const term of glossaryTerms) {
    for (const locale of locales) {
      const fullPath = `/${locale}/glossary/${term.slug}`;
      const hreflangs = generateHreflangTags(fullPath);
      
      urls.push(`  <url>
    <loc>${baseUrl}${fullPath}</loc>
    <lastmod>${glossaryDefaultDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
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
