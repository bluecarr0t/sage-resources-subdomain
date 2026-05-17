#!/usr/bin/env npx tsx
/**
 * Set property_type and land_operator_category on all_glamping_properties rows with
 * research_status = 'in_progress', using property_name + description via OpenAI.
 *
 * Usage:
 *   npx tsx scripts/classify-in-progress-glamping-types-openai.ts
 *   npx tsx scripts/classify-in-progress-glamping-types-openai.ts --limit 20
 *   npx tsx scripts/classify-in-progress-glamping-types-openai.ts --dry-run
 *   npx tsx scripts/classify-in-progress-glamping-types-openai.ts --force
 *
 * Default: only updates rows where property_type is blank OR land_operator_category is null.
 * --force: overwrites both fields whenever the model returns values.
 *
 * OpenAI: set `OPENAI_API_KEY` in the environment or in `.env.local` / `.env` (local wins).
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import {
  buildGlampingClassificationPrompt,
  parseGlampingClassificationJson,
} from '@/lib/infer-glamping-classification-from-text';

// Load `.env.local` first, then `.env` (dotenv does not override already-set keys).
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

/** OpenAI client auth — only `OPENAI_API_KEY` is used (no alternate key names). */
const openaiApiKey = process.env.OPENAI_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!openaiApiKey) {
  console.error(
    'Missing OPENAI_API_KEY. Set it in the shell, .env.local, or .env (see script header).'
  );
  process.exit(1);
}
if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiApiKey });
const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLE = 'all_glamping_properties';
const DELAY_MS = 1500;
const MAX_RETRIES = 2;

interface PropertyRow {
  id: number;
  property_name: string | null;
  description: string | null;
  property_type: string | null;
  land_operator_category: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isBlank(s: string | null | undefined): boolean {
  return s == null || String(s).trim() === '';
}

function needsClassification(row: PropertyRow, force: boolean): boolean {
  if (force) return true;
  return isBlank(row.property_type) || isBlank(row.land_operator_category);
}

async function classifyRow(
  row: PropertyRow,
  force: boolean
): Promise<{ property_type: string | null; land_operator_category: string | null }> {
  const name = row.property_name?.trim() || 'Unknown';
  const prompt = buildGlampingClassificationPrompt(name, row.description);

  await sleep(DELAY_MS);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    response_format: { type: 'json_object' },
    max_tokens: 200,
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error('Empty OpenAI response');

  const parsed = parseGlampingClassificationJson(raw);

  if (!force) {
    if (!isBlank(row.property_type)) {
      parsed.property_type = null;
    }
    if (!isBlank(row.land_operator_category)) {
      parsed.land_operator_category = null;
    }
  }

  return parsed;
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const limit =
    limitIdx >= 0
      ? parseInt(
          args[limitIdx + 1] ||
            String(args[limitIdx] || '').replace('--limit=', '') ||
            '0',
          10
        )
      : undefined;
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  const { data: rows, error } = await supabase
    .from(TABLE)
    .select(
      'id, property_name, description, property_type, land_operator_category'
    )
    .eq('research_status', 'in_progress')
    .order('id', { ascending: true })
    .limit(limit ?? 8000);

  if (error) {
    console.error('Fetch error:', error.message);
    process.exit(1);
  }

  const list = (rows ?? []) as PropertyRow[];
  const toProcess = list.filter((r) => needsClassification(r, force));

  if (!toProcess.length) {
    console.log(
      force
        ? 'No in_progress properties in result set.'
        : 'No in_progress properties need classification (both fields already set). Use --force to overwrite.'
    );
    return;
  }

  console.log(
    `Processing ${toProcess.length} in_progress propert(ies)${force ? ' (--force)' : ' (missing type and/or land operator)'}...\n`
  );

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const row = toProcess[i];
    const progress = `[${i + 1}/${toProcess.length}]`;

    let result: { property_type: string | null; land_operator_category: string | null } | null =
      null;
    let lastErr: Error | null = null;

    for (let a = 0; a <= MAX_RETRIES; a++) {
      try {
        result = await classifyRow(row, force);
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e as Error;
        if (a < MAX_RETRIES) await sleep(DELAY_MS * 2);
      }
    }

    if (!result || lastErr) {
      console.error(
        `${progress} ${row.property_name} - Error: ${lastErr?.message ?? 'unknown'}`
      );
      failed++;
      continue;
    }

    const update: Record<string, unknown> = {};
    if (result.property_type != null) update.property_type = result.property_type;
    if (result.land_operator_category != null) {
      update.land_operator_category = result.land_operator_category;
    }

    if (Object.keys(update).length === 0) {
      console.log(`${progress} ${row.property_name} - Model returned nothing to apply, skipped`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(
        `${progress} ${row.property_name} - Would set: ${JSON.stringify(update)}`
      );
      updated++;
      continue;
    }

    const { error: updateError } = await supabase
      .from(TABLE)
      .update({
        ...update,
        date_updated: new Date().toISOString().split('T')[0],
      })
      .eq('id', row.id);

    if (updateError) {
      console.error(
        `${progress} ${row.property_name} - Update failed: ${updateError.message}`
      );
      failed++;
    } else {
      console.log(`${progress} ${row.property_name} - Updated: ${JSON.stringify(update)}`);
      updated++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
