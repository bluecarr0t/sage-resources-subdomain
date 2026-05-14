import type { SupabaseClient } from '@supabase/supabase-js';
import { STATE_ABBR_TO_NAME } from '@/lib/comps-v2/geo';
import { reverseGeocodeCountyLevel2Usa } from '@/lib/geocode';

/**
 * Best-effort county lookup for `county-population` + `county-gdp`:
 *
 *   1. Pull every county-population row in the anchor state.
 *   2. Prefer a row whose county token matches `countyHint` (from forward geocode
 *      `administrative_area_level_2`) so "Lake Geneva, WI" still resolves to Walworth County.
 *   3. Else score candidates by whether the county name appears in the freeform address line.
 *   4. Else reverse-geocode the anchor lat/lng (Google or Nominatim) and match county again.
 *   5. Look up GDP in `county-gdp` by normalized county token + state.
 *
 * Returns null when nothing matches — callers degrade the Economic strength pillar.
 */

export interface CountyMetricsResult {
  /** "Walworth County, Wisconsin" or whatever was matched. */
  countyName: string;
  /** State abbr (always 2 letters, uppercased). */
  stateAbbr: string;
  population2020: number | null;
  populationChangePct: number | null;
  gdp2023: number | null;
  /** GDP growth (%) — uses moving-annual-average column. */
  gdpGrowthMaaPct: number | null;
  /** True when the match was high-confidence (county token present in input). */
  highConfidence: boolean;
}

interface CountyPopRow {
  geo_id: string | null;
  name: string;
  population_2020: number | null;
  change: number | null;
}

interface CountyGdpRow {
  geofips: string | null;
  geoname: string;
  gdp_2023: number | null;
  'moving-annual-average': number | null;
}

/** Strip "County", "Parish", "Borough", trailing state suffix and lowercase for matching. */
function normalizeCountyToken(name: string): string {
  return name
    .toLowerCase()
    .replace(/,\s*[a-z\s]+$/g, '')
    .replace(/\b(county|parish|borough|census area|municipality)\b/g, '')
    .replace(/[^a-z]/g, '')
    .trim();
}

function normalizeAddressBag(line: string): string {
  return line
    .toLowerCase()
    .replace(/[^a-z]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreCandidate(addressBag: string, countyName: string): number {
  const token = normalizeCountyToken(countyName);
  if (!token) return 0;
  // Exact "X County" mention in the address is the gold standard.
  if (new RegExp(`\\b${token}\\s*county\\b`).test(addressBag.replace(/\s+/g, ' '))) return 100;
  // Bare county name token present (e.g. "walworth")
  if (new RegExp(`\\b${token}\\b`).test(addressBag.replace(/\s+/g, ' '))) return 60;
  return 0;
}

export interface FetchCountyMetricsOptions {
  /** Two-letter US state abbreviation (uppercased). */
  stateAbbr: string;
  /** Raw user-entered address — we extract the county hint from this. */
  addressLine: string;
  /**
   * US county from forward geocode (`administrative_area_level_2`), e.g. "Walworth County".
   * When set, we match `county-population` by county token even if the address line is only "City, ST".
   */
  countyHint?: string | null;
  /** Anchor coordinates — used to reverse-geocode county when the line has no county token and no hint. */
  anchorLat?: number;
  anchorLng?: number;
}

/**
 * Pick the census row whose county token matches the hint (e.g. geocoded "Walworth County"
 * vs table name "Walworth County, Wisconsin"). Exported for unit tests.
 */
export function pickCountyPopRowByCountyHint<
  T extends { name: string; population_2020: number | null }
>(rows: T[], countyHint: string | null | undefined): T | null {
  const h = countyHint?.trim();
  if (!h || rows.length === 0) return null;
  const token = normalizeCountyToken(h);
  if (!token) return null;
  const hits = rows.filter((r) => normalizeCountyToken(r.name) === token);
  if (hits.length === 0) return null;
  return hits.sort((a, b) => (b.population_2020 ?? 0) - (a.population_2020 ?? 0))[0] ?? null;
}

export async function fetchCountyMetrics(
  supabase: SupabaseClient,
  opts: FetchCountyMetricsOptions
): Promise<CountyMetricsResult | null> {
  const stateAbbr = (opts.stateAbbr || '').toUpperCase().slice(0, 2);
  if (stateAbbr.length !== 2) return null;
  const stateName = STATE_ABBR_TO_NAME[stateAbbr];
  if (!stateName) return null;
  const addressBag = normalizeAddressBag(opts.addressLine);

  const { data: popRows, error: popErr } = await supabase
    .from('county-population')
    .select('geo_id, name, population_2020, change')
    .ilike('name', `%${stateName}%`)
    .limit(500);
  if (popErr || !popRows || popRows.length === 0) return null;

  const rows = popRows as unknown as CountyPopRow[];

  const byForwardHint = pickCountyPopRowByCountyHint(rows, opts.countyHint);
  let bestRow: CountyPopRow | null = byForwardHint;
  let highConfidence = !!byForwardHint;

  if (!bestRow) {
    const candidates = rows
      .map((row) => ({
        row,
        score: scoreCandidate(addressBag, row.name),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.row.population_2020 ?? 0) - (a.row.population_2020 ?? 0);
      });

    const best = candidates[0];
    if (best && best.score > 0) {
      bestRow = best.row;
      highConfidence = best.score >= 100;
    }
  }

  if (
    !bestRow &&
    typeof opts.anchorLat === 'number' &&
    typeof opts.anchorLng === 'number' &&
    Number.isFinite(opts.anchorLat) &&
    Number.isFinite(opts.anchorLng)
  ) {
    const revCounty = await reverseGeocodeCountyLevel2Usa(opts.anchorLat, opts.anchorLng);
    const byRev = pickCountyPopRowByCountyHint(rows, revCounty);
    if (byRev) {
      bestRow = byRev;
      highConfidence = true;
    }
  }

  if (!bestRow) {
    return null;
  }

  const countyToken = normalizeCountyToken(bestRow.name);
  // county-gdp.geoname uses "Walworth, WI" pattern — compare normalized county tokens.
  const { data: gdpRows } = await supabase
    .from('county-gdp')
    .select('geofips, geoname, gdp_2023, "moving-annual-average"')
    .ilike('geoname', `%${countyToken}%, ${stateAbbr}`)
    .limit(10);

  const typedGdp = (gdpRows ?? []) as unknown as CountyGdpRow[];
  const gdpMatch =
    typedGdp.find((g) => normalizeCountyToken(g.geoname) === countyToken) ??
    (typedGdp.length === 1 ? typedGdp[0] : null);

  return {
    countyName: bestRow.name,
    stateAbbr,
    population2020: bestRow.population_2020 ?? null,
    populationChangePct: bestRow.change ?? null,
    gdp2023: gdpMatch?.gdp_2023 ?? null,
    gdpGrowthMaaPct: gdpMatch?.['moving-annual-average'] ?? null,
    highConfidence,
  };
}
