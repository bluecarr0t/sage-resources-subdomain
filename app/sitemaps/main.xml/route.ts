import { NextResponse } from 'next/server';
import { locales } from '@/i18n';
import { getTopStates, getTopCities, slugifyLocation, createCitySlug } from '@/lib/location-helpers';
import { getNationalParksWithCoordinates } from '@/lib/national-parks';
import { getAllUnitTypeSlugs } from '@/lib/unit-type-config';

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
  const mainPages = ['', '/guides', '/glossary', '/partners', '/map', '/sitemap'];
  
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

  // Add state pages (priority 0.8)
  try {
    const topStates = await getTopStates(50);
    const lastmod = new Date().toISOString();
    
    for (const stateData of topStates) {
      const stateSlug = slugifyLocation(stateData.state);
      for (const locale of locales) {
        const fullPath = `/${locale}/map/${stateSlug}`;
        const hreflangs = generateHreflangTags(fullPath);
        
        urls.push(`  <url>
    <loc>${baseUrl}${fullPath}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
${hreflangs}
  </url>`);
      }
    }
  } catch (error) {
    console.error('Error generating state pages for sitemap:', error);
  }

  // Add city pages (priority 0.7)
  try {
    const topCities = await getTopCities(100);
    const lastmod = new Date().toISOString();
    
    for (const cityData of topCities) {
      const citySlug = createCitySlug(cityData.city, cityData.state);
      for (const locale of locales) {
        const fullPath = `/${locale}/map/${citySlug}`;
        const hreflangs = generateHreflangTags(fullPath);
        
        urls.push(`  <url>
    <loc>${baseUrl}${fullPath}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
${hreflangs}
  </url>`);
      }
    }
  } catch (error) {
    console.error('Error generating city pages for sitemap:', error);
  }

  // Add glamping near national parks index (priority 0.8)
  for (const locale of locales) {
    const fullPath = `/${locale}/glamping/near-national-parks`;
    const hreflangs = generateHreflangTags(fullPath);
    urls.push(`  <url>
    <loc>${baseUrl}${fullPath}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
${hreflangs}
  </url>`);
  }

  // Add glamping near national parks individual pages (priority 0.7)
  try {
    const parks = await getNationalParksWithCoordinates();
    const lastmod = new Date().toISOString();

    for (const park of parks) {
      if (!park.slug) continue;
      for (const locale of locales) {
        const fullPath = `/${locale}/glamping/near-national-parks/${park.slug}`;
        const hreflangs = generateHreflangTags(fullPath);

        urls.push(`  <url>
    <loc>${baseUrl}${fullPath}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
${hreflangs}
  </url>`);
      }
    }
  } catch (error) {
    console.error('Error generating glamping near national parks pages for sitemap:', error);
  }

  // Add glamping by unit type pages (priority 0.8)
  try {
    const unitTypeSlugs = getAllUnitTypeSlugs();
    const lastmod = new Date().toISOString();

    for (const slug of unitTypeSlugs) {
      for (const locale of locales) {
        const fullPath = `/${locale}/glamping/${slug}`;
        const hreflangs = generateHreflangTags(fullPath);

        urls.push(`  <url>
    <loc>${baseUrl}${fullPath}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
${hreflangs}
  </url>`);
      }
    }
  } catch (error) {
    console.error('Error generating glamping unit type pages for sitemap:', error);
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
