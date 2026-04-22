/**
 * Calculate aggregate rate metrics from the all_glamping_properties table:
 *   1. Avg. retail daily rate
 *   2. Weekday rates per season
 *   3. Weekend rates per season
 *   4. Avg. weekend premium (weekend - weekday) per season + overall
 *
 * Run with: npx tsx scripts/calculate-glamping-rate-metrics.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SEASONS = ['winter', 'spring', 'summer', 'fall'] as const;
type Season = (typeof SEASONS)[number];

type RateRow = {
  rate_avg_retail_daily_rate: number | null;
  rate_winter_weekday: number | null;
  rate_winter_weekend: number | null;
  rate_spring_weekday: number | null;
  rate_spring_weekend: number | null;
  rate_summer_weekday: number | null;
  rate_summer_weekend: number | null;
  rate_fall_weekday: number | null;
  rate_fall_weekend: number | null;
};

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function fmtMoney(n: number | null): string {
  if (n === null) return 'n/a';
  return `$${n.toFixed(2)}`;
}

function fmtMoneySigned(n: number | null): string {
  if (n === null) return 'n/a';
  const sign = n >= 0 ? '+' : '-';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

async function fetchAll(): Promise<RateRow[]> {
  const all: RateRow[] = [];
  const batchSize = 1000;
  let offset = 0;
  let totalCount = 0;

  while (true) {
    const { data, error, count } = await supabase
      .from('all_glamping_properties')
      .select(
        'rate_avg_retail_daily_rate,rate_winter_weekday,rate_winter_weekend,rate_spring_weekday,rate_spring_weekend,rate_summer_weekday,rate_summer_weekend,rate_fall_weekday,rate_fall_weekend',
        { count: 'exact' }
      )
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('Error fetching rows:', error);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    if (totalCount === 0 && count !== null) totalCount = count;

    all.push(
      ...data.map((r) => ({
        rate_avg_retail_daily_rate: toNum(r.rate_avg_retail_daily_rate),
        rate_winter_weekday: toNum(r.rate_winter_weekday),
        rate_winter_weekend: toNum(r.rate_winter_weekend),
        rate_spring_weekday: toNum(r.rate_spring_weekday),
        rate_spring_weekend: toNum(r.rate_spring_weekend),
        rate_summer_weekday: toNum(r.rate_summer_weekday),
        rate_summer_weekend: toNum(r.rate_summer_weekend),
        rate_fall_weekday: toNum(r.rate_fall_weekday),
        rate_fall_weekend: toNum(r.rate_fall_weekend),
      }))
    );

    process.stdout.write(`  Fetched ${all.length}${totalCount ? ` / ${totalCount}` : ''} rows\r`);
    if (data.length < batchSize) break;
    offset += batchSize;
  }

  process.stdout.write('\n');
  return all;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function summarize(label: string, values: number[]) {
  const m = avg(values);
  const med = median(values);
  console.log(
    `  ${label.padEnd(24)} avg=${fmtMoney(m).padStart(9)}  median=${fmtMoney(med).padStart(9)}  n=${values.length}`
  );
}

async function main() {
  console.log('Fetching all_glamping_properties rate columns...');
  const rows = await fetchAll();
  console.log(`Total rows fetched: ${rows.length}\n`);

  const weekday: Record<Season, number[]> = { winter: [], spring: [], summer: [], fall: [] };
  const weekend: Record<Season, number[]> = { winter: [], spring: [], summer: [], fall: [] };
  const premiums: Record<Season, number[]> = { winter: [], spring: [], summer: [], fall: [] };
  const avgRetail: number[] = [];

  for (const r of rows) {
    if (r.rate_avg_retail_daily_rate !== null) avgRetail.push(r.rate_avg_retail_daily_rate);

    for (const s of SEASONS) {
      const wd = r[`rate_${s}_weekday` as keyof RateRow] as number | null;
      const we = r[`rate_${s}_weekend` as keyof RateRow] as number | null;
      if (wd !== null) weekday[s].push(wd);
      if (we !== null) weekend[s].push(we);
      if (wd !== null && we !== null) premiums[s].push(we - wd);
    }
  }

  console.log('=== 1. Avg. Retail Daily Rate (all properties) ===');
  summarize('Avg retail daily rate', avgRetail);

  console.log('\n=== 2. Weekday Rates per Season ===');
  for (const s of SEASONS) summarize(`${s} weekday`, weekday[s]);

  console.log('\n=== 3. Weekend Rates per Season ===');
  for (const s of SEASONS) summarize(`${s} weekend`, weekend[s]);

  console.log('\n=== 4. Avg. Weekend Premium per Season (weekend - weekday) ===');
  const allPremiums: number[] = [];
  for (const s of SEASONS) {
    const m = avg(premiums[s]);
    const med = median(premiums[s]);
    console.log(
      `  ${(s + ' premium').padEnd(24)} avg=${fmtMoneySigned(m).padStart(9)}  median=${fmtMoneySigned(med).padStart(9)}  n=${premiums[s].length}`
    );
    allPremiums.push(...premiums[s]);
  }

  const overallPremiumAvg = avg(allPremiums);
  const overallPremiumMed = median(allPremiums);
  console.log(
    `\n  ${'OVERALL premium'.padEnd(24)} avg=${fmtMoneySigned(overallPremiumAvg).padStart(9)}  median=${fmtMoneySigned(overallPremiumMed).padStart(9)}  n=${allPremiums.length}`
  );

  console.log('\n=== Summary (rounded, for graphics) ===');
  console.log(JSON.stringify(
    {
      avg_retail_daily_rate: avgRetail.length ? Math.round(avg(avgRetail)!) : null,
      weekday_per_season: Object.fromEntries(
        SEASONS.map((s) => [s, weekday[s].length ? Math.round(avg(weekday[s])!) : null])
      ),
      weekend_per_season: Object.fromEntries(
        SEASONS.map((s) => [s, weekend[s].length ? Math.round(avg(weekend[s])!) : null])
      ),
      weekend_premium_per_season: Object.fromEntries(
        SEASONS.map((s) => [s, premiums[s].length ? Math.round(avg(premiums[s])!) : null])
      ),
      overall_weekend_premium: overallPremiumAvg !== null ? Math.round(overallPremiumAvg) : null,
      sample_sizes: {
        avg_retail_daily_rate: avgRetail.length,
        weekday_per_season: Object.fromEntries(SEASONS.map((s) => [s, weekday[s].length])),
        weekend_per_season: Object.fromEntries(SEASONS.map((s) => [s, weekend[s].length])),
        weekend_premium_per_season: Object.fromEntries(SEASONS.map((s) => [s, premiums[s].length])),
      },
    },
    null,
    2
  ));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
