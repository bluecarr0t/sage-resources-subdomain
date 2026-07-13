#!/usr/bin/env npx tsx
/**
 * Retarget the Sage row historically labeled "Douglas Ranch" (Huntsville, UT /
 * douglas-ranch.com) to **Douglas Lake Ranch** — Douglas Lake Cattle Co., BC — and add
 * one `all_glamping_properties` row per published accommodation / rate class from
 * https://www.douglaslake.com/ (rates as published on property pages, retrieved 2026-05-15).
 *
 * Head office (contact page): 2620 Home Ranch Lane, Douglas Lake, BC V0E 1S0
 * Recreation reservations: 1-800-663-4838
 *
 * Usage:
 *   npx tsx scripts/add-douglas-lake-ranch-site-rows.ts --dry-run
 *   npx tsx scripts/add-douglas-lake-ranch-site-rows.ts
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
const PROPERTY = "Douglas Lake Ranch";
/** Legacy misfiled row to retarget (see migration note in ANCHOR_NOTES). */
const LEGACY_PROPERTY_NAME = "Douglas Ranch";
const TODAY = new Date().toISOString().split("T")[0];
const DRY_RUN = process.argv.includes("--dry-run");

const ANCHOR_NOTES = [
  "Row retargeted from legacy import: property_name was “Douglas Ranch” (Huntsville, UT) with url douglas-ranch.com — corrected to Douglas Lake Cattle Co. / Douglas Lake Ranch, BC per https://www.douglaslake.com/ (2026-05-15).",
  "Nightly rates below are **published rack** values from the ranch website; many products require 2–3 night minimums, seasonal closure, or phone booking — see each page for policies.",
].join("\n\n");

const PROPERTY_DESCRIPTION =
  "Douglas Lake Ranch (Douglas Lake Cattle Co.) is an iconic working cattle ranch in British Columbia offering private-lake fly fishing, lakeside yurts, Salmon Lake Resort cabins and camping, Stoney Lake Lodge group rentals, private backcountry campsites, and the historic Quilchena Hotel as a private rental.";

const DISCOVERY = "Douglas Lake Cattle Co. official website (published rates, 2026-05-15)";

type UnitSpec = {
  site_name: string;
  unit_type: string;
  unit_capacity: string;
  nightlyUsd: number | null;
  notesLine?: string;
};

/**
 * Representative nightly rates from site pages (weekday cabin rates used where split weekday/weekend).
 */
