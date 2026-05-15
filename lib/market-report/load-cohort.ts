import type { SupabaseClient } from "@supabase/supabase-js";
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from "@/lib/glamping-land-operator-category";
import {
  getBoundingBox,
  haversineDistanceMiles,
  parseNum,
  stateSqlValuesGlampingRoverpass,
  STATE_ABBR_TO_NAME,
} from "@/lib/comps-v2/geo";
import {
  dedupeCohortRows,
  dedupeCohortRowsPreservingSage,
  type DedupedCohortRow,
} from "@/lib/market-report/dedupe";
import {
  bboxFetchLimitForRadius,
  MARKET_REPORT_MAX_ID_CHUNKS,
  resolveNationalHipcampMaxChunks,
  resolveNationalHipcampPageSize,
  resolveNationalRvMaxChunks,
  resolveNationalRvPageSize,
} from "@/lib/market-report/fetch-limits";
import {
  GLAMPING_PROPERTY_AMENITY_COLUMNS,
  GLAMPING_RV_SITE_COLUMNS,
} from "@/lib/market-report/amenity-columns";
import type {
  CohortPropertyRow,
  MarketReportFetchMeta,
  MarketReportSegment,
} from "@/lib/market-report/types";

export type CohortScope = "local" | "national";

export interface CohortAdrFilter {
  /** Inclusive lower bound on `rate_avg`. */
  adrMin?: number | null;
  /** Inclusive upper bound on `rate_avg`. */
  adrMax?: number | null;
}

export type LoadCohortResult = {
  rows: DedupedCohortRow[];
  fetchMeta: MarketReportFetchMeta;
  /** Pre-dedupe row count (raw rows fetched + in-radius for local). */
  rawRowsConsidered: number;
};

