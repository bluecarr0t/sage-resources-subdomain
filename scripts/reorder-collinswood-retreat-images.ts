/**
 * Collinswood Retreat (id 11446): reorder public images.
 * Default action: promote the 4th image (by sort_order) to hero.
 *
 * Usage: npx tsx scripts/reorder-collinswood-retreat-images.ts
 * Dry-run: npx tsx scripts/reorder-collinswood-retreat-images.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const PROPERTY_ID = 11446;

/** 1-based display index to promote (4 = fourth image in carousel). */
const PROMOTE_DISPLAY_INDEX = 4;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const { createServerClient } = await import('@/lib/supabase');
  const supabase = createServerClient();

  const { data: rows, error } = await supabase
    .from('glamping_property_images')
    .select('id, kind, storage_path, caption, sort_order')
    .eq('property_id', PROPERTY_ID)
    .in('kind', ['hero', 'gallery'])
    .order('sort_order', { ascending: true });

  if (error) throw error;
  if (!rows?.length) {
    console.error('No images found for property', PROPERTY_ID);
    process.exit(1);
  }

  console.log(`Found ${rows.length} image(s) for property ${PROPERTY_ID}`);
  rows.forEach((r, i) => {
    console.log(`  ${i + 1}. sort=${r.sort_order} [${r.kind}] ${r.caption ?? ''} ${r.storage_path}`);
  });

  const promoteIndex = PROMOTE_DISPLAY_INDEX - 1;
  if (promoteIndex < 0 || promoteIndex >= rows.length) {
    console.error(`Cannot promote display index ${PROMOTE_DISPLAY_INDEX} (${rows.length} images)`);
    process.exit(1);
  }

  const newHero = rows[promoteIndex]!;
  const galleryRows = rows.filter((r) => r.id !== newHero.id);

  if (dryRun) {
    console.log(`\n[dry-run] New hero (#${PROMOTE_DISPLAY_INDEX}):`, newHero.storage_path);
    console.log(
      '[dry-run] Gallery order:',
      galleryRows.map((r, i) => `${i + 1}. ${r.caption ?? r.storage_path}`)
    );
    return;
  }

  await supabase
    .from('glamping_property_images')
    .update({ kind: 'gallery' })
    .eq('property_id', PROPERTY_ID)
    .eq('kind', 'hero');

  const { error: heroErr } = await supabase
    .from('glamping_property_images')
    .update({
      kind: 'hero',
      sort_order: 0,
      caption: newHero.caption ?? 'Forest Glen yurt',
    })
    .eq('id', newHero.id)
    .eq('property_id', PROPERTY_ID);
  if (heroErr) throw heroErr;
  console.log('Set hero:', newHero.storage_path);

  for (let i = 0; i < galleryRows.length; i++) {
    const row = galleryRows[i]!;
    const { error: upErr } = await supabase
      .from('glamping_property_images')
      .update({ kind: 'gallery', sort_order: i + 1 })
      .eq('id', row.id)
      .eq('property_id', PROPERTY_ID);
    if (upErr) throw upErr;
    console.log(`Gallery ${i + 1}:`, row.caption ?? row.storage_path);
  }

  console.log(`\n✅ Collinswood Retreat: image #${PROMOTE_DISPLAY_INDEX} is now hero.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
