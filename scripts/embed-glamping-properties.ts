#!/usr/bin/env tsx
/**
 * Batch-embed all_glamping_properties rows into property_embeddings.
 *
 * Run:
 *   npx tsx scripts/embed-glamping-properties.ts [--limit N] [--force]
 *
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
 *   - OPENAI_API_KEY
 *
 * --force   re-embed even if content_hash matches (useful after model change)
 * --limit N only process the first N properties (for dry-runs)
 *
 * The helper in lib/sage-ai/embeddings.ts skips unchanged content by default
 * so this is safe to re-run on a schedule.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import pLimit from 'p-limit';
import {
  upsertPropertyEmbedding,
  type PropertyEmbeddingInput,
} from '@/lib/sage-ai/embeddings';

config({ path: resolve(process.cwd(), '.env.local') });

const FETCH_BATCH = 500;
const CONCURRENCY = 5;

function parseArgs() {
  let limit = Infinity;
  let force = false;
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--force') force = true;
    else if (a === '--limit' && process.argv[i + 1]) {
      limit = Number(process.argv[i + 1]);
      i++;
    }
  }
  return { limit, force };
}

async function main() {
  const { limit: hardLimit, force } = parseArgs();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
    process.exit(1);
  }
  if (!openaiKey) {
    console.error('Missing OPENAI_API_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const openai = new OpenAI({ apiKey: openaiKey });
  const limiter = pLimit(CONCURRENCY);

  const stats = {
    fetched: 0,
    inserted: 0,
    updated: 0,
    skipped_unchanged: 0,
    skipped_too_short: 0,
    errors: 0,
  };

  let offset = 0;
  while (stats.fetched < hardLimit) {
    const pageSize = Math.min(FETCH_BATCH, hardLimit - stats.fetched);
    const { data, error } = await supabase
      .from('all_glamping_properties')
      .select(
        'id, property_name, description, amenities, unit_type, property_type, city, state'
      )
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Fetch error at offset', offset, error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    stats.fetched += data.length;

    await Promise.all(
      data.map((row) =>
        limiter(async () => {
          try {
            const property: PropertyEmbeddingInput = row as PropertyEmbeddingInput;

            if (force) {
              await supabase
                .from('property_embeddings')
                .delete()
                .eq('property_id', property.id);
            }

            const res = await upsertPropertyEmbedding({
              supabase,
              openai,
              property,
            });
            stats[res.status] = (stats[res.status] ?? 0) + 1;
          } catch (err) {
            stats.errors += 1;
            console.warn(
              'Embed failed for',
              (row as { id?: number }).id,
              err instanceof Error ? err.message : err
            );
          }
        })
      )
    );

    console.log(
      `[offset=${offset + data.length}] fetched=${stats.fetched} inserted=${
        stats.inserted
      } updated=${stats.updated} skipped_unchanged=${
        stats.skipped_unchanged
      } skipped_too_short=${stats.skipped_too_short} errors=${stats.errors}`
    );

    offset += data.length;
    if (data.length < pageSize) break;
  }

  console.log('\nDone.', stats);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