function trimStringField(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

/**
 * Single number for "sites / units per property" min filter.
 * RV: prefer `property_total_sites`, then `quantity_of_units`.
 * Glamping: prefer `quantity_of_units`, then `property_total_sites`.
 */
export function cohortSiteUnitMetric(
  row: Pick<CohortPropertyRow, "property_total_sites" | "quantity_of_units">,
  segment: MarketReportSegment,
): number {
  const sites = row.property_total_sites;
  const units = row.quantity_of_units;
  const sOk = sites != null && Number.isFinite(sites) && sites > 0;
  const uOk = units != null && Number.isFinite(units) && units > 0;
  if (segment === "rv_resort") {
    if (sOk) return sites!;
    if (uOk) return units!;
    return 0;
  }
  if (uOk) return units!;
  if (sOk) return sites!;
  return 0;
}

/**
 * Drop properties below the min site/unit threshold (applied after dedupe).
 * For glamping, Sage rows (`all_glamping_properties`) are always exempt.
 * Hipcamp rows are exempt for **national** scope only: after dedupe each row
 * is one unit-type bucket, so a per-property-style minimum would incorrectly
 * drop almost the entire Hipcamp cohort. Local glamping still applies the
 * threshold to Hipcamp.
 */
export function applyMinSiteUnitCountFilter(
  rows: DedupedCohortRow[],
  segment: MarketReportSegment,
  minCount: number,
  options?: { scope?: CohortScope },
): DedupedCohortRow[] {
  if (minCount <= 0) return rows;
  const scope = options?.scope ?? "local";
  return rows.filter((r) => {
    if (segment === "glamping" && r.source === "all_glamping_properties") {
      return true;
    }
    if (
      segment === "glamping" &&
      scope === "national" &&
      r.source === "hipcamp"
    ) {
      return true;
    }
    return cohortSiteUnitMetric(r, segment) >= minCount;
  });
}

/**
 * Hard cap for national fetches per source — protects DB load, serverless
 * memory, and Vercel function payload size.
 *
 * Default 25,000 per source comfortably covers Sage glamping (~few thousand),
 * RoverPass (~thousands), and Campspot. National Hipcamp is **paged** with
 * `resolveNationalHipcampPageSize` / `resolveNationalHipcampMaxChunks` and
 * **two US scopes** (state list + US `country` match, merged by `id`) so rows
 * are not dropped when `state` is missing or nonstandard. Override:
 *   MARKET_REPORT_NATIONAL_HIPCAMP_MAX_CHUNKS, MARKET_REPORT_NATIONAL_PER_SOURCE_CAP=50000
 */
const NATIONAL_PER_SOURCE_CAP_DEFAULT = 25000;
const NATIONAL_PER_SOURCE_CAP_MIN = 1000;
const NATIONAL_PER_SOURCE_CAP_MAX = 100000;
function resolveNationalPerSourceCap(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.MARKET_REPORT_NATIONAL_PER_SOURCE_CAP;
  if (!raw) return NATIONAL_PER_SOURCE_CAP_DEFAULT;
  const n = Number(raw);
  if (!Number.isFinite(n)) return NATIONAL_PER_SOURCE_CAP_DEFAULT;
  return Math.max(
    NATIONAL_PER_SOURCE_CAP_MIN,
    Math.min(NATIONAL_PER_SOURCE_CAP_MAX, Math.floor(n)),
  );
}
const NATIONAL_PER_SOURCE_CAP = resolveNationalPerSourceCap();
/** Two-letter US state abbrs (lowercase included for some hipcamp/campspot rows). */
const US_STATE_KEYS_2LETTER = Object.keys(STATE_ABBR_TO_NAME);
const US_STATE_ALL_KEYS = [
  ...US_STATE_KEYS_2LETTER,
  ...US_STATE_KEYS_2LETTER.map((s) => s.toLowerCase()),
  ...Object.values(STATE_ABBR_TO_NAME),
  ...Object.values(STATE_ABBR_TO_NAME).map((s) => s.toLowerCase()),
];

/** PostgREST keyset cursor: `id` may arrive as number, bigint, or string. */
function numericRowId(row: Record<string, unknown>): number | null {
  const v = row["id"];
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "bigint") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function maxNumericRowId(batch: Record<string, unknown>[]): number | null {
  let max: number | null = null;
  for (const row of batch) {
    const n = numericRowId(row);
    if (n != null && (max == null || n > max)) max = n;
  }
  return max;
}

/** US cohort scope: state/territory string match (existing) OR explicit country = US. */
const US_COUNTRY_OR_FILTER =
  "country.ilike.%United States%,country.ilike.%USA%,country.eq.US,country.eq.USA";

async function paginateNationalRoverRaw(
  supabase: SupabaseClient,
  roverSelect: string,
  filter: CohortAdrFilter,
  applyUsScope: (q: any) => any,
): Promise<{
  allRaw: Record<string, unknown>[];
  chunksUsed: number;
  hitRowCap: boolean;
}> {
  const pageSize = resolveNationalRvPageSize();
  const maxChunks = resolveNationalRvMaxChunks();
  const allRaw: Record<string, unknown>[] = [];
  let lastIdCursor = 0;
  let chunksUsed = 0;
  let hitRowCap = false;

  for (let chunk = 0; chunk < maxChunks; chunk++) {
    let q: any = supabase.from("all_roverpass_data_new").select(roverSelect);
    q = q.or("is_closed.is.null,is_closed.neq.Yes");
    q = applyUsScope(q);
    q = q.not("lat", "is", null).not("lon", "is", null);
    if (filter.adrMin != null)
      q = q.gte("rate_avg_retail_daily_rate", filter.adrMin);
    if (filter.adrMax != null)
      q = q.lte("rate_avg_retail_daily_rate", filter.adrMax);
    if (lastIdCursor > 0) q = q.gt("id", lastIdCursor);
    const { data, error } = await q
      .order("id", { ascending: true })
      .limit(pageSize);
    if (error || !data) {
      console.warn(
        "[market-report] national roverpass fetch:",
        error?.message ?? "no data",
      );
      break;
    }
    const batch = data as unknown as Record<string, unknown>[];
    chunksUsed += 1;
    if (batch.length === 0) break;
    allRaw.push(...batch);
    const prevCursor = lastIdCursor;
    const batchMax = maxNumericRowId(batch);
    if (batchMax != null && batchMax > lastIdCursor) lastIdCursor = batchMax;
    // Do not treat `batch.length < pageSize` as "done": PostgREST often caps
    // responses below the requested `.limit()` (e.g. ~1000 rows), which would
    // otherwise stop keyset paging after the first chunk.
    if (batch.length > 0 && lastIdCursor === prevCursor) {
      console.warn(
        "[market-report] national roverpass: id cursor stalled (non-advancing page)",
      );
      break;
    }
    if (chunk === maxChunks - 1) {
      hitRowCap = true;
      break;
    }
  }

  return { allRaw, chunksUsed, hitRowCap };
}

async function paginateNationalCampspotRaw(
  supabase: SupabaseClient,
  campspotSelect: string,
  applyUsScope: (q: any) => any,
): Promise<{
  allRaw: Record<string, unknown>[];
  chunksUsed: number;
  hitRowCap: boolean;
}> {
  const pageSize = resolveNationalRvPageSize();
  const maxChunks = resolveNationalRvMaxChunks();
  const allRaw: Record<string, unknown>[] = [];
  let lastIdCursor = 0;
  let chunksUsed = 0;
  let hitRowCap = false;

  for (let chunk = 0; chunk < maxChunks; chunk++) {
    let q: any = supabase.from("campspot").select(campspotSelect);
    q = applyUsScope(q);
    q = q.not("lat_num", "is", null).not("lon_num", "is", null);
    if (lastIdCursor > 0) q = q.gt("id", lastIdCursor);
    const { data, error } = await q
      .order("id", { ascending: true })
      .limit(pageSize);
    if (error || !data) {
      console.warn(
        "[market-report] national campspot fetch:",
        error?.message ?? "no data",
      );
      break;
    }
    const batch = data as unknown as Record<string, unknown>[];
    chunksUsed += 1;
    if (batch.length === 0) break;
    allRaw.push(...batch);
    const prevCursor = lastIdCursor;
    const batchMax = maxNumericRowId(batch);
    if (batchMax != null && batchMax > lastIdCursor) lastIdCursor = batchMax;
    if (batch.length > 0 && lastIdCursor === prevCursor) {
      console.warn(
        "[market-report] national campspot: id cursor stalled (non-advancing page)",
      );
      break;
    }
    if (chunk === maxChunks - 1) {
      hitRowCap = true;
      break;
    }
  }

  return { allRaw, chunksUsed, hitRowCap };
}

const BASE_GLAMPING_FIELDS = [
  "id",
  "property_name",
  "site_name",
  "city",
  "state",
  "country",
  "property_type",
  "land_operator_category",
  "unit_type",
  "property_total_sites",
  "quantity_of_units",
  "lat",
  "lon",
  "rate_avg_retail_daily_rate",
  "rate_winter_weekday",
  "rate_winter_weekend",
  "rate_spring_weekday",
  "rate_spring_weekend",
  "rate_summer_weekday",
  "rate_summer_weekend",
  "rate_fall_weekday",
  "rate_fall_weekend",
  "operating_season_months",
  "url",
  ...GLAMPING_PROPERTY_AMENITY_COLUMNS,
  ...GLAMPING_RV_SITE_COLUMNS,
];

const GLAMPING_SELECT = BASE_GLAMPING_FIELDS.join(", ");

/** Same name + city + state + rounded coords → one row (closest first in input order). */
function rvGeoDedupeKey(r: CohortPropertyRow): string {
  const name = String(r.property_name ?? "")
    .trim()
    .toLowerCase();
  const city = String(r.city ?? "")
    .trim()
    .toLowerCase();
  const state = String(r.state ?? "")
    .trim()
    .toLowerCase();
  return `${name}|${city}|${state}|${Math.round(r.geo_lat * 10000)}|${Math.round(r.geo_lng * 10000)}`;
}

function mapGlampingRow(
  r: Record<string, unknown>,
  anchorLat: number,
  anchorLng: number,
  radiusMiles: number,
): CohortPropertyRow | null {
  const lat = parseNum(r.lat);
  const lon = parseNum(r.lon);
  if (lat == null || lon == null) return null;
  const dist = haversineDistanceMiles(anchorLat, anchorLng, lat, lon);
  if (dist > radiusMiles) return null;
  const raw: Record<string, unknown> = { ...r };
  return {
    source: "all_glamping_properties",
    sourceId: r.id != null ? String(r.id) : null,
    geo_lat: lat,
    geo_lng: lon,
    property_name: (r.property_name as string) ?? "Unknown",
    site_name: trimStringField(r.site_name),
    city: (r.city as string) ?? "",
    state: (r.state as string) ?? "",
    property_type: r.property_type != null ? String(r.property_type) : null,
    unit_type: r.unit_type != null ? String(r.unit_type) : null,
    property_total_sites: parseNum(r.property_total_sites),
    quantity_of_units: parseNum(r.quantity_of_units),
    distance_miles: Math.round(dist * 10) / 10,
    rate_avg: parseNum(r.rate_avg_retail_daily_rate),
    winter_weekday: parseNum(r.rate_winter_weekday),
    winter_weekend: parseNum(r.rate_winter_weekend),
    spring_weekday: parseNum(r.rate_spring_weekday),
    spring_weekend: parseNum(r.rate_spring_weekend),
    summer_weekday: parseNum(r.rate_summer_weekday),
    summer_weekend: parseNum(r.rate_summer_weekend),
    fall_weekday: parseNum(r.rate_fall_weekday),
    fall_weekend: parseNum(r.rate_fall_weekend),
    occupancy: null,
    operating_season_months:
      r.operating_season_months != null
        ? String(r.operating_season_months)
        : null,
    url: r.url != null ? String(r.url) : null,
    raw,
  };
}

function mapRoverpassRow(
  r: Record<string, unknown>,
  anchorLat: number,
  anchorLng: number,
  radiusMiles: number,
): CohortPropertyRow | null {
  const lat = parseNum(r.lat);
  const lon = parseNum(r.lon);
  if (lat == null || lon == null) return null;
  const dist = haversineDistanceMiles(anchorLat, anchorLng, lat, lon);
  if (dist > radiusMiles) return null;
  return {
    source: "all_roverpass_data_new",
    sourceId: r.id != null ? String(r.id) : null,
    geo_lat: lat,
    geo_lng: lon,
    property_name: (r.property_name as string) ?? "Unknown",
    site_name: trimStringField(r.site_name),
    city: (r.city as string) ?? "",
    state: (r.state as string) ?? "",
    property_type: r.property_type != null ? String(r.property_type) : null,
    unit_type: r.unit_type != null ? String(r.unit_type) : null,
    property_total_sites: parseNum(r.property_total_sites),
    quantity_of_units: parseNum(r.quantity_of_units),
    distance_miles: Math.round(dist * 10) / 10,
    rate_avg: parseNum(r.rate_avg_retail_daily_rate),
    winter_weekday: parseNum(r.rate_winter_weekday),
    winter_weekend: parseNum(r.rate_winter_weekend),
    spring_weekday: parseNum(r.rate_spring_weekday),
    spring_weekend: parseNum(r.rate_spring_weekend),
    summer_weekday: parseNum(r.rate_summer_weekday),
    summer_weekend: parseNum(r.rate_summer_weekend),
    fall_weekday: parseNum(r.rate_fall_weekday),
    fall_weekend: parseNum(r.rate_fall_weekend),
    occupancy: parseNum(r.roverpass_occupancy_rate),
    operating_season_months:
      r.operating_season_months != null
        ? String(r.operating_season_months)
        : null,
    url: r.url != null ? String(r.url) : null,
    raw: null,
  };
}

/**
 * Hipcamp stores amenity columns under bare names (e.g. `pool`, `hot_tub_sauna`)
 * while the cohort aggregator looks for the `property_*` keys defined in
 * {@link GLAMPING_PROPERTY_AMENITY_COLUMNS}. We map the overlap here so Hipcamp
 * rows contribute to the Amenity Analysis section.
 *
 * The hipcamp `hot_tub_sauna` column is split: a Yes value lights up both
 * `property_hot_tub` and `property_sauna` since either signal is interesting.
 */
/**
 * Hipcamp `property_type` values that are excluded from the Glamping cohort.
 *
 * Why: Hipcamp lists every kind of camping, including pure RV / vehicle
 * accommodations. Those drag the glamping ARDR down and clutter unit-type
 * breakdowns with categories that aren't part of the segment we're studying.
 *
 * Match is case-insensitive after collapsing internal whitespace, so
 * "Mixed Unit RV Resort" and "mixed  unit  rv  resort" both filter out.
 *
 * Edit this list to tune the filter — keep it in `load-cohort.ts` so the
 * decision lives next to the cohort assembly logic.
 */
export const HIPCAMP_GLAMPING_EXCLUDED_PROPERTY_TYPES: ReadonlySet<string> =
  new Set(
    [
      "Vehicles",
      "Rv Tent",
      "Mixed Unit RV Resort",
      "Rv Or Trailer",
      "Airstream",
      "Vintage Trailer",
      "Van Bus",
    ].map((s) => s.toLowerCase().replace(/\s+/g, " ").trim()),
  );

/** True if the Hipcamp property_type is in the RV/vehicle exclusion set. */
export function isHipcampRvDominantPropertyType(value: unknown): boolean {
  if (value == null) return false;
  const normalized = String(value).toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) return false;
  return HIPCAMP_GLAMPING_EXCLUDED_PROPERTY_TYPES.has(normalized);
}

