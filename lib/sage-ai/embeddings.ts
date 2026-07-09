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
  unit_description?: string | null;
  glamping_service_tier?: string | null;
  unit_type?: string | null;
  property_type?: string | null;
  city?: string | null;
  state?: string | null;
  /** Unstructured Roverpass text blobs, when present. */
  amenities_raw?: string | null;
  activities_raw?: string | null;
  lifestyle_raw?: string | null;
  /**
   * The `all_sage_data` schema has NO single `amenities` column — features are
   * hundreds of per-flag columns (`unit_*`, `property_*`, `activities_*`,
   * `setting_*`, `river_stream_or_creek`) whose value is usually "Yes"/"No".
   * The batch script passes the whole row, so accept arbitrary flag columns.
   */
  [key: string]: unknown;
}

/** Prefixes whose "Yes" columns represent a present amenity/activity/setting. */
const FLAG_PREFIXES = ['unit_', 'property_', 'activities_', 'setting_', 'rv_'] as const;

/**
 * Columns matching a flag prefix that are NOT boolean flags (descriptive /
 * numeric / identifier), so they must not be treated as present amenities.
 */
const NON_FLAG_COLUMNS = new Set<string>([
  'unit_type',
  'unit_capacity',
  'unit_sq_ft',
  'unit_description',
  'unit_bed',
  'property_type',
  'property_name',
  'property_id',
  'property_total_sites',
  'rv_vehicle_length',
  'rv_surface_type',
  'rv_surface_level',
]);

function isPresentFlag(column: string, value: unknown): boolean {
  if (NON_FLAG_COLUMNS.has(column)) return false;
  const matchesPrefix =
    column === 'river_stream_or_creek' ||
    FLAG_PREFIXES.some((p) => column.startsWith(p));
  if (!matchesPrefix) return false;
  return typeof value === 'string' && value.trim().toLowerCase() === 'yes';
}

/** "unit_private_bathroom" -> "private bathroom"; "setting_forest" -> "forest". */
function humanizeFlag(column: string): string {
  const withoutPrefix = column.replace(
    /^(unit_|property_|activities_|setting_|rv_)/,
    ''
  );
  return withoutPrefix.replace(/_/g, ' ').trim();
}

/**
 * Canonical "document" text for a property. Keep the label order stable —
 * the content_hash uses this exact serialization to short-circuit repeat
 * embeddings. Amenities/activities/settings come from the real per-flag
 * columns (the "Yes" ones) plus any unstructured raw text, since there is no
 * single `amenities` column in the schema.
 */
export function buildPropertyEmbeddingText(p: PropertyEmbeddingInput): string {
  const presentFlags: string[] = [];
  for (const [column, value] of Object.entries(p)) {
    if (isPresentFlag(column, value)) {
      presentFlags.push(humanizeFlag(column));
    }
  }
  presentFlags.sort();

  const rawText = [p.amenities_raw, p.activities_raw, p.lifestyle_raw]
    .filter((v) => typeof v === 'string' && v.trim().length > 0)
    .map((v) => (v as string).trim())
    .join(' | ');

  const fields: Array<[string, string | null | undefined]> = [
    ['Name', p.property_name],
    ['Location', [p.city, p.state].filter(Boolean).join(', ') || null],
    ['Unit type', p.unit_type],
    ['Property type', p.property_type],
    ['Service tier', p.glamping_service_tier],
    ['Description', p.description],
    ['Unit description', p.unit_description],
    ['Amenities', presentFlags.length > 0 ? presentFlags.join(', ') : null],
    ['Other features', rawText || null],
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
