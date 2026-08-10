/**
 * Retrieve 2–4 redacted style exemplars from report_section_corpus for few-shot conditioning.
 */

import { createServerClient } from '@/lib/supabase';
import { OpenAI } from 'openai';
import type { EnrichedInput } from './types';
import type { StyleCorpusSection } from './style-corpus-types';
import { createStyleCorpusEmbeddingClient } from './style-corpus-ingest';

const EMBEDDING_DIM = 1536;
const TOP_K = 5;
const EXEMPLAR_COUNT = 4;
const EXEMPLAR_CHARS = 1200;

export interface StyleExemplarRow {
  id: string;
  report_id: string;
  study_id: string | null;
  section: string;
  market_type: string | null;
  redacted_text: string;
  similarity: number;
}

function normalizeMarketType(marketType?: string | null): string | null {
  if (!marketType) return null;
  const t = marketType.toLowerCase();
  if (t === 'rv' || t === 'rv_glamping') return 'rv';
  if (t === 'glamping') return 'glamping';
  return t;
}

async function embedQuery(openai: OpenAI, query: string): Promise<number[] | null> {
  const model = process.env.AI_GATEWAY_API_KEY?.trim()
    ? 'openai/text-embedding-3-small'
    : 'text-embedding-3-small';
  try {
    const res = await openai.embeddings.create({
      model,
      input: query.slice(0, 2000),
    });
    const embedding = res.data?.[0]?.embedding;
    if (!embedding || embedding.length !== EMBEDDING_DIM) return null;
    return embedding;
  } catch {
    try {
      const res = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query.slice(0, 2000),
      });
      const embedding = res.data?.[0]?.embedding;
      if (!embedding || embedding.length !== EMBEDDING_DIM) return null;
      return embedding;
    } catch {
      return null;
    }
  }
}

/**
 * Fetch redacted style exemplars for a section. Excludes holdout rows.
 * Returns empty string when ENABLE_RAG is off or corpus is empty.
 */
export async function retrieveStyleExemplars(
  enriched: EnrichedInput,
  section: StyleCorpusSection
): Promise<string> {
  if (process.env.ENABLE_RAG !== 'true') return '';
  if (process.env.ENABLE_STYLE_CORPUS === 'false') return '';

  const openai = createStyleCorpusEmbeddingClient();
  if (!openai) return '';

  const supabase = createServerClient();
  const market = normalizeMarketType(enriched.market_type);

  const queryParts = [
    section,
    enriched.property_name,
    enriched.city,
    enriched.state,
    market ?? '',
    enriched.unit_mix.map((u) => `${u.type} ${u.count}`).join(' '),
  ].filter(Boolean);

  const embedding = await embedQuery(openai, queryParts.join(' '));
  if (!embedding) return '';

  const { data: rows, error } = await supabase.rpc('match_report_section_corpus', {
    query_embedding: embedding,
    match_section: section,
    match_market_type: market,
    exclude_holdout: true,
    match_threshold: 0.45,
    match_count: TOP_K,
  });

  if (error || !Array.isArray(rows) || rows.length === 0) {
    // Soft-fail when table/RPC not migrated yet
    if (error) {
      console.warn('[style-corpus] retrieve failed:', error.message);
    }
    return '';
  }

  const excerpts = (rows as StyleExemplarRow[])
    .map((r) => r?.redacted_text)
    .filter((c): c is string => typeof c === 'string' && c.length > 80)
    .slice(0, EXEMPLAR_COUNT)
    .map((c) => c.slice(0, EXEMPLAR_CHARS));

  if (excerpts.length === 0) return '';

  return [
    'STYLE_EXAMPLES (redacted past Sage sections for tone/structure only; do not copy {{TOKENS}} literally):',
    ...excerpts.map((e, i) => `--- Example ${i + 1} ---\n${e}`),
  ].join('\n\n');
}

/**
 * Legacy exec-summary RAG over report_embeddings (kept for compatibility).
 */
export async function retrieveSimilarSummaries(
  enriched: EnrichedInput
): Promise<string> {
  if (process.env.ENABLE_RAG !== 'true') return '';

  const apiKey =
    process.env.AI_GATEWAY_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return '';

  const openai = process.env.AI_GATEWAY_API_KEY?.trim()
    ? new OpenAI({
        apiKey: process.env.AI_GATEWAY_API_KEY.trim(),
        baseURL: 'https://ai-gateway.vercel.sh/v1',
      })
    : new OpenAI({ apiKey });

  const supabase = createServerClient();

  const queryParts = [
    enriched.property_name,
    enriched.city,
    enriched.state,
    enriched.unit_mix.map((u) => `${u.type} ${u.count}`).join(' '),
  ].filter(Boolean);

  const query = queryParts.join(' ').slice(0, 2000);
  if (!query.trim()) return '';

  const embedding = await embedQuery(openai, query);
  if (!embedding) return '';

  const { data: rows, error } = await supabase.rpc('match_report_embeddings', {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: TOP_K,
  });

  if (error || !Array.isArray(rows) || rows.length === 0) return '';

  const excerpts = rows
    .map((r: { content?: string }) => r?.content)
    .filter((c): c is string => typeof c === 'string' && c.length > 0)
    .slice(0, 3)
    .map((c) => c.slice(0, 800));

  if (excerpts.length === 0) return '';

  return `Similar past summaries (for style reference only; do not copy):\n${excerpts.map((e, i) => `--- Example ${i + 1} ---\n${e}`).join('\n\n')}`;
}
