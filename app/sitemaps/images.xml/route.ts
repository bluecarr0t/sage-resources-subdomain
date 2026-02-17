import { NextResponse } from 'next/server';
import { getAllGuideSlugs, getGuideSync } from '@/lib/guides';
import { getAllGlossaryTerms } from '@/lib/glossary/index';
import { locales } from '@/i18n';

const baseUrl = "https://resources.sageoutdooradvisory.com";
const blobBase = "https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Key images used across the site (limit to ~50 for sitemap size)
const KEY_IMAGES = [
  { url: `${blobBase}/mountain-view.jpg`, caption: "Glamping properties map and guides" },
  { url: `${blobBase}/tipi.jpg`, caption: "Tipi glamping accommodation" },
  { url: `${blobBase}/safari-tent.jpg`, caption: "Safari tent glamping" },
  { url: `${blobBase}/yurt.jpg`, caption: "Yurt glamping accommodation" },
  { url: `${blobBase}/geodesic-dome.jpg`, caption: "Geodesic dome glamping" },
  { url: `${blobBase}/a-frame-cabin.jpg`, caption: "A-frame cabin glamping" },
  { url: `${blobBase}/treehouse.jpg`, caption: "Treehouse glamping" },
  { url: `${blobBase}/bell-tent.jpg`, caption: "Bell tent glamping" },
  { url: `${blobBase}/canvas-tent.jpg`, caption: "Canvas tent glamping" },
  { url: `${blobBase}/cabin.jpg`, caption: "Cabin glamping" },
  { url: `${blobBase}/forest-scene.jpg`, caption: "Forest glamping setting" },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const urls: string[] = [];

  // Homepage images (all locales)
  for (const locale of locales) {
    const pageUrl = `/${locale}`;
    const imageElements = KEY_IMAGES.slice(0, 6).map(
      (img) => `    <image:image>
      <image:loc>${escapeXml(img.url)}</image:loc>
      <image:caption>${escapeXml(img.caption)}</image:caption>
    </image:image>`
    ).join('\n');
    urls.push(`  <url>
    <loc>${baseUrl}${pageUrl}</loc>
${imageElements}
  </url>`);
  }

  // Map page images (all locales)
  for (const locale of locales) {
    const pageUrl = `/${locale}/map`;
    urls.push(`  <url>
    <loc>${baseUrl}${pageUrl}</loc>
    <image:image>
      <image:loc>${escapeXml(KEY_IMAGES[0].url)}</image:loc>
      <image:caption>${escapeXml(KEY_IMAGES[0].caption)}</image:caption>
    </image:image>
  </url>`);
  }

  // Guides page images (all locales)
  for (const locale of locales) {
    const pageUrl = `/${locale}/guides`;
    const imageElements = KEY_IMAGES.slice(0, 4).map(
      (img) => `    <image:image>
      <image:loc>${escapeXml(img.url)}</image:loc>
      <image:caption>${escapeXml(img.caption)}</image:caption>
    </image:image>`
    ).join('\n');
    urls.push(`  <url>
    <loc>${baseUrl}${pageUrl}</loc>
${imageElements}
  </url>`);
  }

  // Individual guide pages with images (limit to first 15 guides)
  const guideSlugs = getAllGuideSlugs().slice(0, 15);
  for (const locale of locales) {
    for (const slug of guideSlugs) {
      const guide = getGuideSync(slug);
      if (!guide) continue;
      const pageUrl = `/${locale}/guides/${slug}`;
      const images: string[] = [];
      if (guide.hero?.backgroundImage) {
        images.push(guide.hero.backgroundImage);
      }
      images.push(KEY_IMAGES[0].url); // Fallback
      const imageElements = [...new Set(images)].slice(0, 3).map(
        (imgUrl) => `    <image:image>
      <image:loc>${escapeXml(imgUrl)}</image:loc>
      <image:caption>${escapeXml(guide.title)}</image:caption>
    </image:image>`
      ).join('\n');
      urls.push(`  <url>
    <loc>${baseUrl}${pageUrl}</loc>
${imageElements}
  </url>`);
    }
  }

  // Glossary terms with images (limit to first 20)
  const glossaryTerms = getAllGlossaryTerms().filter((t) => t.image).slice(0, 20);
  for (const locale of locales) {
    for (const term of glossaryTerms) {
      const imageUrl = term.image!.startsWith('http') ? term.image! : `${baseUrl}${term.image}`;
      const pageUrl = `/${locale}/glossary/${term.slug}`;
      urls.push(`  <url>
    <loc>${baseUrl}${pageUrl}</loc>
    <image:image>
      <image:loc>${escapeXml(imageUrl)}</image:loc>
      <image:caption>${escapeXml(term.term)}</image:caption>
    </image:image>
  </url>`);
    }
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  });
}
