#!/usr/bin/env npx tsx
/**
 * Normalize US country labels on `all_glamping_properties`:
 *   `country = 'USA'` → `country = 'United States'`
 *
 * Run once after deploy; safe to re-run (no-op when no `USA` rows remain).
 *
 * Usage:
 *   npx tsx scripts/unify-all-glamping-properties-country-united-states.ts --dry-run
 *   npx tsx scripts/unify-all-glamping-properties-country-united-states.ts
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
const TARGET = "United States";
const DRY_RUN = process.argv.includes("--dry-run");
const TODAY = new Date().toISOString().split("T")[0];

async function main() {
  const { count, error: cErr } = await supabase
    .from(TABLE)
    .select("*", { count: "exact", head: true })
    .eq("country", "USA");

  if (cErr) {
    console.error(cErr.message);
    process.exit(1);
  }

  console.log(`Rows with country='USA': ${count ?? 0}`);
  if (DRY_RUN) {
    console.log("DRY RUN — no updates.");
    return;
  }

  if (!count) {
    console.log("Nothing to update.");
    return;
  }

  const { error: uErr } = await supabase
    .from(TABLE)
    .update({ country: TARGET, date_updated: TODAY })
    .eq("country", "USA");

  if (uErr) {
    console.error(uErr.message);
    process.exit(1);
  }

  console.log(`Updated ${count} row(s) → country='${TARGET}'.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
