#!/usr/bin/env npx tsx
/**
 * Hybrid outdoor hospitality contact research → public.contacts
 *
 * Seeds from all_sage_data + project_pipeline_jobs + Tavily open-web queries,
 * scrapes contact pages, extracts email+category via OpenAI, and auto-inserts
 * only when both email and category are present (deduped by lower(email)).
 *
 * Usage:
 *   npx tsx scripts/research-outdoor-hospitality-contacts.ts
 *   npx tsx scripts/research-outdoor-hospitality-contacts.ts --dry-run
 *   npx tsx scripts/research-outdoor-hospitality-contacts.ts --limit 5
 *   npx tsx scripts/research-outdoor-hospitality-contacts.ts --seed inventory
 *   npx tsx scripts/research-outdoor-hospitality-contacts.ts --seed web --limit 10
 *   npx tsx scripts/research-outdoor-hospitality-contacts.ts --seed all --limit 20
 *   npx tsx scripts/research-outdoor-hospitality-contacts.ts --seed inventory --offset 500 --limit 20
 *
 * Cron: GET/POST /api/cron/research-contacts (weekly — see vercel.json)
 */

import { resolve } from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { runContactResearch, type SeedMode } from '@/lib/contact-research';

config({ path: resolve(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');

function argValue(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return null;
  return process.argv[idx + 1] ?? null;
}

function parseSeedMode(): SeedMode {
  const raw = (argValue('--seed') ?? 'all').toLowerCase();
  if (raw === 'inventory' || raw === 'web' || raw === 'all') return raw;
  throw new Error(`Invalid --seed ${raw}; use inventory|web|all`);
}

function parseLimit(defaultLimit: number): number {
  const raw = argValue('--limit');
  if (!raw) return defaultLimit;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) throw new Error(`Invalid --limit ${raw}`);
  return n;
}

function parseOffset(): number {
  const raw = argValue('--offset');
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid --offset ${raw}`);
  return n;
}

async function main(): Promise<void> {
  const seedMode = parseSeedMode();
  const limit = parseLimit(15);
  const inventoryOffset = parseOffset();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const tavilyApiKey = process.env.TAVILY_API_KEY?.trim() || null;

  if (!supabaseUrl || !secretKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or service role key in .env.local');
  }
  if (!openaiApiKey) {
    throw new Error('Missing OPENAI_API_KEY in .env.local');
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const openai = new OpenAI({ apiKey: openaiApiKey });

  console.log(
    `Contact research: seed=${seedMode} limit=${limit} offset=${inventoryOffset} dryRun=${DRY_RUN} tavily=${Boolean(tavilyApiKey)}`
  );

  const result = await runContactResearch({
    supabase,
    openai,
    tavilyApiKey,
    mode: seedMode,
    limit,
    inventoryOffset,
    dryRun: DRY_RUN,
    onProgress: (message) => console.log(message),
  });

  console.log(
    `\nDone. inserted=${result.inserted} skipped=${result.skipped} failed=${result.failed} queue=${result.queueSize}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
