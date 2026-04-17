/**
 * Sage AI — property embedding helpers.
 *
 * Used by:
 *   - scripts/embed-glamping-properties.ts (nightly batch)
 *   - semantic_search_properties tool (on-demand query embedding)
 *
 * Hash is computed over the canonical content string so repeat embedding runs
 * only re-embed rows whose source text has changed.
 */

import { createHash } from 'crypto';
import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';

export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIM = 1536;
export const MAX_EMBED_CHARS = 6000;

export interface PropertyEmbeddingInput {
  id: number;
  property_name?: string | null;
  description?: string | null;
  amenities?: string | null;
  unit_type?: string | null;
  property_type?: string | null;
  city?: string | null;
  state?: string | null;
}

/**
 * Canonical "document" text for a property. Keep the label order stable —
 * the content_hash uses this exact serialization to short-circuit repeat
 * embeddings.
 */
export function buildPropertyEmbeddingText(p: PropertyEmbeddingInput): string {
  const fields: Array<[string, string | null | undefined]> = [
    ['Name', p.property_name],
    ['Location', [p.city, p.state].filter(Boolean).join(', ') || null],
    ['Unit type', p.unit_type],
    ['Property type', p.property_type],
    ['Description', p.description],
    ['Amenities', p.amenities],
  ];
  return fields
    .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
    .map(([k, v]) => `${k}: ${(v as string).trim()}`)
    .join('\n')
    .slice(0, MAX_EMBED_CHARS);
}

export function hashEmbeddingContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 32);
}

export async function embedText(
  openai: OpenAI,
  input: string
): Promise<number[] | null> {
  if (!input || input.trim().length < 10) return null;
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: input.slice(0, MAX_EMBED_CHARS),
  });
  const vec = response.data?.[0]?.embedding;
  if (!vec || vec.length !== EMBEDDING_DIM) return null;
  return vec as number[];
}

export interface UpsertPropertyEmbeddingArgs {
  supabase: SupabaseClient;
  openai: OpenAI;
  property: PropertyEmbeddingInput;
}

export interface UpsertResult {
  status: 'inserted' | 'updated' | 'skipped_unchanged' | 'skipped_too_short';
  content_hash?: string;
}

/**
 * Embed `property` and upsert the row. Skips the OpenAI call when an
 * existing row's content_hash matches (so repeated runs are effectively free).
 */
export async function upsertPropertyEmbedding({
  supabase,
  openai,
  property,
}: UpsertPropertyEmbeddingArgs): Promise<UpsertResult> {
  const content = buildPropertyEmbeddingText(property);
  if (content.trim().length < 20) {
    return { status: 'skipped_too_short' };
  }
  const content_hash = hashEmbeddingContent(content);

  const { data: existing } = await supabase
    .from('property_embeddings')
    .select('property_id, content_hash')
    .eq('property_id', property.id)
    .maybeSingle();

  if (existing && (existing as { content_hash?: string }).content_hash === content_hash) {
    return { status: 'skipped_unchanged', content_hash };
  }

  const embedding = await embedText(openai, content);
  if (!embedding) return { status: 'skipped_too_short' };

  const { error } = await supabase.from('property_embeddings').upsert(
    {
      property_id: property.id,
      content,
      content_hash,
      model: EMBEDDING_MODEL,
      embedding,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'property_id' }
  );
  if (error) {
    throw new Error(`property_embeddings upsert failed: ${error.message}`);
  }
  return {
    status: existing ? 'updated' : 'inserted',
    content_hash,
  };
}