/**
 * Hipcamp `unit_type` values excluded from **glamping** unit-type rollups
 * (market summary “Top unit types”, site/unit charts) and counted toward
 * vehicle-majority property exclusion (see {@link filterGlampingMajorityVehicleInventoryRows}).
 *
 * A listing can stay in the glamping cohort (e.g. property_type “Glamping”)
 * while still listing RV pads or vehicle spots on some rows; those rows are
 * dropped only from unit-type summaries so the breakdown matches the segment.
 *
 * Match is case-insensitive after collapsing internal whitespace.
 */
export const GLAMPING_EXCLUDED_UNIT_TYPES: ReadonlySet<string> = new Set(
  ["Vehicles", "Vehicle", "RV Site", "RV Sites"].map((s) =>
    s.toLowerCase().replace(/\s+/g, " ").trim(),
  ),
);

export function isExcludedGlampingUnitType(value: unknown): boolean {
  if (value == null) return false;
  const normalized = String(value).toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) return false;
  return GLAMPING_EXCLUDED_UNIT_TYPES.has(normalized);
}

/** Hipcamp glaming cohort: drop properties where ≥ this share of units are tent-site inventory. */
const HIPCAMP_TENT_SITE_MAJORITY_RATIO = 0.5;

/** Glamping cohort (Sage + Hipcamp): drop properties where ≥ this share of weighted unit rows are vehicle/RV pad inventory. */
const GLAMPING_VEHICLE_UNIT_MAJORITY_RATIO = 0.5;

/** One Hipcamp listing (name + city + state) for aggregating unit-type mix. */
function hipcampGlampingPropertyInventoryKey(row: CohortPropertyRow): string {
  const name = String(row.property_name ?? "").trim().toLowerCase();
  const city = String(row.city ?? "").trim().toLowerCase();
  const state = String(row.state ?? "").trim().toUpperCase();
  return `${name}|${city}|${state}`;
}

/**
 * Unit types counted as traditional tent-site / pitch inventory (not safari/bell/yurt glamping).
 * Used only to exclude Hipcamp properties that are majority tent camping when segment is glamping.
 *
 * @internal Exported for tests.
 */
export function isHipcampTentSiteUnitTypeForMajority(unitType: string | null): boolean {
  if (unitType == null) return false;
  const raw = unitType.trim();
  if (!raw) return false;
  if (
    /\b(safari|bell|wall|lotus|yurt|treehouse|cabin|dome|pod|teepee|tipi|hammock)\b/i.test(raw)
  ) {
    return false;
  }
  if (/\b(rv|trailer|airstream|skoolie|van|bus|vehicle|glamping|luxury)\b/i.test(raw)) return false;
  const lower = raw.toLowerCase();
  if (lower === "tent" || lower === "tents") return true;
  if (lower.includes("tent site") || lower.includes("tent-site")) return true;
  if (/\bwalk[\s-]?in\s+tent\b/.test(lower)) return true;
  if (/\bprimitive\s+tent\b/.test(lower)) return true;
  if (/\btent\s+pitch\b/.test(lower)) return true;
  if (/\bcamping\s+tent\b/.test(lower)) return true;
  if (/\bcanvas\s+tent\b/.test(lower)) return true;
  if (/\b(pitch|pitching)\b/.test(lower) && /\btent\b/.test(lower)) return true;
  return false;
}

function rowWeightForTentMajority(r: CohortPropertyRow): number {
  const q = r.quantity_of_units;
  return q != null && q > 0 ? q : 1;
}

/**
 * Removes Hipcamp rows for properties whose inventory is tent-site majority,
 * so glamping market reports skew toward structure-based glamping.
 *
 * @internal Exported for unit tests.
 */
export function filterHipcampMajorityTentSiteProperties(rows: CohortPropertyRow[]): CohortPropertyRow[] {
  const hip = rows.filter((r) => r.source === "hipcamp");
  if (hip.length === 0) return rows;
  const other = rows.filter((r) => r.source !== "hipcamp");
  const byProp = new Map<string, CohortPropertyRow[]>();
  for (const r of hip) {
    const k = hipcampGlampingPropertyInventoryKey(r);
    const list = byProp.get(k) ?? [];
    list.push(r);
    byProp.set(k, list);
  }
  const dropKeys = new Set<string>();
  for (const [k, group] of byProp) {
    let tentW = 0;
    let totalW = 0;
    for (const r of group) {
      const w = rowWeightForTentMajority(r);
      totalW += w;
      if (isHipcampTentSiteUnitTypeForMajority(r.unit_type)) tentW += w;
    }
    if (totalW > 0 && tentW / totalW >= HIPCAMP_TENT_SITE_MAJORITY_RATIO) {
      dropKeys.add(k);
    }
  }
  const keptHip = hip.filter((r) => !dropKeys.has(hipcampGlampingPropertyInventoryKey(r)));
  return [...other, ...keptHip];
}

const GLAMPING_VEHICLE_MAJORITY_SOURCES = new Set<CohortPropertyRow["source"]>([
  "hipcamp",
  "all_glamping_properties",
]);

