#!/usr/bin/env npx tsx
/**
 * Audit published open glamping rows missing rate_avg_retail_daily_rate.
 *
 * Run: npx tsx scripts/audit-missing-published-adr-2026-07-09.ts
 *   or: npm run audit:missing-published-adr
 */
import { resolve } from 'path';
import {
  createP1AuditClient,
  csvEscape,
  normKey,
  parsePositiveNumber,
  writeCsv,
  OUTPUT_DIR,
} from '@/lib/sage-data-p1-audit';

type Row = {
  id: number;
  property_id: string | null;
  property_name: string | null;
  site_name: string | null;
  unit_type: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  url: string | null;
  brand_id: string | null;
  land_operator_category: string | null;
  research_status: string | null;
  is_open: string | null;
  is_glamping_property: string | null;
  rate_avg_retail_daily_rate: unknown;
  rate_winter_weekday: unknown;
  rate_winter_weekend: unknown;
  rate_spring_weekday: unknown;
  rate_spring_weekend: unknown;
  rate_summer_weekday: unknown;
  rate_summer_weekend: unknown;
  rate_fall_weekday: unknown;
  rate_fall_weekend: unknown;
};

const SEASON_COLS = [
  'rate_winter_weekday',
  'rate_winter_weekend',
  'rate_spring_weekday',
  'rate_spring_weekend',
  'rate_summer_weekday',
  'rate_summer_weekend',
  'rate_fall_weekday',
  'rate_fall_weekend',
] as const;

function isUs(country: string | null | undefined): boolean {
  const c = normKey(country);
  return c === 'united states' || c === 'usa' || c === 'us' || c === '';
}

function hasUrl(url: string | null | undefined): boolean {
  return Boolean(url?.trim());
}

function rowHasPositiveAdr(r: Row): boolean {
  if (parsePositiveNumber(r.rate_avg_retail_daily_rate) != null) return true;
  for (const col of SEASON_COLS) {
    if (parsePositiveNumber(r[col]) != null) return true;
  }
  return false;
}

function isMissingAdr(r: Row): boolean {
  const avg = parsePositiveNumber(r.rate_avg_retail_daily_rate);
  return avg == null;
}

function isPublishedOpenGlamping(r: Row): boolean {
  return (
    normKey(r.research_status) === 'published' &&
    normKey(r.is_open) === 'yes' &&
    normKey(r.is_glamping_property) === 'yes'
  );
}

async function main() {
  const supabase = createP1AuditClient();
  const select = [
    'id',
    'property_id',
    'property_name',
    'site_name',
    'unit_type',
    'city',
    'state',
    'country',
    'url',
    'brand_id',
    'land_operator_category',
    'research_status',
    'is_open',
    'is_glamping_property',
    'rate_avg_retail_daily_rate',
    ...SEASON_COLS,
  ].join(',');

  const all: Row[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('all_sage_data')
      .select(select)
      .eq('research_status', 'published')
      .order('id')
      .range(offset, offset + 999);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...(data as Row[]));
    if (data.length < 1000) break;
    offset += 1000;
  }

  const cohort = all.filter(isPublishedOpenGlamping);
  const withAdr = cohort.filter((r) => !isMissingAdr(r));
  const missing = cohort.filter(isMissingAdr);

  // Sibling rates: same property_id + same unit_type with positive ADR
  const byPidUnit = new Map<string, Row[]>();
  for (const r of all) {
    const pid = r.property_id?.trim();
    if (!pid) continue;
    const key = `${pid}\t${normKey(r.unit_type)}`;
    const list = byPidUnit.get(key) ?? [];
    list.push(r);
    byPidUnit.set(key, list);
  }

  function siblingHasRate(r: Row): boolean {
    const pid = r.property_id?.trim();
    if (!pid) return false;
    const key = `${pid}\t${normKey(r.unit_type)}`;
    const siblings = byPidUnit.get(key) ?? [];
    return siblings.some((s) => s.id !== r.id && rowHasPositiveAdr(s));
  }

  let withUrl = 0;
  let withoutUrl = 0;
  let us = 0;
  let intl = 0;
  let branded = 0;
  let independent = 0;
  let siblingCopy = 0;
  let privateCommercial = 0;

  const csvLines: string[] = [];
  for (const r of missing.sort((a, b) => a.id - b.id)) {
    const urlOk = hasUrl(r.url);
    const usRow = isUs(r.country);
    const sib = siblingHasRate(r);
    if (urlOk) withUrl += 1;
    else withoutUrl += 1;
    if (usRow) us += 1;
    else intl += 1;
    if (r.brand_id) branded += 1;
    else independent += 1;
    if (sib) siblingCopy += 1;
    if (normKey(r.land_operator_category) === 'private_commercial') {
      privateCommercial += 1;
    }

    csvLines.push(
      [
        String(r.id),
        csvEscape(r.property_name ?? ''),
        csvEscape(r.site_name ?? ''),
        csvEscape(r.unit_type ?? ''),
        csvEscape(r.city ?? ''),
        csvEscape(r.state ?? ''),
        csvEscape(r.country ?? ''),
        csvEscape(r.url ?? ''),
        csvEscape(r.brand_id ?? ''),
        csvEscape(r.land_operator_category ?? ''),
        String(urlOk),
        String(sib),
        String(usRow),
      ].join(',')
    );
  }

  const outPath = resolve(OUTPUT_DIR, 'missing-published-adr.csv');
  writeCsv(
    outPath,
    'id,property_name,site_name,unit_type,city,state,country,url,brand_id,land_operator_category,has_url,sibling_has_rate,is_us',
    csvLines
  );

  const coverage =
    cohort.length > 0
      ? ((withAdr.length / cohort.length) * 100).toFixed(1)
      : '0';

  console.log('\n=== Published open glamping ADR audit ===\n');
  console.log(`Cohort (published + open + glamping): ${cohort.length}`);
  console.log(`With positive rate_avg_retail_daily_rate: ${withAdr.length} (${coverage}%)`);
  console.log(`Missing ADR: ${missing.length}`);
  console.log(`  with URL: ${withUrl}`);
  console.log(`  without URL: ${withoutUrl}`);
  console.log(`  US: ${us}`);
  console.log(`  international: ${intl}`);
  console.log(`  branded: ${branded}`);
  console.log(`  independent: ${independent}`);
  console.log(`  sibling copy candidates (same property_id + unit_type): ${siblingCopy}`);
  console.log(`  private_commercial: ${privateCommercial}`);
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
