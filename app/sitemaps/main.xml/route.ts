import { NextResponse } from 'next/server';
import { locales } from '@/i18n';

const baseUrl = "https://resources.sageoutdooradvisory.com";

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';

function generateHreflangTags(path: string): string {
  const hreflangs: string[] = [];
  for (const locale of locales) {
    const localePath = path.replace(/^\/[a-z]{2}(\/|$)/, `/${locale}$1`) || `/${locale}`;
    hreflangs.push(`    <xhtml:link rel="alternate" hreflang="${locale}" href="${baseUrl}${localePath}" />`);
  }
  hreflangs.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}${path.replace(/^\/[a-z]{2}(\/|$)/, '/en$1') || '/en'}" />`);
  return hreflangs.join('\n');
}

export async function GET() {
  const urls: string[] = [];

  // Generate main pages for all locales with hreflang
  const mainPages = ['', '/guides', '/glossary', '/partners', '/map'];
  
  for (const pagePath of mainPages) {
    for (const locale of locales) {
      const fullPath = `/${locale}${pagePath}`;
      const hreflangs = generateHreflangTags(fullPath);
      const lastmod = new Date().toISOString();
      const priority = pagePath === '' ? '1.0' : pagePath === '/partners' ? '0.8' : '0.9';
      const changefreq = pagePath === '/partners' ? 'monthly' : 'weekly';
      
      urls.push(`  <url>
    <loc>${baseUrl}${fullPath}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${hreflangs}
  </url>`);
    }
  }

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
