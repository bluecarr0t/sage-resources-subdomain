#!/usr/bin/env npx tsx
/**
 * Add one `all_glamping_properties` row per bookable site / unit type for
 * Bliss Camps Glamping (Rocky Mountain Glamping), Lyons CO — from ResNexus Standard Rate
 * for Sat May 16 – Mon May 18, 2026 (2 nights, USD). Nightly retail ADR is taken directly
 * from the engine’s “Standard Rate $X / night” line (no lump-sum interpretation).
 *
 * Source (retrieved 2026-05-15):
 *   https://resnexus.com/resnexus/reservations/book/FBC3464B-8E80-4D2F-9A73-04D21785D25C
 *   (dates preset in URL may differ; re-pick May 16–18, 2026 + Standard Rate to verify.)
 *
 * Property marketing site: https://blisscamps.com/
 *
 * Usage:
 *   npx tsx scripts/add-bliss-camps-rocky-mountain-resnexus-units.ts
 *   npx tsx scripts/add-bliss-camps-rocky-mountain-resnexus-units.ts --dry-run
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
/** Must match the anchor row’s `property_name` in Sage (admin / import). */
const PROPERTY = "Bliss Camps Glamping (Rocky Mountain Glamping)";
const TODAY = new Date().toISOString().split("T")[0];
const DRY_RUN = process.argv.includes("--dry-run");

const STAY_NIGHTS = 2;

const RESNEXUS_NOTE = `ADR from ResNexus Standard Rate (${STAY_NIGHTS}-night stay May 16–18, 2026 USD); nightly rate as shown in booking engine. Book: https://resnexus.com/resnexus/reservations/book/FBC3464B-8E80-4D2F-9A73-04D21785D25C`;

const DISCOVERY = `ResNexus booking engine (${STAY_NIGHTS} nights May 16–18, 2026, Standard Rate)`;

const UNITS: {
  site_name: string;
  unit_type: string;
  unit_capacity: string;
  /** Nightly Standard Rate (USD) from ResNexus for the quoted stay. */
  nightlyStandardUsd: number | null;
  unit_ada_accessibility: string | null;
  unit_pets: string | null;
}[] = [
  {
    site_name: "Explorer Tent Glamping",
    unit_type: "Safari tent",
    unit_capacity: "2",
    nightlyStandardUsd: 156.75,
    unit_ada_accessibility: null,
    unit_pets: "Yes",
  },
  {
    site_name: "Frontier Tent Glamping",
    unit_type: "Safari tent",
    unit_capacity: "2",
    nightlyStandardUsd: 152.0,
    unit_ada_accessibility: null,
    unit_pets: "Yes",
  },
  {
    site_name: "Sapphira Vardo Glamping",
    unit_type: "Vardo",
    unit_capacity: "2",
    nightlyStandardUsd: 147.25,
    unit_ada_accessibility: null,
    unit_pets: "Yes",
  },
  {
    site_name: "Shimza Vardo Glamping",
    unit_type: "Vardo",
    unit_capacity: "2",
    nightlyStandardUsd: 137.75,
    unit_ada_accessibility: null,
    unit_pets: "Yes",
  },
  {
    site_name: "Teardrop Camper",
    unit_type: "Teardrop trailer",
    unit_capacity: "2",
    nightlyStandardUsd: 75.0,
    unit_ada_accessibility: null,
    unit_pets: "Yes",
  },
  {
    site_name: "Bliss Camp Event Venue in Paradise",
    unit_type: "Property buyout",
    unit_capacity: "Group",
    nightlyStandardUsd: 795.0,
    unit_ada_accessibility: null,
    unit_pets: "Yes",
  },
  {
    site_name: "Bliss RV Site",
    unit_type: "RV Site",
    unit_capacity: "2",
    nightlyStandardUsd: 55.0,
    unit_ada_accessibility: null,
    unit_pets: "Yes",
  },
];

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function ratesMatchDb(dbVal: unknown, computed: number | null): boolean {
  if (computed == null) return dbVal == null || dbVal === "";
  const n = typeof dbVal === "number" ? dbVal : Number.parseFloat(String(dbVal));
  if (!Number.isFinite(n)) return false;
  return Math.abs(n - computed) < 0.005;
}

