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
 *   npx tsx scripts/discover-glamping-from-news.ts --firecrawl-primary  (try Firecrawl before Cheerio)
 *   npx tsx scripts/discover-glamping-from-news.ts --batch-size 5       (process max 5 articles; useful for cron)
 *
 * First run: npx tsx scripts/apply-discovery-processed-urls-migration.ts
 * (or run scripts/migrations/create-glamping-discovery-processed-urls.sql in Supabase SQL Editor)
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
  passesInclusionCriteria,
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
const RUNS_TABLE = 'glamping_discovery_runs';
const CANDIDATES_TABLE = 'glamping_discovery_candidates';

async function routeFailuresToCandidates(
  sb: ReturnType<typeof createClient>,
  failedProps: { p: { property_name?: string; city?: string; state?: string; country?: string; url?: string; description?: string; unit_type?: string; property_type?: string; number_of_units?: number }; reason: string }[],
  articleUrl: string | undefined,
  discoverySource: string
): Promise<void> {
  if (failedProps.length === 0) return;
  try {
    const rows = failedProps.map(({ p, reason }) => ({
      property_name: p.property_name || 'Unknown',
      city: p.city ?? null,
      state: p.state ?? null,
      country: p.country ?? null,
      url: p.url ?? null,
      description: p.description ?? null,
      unit_type: p.unit_type ?? null,
      property_type: p.property_type ?? null,
      number_of_units: p.number_of_units ?? null,
      article_url: articleUrl ?? null,
      discovery_source: discoverySource,
      status: 'pending',
      rejection_reason: reason,
      confidence: 'low',
    }));
    const { error } = await sb.from(CANDIDATES_TABLE).insert(rows);
    if (error) throw error;
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code !== '42P01') {
      console.warn('Could not route failures to candidates:', err instanceof Error ? err.message : err);
    }
  }
}

async function persistRunMetrics(
  sb: ReturnType<typeof createClient>,
  m: DiscoveryMetrics,
  error: string | null
): Promise<void> {
  try {
    await sb.from(RUNS_TABLE).insert({
      mode: m.mode,
      dry_run: m.dryRun,
      started_at: m.startedAt,
      completed_at: m.completedAt,
      articles_found: m.articlesFound,
      articles_fetched: m.articlesFetched,
      articles_failed: m.articlesFailed,
      properties_extracted: m.propertiesExtracted,
      properties_new: m.propertiesNew,
      properties_inserted: m.propertiesInserted,
      processed_urls_count: m.processedUrlsCount,
      error,
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code !== '42P01') {
      console.warn('Could not persist run metrics:', err instanceof Error ? err.message : err);
    }
  }
}

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
  firecrawlPrimary: boolean;
} {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const firecrawlPrimary = args.includes('--firecrawl-primary');
  const limitIdx = args.indexOf('--limit');
  const batchIdx = args.indexOf('--batch-size');
  let limit =
    limitIdx >= 0
      ? parseInt(String(args[limitIdx + 1] || '').replace('--limit=', '') || '0', 10)
      : undefined;
  if (batchIdx >= 0) {
    const batchSize = parseInt(String(args[batchIdx + 1] || '').replace('--batch-size=', '') || '0', 10);
    if (batchSize > 0) limit = limit ?? batchSize;
  }

  if (args.includes('--tavily')) {
    return { mode: 'tavily', dryRun, limit, firecrawlPrimary };
  }

  if (args.includes('--url')) {
    const urlIdx = args.indexOf('--url');
    const url = args[urlIdx + 1];
    if (!url) {
      console.error('--url requires a URL argument');
      process.exit(1);
    }
    return { mode: 'url', url, dryRun, limit, firecrawlPrimary };
  }

  if (args.includes('--text')) {
    const textIdx = args.indexOf('--text');
    const textPath = args[textIdx + 1];
    if (!textPath) {
      console.error('--text requires a file path argument');
      process.exit(1);
    }
    return { mode: 'text', textPath, dryRun, limit, firecrawlPrimary };
  }

  return { mode: 'rss', dryRun, limit, firecrawlPrimary };
}

