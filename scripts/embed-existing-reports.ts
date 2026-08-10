#!/usr/bin/env tsx
/**
 * Batch embed existing report executive summaries into report_embeddings
 * Run: npx tsx scripts/embed-existing-reports.ts
 *      npx tsx scripts/embed-existing-reports.ts --force   # re-embed all
 *      npx tsx scripts/embed-existing-reports.ts --limit 100
 * Requires: OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { OpenAI } from 'openai';

config({ path: resolve(process.cwd(), '.env.local') });

const EMBEDDING_MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 10;

const args = process.argv.slice(2);
const force = args.includes('--force');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? Math.max(1, parseInt(args[limitIdx + 1] || '500', 10) || 500) : 500;

function contentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 64);
}

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
    .select('id, executive_summary, study_id')
    .not('executive_summary', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (fetchError) {
    console.error('Fetch error:', fetchError);
    process.exit(1);
  }

  if (!reports?.length) {
    console.log('No reports with executive summaries found.');
    return;
  }

  const existing = new Map<string, string>();
  if (!force) {
    const ids = reports.map((r) => r.id);
    const CHUNK = 80;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      const { data: embeds } = await supabase
        .from('report_embeddings')
        .select('report_id, content_hash')
        .eq('section', 'executive_summary')
        .in('report_id', chunk);
      for (const e of embeds ?? []) {
        existing.set(
          (e as { report_id: string }).report_id,
          (e as { content_hash: string }).content_hash
        );
      }
    }
  }

  let skipped = 0;
  let embedded = 0;
  console.log(`Scanning ${reports.length} reports (force=${force})…`);

  for (let i = 0; i < reports.length; i += BATCH_SIZE) {
    const batch = reports.slice(i, i + BATCH_SIZE);
    for (const report of batch) {
      const content = (report.executive_summary || '').slice(0, 8000);
      if (!content || content.length < 50) {
        skipped += 1;
        continue;
      }

      const hash = contentHash(content);
      if (!force && existing.get(report.id) === hash) {
        skipped += 1;
        continue;
      }

      const embedRes = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: content,
      });

      const embedding = embedRes.data?.[0]?.embedding;
      if (!embedding) continue;

      const { error: upsertError } = await supabase.from('report_embeddings').upsert(
        {
          report_id: report.id,
          section: 'executive_summary',
          content,
          content_hash: hash,
          embedding,
        },
        { onConflict: 'report_id,section' }
      );
      if (upsertError) {
        console.warn('Upsert error for', report.study_id || report.id, upsertError.message);
      } else {
        embedded += 1;
      }
    }
    console.log(`  Processed ${Math.min(i + BATCH_SIZE, reports.length)}/${reports.length}`);
  }

  console.log(`Done. Embedded ${embedded}, skipped ${skipped}.`);
  console.log('Tip: ENABLE_RAG=true ENABLE_GUARDRAILS=true in .env.local / Vercel staging');
}

main().catch(console.error);
