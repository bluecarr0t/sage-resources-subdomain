/**
 * Deletes all_glamping_properties rows for Verde Ranch* whose unit_type is
 * wagon / covered wagon / Conestoga (aligned with lib/glamping-unit-type-normalize).
 *
 * Run: npx tsx scripts/apply-remove-verde-ranch-wagon-rows.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  normalizeGlampingUnitTypeForStorage,
  primaryGlampingUnitTypeSegment,
} from '../lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });
config();

const VERDE_NAMES = ['Verde Ranch Resort', 'Verde Ranch RV Resort'] as const;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function isWagonFamilyUnitType(raw: string | null): boolean {
  if (raw == null || !String(raw).trim()) return false;
  const primary = primaryGlampingUnitTypeSegment(String(raw));
  const normalized = normalizeGlampingUnitTypeForStorage(primary);
  if (normalized === 'Covered Wagon') return true;
  const t = primary.toLowerCase();
  if (/\bconestoga\b/.test(t) && /\bwagon\b/.test(t)) return true;
  if (t === 'wagon' || t === 'wagons') return true;
  if (t.startsWith('wagon,') || t.startsWith('wagon;') || t.startsWith('wagon /')) return true;
  return false;
}

async function main() {
  const { data: rows, error: fetchErr } = await supabase
    .from('all_glamping_properties')
    .select('id, property_name, unit_type, site_name')
    .in('property_name', [...VERDE_NAMES]);

  if (fetchErr) {
    console.error('Fetch failed:', fetchErr.message);
    process.exit(1);
  }

  const targets = (rows ?? []).filter((r) => isWagonFamilyUnitType(r.unit_type));
  console.log(`Verde Ranch rows loaded: ${rows?.length ?? 0}`);
  console.log(`Rows to delete (wagon family): ${targets.length}`);

  if (targets.length === 0) {
    console.log('Nothing to delete.');
    return;
  }

  for (const r of targets) {
    const { error } = await supabase.from('all_glamping_properties').delete().eq('id', r.id);
    if (error) {
      console.error(`Delete id=${r.id} failed:`, error.message);
      process.exit(1);
    }
  }

  console.log('Done. Deleted ids:', targets.map((r) => r.id).join(', '));
}

main();