async function main() {
  console.log(DRY_RUN ? "DRY RUN — no inserts\n" : "LIVE insert\n");

  const { data: templates, error: fetchErr } = await supabase
    .from(TABLE)
    .select("*")
    .eq("property_name", PROPERTY)
    .order("id", { ascending: true })
    .limit(1);

  if (fetchErr) {
    console.error("Failed to load template row:", fetchErr.message);
    process.exit(1);
  }
  if (!templates?.length) {
    console.error(
      `No row found for property_name = '${PROPERTY}'. Add one base property row in admin (same exact name) first, then re-run.`,
    );
    process.exit(1);
  }

  const raw = templates[0] as Record<string, unknown>;
  const { id: _id, created_at: _c, updated_at: _u, ...templateRest } = raw;

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const u of UNITS) {
    const nightly = u.nightlyStandardUsd == null ? null : Math.round(u.nightlyStandardUsd * 100) / 100;

    const { data: existing } = await supabase
      .from(TABLE)
      .select("id, rate_avg_retail_daily_rate")
      .eq("property_name", PROPERTY)
      .eq("site_name", u.site_name)
      .limit(1);

    if (existing?.length) {
      const row = existing[0] as { id: number; rate_avg_retail_daily_rate: unknown };
      if (ratesMatchDb(row.rate_avg_retail_daily_rate, nightly)) {
        console.log(`Skip — ADR already ${nightly ?? "null"}: ${u.site_name}`);
        skipped += 1;
        continue;
      }
      if (DRY_RUN) {
        console.log(
          `Would update: ${u.site_name} rate_avg_retail_daily_rate ${String(row.rate_avg_retail_daily_rate)} → ${nightly ?? "null"}`,
        );
        updated += 1;
        continue;
      }
      const { error: upErr } = await supabase
        .from(TABLE)
        .update({
          rate_avg_retail_daily_rate: nightly,
          unit_type: u.unit_type,
          unit_capacity: u.unit_capacity,
          unit_pets: u.unit_pets ?? templateRest.unit_pets,
          unit_ada_accessibility: u.unit_ada_accessibility,
          discovery_source: DISCOVERY,
          date_updated: TODAY,
        })
        .eq("id", row.id);
      if (upErr) {
        console.error(`Update failed (${u.site_name}):`, upErr.message);
        process.exit(1);
      }
      console.log(`Updated: ${u.site_name} rate_avg_retail_daily_rate=${nightly ?? "null"}`);
      updated += 1;
      continue;
    }

    const row = {
      ...templateRest,
      site_name: u.site_name,
      slug: `${slugify(PROPERTY)}-${slugify(u.site_name)}`,
      unit_type: u.unit_type,
      unit_capacity: u.unit_capacity,
      rate_avg_retail_daily_rate: nightly,
      rate_unit_rates_by_year: null,
      unit_ada_accessibility: u.unit_ada_accessibility,
      unit_pets: u.unit_pets ?? templateRest.unit_pets,
      discovery_source: DISCOVERY,
      notes: [RESNEXUS_NOTE, templateRest.notes != null ? String(templateRest.notes) : ""].filter(Boolean).join("\n\n"),
      date_added: TODAY,
      date_updated: TODAY,
    };

    if (DRY_RUN) {
      console.log(`Would insert: ${u.site_name} rate_avg_retail_daily_rate=${nightly ?? "null"}`);
      inserted += 1;
      continue;
    }

    const { error } = await supabase.from(TABLE).insert(row);
    if (error) {
      console.error(`Insert failed (${u.site_name}):`, error.message);
      process.exit(1);
    }
    console.log(`Inserted: ${u.site_name} rate_avg_retail_daily_rate=${nightly ?? "null"}`);
    inserted += 1;
  }

  console.log(
    `\nDone. ${inserted} ${DRY_RUN ? "would be " : ""}inserted, ${updated} ${DRY_RUN ? "would be " : ""}ADR-synced, ${skipped} skipped (already correct).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
