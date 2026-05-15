#!/usr/bin/env npx tsx
/**
 * Find `all_glamping_properties` rows with missing `slug` (NULL or blank) and set
 * `slug` from `property_name` using the same rules as `slugifyPropertyName` in
 * `lib/properties.ts` (aligned with DB trigger `generate_slug_from_property_name`).
 *
 * - All rows sharing the same `property_name` receive the **same** slug (sibling editor).
 * - If that base slug is already taken by a **different** `property_name`, appends
 *   `-2`, `-3`, … until unique (rare).
 * - If any row for that property already has a slug, missing rows copy it.
 * - Rows with no `property_name` get `unknown-property-{id}`.
 *
 * Usage:
 *   npx tsx scripts/backfill-all-glamping-property-slugs.ts --dry-run
 *   npx tsx scripts/backfill-all-glamping-property-slugs.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

import { slugifyPropertyName } from "../lib/properties";

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
const PAGE = 1000;
const DRY_RUN = process.argv.includes("--dry-run");
const TODAY = new Date().toISOString().split("T")[0];

type Row = { id: number; property_name: string | null; city: string | null; state: string | null; slug: string | null };

function slugMissing(s: string | null | undefined): boolean {
  return s == null || String(s).trim() === "";
}

function uniqueSlugOwners(rows: Row[]): Map<string, Set<string>> {
  const slugToNames = new Map<string, Set<string>>();
  for (const r of rows) {
    if (slugMissing(r.slug)) continue;
    const s = String(r.slug).trim();
    const p = (r.property_name ?? "").trim();
    if (!p) continue;
    if (!slugToNames.has(s)) slugToNames.set(s, new Set());
    slugToNames.get(s)!.add(p);
  }
  return slugToNames;
}

function pickSlugForProperty(
  propertyName: string,
  slugOwners: Map<string, Set<string>>,
  reserved: Set<string>,
): string {
  const p = propertyName.trim();
  const base = slugifyPropertyName(p) || `property`;

  const isFree = (candidate: string): boolean => {
    if (reserved.has(candidate)) return false;
    const owners = slugOwners.get(candidate);
    if (!owners || owners.size === 0) return true;
    return owners.size === 1 && owners.has(p);
  };

  let candidate = base;
  let n = 0;
  while (!isFree(candidate)) {
    n += 1;
    candidate = `${base}-${n + 1}`;
  }
  return candidate;
}

async function fetchAllRows(): Promise<Row[]> {
  const out: Row[] = [];
  let from = 0;
  for (;;) {
    const to = from + PAGE - 1;
    const { data, error } = await supabase
      .from(TABLE)
      .select("id, property_name, city, state, slug")
      .order("id", { ascending: true })
      .range(from, to);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as Row[];
    out.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

async function main() {
  console.log(DRY_RUN ? "DRY RUN — no updates\n" : "LIVE updates\n");

  const rows = await fetchAllRows();
  const slugOwners = uniqueSlugOwners(rows);

  const missingRows = rows.filter((r) => slugMissing(r.slug));
  const byName = new Map<string, Row[]>();
  for (const r of missingRows) {
    const key = (r.property_name ?? "").trim() || `__empty__:${r.id}`;
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(r);
  }

  /** Slugs we assign in this run (avoid duplicate candidates within batch). */
  const reserved = new Set<string>();

  const slugByExistingName = new Map<string, string>();
  for (const r of rows) {
    if (slugMissing(r.slug)) continue;
    const p = (r.property_name ?? "").trim();
    if (!p) continue;
    if (!slugByExistingName.has(p)) slugByExistingName.set(p, String(r.slug).trim());
  }

  let groups = 0;
  let rowUpdates = 0;

  const sortedKeys = [...byName.keys()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  for (const key of sortedKeys) {
    const group = byName.get(key)!;
    const first = group[0];
    const propertyName = (first.property_name ?? "").trim();

    let chosen: string;
    if (!propertyName) {
      chosen = `unknown-property-${first.id}`;
    } else {
      const existing = slugByExistingName.get(propertyName);
      if (existing) {
        chosen = existing;
      } else {
        chosen = pickSlugForProperty(propertyName, slugOwners, reserved);
        slugOwners.set(chosen, new Set([propertyName]));
        reserved.add(chosen);
      }
    }

    const ids = group.map((r) => r.id);
    groups += 1;
    rowUpdates += ids.length;

    if (DRY_RUN) {
      console.log(
        `Would set slug=${chosen} for ${ids.length} row(s) id=[${ids.slice(0, 5).join(",")}${ids.length > 5 ? ",…" : ""}] property_name=${JSON.stringify(propertyName || "(empty)")}`,
      );
      continue;
    }

    const { error } = await supabase
      .from(TABLE)
      .update({ slug: chosen, date_updated: TODAY })
      .in("id", ids);
    if (error) {
      console.error(`Update failed for property_name=${JSON.stringify(propertyName)} ids=${ids.join(",")}:`, error.message);
      process.exit(1);
    }
    console.log(`Updated slug=${chosen} (${ids.length} rows) property_name=${JSON.stringify(propertyName || "(empty)")}`);
  }

  console.log(`\nDone. ${groups} property group(s), ${rowUpdates} row(s) ${DRY_RUN ? "would be " : ""}updated.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
