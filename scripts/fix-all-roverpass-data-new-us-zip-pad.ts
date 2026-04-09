/**
 * Left-pad US ZIP codes in all_roverpass_data_new that are 3 or 4 digits (leading zero lost).
 *
 * Rules (mirror scripts/migrations/fix-all-roverpass-data-new-us-zip-leading-zero.sql):
 * - Pad trim(zip) to length 5 with leading zeros when all digits and length 3 or 4
 * - Only when country is US (or null with a US state/territory abbreviation)
 * - Skip Australian states (valid 4-digit AU postcodes must not become 5-digit "US" zips)
 * - Skip Canada, Mexico, Australia country values
 *
 * Usage:
 *   npx tsx scripts/fix-all-roverpass-data-new-us-zip-pad.ts
 *   npx tsx scripts/fix-all-roverpass-data-new-us-zip-pad.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_roverpass_data_new';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const US_COUNTRY = new Set([
  'usa',
  'us',
  'united states',
  'united states of america',
]);

const NON_US_COUNTRY = new Set(['canada', 'mexico', 'australia']);

const AU_STATES = new Set([
  'new south wales',
  'queensland',
  'victoria',
  'tasmania',
  'south australia',
  'western australia',
  'australian capital territory',
  'northern territory',
]);

const US_STATE_ABBREVS = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY', 'DC', 'PR', 'VI', 'GU', 'AS', 'MP',
]);

/** When country is blank, RoverPass often uses full state/territory names — still US locations. */
const US_STATE_OR_TERRITORY_FULL = new Set([
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware',
  'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky',
  'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri',
  'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york',
  'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode island',
  'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington',
  'west virginia', 'wisconsin', 'wyoming', 'district of columbia', 'puerto rico', 'guam',
  'american samoa', 'northern mariana islands', 'u.s. virgin islands', 'us virgin islands',
  'united states virgin islands', 'virgin islands',
]);

type Row = { id: number; zip_code: string | null; country: string | null; state: string | null };

function norm(s: string | null): string {
  return (s ?? '').trim().toLowerCase();
}

function isAustralianState(state: string | null): boolean {
  return AU_STATES.has(norm(state));
}

function isNonUsCountry(country: string | null): boolean {
  return NON_US_COUNTRY.has(norm(country));
}

function isUsCountry(country: string | null): boolean {
  const c = norm(country);
  return US_COUNTRY.has(c);
}

function isBlankCountry(country: string | null): boolean {
  return !country?.trim();
}

function isUsStateAbbrev(state: string | null): boolean {
  const s = state?.trim().toUpperCase();
  return !!s && US_STATE_ABBREVS.has(s);
}

function isUsStateOrTerritoryFullName(state: string | null): boolean {
  return US_STATE_OR_TERRITORY_FULL.has(norm(state));
}

function shouldPadLocation(row: Row): boolean {
  if (isAustralianState(row.state)) return false;
  if (isNonUsCountry(row.country)) return false;
  if (isUsCountry(row.country)) return true;
  if (
    isBlankCountry(row.country) &&
    (isUsStateAbbrev(row.state) || isUsStateOrTerritoryFullName(row.state))
  ) {
    return true;
  }
  return false;
}

function paddedZip(zip: string): string | null {
  const t = zip.trim();
  if (/^\d{4}$/.test(t) || /^\d{3}$/.test(t)) return t.padStart(5, '0');
  return null;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  if (!supabaseUrl || !secretKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows: Row[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, zip_code, country, state')
      .range(from, from + page - 1);
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    if (!data?.length) break;
    rows.push(...(data as Row[]));
    if (data.length < page) break;
  }

  const updates: { id: number; from: string; to: string }[] = [];
  for (const row of rows) {
    const z = row.zip_code;
    if (z == null || !String(z).trim()) continue;
    const next = paddedZip(String(z));
    if (!next || next === String(z).trim()) continue;
    if (!shouldPadLocation(row)) continue;
    updates.push({ id: row.id, from: String(z).trim(), to: next });
  }

  console.log(`${dryRun ? '[dry-run] ' : ''}Rows to update: ${updates.length}`);
  if (updates.length <= 30) {
    updates.forEach((u) => console.log(`  id ${u.id}: ${u.from} → ${u.to}`));
  } else {
    updates.slice(0, 15).forEach((u) => console.log(`  id ${u.id}: ${u.from} → ${u.to}`));
    console.log(`  ... and ${updates.length - 15} more`);
  }

  if (dryRun || updates.length === 0) return;

  let ok = 0;
  let fail = 0;
  for (const u of updates) {
    const { error } = await supabase
      .from(TABLE)
      .update({ zip_code: u.to, updated_at: new Date().toISOString() })
      .eq('id', u.id);
    if (error) {
      console.error(`  ❌ id ${u.id}:`, error.message);
      fail++;
    } else {
      ok++;
    }
  }

  console.log(`\n✅ Updated ${ok} rows${fail ? `, ${fail} failed` : ''}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
