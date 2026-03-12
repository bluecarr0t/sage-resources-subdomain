#!/usr/bin/env tsx
/**
 * Batch embed existing report executive summaries into report_embeddings
 * Run: npx tsx scripts/embed-existing-reports.ts
 * Requires: OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });
import { OpenAI } from 'openai';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 10;

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_ANON_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  if (!openaiKey) {
    console.error('Missing OPENAI_API_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const openai = new OpenAI({ apiKey: openaiKey });

  const { data: reports, error: fetchError } = await supabase
    .from('reports')
    .select('id, executive_summary')
    .not('executive_summary', 'is', null)
    .limit(500);

  if (fetchError) {
    console.error('Fetch error:', fetchError);
    process.exit(1);
  }

  if (!reports?.length) {
    console.log('No reports with executive summaries found.');
    return;
  }

  console.log(`Embedding ${reports.length} reports...`);

  for (let i = 0; i < reports.length; i += BATCH_SIZE) {
    const batch = reports.slice(i, i + BATCH_SIZE);
    for (const report of batch) {
      const content = (report.executive_summary || '').slice(0, 8000);
      if (!content || content.length < 50) continue;

      const embedRes = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: content,
      });

      const embedding = embedRes.data?.[0]?.embedding;
      if (!embedding) continue;

      const contentHash = Buffer.from(content).toString('base64').slice(0, 64);

      const { error: upsertError } = await supabase.from('report_embeddings').upsert(
        {
          report_id: report.id,
          section: 'executive_summary',
          content,
          content_hash: contentHash,
          embedding,
        },
        { onConflict: 'report_id,section' }
      );
      if (upsertError) console.warn('Upsert error for', report.id, upsertError.message);
    }
    console.log(`  Processed ${Math.min(i + BATCH_SIZE, reports.length)}/${reports.length}`);
  }

  console.log('Done.');
}

main().catch(console.error);
