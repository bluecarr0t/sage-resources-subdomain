#!/usr/bin/env npx tsx
/**
 * Insert professionalized USA glamping pipeline properties found on 2026-09-18
 * (Tavily discovery after OpenAI extraction 429'd). Dedupes against all_sage_data.
 *
 * Usage:
 *   npx tsx scripts/insert-usa-pipeline-glamping-2026-09-18.ts --dry-run
 *   npx tsx scripts/insert-usa-pipeline-glamping-2026-09-18.ts
 */
import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  getDatabasePropertyNames,
  normalizePropertyName,
  propertyExistsInDb,
} from '../lib/glamping-discovery/deduplicate';
import { openInitialPipelineStatusHistory } from '../lib/glamping-pipeline/status-history';
import { toPipelineInsertRow } from '../lib/glamping-pipeline/to-insert-row';
import type { PipelineExtractedProperty } from '../lib/glamping-pipeline/types';

config({ path: resolve(process.cwd(), '.env.local') });

const DISCOVERY_SOURCE = 'web_research_usa_pipeline_2026_09_18';
const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const CANDIDATES: PipelineExtractedProperty[] = [
  {
    property_name: 'Stargazers Luxury Glamping Resort',
    city: 'Thompsonville',
    state: 'MI',
    country: 'United States',
    url: 'https://staystargazing.staystargazing.com/',
    description:
      'Planned 24-acre luxury glamping resort next to Crystal Mountain in Thompsonville, Michigan. Phase one is 13 climate-controlled 750 sq ft architectural domes (two king beds, kitchen, lounge) plus a seasonal pool and concierge-style guest service. Operator copy is launching soon / being developed; no independent construction-permit confirmation as of 2026-09-18.',
    unit_type: 'Dome',
    number_of_units: 13,
    is_open: 'Proposed Development',
    property_type: 'Glamping Resort',
    zip_code: '49683',
  },
  {
    property_name: 'The Outpost at Yellowstone',
    city: 'West Yellowstone',
    state: 'MT',
    country: 'United States',
    url: 'https://everwildhospitality.com/our-projects',
    description:
      'Everwild Hospitality Group flagship outdoor-hospitality development minutes from Yellowstone National Park. Pre-construction as of operator site: 10 modern cabins, 10 luxury yurts, 20 premium RV sites, and a lodge-style clubhouse with pool. Opening originally planned for 2026; still listed as pre-construction on 2026-09-18.',
    unit_type: 'Cabin',
    number_of_units: 20,
    is_open: 'Proposed Development',
    property_type: 'Glamping Resort',
    zip_code: '59758',
  },
];

async function main() {
  const dbNames = await getDatabasePropertyNames(supabase);
  let inserted = 0;

  for (const prop of CANDIDATES) {
    if (propertyExistsInDb(prop, dbNames)) {
      console.log(`skip existing: ${prop.property_name}`);
      continue;
    }

    const row = toPipelineInsertRow(prop, 'glamping', DISCOVERY_SOURCE, 'United States');
    const propertyId = randomUUID();
    const payload = { ...row, property_id: propertyId };

    console.log(
      `${DRY_RUN ? 'would insert' : 'insert'} ${row.property_name} | ${row.is_open} | ${row.city}, ${row.state} | ${row.quantity_of_units} ${row.unit_type}`
    );

    if (DRY_RUN) {
      dbNames.add(normalizePropertyName(row.property_name));
      inserted++;
      continue;
    }

    const { data, error } = await supabase
      .from('all_sage_data')
      .insert(payload)
      .select('id, slug, is_open')
      .single();

    if (error) {
      console.error(`insert failed for ${row.property_name}:`, error.message);
      continue;
    }

    await openInitialPipelineStatusHistory(supabase, {
      propertyId: data.id,
      slug: data.slug,
      isOpen: row.is_open as 'Proposed Development' | 'Under Construction',
      changeSource: 'manual_script',
      evidenceUrl: row.url,
    });

    dbNames.add(normalizePropertyName(row.property_name));
    inserted++;
  }

  console.log(`Done. ${inserted} ${DRY_RUN ? 'would be inserted' : 'inserted'}.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