/**
 * Removes rows for properties whose weighted unit-type mix is ≥50% vehicle/RV
 * pad inventory (`{@link GLAMPING_EXCLUDED_UNIT_TYPES}`), so glamping market
 * reports and property tables match structure-first glamping (not drive-in
 * vehicle camping).
 *
 * Applies to Hipcamp and Sage (`all_glamping_properties`) rows; other sources
 * pass through unchanged.
 *
 * @internal Exported for unit tests.
 */
export function filterGlampingMajorityVehicleInventoryRows(
  rows: CohortPropertyRow[],
): CohortPropertyRow[] {
  const affected = rows.filter((r) => GLAMPING_VEHICLE_MAJORITY_SOURCES.has(r.source));
  const rest = rows.filter((r) => !GLAMPING_VEHICLE_MAJORITY_SOURCES.has(r.source));
  if (affected.length === 0) return rows;

  const byKey = new Map<string, CohortPropertyRow[]>();
  for (const r of affected) {
    const k = `${r.source}|${hipcampGlampingPropertyInventoryKey(r)}`;
    const list = byKey.get(k) ?? [];
    list.push(r);
    byKey.set(k, list);
  }
  const dropKeys = new Set<string>();
  for (const [k, group] of byKey) {
    let vehicleW = 0;
    let totalW = 0;
    for (const r of group) {
      const w = rowWeightForTentMajority(r);
      totalW += w;
      if (isExcludedGlampingUnitType(r.unit_type)) vehicleW += w;
    }
    if (totalW > 0 && vehicleW / totalW >= GLAMPING_VEHICLE_UNIT_MAJORITY_RATIO) {
      dropKeys.add(k);
    }
  }
  const kept = affected.filter((r) => {
    const k = `${r.source}|${hipcampGlampingPropertyInventoryKey(r)}`;
    return !dropKeys.has(k);
  });
  return [...rest, ...kept];
}

const HIPCAMP_AMENITY_ALIASES: Array<{
  hipcampField: string;
  propertyFields: string[];
}> = [
  { hipcampField: "pool", propertyFields: ["property_pool"] },
  { hipcampField: "laundry", propertyFields: ["property_laundry"] },
  { hipcampField: "playground", propertyFields: ["property_playground"] },
  { hipcampField: "restaurant", propertyFields: ["property_restaurant"] },
  { hipcampField: "dog_park", propertyFields: ["property_dog_park"] },
  { hipcampField: "clubhouse", propertyFields: ["property_clubhouse"] },
  { hipcampField: "waterpark", propertyFields: ["property_waterpark"] },
  { hipcampField: "general_store", propertyFields: ["property_general_store"] },
  { hipcampField: "waterfront", propertyFields: ["property_waterfront"] },
  {
    hipcampField: "hot_tub_sauna",
    propertyFields: ["property_hot_tub", "property_sauna"],
  },
];

function mapHipcampRow(
  r: Record<string, unknown>,
  anchorLat: number,
  anchorLng: number,
  radiusMiles: number,
): CohortPropertyRow | null {
  // Filter out RV-/vehicle-dominant Hipcamp listings from the glamping cohort
  // BEFORE coordinate parsing so we don't waste work on excluded rows.
  if (isHipcampRvDominantPropertyType(r.property_type)) return null;
  const lat = parseNum(r.lat_num) ?? parseNum(r.lat);
  const lon = parseNum(r.lon_num) ?? parseNum(r.lon);
  if (lat == null || lon == null) return null;
  const dist = haversineDistanceMiles(anchorLat, anchorLng, lat, lon);
  if (dist > radiusMiles) return null;
  // Build a `raw` blob that satisfies both Hipcamp's bare amenity names AND
  // the `property_*` aliases used by the amenity aggregator.
  const raw: Record<string, unknown> = { ...r };
  for (const alias of HIPCAMP_AMENITY_ALIASES) {
    const v = r[alias.hipcampField];
    if (v == null) continue;
    for (const key of alias.propertyFields) {
      if (raw[key] == null) raw[key] = v;
    }
  }
  const occ =
    parseNum(r.occupancy_rate_2026) ??
    parseNum(r.occupancy_rate_2025) ??
    parseNum(r.occupancy_rate_2024);
  return {
    source: "hipcamp",
    sourceId: r.id != null ? String(r.id) : null,
    geo_lat: lat,
    geo_lng: lon,
    property_name: (r.property_name as string) ?? "Unknown",
    site_name: trimStringField(r.site_name),
    city: (r.city as string) ?? "",
    state: (r.state as string) ?? "",
    property_type: r.property_type != null ? String(r.property_type) : null,
    unit_type: r.unit_type != null ? String(r.unit_type) : null,
    property_total_sites: parseNum(r.property_total_sites),
    quantity_of_units: parseNum(r.quantity_of_units),
    distance_miles: Math.round(dist * 10) / 10,
    rate_avg:
      parseNum(r.avg_retail_daily_rate_2025) ??
      parseNum(r.avg_retail_daily_rate_2024),
    winter_weekday: parseNum(r.winter_weekday),
    winter_weekend: parseNum(r.winter_weekend),
    spring_weekday: parseNum(r.spring_weekday),
    spring_weekend: parseNum(r.spring_weekend),
    summer_weekday: parseNum(r.summer_weekday),
    summer_weekend: parseNum(r.summer_weekend),
    fall_weekday: parseNum(r.fall_weekday),
    fall_weekend: parseNum(r.fall_weekend),
    occupancy: occ,
    operating_season_months:
      r.operating_season_months != null
        ? String(r.operating_season_months)
        : null,
    url: r.url != null ? String(r.url) : null,
    raw,
  };
}

function mapCampspotRow(
  r: Record<string, unknown>,
  anchorLat: number,
  anchorLng: number,
  radiusMiles: number,
): CohortPropertyRow | null {
  const lat = parseNum(r.lat_num) ?? parseNum(r.lat);
  const lon = parseNum(r.lon_num) ?? parseNum(r.lon);
  if (lat == null || lon == null) return null;
  const dist = haversineDistanceMiles(anchorLat, anchorLng, lat, lon);
  if (dist > radiusMiles) return null;
  const occ =
    parseNum(r.occupancy_rate_2026) ??
    parseNum(r.occupancy_rate_2025) ??
    parseNum(r.occupancy_rate_2024);
  return {
    source: "campspot",
    sourceId: null,
    geo_lat: lat,
    geo_lng: lon,
    property_name: (r.property_name as string) ?? "Unknown",
    site_name: trimStringField(r.site_name),
    city: (r.city as string) ?? "",
    state: (r.state as string) ?? "",
    property_type: null,
    unit_type: r.unit_type != null ? String(r.unit_type) : null,
    property_total_sites: parseNum(r.property_total_sites),
    quantity_of_units: parseNum(r.quantity_of_units),
    distance_miles: Math.round(dist * 10) / 10,
    rate_avg: parseNum(r.avg_retail_daily_rate_2025),
    winter_weekday: parseNum(r.winter_weekday),
    winter_weekend: parseNum(r.winter_weekend),
    spring_weekday: parseNum(r.spring_weekday),
    spring_weekend: parseNum(r.spring_weekend),
    summer_weekday: parseNum(r.summer_weekday),
    summer_weekend: parseNum(r.summer_weekend),
    fall_weekday: parseNum(r.fall_weekday),
    fall_weekend: parseNum(r.fall_weekend),
    occupancy: occ,
    operating_season_months:
      r.operating_season_months != null
        ? String(r.operating_season_months)
        : null,
    url: r.url != null ? String(r.url) : null,
    raw: null,
  };
}

