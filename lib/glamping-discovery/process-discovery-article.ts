/**
 * Process one article through extract → dedupe → inclusion → enrich → insert.
 * Used by discover-glamping-from-news.ts and integration tests.
 */

import type { OpenAI } from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { extractPropertiesFromArticle } from './extract-properties';
import type { ExtractedProperty } from './extract-properties';
import { filterNewProperties, normalizePropertyName } from './deduplicate';
import { passesInclusionCriteria, passesPostEnrichmentUnitCriteria } from './inclusion-filter';
import { enrichProperty, toInsertRow, insertProperties, type InsertRow } from './enrich-and-insert';
import { routeDiscoveryFailuresToCandidates } from './route-discovery-failures-to-candidates';

const PROCESSED_URLS_TABLE = 'glamping_discovery_processed_urls';

export interface ProcessDiscoveryArticleParams {
  content: string;
  articleUrl?: string;
  discoverySource: string;
  dryRun: boolean;
  openai: OpenAI;
  supabase: SupabaseClient;
  /** Mutable set of normalized names; updated when rows are queued for insert */
  dbPropertyNames: Set<string>;
  /** When set (e.g. Canada pipeline), used if extraction omits `country` */
  insertDefaults?: { defaultCountry?: string };
}

export interface ProcessDiscoveryArticleResult {
  propertiesExtracted: number;
  propertiesNew: number;
  propertiesInserted: number;
  /** Rows built after enrichment (for dry-run logging or verification) */
  queuedInsertRows: InsertRow[];
}

async function markUrlProcessed(
  sb: SupabaseClient,
  url: string,
  propertiesExtracted: number
): Promise<void> {
  await sb.from(PROCESSED_URLS_TABLE).upsert(
    { url, processed_at: new Date().toISOString(), properties_extracted: propertiesExtracted },
    { onConflict: 'url' }
  );
}

/**
 * Run the discovery pipeline for a single article body.
 */
export async function processDiscoveryArticle(
  params: ProcessDiscoveryArticleParams
): Promise<ProcessDiscoveryArticleResult> {
  const { content, articleUrl, discoverySource, dryRun, openai, supabase, dbPropertyNames, insertDefaults } =
    params;

  const extracted = await extractPropertiesFromArticle(content, openai);

  const newProps = filterNewProperties(extracted, dbPropertyNames);

  const passingProps: ExtractedProperty[] = [];
  const failedProps: { p: ExtractedProperty; reason: string }[] = [];
  for (const p of newProps) {
    const { pass, reason } = passesInclusionCriteria(p);
    if (!pass) {
      failedProps.push({ p, reason: reason ?? 'unknown' });
    } else {
      passingProps.push(p);
    }
  }
  if (failedProps.length > 0) {
    await routeDiscoveryFailuresToCandidates(supabase, failedProps, articleUrl, discoverySource);
  }

  if (passingProps.length === 0) {
    if (articleUrl) {
      await markUrlProcessed(supabase, articleUrl, extracted.length);
    }
    return {
      propertiesExtracted: extracted.length,
      propertiesNew: newProps.length,
      propertiesInserted: 0,
      queuedInsertRows: [],
    };
  }

  const rows = [];
  const postEnrichFailed: { p: ExtractedProperty; reason: string }[] = [];
  for (const prop of passingProps) {
    const enriched = await enrichProperty(prop, openai);
    const post = passesPostEnrichmentUnitCriteria(enriched);
    if (!post.pass) {
      postEnrichFailed.push({ p: enriched, reason: post.reason ?? 'post_enrich' });
      continue;
    }
    rows.push(toInsertRow(enriched, discoverySource, insertDefaults));
    dbPropertyNames.add(normalizePropertyName(enriched.property_name || ''));
  }

  if (postEnrichFailed.length > 0) {
    await routeDiscoveryFailuresToCandidates(supabase, postEnrichFailed, articleUrl, discoverySource);
  }

  let propertiesInserted = 0;
  if (dryRun) {
    // Match script: dry run does not mark URL processed when there were passing props
  } else {
    propertiesInserted = await insertProperties(rows, supabase);
    if (articleUrl) {
      await markUrlProcessed(supabase, articleUrl, extracted.length);
    }
  }

  return {
    propertiesExtracted: extracted.length,
    propertiesNew: newProps.length,
    propertiesInserted,
    queuedInsertRows: rows,
  };
}
