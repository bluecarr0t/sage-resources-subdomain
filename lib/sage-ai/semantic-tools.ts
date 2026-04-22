/**
 * Sage AI — semantic search over all_glamping_properties.
 *
 * Backed by the property_embeddings table and the semantic_search_properties_v1
 * RPC (see scripts/migrations/sage-ai-property-embeddings.sql).
 *
 * Registered by createSageAiTools when semanticSearchEnabled is true.
 */

import { tool } from 'ai';
import { z } from 'zod';
import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { enforceDailyQuota } from '@/lib/upstash';
import {
  embedText,
  EMBEDDING_DIM,
} from '@/lib/sage-ai/embeddings';

const QUOTA_PER_DAY = Number(
  process.env.SAGE_AI_QUOTA_SEMANTIC_SEARCH ?? 100
);

async function quotaGate(
  toolName: string,
  userId: string | undefined
): Promise<{ error: string; data: null } | null> {
  // semantic_search calls OpenAI embeddings (paid) when given a free-text
  // query. Require a user so we can rate-limit per identity.
  if (!userId) {
    return {
      error: `${toolName} requires an authenticated user to enforce daily quota.`,
      data: null,
    };
  }
  const { allowed, used } = await enforceDailyQuota(
    toolName,
    userId,
    QUOTA_PER_DAY
  );
  if (!allowed) {
    return {
      error: `Daily quota exceeded for ${toolName} (used ${used} of ${QUOTA_PER_DAY}). Try again tomorrow or ask an admin to raise the limit.`,
      data: null,
    };
  }
  return null;
}

async function fetchPropertyEmbedding(
  supabase: SupabaseClient,
  propertyId: number
): Promise<number[] | null> {
  const { data, error } = await supabase
    .from('property_embeddings')
    .select('embedding')
    .eq('property_id', propertyId)
    .maybeSingle();
  if (error || !data) return null;
  const embedding = (data as { embedding: unknown }).embedding;
  // pgvector returns the vector as a string like "[0.1, 0.2, ...]" or as an
  // array depending on the driver. Normalize both.
  if (typeof embedding === 'string') {
    try {
      const parsed = JSON.parse(embedding) as number[];
      if (Array.isArray(parsed) && parsed.length === EMBEDDING_DIM) return parsed;
    } catch {
      return null;
    }
    return null;
  }
  if (Array.isArray(embedding) && embedding.length === EMBEDDING_DIM) {
    return embedding as number[];
  }
  return null;
}

export function createSemanticTools(
  supabase: SupabaseClient,
  userId: string | undefined
) {
  return {
    semantic_search_properties: tool({
      description: `Find glamping properties semantically similar to a natural-language query OR to another property in the database. Uses text-embedding-3-small over property name, location, unit type, property type, description, and amenities.

Use this tool when the user asks "find properties like X", "similar to Y", or describes a vibe/amenity mix in natural language ("treehouses with hot tubs and mountain views"). Prefer this over keyword search via query_properties when the request is descriptive.

Provide EITHER \`query\` (text) OR \`similar_to_property_id\` (use that property's stored embedding directly — no OpenAI call).`,
      inputSchema: z
        .object({
          query: z
            .string()
            .min(3)
            .max(1000)
            .optional()
            .describe('Natural-language description (embedded on the fly).'),
          similar_to_property_id: z
            .number()
            .int()
            .positive()
            .optional()
            .describe(
              'Use this property\'s precomputed embedding as the query vector.'
            ),
          limit: z.number().int().min(1).max(50).default(10),
          min_similarity: z
            .number()
            .min(0)
            .max(1)
            .default(0.3)
            .describe(
              'Drop results below this cosine similarity (0=everything, 1=exact match).'
            ),
          filters: z
            .object({
              state: z.string().optional(),
              country: z.string().optional(),
              unit_type: z.string().optional(),
            })
            .optional()
            .describe('Optional hard filters applied before ranking.'),
        })
        .refine((v) => !!v.query || !!v.similar_to_property_id, {
          message: 'Provide either query or similar_to_property_id',
        }),
      execute: async ({
        query,
        similar_to_property_id,
        limit,
        min_similarity,
        filters,
      }) => {
        let queryEmbedding: number[] | null = null;

        if (similar_to_property_id) {
          queryEmbedding = await fetchPropertyEmbedding(
            supabase,
            similar_to_property_id
          );
          if (!queryEmbedding) {
            return {
              error: `No embedding found for property ${similar_to_property_id}. Run scripts/embed-glamping-properties.ts first.`,
              data: null,
            };
          }
        } else if (query) {
          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) {
            return { error: 'OPENAI_API_KEY is not configured', data: null };
          }
          const gate = await quotaGate('semantic_search_properties', userId);
          if (gate) return gate;
          try {
            // Cap embedding latency at 15s. The OpenAI SDK retries 2x by
            // default; we cap the total wall time so a single bad embedding
            // call can't hold the whole tool step open for the gateway timeout.
            const openai = new OpenAI({ apiKey, timeout: 15_000, maxRetries: 1 });
            queryEmbedding = await embedText(openai, query);
          } catch (err) {
            return {
              error: `Embedding failed: ${
                err instanceof Error ? err.message : String(err)
              }`,
              data: null,
            };
          }
          if (!queryEmbedding) {
            return { error: 'Query was too short to embed', data: null };
          }
        } else {
          return {
            error: 'Provide either query or similar_to_property_id',
            data: null,
          };
        }

        const { data, error } = await supabase.rpc(
          'semantic_search_properties_v1',
          {
            query_embedding: queryEmbedding,
            match_count: limit ?? 10,
            filter_state: filters?.state ?? null,
            filter_country: filters?.country ?? null,
            filter_unit_type: filters?.unit_type ?? null,
            min_similarity: min_similarity ?? 0.3,
          }
        );
        if (error) {
          return { error: error.message, data: null };
        }

        const rows = (data ?? []) as Array<{
          id: number;
          property_name: string | null;
          city: string | null;
          state: string | null;
          country: string | null;
          unit_type: string | null;
          property_type: string | null;
          url: string | null;
          description: string | null;
          similarity: number;
        }>;

        return {
          mode: similar_to_property_id ? 'by_property' : 'by_text',
          query: query ?? null,
          similar_to_property_id: similar_to_property_id ?? null,
          results: rows.map((r) => ({
            id: r.id,
            property_name: r.property_name,
            city: r.city,
            state: r.state,
            country: r.country,
            unit_type: r.unit_type,
            property_type: r.property_type,
            url: r.url,
            description: r.description
              ? r.description.slice(0, 300)
              : null,
            similarity: Number(r.similarity).toFixed(3),
          })),
          returned_count: rows.length,
        };
      },
    }),
  };
}
