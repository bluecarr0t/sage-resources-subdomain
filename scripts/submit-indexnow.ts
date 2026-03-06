#!/usr/bin/env tsx
/**
 * Submits sitemap URLs to IndexNow (Bing, Yandex) for faster indexing.
 * Run after deploy: INDEXNOW_KEY=xxx SITE_URL=https://resources.sageoutdooradvisory.com npx tsx scripts/submit-indexnow.ts
 */
const INDEXNOW_KEY = process.env.INDEXNOW_KEY;
const SITE_URL = process.env.SITE_URL || 'https://resources.sageoutdooradvisory.com';
const BING_ENDPOINT = 'https://api.bing.com/indexnow';
const YANDEX_ENDPOINT = 'https://yandex.com/indexnow';

async function fetchSitemapUrls(): Promise<string[]> {
  const indexUrl = `${SITE_URL}/sitemap.xml`;
  const res = await fetch(indexUrl);
  if (!res.ok) throw new Error(`Failed to fetch sitemap index: ${res.status}`);

  const text = await res.text();
  const sitemapLocs = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

  const urls: string[] = [];
  for (const loc of sitemapLocs) {
    if (loc.endsWith('.xml')) {
      const subRes = await fetch(loc);
      if (!subRes.ok) continue;
      const subText = await subRes.text();
      const pageUrls = [...subText.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
      urls.push(...pageUrls);
    }
  }

  return [...new Set(urls)];
}

async function submitToIndexNow(urls: string[], endpoint: string): Promise<boolean> {
  const host = new URL(SITE_URL).hostname;
  const body = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls.slice(0, 10000),
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(`IndexNow ${endpoint}: ${res.status} ${await res.text()}`);
    return false;
  }
  console.log(`IndexNow ${endpoint}: Submitted ${urls.length} URLs`);
  return true;
}

async function main() {
  if (!INDEXNOW_KEY) {
    console.log('INDEXNOW_KEY not set. Set it and run again after deploy.');
    process.exit(0);
  }

  console.log('Fetching sitemap URLs...');
  const urls = await fetchSitemapUrls();
  console.log(`Found ${urls.length} URLs`);

  if (urls.length === 0) {
    console.warn('No URLs found. Ensure site is deployed and sitemap is accessible.');
    process.exit(1);
  }

  await submitToIndexNow(urls, BING_ENDPOINT);
  await submitToIndexNow(urls, YANDEX_ENDPOINT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
