/**
 * RAG retrieval over past report executive summaries
 * Fetches similar past summaries when ENABLE_RAG is true
 */

import { createServerClient } from '@/lib/supabase';
import { OpenAI } from 'openai';
import type { EnrichedInput } from './types';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1536;
const TOP_K = 5;

export async function retrieveSimilarSummaries(
  enriched: EnrichedInput
): Promise<string> {
  if (process.env.ENABLE_RAG !== 'true') return '';

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return '';

  const openai = new OpenAI({ apiKey });
  const supabase = createServerClient();

  const queryParts = [
    enriched.property_name,
    enriched.city,
    enriched.state,
    enriched.unit_mix.map((u) => `${u.type} ${u.count}`).join(' '),
  ].filter(Boolean);

  const query = queryParts.join(' ').slice(0, 2000);
  if (!query.trim()) return '';

  const embedRes = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: query,
  });

  const embedding = embedRes.data?.[0]?.embedding;
  if (!embedding || embedding.length !== EMBEDDING_DIM) return '';

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
