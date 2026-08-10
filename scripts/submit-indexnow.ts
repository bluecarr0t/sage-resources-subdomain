#!/usr/bin/env tsx
/**
 * Submits URLs to IndexNow (Bing, Yandex) for faster indexing.
 *
 * Full sitemap (default):
 *   INDEXNOW_KEY=xxx SITE_URL=https://resources.sageoutdooradvisory.com npm run indexnow:submit
 *
 * New hubs only (markets + journeys):
 *   INDEXNOW_KEY=xxx npm run indexnow:submit:hubs
 *   INDEXNOW_KEY=xxx npx tsx scripts/submit-indexnow.ts --hubs=markets,journeys
 *
 * Options:
 *   --hubs=markets,journeys|all   Submit hub URLs from source of truth (not sitemap scrape)
 *   --dry-run                     Print URL count / sample; do not POST
 *   --require-live                HEAD each URL; abort if any non-2xx (skip in dry-run listing)
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import {
  buildIndexNowHubUrls,
  parseIndexNowHubs,
  type IndexNowHub,
} from '../lib/indexnow-hub-urls';

const INDEXNOW_KEY = process.env.INDEXNOW_KEY;
const SITE_URL = (process.env.SITE_URL || 'https://resources.sageoutdooradvisory.com').replace(
  /\/$/,
  ''
);
const BING_ENDPOINT = 'https://api.bing.com/indexnow';
const YANDEX_ENDPOINT = 'https://yandex.com/indexnow';

type CliOptions = {
  hubs: IndexNowHub[] | null;
  dryRun: boolean;
  requireLive: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  let hubs: IndexNowHub[] | null = null;
  let dryRun = false;
  let requireLive = false;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--require-live') {
      requireLive = true;
      continue;
    }
    if (arg.startsWith('--hubs=')) {
      hubs = parseIndexNowHubs(arg.slice('--hubs='.length));
      continue;
    }
    if (arg === '--hubs') {
      hubs = parseIndexNowHubs('all');
      continue;
    }
  }

  return { hubs, dryRun, requireLive };
}

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

async function assertUrlsLive(urls: string[]): Promise<void> {
  const failures: Array<{ url: string; status: number }> = [];
  // Small concurrency to avoid tripping public map / WAF rate limits
  const batchSize = 4;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (url) => {
        try {
          const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
          return { url, status: res.status };
        } catch {
          return { url, status: 0 };
        }
      })
    );
    for (const r of results) {
      if (r.status < 200 || r.status >= 300) {
        failures.push(r);
      }
    }
  }

  if (failures.length > 0) {
    const sample = failures
      .slice(0, 8)
      .map((f) => `  ${f.status} ${f.url}`)
      .join('\n');
    throw new Error(
      `${failures.length}/${urls.length} hub URLs are not live (need deploy first).\n${sample}`
    );
  }
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
  const opts = parseArgs(process.argv.slice(2));

  if (!INDEXNOW_KEY && !opts.dryRun) {
    console.log('INDEXNOW_KEY not set. Set it and run again after deploy.');
    process.exit(0);
  }

  let urls: string[];
  if (opts.hubs) {
    console.log(`Building hub URLs (${opts.hubs.join(', ')}) from source of truth...`);
    urls = buildIndexNowHubUrls(opts.hubs, SITE_URL);
  } else {
    console.log('Fetching sitemap URLs...');
    urls = await fetchSitemapUrls();
  }

  console.log(`Found ${urls.length} URLs`);
  if (urls.length > 0) {
    console.log('Sample:');
    for (const u of urls.slice(0, 5)) console.log(`  ${u}`);
    if (urls.length > 5) console.log(`  … +${urls.length - 5} more`);
  }

  if (urls.length === 0) {
    console.warn('No URLs found.');
    process.exit(1);
  }

  if (opts.requireLive) {
    console.log('Checking URLs are live (HEAD)...');
    await assertUrlsLive(urls);
    console.log('All URLs returned 2xx.');
  }

  if (opts.dryRun) {
    console.log('Dry run — skipping IndexNow POST.');
    return;
  }

  const [bingOk, yandexOk] = await Promise.all([
    submitToIndexNow(urls, BING_ENDPOINT),
    submitToIndexNow(urls, YANDEX_ENDPOINT),
  ]);

  if (!bingOk && !yandexOk) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