const UNITS: UnitSpec[] = [
  {
    site_name: "Salmon Lake Resort — 1-bedroom cabin (#1,3,5,7,9)",
    unit_type: "Cabin",
    unit_capacity: "4",
    nightlyUsd: 165,
    notesLine: "Weekday rack; weekends $175/night on site. 2-night minimum. https://www.douglaslake.com/salmon",
  },
  {
    site_name: "Salmon Lake Resort — 2-bedroom cabin (#2,4,6,8,10,11)",
    unit_type: "Cabin",
    unit_capacity: "4",
    nightlyUsd: 185,
    notesLine: "Weekday rack; weekends $195/night on site. 2-night minimum. https://www.douglaslake.com/salmon",
  },
  {
    site_name: "Salmon Lake Resort — RV site (power + water)",
    unit_type: "RV Site",
    unit_capacity: "4",
    nightlyUsd: 37,
    notesLine: "“Regular” RV site. https://www.douglaslake.com/salmon",
  },
  {
    site_name: "Salmon Lake Resort — RV Plus site (power, water + septic)",
    unit_type: "RV Site",
    unit_capacity: "4",
    nightlyUsd: 47,
    notesLine: "https://www.douglaslake.com/salmon",
  },
  {
    site_name: "Salmon Lake Resort — dry campsite",
    unit_type: "Campsite",
    unit_capacity: "4",
    nightlyUsd: 25,
    notesLine: "https://www.douglaslake.com/salmon",
  },
  {
    site_name: "Salmon Lake Yurt",
    unit_type: "Yurt",
    unit_capacity: "6",
    nightlyUsd: 300,
    notesLine: "Includes 2 rowboats; 4x4 recommended. https://www.douglaslake.com/yurt-index",
  },
  {
    site_name: "Wasley Lake Yurts (#1 and #2)",
    unit_type: "Yurt",
    unit_capacity: "6",
    nightlyUsd: 325,
    notesLine: "Same published nightly rate for each of two yurts. 4x4 required. https://www.douglaslake.com/yurt-index",
  },
  {
    site_name: "Jerry's Yurt (Mellin Lake)",
    unit_type: "Yurt",
    unit_capacity: "6",
    nightlyUsd: 325,
    notesLine: "https://www.douglaslake.com/yurt-index",
  },
  {
    site_name: "Minnie Lake Yurt No. 1",
    unit_type: "Yurt",
    unit_capacity: "6",
    nightlyUsd: 375,
    notesLine: "Rod fees included per site. https://www.douglaslake.com/yurt-index",
  },
  {
    site_name: "Hidden Yurt at Minnie Lake",
    unit_type: "Yurt",
    unit_capacity: "6",
    nightlyUsd: 475,
    notesLine: "30' yurt; rod fees included. https://www.douglaslake.com/yurt-index",
  },
  {
    site_name: "Stoney Lake Lodge — full lodge rental (8 rooms, 15 guests)",
    unit_type: "Lodge",
    unit_capacity: "15",
    nightlyUsd: 2000,
    notesLine: "Non-staffed vacation rental; 2-night min (3 on long weekends). May 1–Oct 15 fishing season. https://www.douglaslake.com/stoney",
  },
  {
    site_name: "Stoney Lake Lodge — partial rental (rooms 1–5 wing, ≤10 guests)",
    unit_type: "Lodge",
    unit_capacity: "10",
    nightlyUsd: 1500,
    notesLine: "https://www.douglaslake.com/stoney",
  },
  {
    site_name: "Crater Lake camping — standard site",
    unit_type: "Campsite",
    unit_capacity: "6",
    nightlyUsd: 50,
    notesLine: "2 regular sites on lake; 4x4 recommended. https://www.douglaslake.com/camping-index",
  },
  {
    site_name: "Crater Lake camping — group site",
    unit_type: "Campsite",
    unit_capacity: "12",
    nightlyUsd: 100,
    notesLine: "https://www.douglaslake.com/camping-index",
  },
  {
    site_name: "Alleyne Lake camping",
    unit_type: "Campsite",
    unit_capacity: "6",
    nightlyUsd: 35,
    notesLine: "5 sites total; steep access. https://www.douglaslake.com/camping-index",
  },
  {
    site_name: "Big Sabin Lake camping",
    unit_type: "Campsite",
    unit_capacity: "6",
    nightlyUsd: 45,
    notesLine: "2 sites. https://www.douglaslake.com/camping-index",
  },
  {
    site_name: "Little Sabin Lake camping",
    unit_type: "Campsite",
    unit_capacity: "6",
    nightlyUsd: 50,
    notesLine: "1 site. https://www.douglaslake.com/camping-index",
  },
  {
    site_name: "Quilchena Hotel — entire facility rental (EFR)",
    unit_type: "Hotel Room",
    unit_capacity: "30",
    nightlyUsd: 3300,
    notesLine: "15 rooms; private non-staffed rental; 2-night minimum. https://www.douglaslake.com/quilchena-resort",
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
  console.log(DRY_RUN ? "DRY RUN\n" : "LIVE\n");

  let anchors: Record<string, unknown>[] | null = null;
  let findErr: { message: string } | null = null;

  const legacy = await supabase
    .from(TABLE)
    .select("*")
    .eq("property_name", LEGACY_PROPERTY_NAME)
    .order("id", { ascending: true })
    .limit(1);
  findErr = legacy.error;
  if (legacy.data?.length) anchors = legacy.data;

  if (!anchors?.length) {
    const renamed = await supabase
      .from(TABLE)
      .select("*")
      .eq("property_name", PROPERTY)
      .is("site_name", null)
      .order("id", { ascending: true })
      .limit(1);
    findErr = renamed.error;
    if (renamed.data?.length) anchors = renamed.data;
  }

  if (findErr) {
    console.error(findErr.message);
    process.exit(1);
  }

  const anchor = anchors?.[0];
  if (!anchor) {
    console.error(`No anchor row for ${LEGACY_PROPERTY_NAME} (or renamed ${PROPERTY} with empty site_name).`);
    process.exit(1);
  }

  const anchorId = (anchor as { id: number }).id;

  const anchorUpdate = {
    property_name: PROPERTY,
    site_name: null,
    slug: slugify(PROPERTY),
    address: "2620 Home Ranch Lane",
    city: "Douglas Lake",
    state: "BC",
    zip_code: "V0E 1S0",
    country: "Canada",
    lat: 50.1633094,
    lon: -120.1960212,
    url: "https://www.douglaslake.com/",
    phone_number: "1-800-663-4838",
    description: PROPERTY_DESCRIPTION,
    discovery_source: DISCOVERY,
    minimum_nights: "2",
    date_updated: TODAY,
    notes: ANCHOR_NOTES,
  };

  if (DRY_RUN) {
    console.log(`Would update anchor id=${anchorId} →`, JSON.stringify(anchorUpdate, null, 2));
  } else {
    const { error: upAnchorErr } = await supabase.from(TABLE).update(anchorUpdate).eq("id", anchorId);
    if (upAnchorErr) {
      console.error("Anchor update failed:", upAnchorErr.message);
      process.exit(1);
    }
    console.log(`Updated anchor id=${anchorId} to ${PROPERTY} (BC) + douglaslake.com`);
  }

  let templateRow: Record<string, unknown>;
  if (DRY_RUN) {
    templateRow = { ...anchor, ...anchorUpdate } as Record<string, unknown>;
  } else {
    const { data, error: tplErr } = await supabase.from(TABLE).select("*").eq("id", anchorId).single();
    if (tplErr || !data) {
      console.error("Failed to reload template:", tplErr?.message);
      process.exit(1);
    }
    templateRow = data as Record<string, unknown>;
  }

  const raw = templateRow;
  const { id: _id, created_at: _c, updated_at: _u, ...templateRest } = raw;

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const u of UNITS) {
    const nightly = u.nightlyUsd == null ? null : Math.round(u.nightlyUsd * 100) / 100;
    const unitNotes = [u.notesLine, `Source: ${DISCOVERY}. Main site: https://www.douglaslake.com/`].filter(Boolean).join("\n");

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
        console.log(`Would update site row ${u.site_name} → rate ${nightly}`);
        updated += 1;
        continue;
      }
      const { error: upErr } = await supabase
        .from(TABLE)
        .update({
          rate_avg_retail_daily_rate: nightly,
          unit_type: u.unit_type,
          unit_capacity: u.unit_capacity,
          discovery_source: DISCOVERY,
          notes: unitNotes,
          date_updated: TODAY,
        })
        .eq("id", row.id);
      if (upErr) {
        console.error(`Update failed (${u.site_name}):`, upErr.message);
        process.exit(1);
      }
      console.log(`Updated: ${u.site_name} rate=${nightly}`);
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
      discovery_source: DISCOVERY,
      notes: [ANCHOR_NOTES, unitNotes].filter(Boolean).join("\n\n"),
      date_added: TODAY,
      date_updated: TODAY,
    };

    if (DRY_RUN) {
      console.log(`Would insert: ${u.site_name} rate=${nightly}`);
      inserted += 1;
      continue;
    }

    const { error } = await supabase.from(TABLE).insert(row);
    if (error) {
      console.error(`Insert failed (${u.site_name}):`, error.message);
      process.exit(1);
    }
    console.log(`Inserted: ${u.site_name} rate=${nightly}`);
    inserted += 1;
  }

  console.log(
    `\nDone. ${inserted} ${DRY_RUN ? "would insert" : "inserted"}, ${updated} ${DRY_RUN ? "would update" : "updated"}, ${skipped} skipped.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
