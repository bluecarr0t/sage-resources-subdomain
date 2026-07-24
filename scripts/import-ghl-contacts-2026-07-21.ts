#!/usr/bin/env npx tsx
/**
 * Import GoHighLevel contact export CSV into public.contacts.
 *
 * Usage:
 *   npx tsx scripts/import-ghl-contacts-2026-07-21.ts [path-to-csv]
 *   npx tsx scripts/import-ghl-contacts-2026-07-21.ts --dry-run [path-to-csv]
 */

import { createReadStream } from 'fs';
import { resolve } from 'path';
import { parse } from 'csv-parse';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const SOURCE = 'GoHighLevel';
const BATCH_SIZE = 200;
const DRY_RUN = process.argv.includes('--dry-run');

const DEFAULT_CSV =
  '/Users/nickharsell/Downloads/Export_Contacts_undefined_Jul_2026_9_09_AM.csv';

type CsvRow = {
  'Contact Id'?: string;
  'First Name'?: string;
  'Last Name'?: string;
  Phone?: string;
  Email?: string;
  'Business Name'?: string;
  Created?: string;
  'Last Activity'?: string;
  Tags?: string;
};

type ContactInsert = {
  external_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  business_name: string | null;
  external_created_at: string | null;
  last_activity: string | null;
  tags: string | null;
  source: typeof SOURCE;
};

function emptyToNull(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed ? trimmed : null;
}

function parseCreated(value: string | undefined): string | null {
  const raw = emptyToNull(value);
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

async function readCsv(path: string): Promise<ContactInsert[]> {
  const rows: ContactInsert[] = [];
  const parser = createReadStream(path).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    }),
  );

  for await (const record of parser as AsyncIterable<CsvRow>) {
    const externalId = emptyToNull(record['Contact Id']);
    if (!externalId) continue;

    rows.push({
      external_id: externalId,
      first_name: emptyToNull(record['First Name']),
      last_name: emptyToNull(record['Last Name']),
      phone: emptyToNull(record.Phone),
      email: emptyToNull(record.Email),
      business_name: emptyToNull(record['Business Name']),
      external_created_at: parseCreated(record.Created),
      last_activity: emptyToNull(record['Last Activity']),
      tags: emptyToNull(record.Tags),
      source: SOURCE,
    });
  }

  return rows;
}

async function main() {
  const csvArg = process.argv.find(
    (arg, i) => i > 1 && arg !== '--dry-run' && !arg.startsWith('-'),
  );
  const csvPath = resolve(csvArg ?? DEFAULT_CSV);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or service role key in .env.local');
  }

  const contacts = await readCsv(csvPath);
  console.log(`Parsed ${contacts.length} contacts from ${csvPath}`);
  console.log(`source=${SOURCE} dryRun=${DRY_RUN}`);

  if (contacts.length === 0) {
    console.log('Nothing to import.');
    return;
  }

  if (DRY_RUN) {
    console.log('Sample row:', contacts[0]);
    return;
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let upserted = 0;
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('contacts').upsert(batch, {
      onConflict: 'source,external_id',
      ignoreDuplicates: false,
    });
    if (error) {
      throw new Error(`Upsert failed at offset ${i}: ${error.message}`);
    }
    upserted += batch.length;
    console.log(`Upserted ${upserted}/${contacts.length}`);
  }

  const { count, error: countError } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('source', SOURCE);

  if (countError) {
    throw new Error(`Count failed: ${countError.message}`);
  }

  console.log(`Done. contacts with source=${SOURCE}: ${count}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