function applyAdrFilter<T extends { rate_avg: number | null }>(
  rows: T[],
  filter?: CohortAdrFilter | null,
): T[] {
  if (!filter || (filter.adrMin == null && filter.adrMax == null)) return rows;
  const lo = filter.adrMin ?? Number.NEGATIVE_INFINITY;
  const hi = filter.adrMax ?? Number.POSITIVE_INFINITY;
  return rows.filter(
    (r) => r.rate_avg != null && r.rate_avg >= lo && r.rate_avg <= hi,
  );
}

async function fetchGlampingCohort(
  supabase: SupabaseClient,
  anchorLat: number,
  anchorLng: number,
  radiusMiles: number,
  rowLimit: number,
): Promise<{
  rows: CohortPropertyRow[];
  meta: NonNullable<MarketReportFetchMeta["glamping"]>;
}> {
  const bb = getBoundingBox(anchorLat, anchorLng, radiusMiles);
  const allRaw: Record<string, unknown>[] = [];
  let lastIdCursor = 0;
  let lastChunkHitCap = false;
  let chunksUsed = 0;

  for (let chunk = 0; chunk < MARKET_REPORT_MAX_ID_CHUNKS; chunk++) {
    let q = supabase
      .from("all_glamping_properties")
      .select(GLAMPING_SELECT)
      .eq("is_glamping_property", "Yes")
      .or("is_open.is.null,is_open.neq.No")
      .eq("research_status", "published")
      .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
      .gte("lat", bb.minLat)
      .lte("lat", bb.maxLat)
      .gte("lon", bb.minLng)
      .lte("lon", bb.maxLng)
      .not("lat", "is", null)
      .not("lon", "is", null);
    if (lastIdCursor > 0) {
      q = q.gt("id", lastIdCursor);
    }
    const { data, error } = await q
      .order("id", { ascending: true })
      .limit(rowLimit);

    if (error) {
      console.warn("[market-report] glamping fetch:", error.message);
      break;
    }
    if (!data || data.length === 0) {
      break;
    }

    const batch = data as unknown as Record<string, unknown>[];
    allRaw.push(...batch);
    chunksUsed += 1;
    lastChunkHitCap = batch.length >= rowLimit;
    lastIdCursor = Math.max(...batch.map((r) => Number(r.id)));
    if (!lastChunkHitCap) {
      break;
    }
  }

  if (chunksUsed === 0) {
    return {
      rows: [],
      meta: { candidatesInBBox: 0, hitRowCap: false, chunksUsed: 0 },
    };
  }

  const meta = {
    candidatesInBBox: allRaw.length,
    hitRowCap: lastChunkHitCap,
    chunksUsed,
  };
  const rows = allRaw
    .map((row) => mapGlampingRow(row, anchorLat, anchorLng, radiusMiles))
    .filter((x): x is CohortPropertyRow => x !== null);
  return { rows, meta };
}

async function fetchRoverpassCohort(
  supabase: SupabaseClient,
  anchorLat: number,
  anchorLng: number,
  radiusMiles: number,
  rowLimit: number,
): Promise<{
  rows: CohortPropertyRow[];
  meta: NonNullable<MarketReportFetchMeta["roverpass"]>;
}> {
  const bb = getBoundingBox(anchorLat, anchorLng, radiusMiles);
  const roverSelect =
    "id, property_type, property_name, site_name, city, state, unit_type, property_total_sites, quantity_of_units, " +
    "rate_avg_retail_daily_rate, rate_winter_weekday, rate_winter_weekend, " +
    "rate_spring_weekday, rate_spring_weekend, rate_summer_weekday, rate_summer_weekend, " +
    "rate_fall_weekday, rate_fall_weekend, operating_season_months, url, lat, lon, " +
    "roverpass_occupancy_rate";

  const allRaw: Record<string, unknown>[] = [];
  let lastIdCursor = 0;
  let lastChunkHitCap = false;
  let chunksUsed = 0;

  for (let chunk = 0; chunk < MARKET_REPORT_MAX_ID_CHUNKS; chunk++) {
    let q = supabase
      .from("all_roverpass_data_new")
      .select(roverSelect)
      // Unified RoverPass schema uses `is_closed` (Yes = closed). Do not rely on `is_open`, which is often absent or null.
      .neq("is_closed", "Yes")
      .gte("lat", bb.minLat)
      .lte("lat", bb.maxLat)
      .gte("lon", bb.minLng)
      .lte("lon", bb.maxLng)
      .not("lat", "is", null)
      .not("lon", "is", null);
    if (lastIdCursor > 0) {
      q = q.gt("id", lastIdCursor);
    }
    const { data, error } = await q
      .order("id", { ascending: true })
      .limit(rowLimit);

    if (error) {
      console.warn("[market-report] roverpass fetch:", error.message);
      break;
    }
    if (!data || data.length === 0) {
      break;
    }

    const batch = data as unknown as Record<string, unknown>[];
    allRaw.push(...batch);
    chunksUsed += 1;
    lastChunkHitCap = batch.length >= rowLimit;
    lastIdCursor = Math.max(...batch.map((r) => Number(r.id)));
    if (!lastChunkHitCap) {
      break;
    }
  }

  if (chunksUsed === 0) {
    return {
      rows: [],
      meta: { candidatesInBBox: 0, hitRowCap: false, chunksUsed: 0 },
    };
  }

  const meta = {
    candidatesInBBox: allRaw.length,
    hitRowCap: lastChunkHitCap,
    chunksUsed,
  };
  const rows = allRaw
    .map((row) => mapRoverpassRow(row, anchorLat, anchorLng, radiusMiles))
    .filter((x): x is CohortPropertyRow => x !== null);
  return { rows, meta };
}

async function fetchCampspotCohort(
  supabase: SupabaseClient,
  anchorLat: number,
  anchorLng: number,
  radiusMiles: number,
  stateAbbr: string,
  rowLimit: number,
): Promise<{
  rows: CohortPropertyRow[];
  meta: NonNullable<MarketReportFetchMeta["campspot"]>;
}> {
  const stateKeys = stateSqlValuesGlampingRoverpass([stateAbbr]);
  const bb = getBoundingBox(anchorLat, anchorLng, radiusMiles);
  const { data, error } = await supabase
    .from("campspot")
    .select(
      "property_name, site_name, city, state, unit_type, property_total_sites, quantity_of_units, " +
        "avg_retail_daily_rate_2025, high_rate_2025, low_rate_2025, " +
        "occupancy_rate_2024, occupancy_rate_2025, occupancy_rate_2026, " +
        "winter_weekday, winter_weekend, spring_weekday, spring_weekend, " +
        "summer_weekday, summer_weekend, fall_weekday, fall_weekend, " +
        "operating_season_months, url, lat, lon, lat_num, lon_num",
    )
    .in("state", stateKeys)
    .gte("lat_num", bb.minLat)
    .lte("lat_num", bb.maxLat)
    .gte("lon_num", bb.minLng)
    .lte("lon_num", bb.maxLng)
    .not("lat_num", "is", null)
    .not("lon_num", "is", null)
    .order("property_name", { ascending: true })
    .order("lat_num", { ascending: true })
    .order("lon_num", { ascending: true })
    .limit(rowLimit);

  if (error || !data) {
    console.warn("[market-report] campspot fetch:", error?.message);
    return {
      rows: [],
      meta: { candidatesInBBox: 0, hitRowCap: false, chunksUsed: 0 },
    };
  }

  const rawRows = data as unknown as Record<string, unknown>[];
  const meta = {
    candidatesInBBox: rawRows.length,
    hitRowCap: rawRows.length >= rowLimit,
    chunksUsed: 1,
  };
  const rows = rawRows
    .map((row) => mapCampspotRow(row, anchorLat, anchorLng, radiusMiles))
    .filter((x): x is CohortPropertyRow => x !== null);
  return { rows, meta };
}

