/**
 * Backfill Hipcamp-sourced photos for Collinswood Retreat (property id 11446).
 * Google Places text search matches an unrelated business; public page uses glamping_property_images.
 *
 * Usage: npx tsx scripts/backfill-collinswood-retreat-images.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { execSync } from 'child_process';

config({ path: resolve(process.cwd(), '.env.local') });

const PROPERTY_ID = 11446;

const CLOUDINARY_PREFIX =
  'https://hipcamp-res.cloudinary.com/images/f_auto,c_limit,w_1920,q_auto';

/** Curated Hipcamp Cloudinary paths (hero + gallery), verified 2026-05-20 */
const HIPcamp_IMAGES: { path: string; kind: 'hero' | 'gallery'; caption?: string }[] = [
  {
    kind: 'hero',
    path: '/v1634487967/campground-photos/bmupxosmdc15eq5uldwg/collinswood-retreat-woodbend-campsite-central-alberta.jpg',
    caption: 'Woodbend campsite',
  },
  {
    kind: 'gallery',
    path: '/v1634487932/campground-photos/nz5pcjjoadkjrjdikbg2/collinswood-retreat-collinswood-retreat-camping-central-alberta.jpg',
    caption: 'Property overview',
  },
  {
    kind: 'gallery',
    path: '/v1689519174/land-photos/uhtubmv4txbpkxj6kqqv/collinswood-retreat-rosebud-cafe-central-alberta.jpg',
    caption: 'Rosebud Cafe',
  },
  {
    kind: 'gallery',
    path: '/v1717943096/dev-campground-photos/w6rrparigw43vljrgqyj/collinswood-retreat-back-country-forest-glen-yurt-central-alberta.jpg',
    caption: 'Forest Glen yurt',
  },
];

function main() {
  for (const img of HIPcamp_IMAGES) {
    console.log(`\n→ ${img.kind}: ${img.caption ?? img.path}`);
    const url = `${CLOUDINARY_PREFIX}${img.path}`;
    execSync(
      `npx tsx scripts/backfill-glamping-property-image-from-url.ts --property-id ${PROPERTY_ID} --url "${url}" --kind ${img.kind}`,
      { stdio: 'inherit', cwd: process.cwd() }
    );
  }
  console.log('\n✅ Collinswood Retreat images backfilled.');
}

main();
