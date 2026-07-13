#!/usr/bin/env tsx
/**
 * Batch-embed all_sage_data rows into property_embeddings.
 *
 * Run:
 *   npx tsx scripts/embed-glamping-properties.ts --anchors-only
 *   npx tsx scripts/embed-glamping-properties.ts --anchors-only --limit 50
 *   npx tsx scripts/embed-glamping-properties.ts --all-rows
 *
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
 *   - OPENAI_API_KEY
 *
 * --anchors-only  embed list anchors only (default)
 * --all-rows      embed every unit row in all_sage_data
 * --force         re-embed even if content_hash matches
 * --limit N       only process the first N properties
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import pLimit from 'p-limit';
import {
  ALL_SAGE_DATA_LIST_ANCHORS_VIEW,
  ALL_SAGE_DATA_TABLE,
} from '@/lib/all-sage-data-table';
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
  let anchorsOnly = true;
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--force') force = true;
    else if (a === '--anchors-only') anchorsOnly = true;
    else if (a === '--all-rows') anchorsOnly = false;
    else if (a === '--limit' && process.argv[i + 1]) {
      limit = Number(process.argv[i + 1]);
      i++;
    }
  }
  return { limit, force, anchorsOnly };
}

async function main() {
  const { limit: hardLimit, force, anchorsOnly } = parseArgs();
  const sourceTable = anchorsOnly
    ? ALL_SAGE_DATA_LIST_ANCHORS_VIEW
    : ALL_SAGE_DATA_TABLE;

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

  console.log(
    `Embedding from ${sourceTable} (anchorsOnly=${anchorsOnly}, limit=${Number.isFinite(hardLimit) ? hardLimit : 'all'})`
  );

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
      .from(sourceTable)
      .select('*')
      .order('id', { ascending: true })
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