export function mergeAndDedupeRv(rows: CohortPropertyRow[]): CohortPropertyRow[] {
  const byKey = new Map<string, CohortPropertyRow>();
  const sorted = [...rows].sort((a, b) => a.distance_miles - b.distance_miles);
  for (const r of sorted) {
    const k = rvGeoDedupeKey(r);
    if (!byKey.has(k)) byKey.set(k, r);
  }
  return [...byKey.values()].sort(
    (a, b) => a.distance_miles - b.distance_miles,
  );
}

async function paginateNationalGlampingScopedRaw(
  supabase: SupabaseClient,
  applyUsScope: (q: any) => any,
  filter: CohortAdrFilter,
  logLabel: string,
): Promise<{
  allRaw: Record<string, unknown>[];
  chunksUsed: number;
  hitRowCap: boolean;
}> {
  const pageSize = resolveNationalHipcampPageSize();
  const maxChunks = resolveNationalHipcampMaxChunks();
  const allRaw: Record<string, unknown>[] = [];
  let lastIdCursor = 0;
  let chunksUsed = 0;
  let hitRowCap = false;

  for (let chunk = 0; chunk < maxChunks; chunk++) {
    let q: any = supabase.from("all_glamping_properties").select(GLAMPING_SELECT);
    q = applyUsScope(q);
    q = q
      .eq("is_glamping_property", "Yes")
      .or("is_open.is.null,is_open.neq.No")
      .eq("research_status", "published")
      .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
      .not("lat", "is", null)
      .not("lon", "is", null);
    if (filter.adrMin != null)
      q = q.gte("rate_avg_retail_daily_rate", filter.adrMin);
    if (filter.adrMax != null)
      q = q.lte("rate_avg_retail_daily_rate", filter.adrMax);
    if (lastIdCursor > 0) q = q.gt("id", lastIdCursor);
    const { data, error } = await q
      .order("id", { ascending: true })
      .limit(pageSize);
    if (error || !data) {
      console.warn(
        `[market-report] national glamping fetch (${logLabel}):`,
        error?.message ?? "no data",
      );
      break;
    }
    const batch = data as unknown as Record<string, unknown>[];
    chunksUsed += 1;
    if (batch.length === 0) break;
    allRaw.push(...batch);
    const prevCursor = lastIdCursor;
    const batchMax = maxNumericRowId(batch);
    if (batchMax != null && batchMax > lastIdCursor) lastIdCursor = batchMax;
    if (batch.length > 0 && lastIdCursor === prevCursor) {
      console.warn(
        `[market-report] national glamping: id cursor stalled (non-advancing page) (${logLabel})`,
      );
      break;
    }
    if (chunk === maxChunks - 1) {
      hitRowCap = true;
      break;
    }
  }

  return { allRaw, chunksUsed, hitRowCap };
}

/** National (US-wide) glamping: Sage rows in US by state list **or** US country string (merged by `id`). */
async function fetchNationalGlamping(
  supabase: SupabaseClient,
  filter: CohortAdrFilter,
): Promise<{
  rows: CohortPropertyRow[];
  meta: NonNullable<MarketReportFetchMeta["glamping"]>;
}> {
  const [byState, byCountry] = await Promise.all([
    paginateNationalGlampingScopedRaw(
      supabase,
      (q) => q.in("state", US_STATE_ALL_KEYS),
      filter,
      "state",
    ),
    paginateNationalGlampingScopedRaw(
      supabase,
      (q) => q.or(US_COUNTRY_OR_FILTER).not("country", "is", null),
      filter,
      "country",
    ),
  ]);

  const seen = new Set<string>();
  const raw: Record<string, unknown>[] = [];
  for (const r of byState.allRaw) {
    const k = String(r.id ?? "");
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    raw.push(r);
  }
  for (const r of byCountry.allRaw) {
    const k = String(r.id ?? "");
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    raw.push(r);
  }

  const meta = {
    candidatesInBBox: raw.length,
    hitRowCap: byState.hitRowCap || byCountry.hitRowCap,
    chunksUsed: byState.chunksUsed + byCountry.chunksUsed,
  };
  const rows = raw
    .map((r) => mapGlampingRow(r, 0, 0, Number.POSITIVE_INFINITY))
    .filter((x): x is CohortPropertyRow => x !== null)
    .map((r) => ({ ...r, distance_miles: 0 }));
  return { rows, meta };
}

async function fetchNationalRoverpass(
  supabase: SupabaseClient,
  filter: CohortAdrFilter,
): Promise<{
  rows: CohortPropertyRow[];
  meta: NonNullable<MarketReportFetchMeta["roverpass"]>;
}> {
  const roverSelect =
    "id, property_type, property_name, site_name, city, state, country, unit_type, property_total_sites, quantity_of_units, " +
    "rate_avg_retail_daily_rate, rate_winter_weekday, rate_winter_weekend, " +
    "rate_spring_weekday, rate_spring_weekend, rate_summer_weekday, rate_summer_weekend, " +
    "rate_fall_weekday, rate_fall_weekend, operating_season_months, url, lat, lon, " +
    "roverpass_occupancy_rate";

  const [byState, byCountry] = await Promise.all([
    paginateNationalRoverRaw(supabase, roverSelect, filter, (q) =>
      q.in("state", US_STATE_ALL_KEYS),
    ),
    paginateNationalRoverRaw(supabase, roverSelect, filter, (q) =>
      q.or(US_COUNTRY_OR_FILTER).not("country", "is", null),
    ),
  ]);

  const seen = new Set<string>();
  const merged: Record<string, unknown>[] = [];
  for (const r of byState.allRaw) {
    const k = String(r.id ?? "");
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(r);
  }
  for (const r of byCountry.allRaw) {
    const k = String(r.id ?? "");
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(r);
  }

  const meta = {
    candidatesInBBox: merged.length,
    hitRowCap: byState.hitRowCap || byCountry.hitRowCap,
    chunksUsed: byState.chunksUsed + byCountry.chunksUsed,
  };
  const rows = merged
    .map((r) => mapRoverpassRow(r, 0, 0, Number.POSITIVE_INFINITY))
    .filter((x): x is CohortPropertyRow => x !== null)
    .map((r) => ({ ...r, distance_miles: 0 }));
  return { rows, meta };
}

/** Hipcamp columns we pull into the cohort. Includes the bare amenity names so
 * `mapHipcampRow` can alias them into `property_*` keys for amenity analysis. */
const HIPCAMP_SELECT = [
  "id",
  "property_name",
  "site_name",
  "city",
  "state",
  "country",
  "property_type",
  "unit_type",
  "property_total_sites",
  "quantity_of_units",
  "lat",
  "lon",
  "lat_num",
  "lon_num",
  "avg_retail_daily_rate_2024",
  "avg_retail_daily_rate_2025",
  "winter_weekday",
  "winter_weekend",
  "spring_weekday",
  "spring_weekend",
  "summer_weekday",
  "summer_weekend",
  "fall_weekday",
  "fall_weekend",
  "occupancy_rate_2024",
  "occupancy_rate_2025",
  "occupancy_rate_2026",
  "operating_season_months",
  "url",
  // amenity aliases (see HIPCAMP_AMENITY_ALIASES)
  "pool",
  "laundry",
  "playground",
  "restaurant",
  "dog_park",
  "clubhouse",
  "waterpark",
  "general_store",
  "waterfront",
  "hot_tub_sauna",
].join(", ");

