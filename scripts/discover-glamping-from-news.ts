#!/usr/bin/env npx tsx
/**
 * Glamping discovery pipeline: RSS feeds, article URLs, or local text
 *
 * Fetches articles, extracts glamping properties via OpenAI, deduplicates against
 * all_glamping_properties, enriches, and inserts with discovery_source tracking.
 *
 * Usage:
 *   npx tsx scripts/discover-glamping-from-news.ts --rss
 *   npx tsx scripts/discover-glamping-from-news.ts --url https://example.com/article
 *   npx tsx scripts/discover-glamping-from-news.ts --text path/to/article.txt
 *   npx tsx scripts/discover-glamping-from-news.ts --rss --dry-run
 *   npx tsx scripts/discover-glamping-from-news.ts --rss --limit 3
 *   npx tsx scripts/discover-glamping-from-news.ts --tavily
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import Parser from 'rss-parser';
import {
  GLAMPING_RSS_FEEDS,
  fetchArticleContent,
  extractPropertiesFromArticle,
  getDatabasePropertyNames,
  normalizePropertyName,
  filterNewProperties,
  enrichProperty,
  toInsertRow,
  insertProperties,
  searchGlampingNews,
} from '../lib/glamping-discovery';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!openaiApiKey) {
  console.error('Missing OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const openai = new OpenAI({ apiKey: openaiApiKey });

const PROCESSED_URLS_TABLE = 'glamping_discovery_processed_urls';

async function getProcessedUrls(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from(PROCESSED_URLS_TABLE)
    .select('url');

  if (error) {
    console.warn('Could not fetch processed URLs:', error.message);
    return new Set();
  }

  return new Set((data || []).map((r: { url: string }) => r.url));
}

async function markUrlProcessed(url: string, propertiesExtracted: number): Promise<void> {
  await supabase.from(PROCESSED_URLS_TABLE).upsert(
    { url, processed_at: new Date().toISOString(), properties_extracted: propertiesExtracted },
    { onConflict: 'url' }
  );
}

async function getRssArticleUrls(limit?: number): Promise<{ url: string; discoverySource: string }[]> {
  const parser = new Parser();
  const results: { url: string; discoverySource: string }[] = [];

  for (const feed of GLAMPING_RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const item of parsed.items || []) {
        const link = item.link;
        if (link && link.startsWith('http')) {
          results.push({ url: link, discoverySource: feed.discoverySource });
        }
      }
    } catch (err) {
      console.warn(`Failed to parse feed ${feed.name}:`, err instanceof Error ? err.message : err);
    }
  }

  const unique = Array.from(
    new Map(results.map((r) => [r.url, r])).values()
  );

  return limit ? unique.slice(0, limit) : unique;
}

function parseArgs(): {
  mode: 'rss' | 'url' | 'text' | 'tavily';
  url?: string;
  textPath?: string;
  dryRun: boolean;
  limit?: number;
} {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIdx = args.indexOf('--limit');
  const limit =
    limitIdx >= 0
      ? parseInt(String(args[limitIdx + 1] || '').replace('--limit=', '') || '0', 10)
      : undefined;

  if (args.includes('--tavily')) {
    return { mode: 'tavily', dryRun, limit };
  }

  if (args.includes('--url')) {
    const urlIdx = args.indexOf('--url');
    const url = args[urlIdx + 1];
    if (!url) {
      console.error('--url requires a URL argument');
      process.exit(1);
    }
    return { mode: 'url', url, dryRun, limit };
  }

  if (args.includes('--text')) {
    const textIdx = args.indexOf('--text');
    const textPath = args[textIdx + 1];
    if (!textPath) {
      console.error('--text requires a file path argument');
      process.exit(1);
    }
    return { mode: 'text', textPath, dryRun, limit };
  }

  return { mode: 'rss', dryRun, limit };
}

async function main(): Promise<void> {
  const { mode, url, textPath, dryRun, limit } = parseArgs();

  console.log('='.repeat(60));
  console.log('Glamping Discovery Pipeline');
  console.log('='.repeat(60));
  console.log(`Mode: ${mode} | Dry run: ${dryRun} | Limit: ${limit ?? 'none'}\n`);

  let articleTasks: { content: string; url?: string; discoverySource: string }[] = [];

  if (mode === 'rss') {
    const urls = await getRssArticleUrls(limit);
    const processed = await getProcessedUrls();
    const toProcess = urls.filter((u) => !processed.has(u.url));

    console.log(`RSS: ${urls.length} articles, ${toProcess.length} new (${processed.size} already processed)\n`);

    for (const { url: articleUrl, discoverySource } of toProcess) {
      try {
        const content = await fetchArticleContent(articleUrl);
        articleTasks.push({ content, url: articleUrl, discoverySource });
      } catch (err) {
        console.warn(`Failed to fetch ${articleUrl}:`, err instanceof Error ? err.message : err);
      }
    }
  } else if (mode === 'tavily') {
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (!tavilyKey) {
      console.error('--tavily requires TAVILY_API_KEY in .env.local');
      process.exit(1);
    }
    const tavilyResults = await searchGlampingNews(tavilyKey, limit ?? 5);
    const processed = await getProcessedUrls();
    const toProcess = tavilyResults.filter((r) => !processed.has(r.url));

    console.log(`Tavily: ${tavilyResults.length} articles, ${toProcess.length} new (${processed.size} already processed)\n`);

    for (const { url: articleUrl } of toProcess) {
      try {
        const content = await fetchArticleContent(articleUrl);
        articleTasks.push({ content, url: articleUrl, discoverySource: 'Tavily Search' });
      } catch (err) {
        console.warn(`Failed to fetch ${articleUrl}:`, err instanceof Error ? err.message : err);
      }
    }
  } else if (mode === 'url' && url) {
    const content = await fetchArticleContent(url);
    articleTasks.push({ content, url, discoverySource: 'Manual Article' });
  } else if (mode === 'text' && textPath) {
    if (!fs.existsSync(textPath)) {
      console.error(`File not found: ${textPath}`);
      process.exit(1);
    }
    const content = fs.readFileSync(textPath, 'utf-8');
    articleTasks.push({ content, discoverySource: 'Local Text File' });
  }

  if (articleTasks.length === 0) {
    console.log('No articles to process.');
    return;
  }

  const dbProperties = await getDatabasePropertyNames(supabase);
  console.log(`Loaded ${dbProperties.size} existing property names for dedup.\n`);

  let totalInserted = 0;

  for (const { content, url: articleUrl, discoverySource } of articleTasks) {
    console.log(`\n--- Processing ${articleUrl || 'local file'} ---`);

    const extracted = await extractPropertiesFromArticle(content, openai);
    console.log(`Extracted ${extracted.length} properties`);

    const newProps = filterNewProperties(extracted, dbProperties);
    console.log(`${newProps.length} new after dedup`);

    if (newProps.length === 0) {
      if (articleUrl) await markUrlProcessed(articleUrl, extracted.length);
      continue;
    }

    const rows = [];
    for (let i = 0; i < newProps.length; i++) {
      console.log(`  Enriching [${i + 1}/${newProps.length}]: ${newProps[i].property_name}`);
      const enriched = await enrichProperty(newProps[i], openai);
      rows.push(toInsertRow(enriched, discoverySource));
      dbProperties.add(normalizePropertyName(enriched.property_name || ''));
    }

    if (dryRun) {
      console.log('\n[DRY RUN] Would insert:');
      rows.forEach((r, i) => console.log(`  ${i + 1}. ${r.property_name} (${r.city}, ${r.state})`));
    } else {
      const inserted = await insertProperties(rows, supabase);
      totalInserted += inserted;
      console.log(`Inserted ${inserted} properties`);
      if (articleUrl) await markUrlProcessed(articleUrl, extracted.length);
    }
  }

  console.log(`\nDone. Total inserted: ${totalInserted}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