interface DiscoveryMetrics {
  mode: string;
  dryRun: boolean;
  articlesFound: number;
  articlesFetched: number;
  articlesFailed: number;
  propertiesExtracted: number;
  propertiesNew: number;
  propertiesInserted: number;
  processedUrlsCount: number;
  startedAt: string;
  completedAt: string;
}

async function main(): Promise<void> {
  const { mode, url, textPath, dryRun, limit, firecrawlPrimary } = parseArgs();
  const fetchOptions = firecrawlPrimary ? { firecrawlPrimary: true } : {};

  const metrics: DiscoveryMetrics = {
    mode,
    dryRun,
    articlesFound: 0,
    articlesFetched: 0,
    articlesFailed: 0,
    propertiesExtracted: 0,
    propertiesNew: 0,
    propertiesInserted: 0,
    processedUrlsCount: 0,
    startedAt: new Date().toISOString(),
    completedAt: '',
  };

  console.log('='.repeat(60));
  console.log('Glamping Discovery Pipeline');
  console.log('='.repeat(60));
  console.log(`Mode: ${mode} | Dry run: ${dryRun} | Limit: ${limit ?? 'none'} | Firecrawl primary: ${firecrawlPrimary}\n`);

  let articleTasks: { content: string; url?: string; discoverySource: string }[] = [];

  if (mode === 'rss') {
    const urls = await getRssArticleUrls(limit);
    metrics.articlesFound = urls.length;
    const processed = await getProcessedUrls();
    metrics.processedUrlsCount = processed.size;
    const toProcess = urls.filter((u) => !processed.has(u.url));

    console.log(`RSS: ${urls.length} articles, ${toProcess.length} new (${processed.size} already processed)\n`);

    for (const { url: articleUrl, discoverySource } of toProcess) {
      try {
        const content = await fetchArticleContent(articleUrl, fetchOptions);
        articleTasks.push({ content, url: articleUrl, discoverySource });
        metrics.articlesFetched++;
      } catch (err) {
        metrics.articlesFailed++;
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
    metrics.articlesFound = tavilyResults.length;
    const processed = await getProcessedUrls();
    metrics.processedUrlsCount = processed.size;
    const toProcess = tavilyResults.filter((r) => !processed.has(r.url));

    console.log(`Tavily: ${tavilyResults.length} articles, ${toProcess.length} new (${processed.size} already processed)\n`);

    for (const { url: articleUrl } of toProcess) {
      try {
        const content = await fetchArticleContent(articleUrl, fetchOptions);
        articleTasks.push({ content, url: articleUrl, discoverySource: 'Tavily Search' });
        metrics.articlesFetched++;
      } catch (err) {
        metrics.articlesFailed++;
        console.warn(`Failed to fetch ${articleUrl}:`, err instanceof Error ? err.message : err);
      }
    }
  } else if (mode === 'url' && url) {
    metrics.articlesFound = 1;
    try {
      const content = await fetchArticleContent(url, fetchOptions);
      articleTasks.push({ content, url, discoverySource: 'Manual Article' });
      metrics.articlesFetched++;
    } catch (err) {
      metrics.articlesFailed++;
      throw err;
    }
  } else if (mode === 'text' && textPath) {
    if (!fs.existsSync(textPath)) {
      console.error(`File not found: ${textPath}`);
      process.exit(1);
    }
    const content = fs.readFileSync(textPath, 'utf-8');
    articleTasks.push({ content, discoverySource: 'Local Text File' });
    metrics.articlesFound = 1;
    metrics.articlesFetched = 1;
  }

  if (articleTasks.length === 0) {
    metrics.completedAt = new Date().toISOString();
    await persistRunMetrics(supabase, metrics, null);
    console.log('No articles to process.');
    if (process.env.DISCOVERY_METRICS_JSON === '1') {
      console.log(JSON.stringify(metrics, null, 2));
    }
    return;
  }

  const dbProperties = await getDatabasePropertyNames(supabase);
  console.log(`Loaded ${dbProperties.size} existing property names for dedup.\n`);

  let totalInserted = 0;

  for (const { content, url: articleUrl, discoverySource } of articleTasks) {
    console.log(`\n--- Processing ${articleUrl || 'local file'} ---`);

    const extracted = await extractPropertiesFromArticle(content, openai);
    metrics.propertiesExtracted += extracted.length;
    console.log(`Extracted ${extracted.length} properties`);

    const newProps = filterNewProperties(extracted, dbProperties);
    metrics.propertiesNew += newProps.length;
    console.log(`${newProps.length} new after dedup`);

    const passingProps: typeof newProps = [];
    const failedProps: { p: (typeof newProps)[0]; reason: string }[] = [];
    for (const p of newProps) {
      const { pass, reason } = passesInclusionCriteria(p);
      if (!pass) {
        console.log(`  Excluded: ${p.property_name} (${reason ?? 'unknown'})`);
        failedProps.push({ p, reason: reason ?? 'unknown' });
      } else {
        passingProps.push(p);
      }
    }
    if (failedProps.length > 0) {
      console.log(`${failedProps.length} excluded by inclusion criteria, ${passingProps.length} proceeding`);
      await routeFailuresToCandidates(supabase, failedProps, articleUrl, discoverySource);
    }

    if (passingProps.length === 0) {
      if (articleUrl) await markUrlProcessed(articleUrl, extracted.length);
      continue;
    }

    const rows = [];
    for (let i = 0; i < passingProps.length; i++) {
      console.log(`  Enriching [${i + 1}/${passingProps.length}]: ${passingProps[i].property_name}`);
      const enriched = await enrichProperty(passingProps[i], openai);
      rows.push(toInsertRow(enriched, discoverySource));
      dbProperties.add(normalizePropertyName(enriched.property_name || ''));
    }

    if (dryRun) {
      console.log('\n[DRY RUN] Would insert:');
      rows.forEach((r, i) => console.log(`  ${i + 1}. ${r.property_name} (${r.city}, ${r.state})`));
    } else {
      const inserted = await insertProperties(rows, supabase);
      totalInserted += inserted;
      metrics.propertiesInserted += inserted;
      console.log(`Inserted ${inserted} properties`);
      if (articleUrl) await markUrlProcessed(articleUrl, extracted.length);
    }
  }

  metrics.completedAt = new Date().toISOString();
  await persistRunMetrics(supabase, metrics, null);

  console.log('\n' + '='.repeat(60));
  console.log('Discovery run complete');
  console.log('='.repeat(60));
  console.log(`  Articles found:   ${metrics.articlesFound}`);
  console.log(`  Articles fetched:  ${metrics.articlesFetched}`);
  console.log(`  Articles failed:  ${metrics.articlesFailed}`);
  console.log(`  Properties extracted: ${metrics.propertiesExtracted}`);
  console.log(`  Properties new (after dedup): ${metrics.propertiesNew}`);
  console.log(`  Properties inserted: ${metrics.propertiesInserted}`);
  console.log(`  Total inserted:  ${totalInserted}`);
  if (process.env.DISCOVERY_METRICS_JSON === '1') {
    console.log('\n' + JSON.stringify(metrics, null, 2));
  }
}

main().catch(async (err) => {
  console.error(err);
  const metrics: DiscoveryMetrics = {
    mode: 'unknown',
    dryRun: false,
    articlesFound: 0,
    articlesFetched: 0,
    articlesFailed: 0,
    propertiesExtracted: 0,
    propertiesNew: 0,
    propertiesInserted: 0,
    processedUrlsCount: 0,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
  await persistRunMetrics(supabase, metrics, err instanceof Error ? err.message : String(err));
  process.exit(1);
});
