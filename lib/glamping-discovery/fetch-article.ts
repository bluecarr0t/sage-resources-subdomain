/**
 * Fetch article content from URL and extract main text
 * Uses cheerio for HTML parsing. Truncates to ~50k chars for OpenAI context.
 */

import * as cheerio from 'cheerio';

const MAX_CONTENT_LENGTH = 50000;

/**
 * Extract main text content from HTML
 */
function extractTextFromHtml(html: string): string {
  const $ = cheerio.load(html);

  // Remove script, style, nav, footer, ads
  $('script, style, nav, footer, aside, [role="navigation"], .ad, .ads').remove();

  // Prefer article, main, or content areas
  const contentSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.article-body',
    '.post-content',
    '.entry-content',
    '.content',
    '.story-body',
    'body',
  ];

  let text = '';
  for (const sel of contentSelectors) {
    const el = $(sel).first();
    if (el.length) {
      text = el.text();
      if (text.trim().length > 500) break;
    }
  }

  if (!text || text.trim().length < 200) {
    text = $('body').text();
  }

  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Try to extract canonical/source URL from HTML (e.g. Google News pages)
 */
function extractCanonicalUrl(html: string, baseUrl: string): string | null {
  const $ = cheerio.load(html);
  const canonical = $('link[rel="canonical"]').attr('href');
  if (canonical && canonical.startsWith('http')) return canonical;
  // Some pages link to original source
  const ogUrl = $('meta[property="og:url"]').attr('content');
  if (ogUrl && ogUrl.startsWith('http')) return ogUrl;
  return null;
}

/**
 * Fetch article content from URL
 * Returns extracted text, truncated to MAX_CONTENT_LENGTH
 * For Google News redirect URLs, tries canonical URL if initial fetch yields little content
 */
export async function fetchArticleContent(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; GlampingDiscovery/1.0; +https://sageoutdooradvisory.com)',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  let text = extractTextFromHtml(html);

  // If insufficient content and we're on a news aggregator, try canonical URL
  if ((!text || text.length < 100) && (url.includes('news.google.com') || url.includes('google.com'))) {
    const canonical = extractCanonicalUrl(html, url);
    if (canonical && canonical !== url) {
      const canonRes = await fetch(canonical, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; GlampingDiscovery/1.0; +https://sageoutdooradvisory.com)',
        },
      });
      if (canonRes.ok) {
        const canonHtml = await canonRes.text();
        text = extractTextFromHtml(canonHtml);
      }
    }
  }

  if (!text || text.length < 100) {
    throw new Error(`Insufficient content extracted from ${url}`);
  }

  return text.substring(0, MAX_CONTENT_LENGTH);
}
