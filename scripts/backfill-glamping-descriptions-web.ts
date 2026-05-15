/**
 * Web-backed SEO description generator for `all_glamping_properties` rows missing `description`.
 *
 * Prerequisites:
 *   - Table `glamping_description_runs` applied in Supabase (see scripts/migrations/create-glamping-description-runs-2026-05.sql)
 *   - .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY),
 *     OPENAI_API_KEY and/or AI_GATEWAY_API_KEY
 *   - Optional: FIRECRAWL_API_KEY (recommended for JS-heavy sites)
 *
 * Usage:
 *   npx tsx scripts/backfill-glamping-descriptions-web.ts --dry-run --limit 3 --no-firecrawl
 *   npx tsx scripts/backfill-glamping-descriptions-web.ts --limit 10
 *   npx tsx scripts/backfill-glamping-descriptions-web.ts --id 12345 --dry-run
 *
 * Env:
 *   GLAMPING_DESCRIPTION_MODEL — optional; default gpt-4o-mini (JSON `response_format` requires a compatible OpenAI model id on the gateway).
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { runGlampingDescriptionPipeline } from '@/lib/glamping-description-research/run-property-pipeline';

config({ path: resolve(process.cwd(), '.env.local') });

const SELECT_FIELDS = [
  'id',
  'property_name',
  'site_name',
  'city',
  'state',
  'country',
  'url',
  'unit_type',
  'property_type',
  'property_total_sites',
  'operating_season_months',
  'research_status',
  'description',
  'property_laundry',
  'property_playground',
  'property_pool',
  'property_food_on_site',
  'property_sauna',
  'property_hot_tub',
  'property_restaurant',
  'property_dog_park',
  'property_waterfront',
  'property_family_friendly',
  'unit_wifi',
  'unit_pets',
  'unit_private_bathroom',
  'unit_hot_tub',
  'unit_air_conditioning',
  'setting_forest',
  'setting_lake',
  'setting_mountainous',
  'setting_desert',
  'setting_beach',
  'setting_ranch',
].join(', ');

function parseArgs(argv: string[]) {
  let dryRun = false;
  let limit: number | null = null;
  let id: string | null = null;
  let publishedOnly = true;
  let noFirecrawl = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') dryRun = true;
    else if (a === '--all-statuses') publishedOnly = false;
    else if (a === '--no-firecrawl') noFirecrawl = true;
    else if (a === '--limit' && argv[i + 1]) {
      limit = Math.max(1, parseInt(argv[++i], 10) || 1);
    } else if (a === '--id' && argv[i + 1]) {
      id = argv[++i] ?? null;
    }
  }
  return { dryRun, limit, id, publishedOnly, noFirecrawl };
}

function terminalStatus(
  pipeline: Awaited<ReturnType<typeof runGlampingDescriptionPipeline>>
): 'success' | 'failed' | 'skipped' {
  if (pipeline.ok) return 'success';
  if (pipeline.code === 'no_url') return 'skipped';
  return 'failed';
}

async function main() {
  const { dryRun, limit, id, publishedOnly, noFirecrawl } = parseArgs(process.argv);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY?.trim() && !process.env.AI_GATEWAY_API_KEY?.trim()) {
    console.error('Missing OPENAI_API_KEY or AI_GATEWAY_API_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const firecrawlKey =
    noFirecrawl ? null : process.env.FIRECRAWL_API_KEY?.trim() || null;

  let q = supabase
    .from('all_glamping_properties')
    .select(SELECT_FIELDS)
    // Null or empty string (PostgREST empty: `description.eq.` — same pattern as admin URL gap filter)
    .or('description.is.null,description.eq.')
    .not('url', 'is', null)
    .neq('url', '');
  if (publishedOnly) {
    q = q.eq('research_status', 'published');
  }
  if (id) {
    q = q.eq('id', id);
  }
  q = q.order('id', { ascending: true });
  if (limit != null) {
    q = q.limit(limit);
  }

  const { data: rows, error } = await q;
  if (error) {
    console.error('Query failed:', error.message);
    process.exit(1);
  }
  if (!rows?.length) {
    console.warn('No matching rows.');
    process.exit(0);
  }

  console.warn(
    `Processing ${rows.length} row(s). dryRun=${dryRun} firecrawl=${Boolean(firecrawlKey)}`,
  );

  let ok = 0;
  let failed = 0;
  const today = new Date().toISOString().split('T')[0];

  for (const row of rows) {
    const rid = row.id as number;
    const pipeline = await runGlampingDescriptionPipeline({
      row,
      env: process.env,
      firecrawlApiKey: firecrawlKey,
    });

    const status = terminalStatus(pipeline);

    const { data: inserted, error: insErr } = await supabase
      .from('glamping_description_runs')
      .insert({
        property_id: rid,
        research_status_at_run: row.research_status != null ? String(row.research_status) : null,
        dry_run: dryRun,
        status,
        source_urls: pipeline.ok ? pipeline.sourceUrls : pipeline.sourceUrls,
        evidence_chars: pipeline.ok ? pipeline.evidenceChars : pipeline.evidenceChars,
        model: pipeline.model,
        prompt_version: 'v1',
        generated_description: pipeline.ok ? pipeline.description : null,
        validation_warnings: pipeline.ok
          ? pipeline.validationWarnings
          : pipeline.validationWarnings,
        error_message: pipeline.ok ? null : pipeline.message,
        applied: false,
      })
      .select('id')
      .single();

    if (insErr || !inserted?.id) {
      console.error(`[id=${rid}] audit insert failed:`, insErr?.message ?? 'no id');
      failed++;
      continue;
    }

    const runId = inserted.id as string;

    if (!pipeline.ok) {
      console.warn(`[id=${rid}] ${status}: ${pipeline.message}`);
      failed++;
      continue;
    }

    if (!dryRun) {
      const { error: upErr } = await supabase
        .from('all_glamping_properties')
        .update({ description: pipeline.description, date_updated: today })
        .eq('id', rid);
      if (upErr) {
        console.error(`[id=${rid}] update failed:`, upErr.message);
        failed++;
        continue;
      }
      const { error: markErr } = await supabase
        .from('glamping_description_runs')
        .update({ applied: true })
        .eq('id', runId);
      if (markErr) {
        console.warn(`[id=${rid}] description saved but could not mark applied:`, markErr.message);
      }
    }

    ok++;
    console.warn(`[id=${rid}] ${dryRun ? 'dry-run OK' : 'saved'} (${pipeline.description.length} chars)`);
  }

  console.warn(`Done. success=${ok} failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