async function fetchHipcampCohort(
  supabase: SupabaseClient,
  anchorLat: number,
  anchorLng: number,
  radiusMiles: number,
  rowLimit: number,
  /** Local scope: USPS state (e.g. `OR`) to pull a capped batch of Hipcamp rows with text lat/lon but null `lat_num`. */
  anchorStateAbbr?: string,
): Promise<{
  rows: CohortPropertyRow[];
  meta: NonNullable<MarketReportFetchMeta["hipcamp"]>;
}> {
  const bb = getBoundingBox(anchorLat, anchorLng, radiusMiles);
  const allRaw: Record<string, unknown>[] = [];
  let lastIdCursor = 0;
  let lastChunkHitCap = false;
  let chunksUsed = 0;

  for (let chunk = 0; chunk < MARKET_REPORT_MAX_ID_CHUNKS; chunk++) {
    let q = supabase
      .from("hipcamp")
      .select(HIPCAMP_SELECT)
      .gte("lat_num", bb.minLat)
      .lte("lat_num", bb.maxLat)
      .gte("lon_num", bb.minLng)
      .lte("lon_num", bb.maxLng)
      .not("lat_num", "is", null)
      .not("lon_num", "is", null)
      .not("property_name", "is", null);
    if (lastIdCursor > 0) {
      q = q.gt("id", lastIdCursor);
    }
    const { data, error } = await q
      .order("id", { ascending: true })
      .limit(rowLimit);

    if (error) {
      console.warn("[market-report] hipcamp fetch:", error.message);
      break;
    }
    if (!data || data.length === 0) break;

    const batch = data as unknown as Record<string, unknown>[];
    allRaw.push(...batch);
    chunksUsed += 1;
    lastChunkHitCap = batch.length >= rowLimit;
    lastIdCursor = Math.max(...batch.map((r) => Number(r.id)));
    if (!lastChunkHitCap) break;
  }

  const seenIds = new Set(
    allRaw.map((r) => Number(r.id)).filter((n) => Number.isFinite(n)),
  );
  let supplementalHitCap = false;
  const abbr = anchorStateAbbr?.trim().toUpperCase() ?? "";
  if (abbr.length === 2) {
    const supLimit = Math.min(4000, Math.max(rowLimit, 1500));
    const stateKeys = stateSqlValuesGlampingRoverpass([abbr]);
    const { data: supData, error: supErr } = await supabase
      .from("hipcamp")
      .select(HIPCAMP_SELECT)
      .in("state", stateKeys)
      .is("lat_num", null)
      .not("lat", "is", null)
      .not("lon", "is", null)
      .not("property_name", "is", null)
      .order("id", { ascending: true })
      .limit(supLimit);
    if (!supErr && supData?.length) {
      const batch = supData as unknown as Record<string, unknown>[];
      for (const r of batch) {
        const id = Number(r.id);
        if (Number.isFinite(id) && seenIds.has(id)) continue;
        if (Number.isFinite(id)) seenIds.add(id);
        allRaw.push(r);
      }
      supplementalHitCap = batch.length >= supLimit;
      chunksUsed += 1;
    }
  }

  const rows = allRaw
    .map((r) => mapHipcampRow(r, anchorLat, anchorLng, radiusMiles))
    .filter((x): x is CohortPropertyRow => x !== null);

  return {
    rows,
    meta: {
      candidatesInBBox: allRaw.length,
      hitRowCap: lastChunkHitCap || supplementalHitCap,
      chunksUsed,
    },
  };
}

async function paginateNationalHipcampScopedRaw(
  supabase: SupabaseClient,
  applyUsScope: (q: any) => any,
  logLabel: string,
): Promise<{
  allRaw: Record<string, unknown>[];
  chunksUsed: number;
  hitRowCap: boolean;
}> {
  const pageSize = resolveNationalHipcampPageSize();
  const maxChunks = resolveNationalHipcampMaxChunks();
  const allRaw: Record<string, unknown>[] = [];
  let lastIdCursor = 0;
  let chunksUsed = 0;
  let hitRowCap = false;

  for (let chunk = 0; chunk < maxChunks; chunk++) {
    let q: any = supabase.from("hipcamp").select(HIPCAMP_SELECT);
    q = applyUsScope(q);
    q = q
      .not("lat_num", "is", null)
      .not("lon_num", "is", null)
      .not("property_name", "is", null);
    if (lastIdCursor > 0) q = q.gt("id", lastIdCursor);
    const { data, error } = await q
      .order("id", { ascending: true })
      .limit(pageSize);
    if (error || !data) {
      console.warn(
        `[market-report] national hipcamp fetch (${logLabel}):`,
        error?.message ?? "no data",
      );
      break;
    }
    const batch = data as unknown as Record<string, unknown>[];
    chunksUsed += 1;
    if (batch.length === 0) break;
    allRaw.push(...batch);
    const prevCursor = lastIdCursor;
    const batchMax = maxNumericRowId(batch);
    if (batchMax != null && batchMax > lastIdCursor) lastIdCursor = batchMax;
    if (batch.length > 0 && lastIdCursor === prevCursor) {
      console.warn(
        `[market-report] national hipcamp: id cursor stalled (non-advancing page) (${logLabel})`,
      );
      break;
    }
    if (chunk === maxChunks - 1) {
      hitRowCap = true;
      break;
    }
  }

  return { allRaw, chunksUsed, hitRowCap };
}

async function fetchNationalHipcamp(
  supabase: SupabaseClient,
  filter: CohortAdrFilter,
): Promise<{
  rows: CohortPropertyRow[];
  meta: NonNullable<MarketReportFetchMeta["hipcamp"]>;
}> {
  const [byState, byCountry] = await Promise.all([
    paginateNationalHipcampScopedRaw(supabase, (q) => q.in("state", US_STATE_ALL_KEYS), "state"),
    paginateNationalHipcampScopedRaw(
      supabase,
      (q) => q.or(US_COUNTRY_OR_FILTER).not("country", "is", null),
      "country",
    ),
  ]);

  const seen = new Set<string>();
  const merged: Record<string, unknown>[] = [];
  for (const r of byState.allRaw) {
    const k = String(r.id ?? "");
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(r);
  }
  for (const r of byCountry.allRaw) {
    const k = String(r.id ?? "");
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(r);
  }

  const meta = {
    candidatesInBBox: merged.length,
    hitRowCap: byState.hitRowCap || byCountry.hitRowCap,
    chunksUsed: byState.chunksUsed + byCountry.chunksUsed,
  };
  const mapped = merged
    .map((r) => mapHipcampRow(r, 0, 0, Number.POSITIVE_INFINITY))
    .filter((x): x is CohortPropertyRow => x !== null)
    .map((r) => ({ ...r, distance_miles: 0 }));
  return { rows: applyAdrFilter(mapped, filter), meta };
}

