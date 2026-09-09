#!/usr/bin/env npx tsx
/**
 * Upsert all Glamping Market Overview leads from Supabase into GoHighLevel:
 * first name, last name, email, Contact Type, and tag
 * `Website - Glamping Market Overview`.
 *
 * Usage:
 *   npx tsx scripts/sync-glamping-market-overview-contacts-to-ghl-2026-09-09.ts
 *   npx tsx scripts/sync-glamping-market-overview-contacts-to-ghl-2026-09-09.ts --apply
 *   npx tsx scripts/sync-glamping-market-overview-contacts-to-ghl-2026-09-09.ts --apply --limit 1
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { GATED_PAGE_GLAMPING_MARKET_OVERVIEW } from '@/lib/gated-access';
import { GhlApiError } from '@/lib/ghl/client';
import { upsertGhlMarketOverviewContact } from '@/lib/ghl/contacts';
import { splitFullName } from '@/lib/person-name';

config({ path: resolve(process.cwd(), '.env.local') });

const APPLY = process.argv.includes('--apply');
const limitArg = process.argv.find((arg, i) => process.argv[i - 1] === '--limit');
const LIMIT = limitArg ? Number.parseInt(limitArg, 10) : null;
const emailArg = process.argv.find((arg, i) => process.argv[i - 1] === '--email');
const EMAIL_FILTER = emailArg?.trim().toLowerCase() || null;
const DELAY_MS = 150;

type GatedLeadRow = {
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  business_type: string | null;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

async function loadLeads(): Promise<GatedLeadRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or service role key in .env.local');
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('gated_content_leads')
    .select('email, first_name, last_name, name, business_type')
    .eq('page_slug', GATED_PAGE_GLAMPING_MARKET_OVERVIEW)
    .not('email', 'is', null)
    .order('verified_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load gated_content_leads: ${error.message}`);
  }

  return (data ?? []).filter((row) => (row.email ?? '').trim());
}

async function upsertWithRetry(row: GatedLeadRow) {
  const email = (row.email ?? '').trim().toLowerCase();
  const split = splitFullName(row.name ?? '');
  const firstName = (row.first_name ?? '').trim() || split.first_name;
  const lastName = (row.last_name ?? '').trim() || split.last_name;

  try {
    return await upsertGhlMarketOverviewContact({
      email,
      firstName,
      lastName,
      businessType: row.business_type,
    });
  } catch (err) {
    const retryable =
      err instanceof GhlApiError &&
      (err.status === 429 || (err.status === 401 && err.body.includes('timed out')));
    if (retryable) {
      await sleep(1_500);
      return upsertGhlMarketOverviewContact({
        email,
        firstName,
        lastName,
        businessType: row.business_type,
      });
    }
    throw err;
  }
}

async function main() {
  const leads = (await loadLeads()).filter((row) =>
    EMAIL_FILTER ? (row.email ?? '').trim().toLowerCase() === EMAIL_FILTER : true
  );
  const selected =
    LIMIT != null && Number.isFinite(LIMIT) ? leads.slice(0, Math.max(0, LIMIT)) : leads;
  const withType = selected.filter((row) => (row.business_type ?? '').trim()).length;

  console.log(
    `Market Overview leads: ${leads.length} (syncing ${selected.length}; ${withType} have Contact Type)`
  );
  console.log(`mode=${APPLY ? 'apply' : 'dry-run'}`);

  if (!APPLY) {
    console.log('Re-run with --apply to write to GoHighLevel.');
    return;
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < selected.length; i += 1) {
    const row = selected[i];
    const email = (row.email ?? '').trim().toLowerCase();
    try {
      const result = await upsertWithRetry(row);
      if (result.status === 'created') created += 1;
      else if (result.status === 'updated') updated += 1;
      else skipped += 1;
      console.log(
        `${i + 1}/${selected.length} ${result.status} ${email} type=${row.business_type ?? '—'}`
      );
    } catch (err) {
      failed += 1;
      console.error(`${i + 1}/${selected.length} FAILED ${email}:`, err);
    }
    await sleep(DELAY_MS);
  }

  console.log(
    `Done. created=${created} updated=${updated} skipped=${skipped} failed=${failed}`
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
