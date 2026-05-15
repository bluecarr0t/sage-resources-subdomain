#!/usr/bin/env npx tsx
/**
 * Backfill `url` on `all_glamping_properties` for `research_status = in_progress`
 * rows with missing website, using web-researched official / canonical booking URLs
 * (2026-05-15).
 *
 * Usage:
 *   npx tsx scripts/backfill-in-progress-glamping-urls.ts --dry-run
 *   npx tsx scripts/backfill-in-progress-glamping-urls.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLE = "all_glamping_properties";
const TODAY = new Date().toISOString().split("T")[0];
const DRY_RUN = process.argv.includes("--dry-run");

/** id -> canonical https URL (web research, May 2026). */
const URL_BY_ID: Record<number, string> = {
  11449: "https://www.hipcamp.com/en-CA/land/alberta-fungi-forest-retreat-2ejhpve1",
  11469: "https://www.ofland29palmsresort.com/",
  11455: "https://www.hiddensprings.ca/",
  11453: "https://www.secretsanctuary.ca/",
  11467: "https://thehavenofcadillac.com/",
  11450: "https://www.hipcamp.com/en-CA/land/alberta-creek-s-edge-2ejh5r88",
  11451: "https://www.hipcamp.com/en-CA/land/alberta-homegrown-campground-cabins-5x5hpdn9",
  11452: "https://www.hipcamp.com/en-CA/land/alberta-elk-island-getaway-dw9h2e2w",
  11454: "https://www.trappershill.com/",
  11456: "https://www.hipcamp.com/en-CA/land/alberta-forest-retreat-cabins-camping-kk9hdddj",
  11795: "https://thecanyonatpondcreek.com/",
};

async function main() {
  console.log(DRY_RUN ? "DRY RUN\n" : "LIVE\n");

  const { data: rows, error } = await supabase
    .from(TABLE)
    .select("id, property_name, url")
    .eq("research_status", "in_progress")
    .or("url.is.null,url.eq.");

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const list = rows ?? [];
  console.log(`Found ${list.length} in_progress row(s) with missing url.\n`);

  let updated = 0;
  let skipped = 0;

  for (const r of list) {
    const id = Number(r.id);
    const url = URL_BY_ID[id];
    if (!url) {
      console.warn(`No URL mapping for id=${id} (${r.property_name})`);
      skipped += 1;
      continue;
    }

    if (DRY_RUN) {
      console.log(`Would update id=${id} ${JSON.stringify(r.property_name)} → ${url}`);
      updated += 1;
      continue;
    }

    const { error: upErr } = await supabase.from(TABLE).update({ url, date_updated: TODAY }).eq("id", id);

    if (upErr) {
      console.error(`Update failed id=${id}:`, upErr.message);
      process.exit(1);
    }
    console.log(`Updated id=${id} ${JSON.stringify(r.property_name)} → ${url}`);
    updated += 1;
  }

  console.log(`\nDone. ${updated} ${DRY_RUN ? "would be " : ""}updated, ${skipped} skipped.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