async function fetchNationalCampspot(
  supabase: SupabaseClient,
  filter: CohortAdrFilter,
): Promise<{
  rows: CohortPropertyRow[];
  meta: NonNullable<MarketReportFetchMeta["campspot"]>;
}> {
  // Campspot stores rates as text with values like "No data" — cast at the app layer
  // and rely on the ADR filter (applied post-fetch) when given.
  const campspotSelect =
    "id, property_name, site_name, city, state, country, unit_type, property_total_sites, quantity_of_units, " +
    "avg_retail_daily_rate_2025, high_rate_2025, low_rate_2025, " +
    "occupancy_rate_2024, occupancy_rate_2025, occupancy_rate_2026, " +
    "winter_weekday, winter_weekend, spring_weekday, spring_weekend, " +
    "summer_weekday, summer_weekend, fall_weekday, fall_weekend, " +
    "operating_season_months, url, lat, lon, lat_num, lon_num";

  const [byState, byCountry] = await Promise.all([
    paginateNationalCampspotRaw(supabase, campspotSelect, (q) =>
      q.in("state", US_STATE_ALL_KEYS),
    ),
    paginateNationalCampspotRaw(supabase, campspotSelect, (q) =>
      q.or(US_COUNTRY_OR_FILTER).not("country", "is", null),
    ),
  ]);

  const seen = new Set<string>();
  const merged: Record<string, unknown>[] = [];
  for (const r of byState.allRaw) {
    const k = String(r.id ?? "");
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(r);
  }
  for (const r of byCountry.allRaw) {
    const k = String(r.id ?? "");
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(r);
  }

  const meta = {
    candidatesInBBox: merged.length,
    hitRowCap: byState.hitRowCap || byCountry.hitRowCap,
    chunksUsed: byState.chunksUsed + byCountry.chunksUsed,
  };
  const mapped = merged
    .map((r) => mapCampspotRow(r, 0, 0, Number.POSITIVE_INFINITY))
    .filter((x): x is CohortPropertyRow => x !== null)
    .map((r) => ({ ...r, distance_miles: 0 }));
  // Apply ADR filter in TS since campspot rates are text-cast at map-time.
  return { rows: applyAdrFilter(mapped, filter), meta };
}

export async function loadMarketReportCohort(
  supabase: SupabaseClient,
  params: {
    segment: MarketReportSegment;
    anchorLat: number;
    anchorLng: number;
    radiusMiles: number;
    stateAbbr: string;
    scope?: CohortScope;
    adrFilter?: CohortAdrFilter | null;
    /** Min sites (RV) or units (glamping) per property; 0 = no filter. */
    minSiteUnitCount?: number;
  },
): Promise<LoadCohortResult> {
  const { segment, anchorLat, anchorLng, radiusMiles, stateAbbr } = params;
  const scope: CohortScope = params.scope ?? "local";
  const adrFilter: CohortAdrFilter = params.adrFilter ?? {};
  const minSiteUnit = Math.max(
    0,
    Math.min(100_000, Math.floor(params.minSiteUnitCount ?? 0)),
  );

  // National scope: skip bbox; merge cohort (Sage: every `all_glamping_properties` row;
  // Hipcamp deduped), then filters.
  if (scope === "national") {
    if (segment === "glamping") {
      // Glamping cohort = Sage + Hipcamp. Campspot is intentionally excluded
      // (RV-park product); RV reports use the other branch below.
      const [glam, hip] = await Promise.all([
        fetchNationalGlamping(supabase, adrFilter),
        fetchNationalHipcamp(supabase, adrFilter),
      ]);
      const rawConsidered = glam.rows.length + hip.rows.length;
      const hipFiltered = filterHipcampMajorityTentSiteProperties(hip.rows);
      const merged = [...applyAdrFilter(glam.rows, adrFilter), ...hipFiltered];
      const vehicleFiltered = filterGlampingMajorityVehicleInventoryRows(merged);
      const { rows: deduped } = dedupeCohortRowsPreservingSage(vehicleFiltered);
      return {
        rows: applyMinSiteUnitCountFilter(deduped, segment, minSiteUnit, {
          scope: "national",
        }),
        fetchMeta: { glamping: glam.meta, hipcamp: hip.meta },
        rawRowsConsidered: rawConsidered,
      };
    }
    const [rover, camp] = await Promise.all([
      fetchNationalRoverpass(supabase, adrFilter),
      fetchNationalCampspot(supabase, adrFilter),
    ]);
    const rawConsidered = rover.rows.length + camp.rows.length;
    const filtered = [...applyAdrFilter(rover.rows, adrFilter), ...camp.rows];
    const { rows: deduped } = dedupeCohortRows(filtered);
    return {
      rows: applyMinSiteUnitCountFilter(deduped, segment, minSiteUnit, {
        scope: "national",
      }),
      fetchMeta: { roverpass: rover.meta, campspot: camp.meta },
      rawRowsConsidered: rawConsidered,
    };
  }

  // Local scope: bbox + Haversine, then cohort merge (Sage: all `all_glamping_properties`
  // rows; Hipcamp deduped), ADR filter in TS.
  const rowLimit = bboxFetchLimitForRadius(radiusMiles);

  if (segment === "glamping") {
    // Glamping cohort = Sage + Hipcamp. Campspot is intentionally excluded
    // (RV-park product); RV reports use the other branch below.
    const [{ rows: glamRows, meta: glampingMeta }, hipResult] =
      await Promise.all([
        fetchGlampingCohort(
          supabase,
          anchorLat,
          anchorLng,
          radiusMiles,
          rowLimit,
        ),
        fetchHipcampCohort(
          supabase,
          anchorLat,
          anchorLng,
          radiusMiles,
          rowLimit,
          scope === "local" && stateAbbr.length === 2 ? stateAbbr : undefined,
        ),
      ]);
    const hipFiltered = filterHipcampMajorityTentSiteProperties(hipResult.rows);
    // Do not use `mergeAndDedupeRv` here: that helper is for RoverPass+Campspot
    // listings that duplicate the same RV park at one set of coordinates. Hipcamp
    // intentionally has many rows per listing (one per unit type); geo-merging
    // them drops inventory used by tent/vehicle majority filters and understates
    // the cohort. National glamping already concatenates Sage + Hipcamp the same way.
    const merged = [...glamRows, ...hipFiltered];
    const vehicleFiltered = filterGlampingMajorityVehicleInventoryRows(merged);
    const filtered = applyAdrFilter(vehicleFiltered, adrFilter);
    const { rows: deduped } = dedupeCohortRowsPreservingSage(filtered);
    const siteFiltered = applyMinSiteUnitCountFilter(
      deduped,
      segment,
      minSiteUnit,
      { scope: "local" },
    );
    const sorted = siteFiltered.sort((a, b) => a.distance_miles - b.distance_miles);
    return {
      rows: sorted,
      fetchMeta: {
        glamping: glampingMeta,
        hipcamp: hipResult.meta,
      },
      rawRowsConsidered: glamRows.length + hipResult.rows.length,
    };
  }

  const [roverResult, campResult] = await Promise.all([
    fetchRoverpassCohort(supabase, anchorLat, anchorLng, radiusMiles, rowLimit),
    stateAbbr.length === 2
      ? fetchCampspotCohort(
          supabase,
          anchorLat,
          anchorLng,
          radiusMiles,
          stateAbbr,
          rowLimit,
        )
      : Promise.resolve({
          rows: [] as CohortPropertyRow[],
          meta: { candidatesInBBox: 0, hitRowCap: false, chunksUsed: 0 },
        }),
  ]);

  const merged = mergeAndDedupeRv([...roverResult.rows, ...campResult.rows]);
  const filtered = applyAdrFilter(merged, adrFilter);
  const { rows: deduped } = dedupeCohortRows(filtered);
  return {
    rows: applyMinSiteUnitCountFilter(deduped, segment, minSiteUnit, {
      scope: "local",
    }),
    fetchMeta: {
      roverpass: roverResult.meta,
      campspot: campResult.meta,
    },
    rawRowsConsidered: roverResult.rows.length + campResult.rows.length,
  };
}

export function fetchMetaAnyHitCap(fetchMeta: MarketReportFetchMeta): boolean {
  return Boolean(
    fetchMeta.glamping?.hitRowCap ||
    fetchMeta.roverpass?.hitRowCap ||
    fetchMeta.campspot?.hitRowCap ||
    fetchMeta.hipcamp?.hitRowCap,
  );
}
