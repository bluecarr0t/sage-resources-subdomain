#!/usr/bin/env npx tsx
/**
 * Populate `lat` / `lon` for `all_glamping_properties` rows where
 * `research_status = in_progress` and coordinates are missing.
 *
 * Coordinates are **approximate** (municipality / region centroids from
 * OpenStreetMap Nominatim, retrieved 2026-05-15) except where a property-level
 * hit exists — suitable for mapping / proximity until street-level geocoding is available.
 *
 * Usage:
 *   npx tsx scripts/geocode-in-progress-glamping-lat-lon.ts --dry-run
 *   npx tsx scripts/geocode-in-progress-glamping-lat-lon.ts
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

/** Nominatim `q` that produced each coordinate (OSM centroid / admin area). */
const GEOCODE_BY_ID: Record<number, { lat: number; lon: number; nominatimQuery: string }> = {
  11449: { lat: 49.485667, lon: -113.9502919, nominatimQuery: "Pincher Creek, Alberta, Canada" },
  11469: { lat: 34.1356915, lon: -116.0543506, nominatimQuery: "Twentynine Palms, California, USA" },
  11453: { lat: 52.968492, lon: -113.36792, nominatimQuery: "Wetaskiwin, Alberta, Canada" },
  11467: { lat: 44.1993902, lon: -85.3958517, nominatimQuery: "Clam Lake Township, Michigan, USA" },
  10994: { lat: 51.0377778, lon: 4.2405556, nominatimQuery: "Flanders, Belgium" },
  11450: { lat: 53.545204, lon: -113.903503, nominatimQuery: "Spruce Grove, Alberta, Canada" },
  11451: { lat: 55.2810741, lon: -114.7717876, nominatimQuery: "Slave Lake, Alberta, Canada" },
  11452: { lat: 53.5517087, lon: -113.143322, nominatimQuery: "Ardrossan, Alberta, Canada" },
  11454: { lat: 51.3728571, lon: -115.0327255, nominatimQuery: "Bighorn, Alberta, Canada" },
  11455: { lat: 52.9805793, lon: -113.8701825, nominatimQuery: "County of Wetaskiwin No. 10, Alberta, Canada" },
  11456: { lat: 53.5462055, lon: -113.491241, nominatimQuery: "Edmonton, Alberta, Canada" },
  11241: { lat: 54.7023545, lon: -3.2765753, nominatimQuery: "United Kingdom" },
  11219: { lat: 46.7985624, lon: 8.2319736, nominatimQuery: "Switzerland" },
};

async function main() {
  console.log(DRY_RUN ? "DRY RUN\n" : "LIVE\n");

  const { data: rows, error } = await supabase
    .from(TABLE)
    .select("id, property_name, city, state, country, lat, lon, research_status")
    .eq("research_status", "in_progress")
    .is("lat", null);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const list = rows ?? [];
  console.log(`Found ${list.length} in_progress row(s) with null lat.\n`);

  let updated = 0;
  let skipped = 0;

  for (const r of list) {
    const id = Number(r.id);
    const geo = GEOCODE_BY_ID[id];
    if (!geo) {
      console.warn(`No GEOCODE_BY_ID entry for id=${id} (${r.property_name}) — skipped.`);
      skipped += 1;
      continue;
    }

    if (DRY_RUN) {
      console.log(
        `Would update id=${id} ${JSON.stringify(r.property_name)} → lat=${geo.lat} lon=${geo.lon} (${geo.nominatimQuery})`,
      );
      updated += 1;
      continue;
    }

    const { error: upErr } = await supabase
      .from(TABLE)
      .update({
        lat: geo.lat,
        lon: geo.lon,
        date_updated: TODAY,
      })
      .eq("id", id)
      .eq("research_status", "in_progress")
      .is("lat", null);

    if (upErr) {
      console.error(`Update failed id=${id}:`, upErr.message);
      process.exit(1);
    }
    console.log(`Updated id=${id} ${JSON.stringify(r.property_name)} lat=${geo.lat} lon=${geo.lon}`);
    updated += 1;
  }

  console.log(`\nDone. ${updated} ${DRY_RUN ? "would be " : ""}updated, ${skipped} skipped (no mapping).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
