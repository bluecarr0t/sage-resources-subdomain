import { NextResponse } from 'next/server';
import { getAllGlossaryTerms } from '@/lib/glossary/index';
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
  const glossaryTerms = getAllGlossaryTerms();
  const urls: string[] = [];
  const glossaryDefaultDate = getMostRecentContentDate();

  // Generate glossary term pages for locales with translated term content
  for (const term of glossaryTerms) {
    for (const locale of getAvailableLocalesForContent('glossary')) {
      const fullPath = `/${locale}/glossary/${term.slug}`;
      const hreflangs = generateEnOnlyHreflangTags(fullPath);
      
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
