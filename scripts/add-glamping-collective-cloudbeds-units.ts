#!/usr/bin/env npx tsx
/**
 * Add per–room-type rows for The Glamping Collective (Asheville / Clyde, NC) from
 * Cloudbeds Standard Rate totals for Jun 19–22, 2026 (3 nights, USD). Nightly retail ADR is always
 * `three_night_standard_usd / STAY_NIGHTS` (no lump-sum interpretation), rounded to cents.
 *
 * Source (retrieved 2026-05-15):
 *   https://theglampingcollective.cloudbeds.com/en/reservas/C7QMpY/
 *   ?referral_id=320396&association_direct=1&checkin=2026-06-19&checkout=2026-06-22&currency=usd
 *
 * XL Geo Dome showed as sold out for those dates (no Standard Rate on the engine); inserted with
 * null rate_avg_retail_daily_rate and a short notes provenance line.
 *
 * Usage:
 *   npx tsx scripts/add-glamping-collective-cloudbeds-units.ts
 *   npx tsx scripts/add-glamping-collective-cloudbeds-units.ts --dry-run
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
const PROPERTY = "The Glamping Collective";
const TODAY = new Date().toISOString().split("T")[0];
const DRY_RUN = process.argv.includes("--dry-run");

/** Must match Cloudbeds quote (check-in / check-out span). */
const STAY_NIGHTS = 3;

const CLOUDBEDS_NOTE = `ADR from Cloudbeds Standard Rate (${STAY_NIGHTS}-night stay Jun 19–22, 2026 USD); Standard total ÷ ${STAY_NIGHTS} = nightly retail. Booking: https://theglampingcollective.cloudbeds.com/en/reservas/C7QMpY/?checkin=2026-06-19&checkout=2026-06-22&currency=usd`;

const DISCOVERY = "Cloudbeds booking engine (Jun 19–22, 2026, Standard Rate)";

/** Standard Rate totals for `STAY_NIGHTS` nights from Cloudbeds. */
const UNITS: {
  site_name: string;
  unit_type: string;
  unit_capacity: string;
  threeNightStandardUsd: number | null;
  unit_ada_accessibility: string | null;
  unit_hot_tub: string | null;
}[] = [
  { site_name: "Ultra Luxe Dome", unit_type: "Dome", unit_capacity: "2", threeNightStandardUsd: 2416, unit_ada_accessibility: null, unit_hot_tub: "Yes" },
  { site_name: "Luxe Dome", unit_type: "Dome", unit_capacity: "2", threeNightStandardUsd: 2012, unit_ada_accessibility: null, unit_hot_tub: "Yes" },
  { site_name: "Luxe Glass Cabin", unit_type: "Cabin", unit_capacity: "2", threeNightStandardUsd: 1395, unit_ada_accessibility: null, unit_hot_tub: "Yes" },
  { site_name: "Glass Cabin", unit_type: "Cabin", unit_capacity: "2", threeNightStandardUsd: 930, unit_ada_accessibility: null, unit_hot_tub: null },
  { site_name: "Ultra Luxe Dome Accessible", unit_type: "Dome", unit_capacity: "2", threeNightStandardUsd: 2416, unit_ada_accessibility: "Yes", unit_hot_tub: "Yes" },
  { site_name: "Luxe Glass Cabin Accessible", unit_type: "Cabin", unit_capacity: "2", threeNightStandardUsd: 1395, unit_ada_accessibility: "Yes", unit_hot_tub: "Yes" },
  { site_name: "XL Luxe Geo Dome", unit_type: "Dome", unit_capacity: "4-6", threeNightStandardUsd: 2903, unit_ada_accessibility: null, unit_hot_tub: "Yes" },
  {
    site_name: "XL Geo Dome",
    unit_type: "Dome",
    unit_capacity: "4-6",
    threeNightStandardUsd: null,
    unit_ada_accessibility: null,
    unit_hot_tub: "Yes",
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

/** Nightly rate from multi-night Standard total: total ÷ nights (2 decimal USD). */
function nightlyRateFromStayTotal(totalUsd: number | null, nights: number): number | null {
  if (totalUsd == null || nights <= 0) return null;
  return Math.round((totalUsd / nights) * 100) / 100;
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
    console.error(`No row found for property_name = '${PROPERTY}'. Add a base property row first.`);
    process.exit(1);
  }

  const raw = templates[0] as Record<string, unknown>;
  const { id: _id, created_at: _c, updated_at: _u, ...templateRest } = raw;

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const u of UNITS) {
    const nightly = nightlyRateFromStayTotal(u.threeNightStandardUsd, STAY_NIGHTS);

    const { data: existing } = await supabase
      .from(TABLE)
      .select("id, rate_avg_retail_daily_rate")
      .eq("property_name", PROPERTY)
      .eq("site_name", u.site_name)
      .limit(1);

    if (existing?.length) {
      const row = existing[0] as { id: number; rate_avg_retail_daily_rate: unknown };
      if (ratesMatchDb(row.rate_avg_retail_daily_rate, nightly)) {
        console.log(`Skip — ADR already ${nightly ?? "null"} (${STAY_NIGHTS}nt): ${u.site_name}`);
        skipped += 1;
        continue;
      }
      if (DRY_RUN) {
        console.log(
          `Would update: ${u.site_name} rate_avg_retail_daily_rate ${String(row.rate_avg_retail_daily_rate)} → ${nightly ?? "null"} (${STAY_NIGHTS}nt total ÷ ${STAY_NIGHTS})`,
        );
        updated += 1;
        continue;
      }
      const { error: upErr } = await supabase
        .from(TABLE)
        .update({
          rate_avg_retail_daily_rate: nightly,
          discovery_source: DISCOVERY,
          date_updated: TODAY,
        })
        .eq("id", row.id);
      if (upErr) {
        console.error(`Update failed (${u.site_name}):`, upErr.message);
        process.exit(1);
      }
      console.log(`Updated: ${u.site_name} rate_avg_retail_daily_rate=${nightly ?? "null"} (${STAY_NIGHTS}nt ÷ ${STAY_NIGHTS})`);
      updated += 1;
      continue;
    }

    const notesExtra =
      u.threeNightStandardUsd == null
        ? " Jun 19–22 2026: XL Geo Dome sold out on Cloudbeds (no Standard Rate shown)."
        : "";

    const row = {
      ...templateRest,
      site_name: u.site_name,
      slug: `${slugify(PROPERTY)}-${slugify(u.site_name)}`,
      unit_type: u.unit_type,
      unit_capacity: u.unit_capacity,
      rate_avg_retail_daily_rate: nightly,
      rate_unit_rates_by_year: null,
      unit_ada_accessibility: u.unit_ada_accessibility,
      unit_hot_tub: u.unit_hot_tub ?? templateRest.unit_hot_tub,
      discovery_source: DISCOVERY,
      notes: [CLOUDBEDS_NOTE + notesExtra, templateRest.notes != null ? String(templateRest.notes) : ""]
        .filter(Boolean)
        .join("\n\n"),
      date_added: TODAY,
      date_updated: TODAY,
    };

    if (DRY_RUN) {
      console.log(`Would insert: ${u.site_name} rate_avg_retail_daily_rate=${nightly ?? "null"} (${STAY_NIGHTS}nt ÷ ${STAY_NIGHTS})`);
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
