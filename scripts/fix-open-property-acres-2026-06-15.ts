#!/usr/bin/env npx tsx
/**
 * Fix inflated acreage parsed from adjacent parks, lakes, and parent-ranch copy.
 *
 * Usage:
 *   npx tsx scripts/fix-open-property-acres-2026-06-15.ts
 *   npx tsx scripts/fix-open-property-acres-2026-06-15.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { propertyAcresFromSageFields } from '@/lib/pipeline-quarterly/property-acres';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_sage_data';
const DRY_RUN = process.argv.includes('--dry-run');
const TODAY = new Date().toISOString().split('T')[0];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

type DescriptionPatch = {
  id: number;
  propertyName: string;
  description: string;
};

const TREETOPIA_LEAD =
  'Treetopia Campground sits on ~225 acres in Catskill, NY. ';

function patchTreetopiaDescription(description: string): string {
  let next = description;
  if (!/~\s*225\s*acres/i.test(next)) {
    next = `${TREETOPIA_LEAD}${next.replace(/^Treetopia Campground,?\s*/i, '')}`;
  }
  next = next
    .replace(
      /(?:just steps away from|surrounded by|enjoy the natural beauty of|backdrop of) the expansive 700,000-acre Catskill Park/gi,
      'with easy access to the adjacent Catskill Park wilderness (about seven hundred thousand acres total)'
    )
    .replace(
      /the Catskill Mountains and its 700,000-acre wilderness/gi,
      'the Catskill Mountains, adjacent to the Catskill Park wilderness (about seven hundred thousand acres total)'
    )
    .replace(
      /(?:surrounded by|within) the expansive 700,000-acre Catskill Park/gi,
      'adjacent to the Catskill Park wilderness (about seven hundred thousand acres total)'
    );
  return next;
}

const TIMBERLINE_GOOD_DESCRIPTION =
  'Timberline Glamping Co. at Clarks Hill Lake offers a luxurious glamping experience nestled within the serene 75-acre Wildwood Park in Appling, Georgia. Guests can choose from comfortable, well-appointed canvas tents that feature cozy beds with proper linens, heating and cooling options, and amenities like a Keurig coffee maker. The property boasts unique features such as a wood fire pit, hammocks, and picnic tables, while also offering access to the vast 72,000-acre Clarks Hill Lake for fishing, boating, and water sports. Visitors can enjoy a variety of recreational activities, including scenic hikes on the historic Bartram Trail and playing at the International Disc Golf Center. With its blend of luxury and nature, Timberline Glamping Co. provides a perfect retreat for creating lasting memories with family and friends.';

const FRENCH_CREEK_DESCRIPTION =
  'French Creek at Brush Creek Ranch is an exclusive glamping enclave—four single-room cabins and a luxury yurt—on Brush Creek Ranch near Saratoga, Wyoming. This remote creekside retreat accommodates up to 14 guests with exceptionally personalized service, including a concierge, guides, and personal chef. Guests enjoy private access to over 20 miles of pristine fly-fishing waters along the North Platte River watershed, plus hunting and other outdoor pursuits. Brush Creek Ranch operates a large Wyoming fly-fishing and adventure ranch; French Creek itself is the most secluded and intimate glamping collection in the portfolio.';

const FRENCH_CREEK_ALT_DESCRIPTION =
  'French Creek at Brush Creek Ranch is a secluded and intimate glamping resort near Saratoga, Wyoming. This exclusive enclave offers four single-room cabins and a luxury yurt for up to 14 guests, with world-class fly-fishing, hunting, and concierge-led outdoor experiences. French Creek is the remote creekside glamping village within the broader Brush Creek Ranch operation in Saratoga County.';

const STATIC_PATCHES: DescriptionPatch[] = [
  {
    id: 10128,
    propertyName: 'Timberline Glamping Co. Clarks Hill Lake',
    description: TIMBERLINE_GOOD_DESCRIPTION,
  },
  {
    id: 10551,
    propertyName: 'French Creek at Bush Creek Ranch',
    description: FRENCH_CREEK_DESCRIPTION,
  },
  {
    id: 9841,
    propertyName: 'French Creek at Bush Creek Ranch',
    description: FRENCH_CREEK_ALT_DESCRIPTION,
  },
];

async function fetchTreetopiaRows(): Promise<DescriptionPatch[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, property_name, description')
    .eq('property_name', 'Treetopia Campground');

  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.description?.includes('700,000-acre'))
    .map((row) => ({
      id: row.id,
      propertyName: row.property_name,
      description: patchTreetopiaDescription(row.description ?? ''),
    }));
}

async function applyPatch(patch: DescriptionPatch): Promise<void> {
  const before = await supabase
    .from(TABLE)
    .select('description, address, notes')
    .eq('id', patch.id)
    .single();

  const beforeAcres = propertyAcresFromSageFields(before.data ?? {});
  const afterAcres = propertyAcresFromSageFields({
    description: patch.description,
    address: before.data?.address,
    notes: before.data?.notes,
  });

  console.log(
    `${DRY_RUN ? '[dry-run] ' : ''}${patch.propertyName} #${patch.id}: ${beforeAcres ?? '—'} -> ${afterAcres ?? '—'}`
  );

  if (DRY_RUN) return;

  const { error } = await supabase
    .from(TABLE)
    .update({
      description: patch.description,
      date_updated: TODAY,
    })
    .eq('id', patch.id);

  if (error) throw error;
}

async function main(): Promise<void> {
  const patches = [...(await fetchTreetopiaRows()), ...STATIC_PATCHES];
  console.log(`Applying ${patches.length} acreage description fixes...`);
  for (const patch of patches) {
    await applyPatch(patch);
  }
  console.log(DRY_RUN ? 'Dry run complete.' : 'Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
