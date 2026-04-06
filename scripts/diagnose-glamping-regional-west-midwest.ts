#!/usr/bin/env npx tsx
/**
 * Count Lodging (glamping-classified) rows in West / Midwest and why they are
 * included or excluded from "Regional ARDR and occupancy (2025)" map labels.
 *
 * Usage:
 *   npx tsx scripts/diagnose-glamping-regional-west-midwest.ts
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createServerClient } from '../lib/supabase';
import { CAMPSPOT_RV_OVERVIEW_PAGE_SELECT } from '../lib/rv-industry-overview/campspot-rv-overview-page-data';
import {
  CAMPSPOT_RV_OVERVIEW_MAX_ROWS,
  CAMPSPOT_RV_OVERVIEW_PAGE_SIZE,
  CAMPSPOT_RV_OVERVIEW_PARALLEL_PAGES,
} from '../lib/rv-industry-overview/campspot-fetch-cap';
import { classifyCampspotUnitChartBucket } from '../lib/rv-industry-overview/campspot-unit-type-chart-data';
import { normalizeState } from '../lib/anchor-point-insights/utils';
import {
  getRvIndustryRegionForStateAbbr,
  type RvIndustryRegionId,
} from '../lib/rv-industry-overview/us-rv-regions';
import {
  RV_MAP_REGIONAL_RATE_BANDS_GLAMPING,
  regionalMapLabelDiagnostics,
  type CampspotRvMapAggRow,
  type RegionalMapLabelExclusionReason,
} from '../lib/rv-industry-overview/campspot-rv-map-data';

config({ path: resolve(process.cwd(), '.env.local') });

const REGIONS: RvIndustryRegionId[] = ['west', 'midwest'];

type Row = CampspotRvMapAggRow & { property_name?: string | null; state?: string | null };

function emptyReasonCounts(): Record<RegionalMapLabelExclusionReason, number> {
  return {
    missing_2025_adr: 0,
    adr_below_standard_minimum_usd: 0,
    adr_above_standard_maximum_usd: 0,
    missing_occupancy: 0,
    occupancy_below_standard_minimum_pct: 0,
    occupancy_at_or_above_100_pct: 0,
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local — cannot query.'
    );
    process.exit(1);
  }

  const supabase = createServerClient();
  const pageSize = CAMPSPOT_RV_OVERVIEW_PAGE_SIZE;
  const parallel = CAMPSPOT_RV_OVERVIEW_PARALLEL_PAGES;

  const byRegion: Record<
    RvIndustryRegionId,
    { glampingRows: number; includedInLabels: number; excluded: ReturnType<typeof emptyReasonCounts> }
  > = {
    west: {
      glampingRows: 0,
      includedInLabels: 0,
      excluded: emptyReasonCounts(),
    },
    midwest: {
      glampingRows: 0,
      includedInLabels: 0,
      excluded: emptyReasonCounts(),
    },
  };

  /** Up to 8 samples per region for ADR above cap (for manual spot-check). */
  const samplesAboveMax: Record<RvIndustryRegionId, string[]> = { west: [], midwest: [] };

  let rowsScanned = 0;
  const fetchRange = (start: number, end: number) =>
    supabase
      .from('campspot')
      .select(CAMPSPOT_RV_OVERVIEW_PAGE_SELECT)
      .order('id', { ascending: true })
      .range(start, end);

  while (rowsScanned < CAMPSPOT_RV_OVERVIEW_MAX_ROWS) {
    const batchStarts: number[] = [];
    for (let p = 0; p < parallel; p++) {
      const start = rowsScanned + p * pageSize;
      if (start >= CAMPSPOT_RV_OVERVIEW_MAX_ROWS) break;
      batchStarts.push(start);
    }
    if (batchStarts.length === 0) break;

    const results = await Promise.all(batchStarts.map((s) => fetchRange(s, s + pageSize - 1)));

    let batchDone = false;
    for (const { data, error } of results) {
      if (error) {
        console.error('Fetch error:', error.message);
        process.exit(1);
      }
      if (!data?.length) {
        batchDone = true;
        break;
      }

      for (const raw of data as Row[]) {
        if (classifyCampspotUnitChartBucket(raw) !== 'glamping') continue;
        const abbr = normalizeState(raw.state);
        if (!abbr) continue;
        const regionId = getRvIndustryRegionForStateAbbr(abbr);
        if (!regionId || !REGIONS.includes(regionId)) continue;

        const slot = byRegion[regionId];
        slot.glampingRows += 1;

        const d = regionalMapLabelDiagnostics(raw, RV_MAP_REGIONAL_RATE_BANDS_GLAMPING);
        if (d.included) {
          slot.includedInLabels += 1;
        } else {
          slot.excluded[d.reason] += 1;
          if (
            d.reason === 'adr_above_standard_maximum_usd' &&
            samplesAboveMax[regionId].length < 8 &&
            raw.property_name
          ) {
            samplesAboveMax[regionId].push(
              `${raw.property_name} (${abbr}) ADR≈$${d.adr2025?.toFixed(0) ?? '?'}`
            );
          }
        }
      }

      rowsScanned += data.length;
      if (data.length < pageSize || rowsScanned >= CAMPSPOT_RV_OVERVIEW_MAX_ROWS) {
        batchDone = true;
        break;
      }
    }

    if (batchDone) break;
  }

  console.log(
    `Scanned ${rowsScanned} campspot rows (cap ${CAMPSPOT_RV_OVERVIEW_MAX_ROWS}).\n`
  );
  console.log(
    'Lodging (glamping-classified) rows in West / Midwest — regional map label gate:\n'
  );

  for (const r of REGIONS) {
    const s = byRegion[r];
    console.log(`--- ${r.toUpperCase()} ---`);
    console.log(`  Glamping rows in region:     ${s.glampingRows}`);
    console.log(`  Included in regional labels: ${s.includedInLabels}`);
    console.log('  Excluded by reason:');
    const reasons = Object.keys(s.excluded) as RegionalMapLabelExclusionReason[];
    for (const reason of reasons) {
      const n = s.excluded[reason];
      if (n > 0) console.log(`    ${reason}: ${n}`);
    }
    if (samplesAboveMax[r].length > 0) {
      console.log('  Sample properties (ADR above standard max):');
      for (const line of samplesAboveMax[r]) console.log(`    • ${line}`);
    }
    console.log('');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
