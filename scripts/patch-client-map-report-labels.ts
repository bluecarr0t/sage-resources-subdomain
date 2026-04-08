#!/usr/bin/env npx tsx
/**
 * One-off / repeatable fixes for `reports.property_name` and `reports.title` used on the client map.
 *
 *   npx tsx scripts/patch-client-map-report-labels.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

type ReportLabelPatch = {
  study_id: string;
  property_name?: string;
  title?: string;
  city?: string;
  location?: string;
};

const PATCHES: ReportLabelPatch[] = [
  {
    study_id: '23-222B-08',
    property_name: 'Starry Skies RV Park',
    title: 'Starry Skies RV Park - 23-222B-08',
  },
  {
    study_id: '25-271A-08',
    property_name: 'Bellaire, MI Glamping Market Analysis',
    title: 'Bellaire, MI Glamping Market Analysis - 25-271A-08',
  },
  {
    study_id: '23-244A-09',
    property_name: 'Starlite Classic Campground',
    title: 'Starlite Classic Campground - 23-244A-09',
    city: 'Cañon City',
    location: '30 County Road 3A, Cañon City, CO 81212',
  },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  for (const p of PATCHES) {
    const update: Record<string, string> = {};
    if (p.property_name != null) update.property_name = p.property_name;
    if (p.title != null) update.title = p.title;
    if (p.city != null) update.city = p.city;
    if (p.location != null) update.location = p.location;
    if (Object.keys(update).length === 0) {
      console.warn(`${p.study_id}: empty patch, skip`);
      continue;
    }

    const { data, error } = await supabase
      .from('reports')
      .update(update)
      .eq('study_id', p.study_id)
      .is('deleted_at', null)
      .select('id, study_id')
      .maybeSingle();

    if (error) {
      console.error(`${p.study_id}:`, error.message);
      process.exit(1);
    }
    if (!data) {
      console.warn(`${p.study_id}: no active row updated (missing or wrong study_id)`);
    } else {
      const label = p.property_name ?? p.city ?? p.study_id;
      console.log(`Updated ${p.study_id} → ${label} (${data.id})`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
