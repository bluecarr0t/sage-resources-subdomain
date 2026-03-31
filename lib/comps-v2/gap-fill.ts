/**
 * Merge Tavily gap results + optional Firecrawl snippets into comps-v2 candidates.
 */

import pLimit from 'p-limit';
import type { CompsV2Candidate, CompsV2PropertyKind, QualityTier } from '@/lib/comps-v2/types';
import {
  canonicalUrlKeyForDedupe,
  extractRateFromWebText,
  extractRateRangeFromWebText,
  extractSiteCountFromWebText,
  fetchTavilyGapComps,
} from '@/lib/comps-v2/tavily-gap';
import { resolveWebResearchQualityTier } from '@/lib/comps-v2/web-research-tier';
import { scrapeUrlMarkdown } from '@/lib/comps-v2/scrape-url';
import { stableCandidateId } from '@/lib/comps-v2/stable-id';
import { effectiveAdr } from '@/lib/comps-v2/filters';
import {
  emptyWebResearchDiagnostics,
  type WebResearchDiagnostics,
} from '@/lib/comps-v2/web-research-diagnostics';
import { compsV2WebVsMarketDedupeKey } from '@/lib/comps-v2/candidate-dedupe-keys';
import { extractLatLngFromWebContent } from '@/lib/comps-v2/extract-geo-from-web-scrape';
import {
  buildFirecrawlTargetsByCanonicalKey,
  orderedFirecrawlScrapeUrls,
} from '@/lib/comps-v2/firecrawl-url-priority';
import {
  geocodeNominatim,
  geocodePlaceLine,
  googlePlacesFindPlaceLatLng,
} from '@/lib/geocode';
import { haversineDistanceMiles } from '@/lib/comps-v2/geo';

function snapshotWebResearchDiagnostics(d: WebResearchDiagnostics): WebResearchDiagnostics {
  return {
    ...d,
    tavily: { ...d.tavily },
    firecrawl: { ...d.firecrawl },
  };
}

const NOMINATIM_GAP_MS = 1100;
/** Align with max Tavily gap rows (40); geocode every web candidate when possible. */
const MAX_WEB_GEOCODE_ATTEMPTS_PER_RUN = 40;

export interface GapFillPipelineResult {
  candidates: CompsV2Candidate[];
  diagnostics: WebResearchDiagnostics;
}

/**
 * Best-effort US street fragment from Firecrawl/Tavily text for geocoding (full line, no PO Box).
 */
export function extractStreetAddressHintFromWebText(text: string): string | null {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length < 12) return null;
  const m = t.match(
    /\b(\d{1,6}\s+[A-Za-z0-9#.\-]+(?:\s+[A-Za-z0-9#.\-]+){0,10}\s+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Boulevard|Blvd|Loop|Way|Court|Ct|Circle|Cir|Highway|Hwy|Route|Rt|FM\s*\d+|CR\s*\d+|County\s+Road\s+\d+)\b(?:[,\s]+[A-Za-z][A-Za-z\s.'\-]+){0,2})/i
  );
  if (!m) return null;
  const s = m[1].replace(/\s+/g, ' ').trim();
  if (s.length < 8 || s.length > 220) return null;
  if (/\bP\.?\s*O\.?\s*Box\b/i.test(s)) return null;
  return s;
}

function buildWebResearchLocationDetail(text: string, city: string, state: string): string | null {
  const street = extractStreetAddressHintFromWebText(text);
  const st = state.trim().toUpperCase().slice(0, 2);
  const cityPart = city.trim();
  const cs =
    cityPart && st.length === 2 ? `${cityPart}, ${st}` : cityPart || (st.length === 2 ? st : '');
  if (street && cs) return `${street} · ${cs}`;
  if (street) return street;
  return cs.length >= 2 ? cs : null;
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocodeWebCandidateLocation(
  c: CompsV2Candidate,
  fallbackCity: string,
  anchor: { lat: number; lng: number } | null,
  nominatimClock: { lastCall: number },
  geoCallStats: { googleGeocodeCalls: number; nominatimGeocodeCalls: number }
): Promise<{ lat: number; lng: number } | null> {
  const state = (c.state || '').trim().toUpperCase().slice(0, 2);
  const name = (c.property_name || '').trim();
  const locality = (c.city?.trim() || fallbackCity || '').trim();
  if (!name || state.length !== 2) return null;

  const desc = c.description ?? '';
  const fullText = `${name}\n${desc}`;
  const embedded = extractLatLngFromWebContent(undefined, fullText);
  if (embedded) return embedded;

  const addrHint = extractStreetAddressHintFromWebText(desc);

  const queries: string[] = [];
  if (addrHint) {
    queries.push(`${addrHint}, USA`);
    queries.push(`${addrHint}, ${state}, USA`);
  }
  if (locality.length >= 2) {
    queries.push(`${name}, ${locality}, ${state}, USA`);
    queries.push(`${name}, ${locality}, United States`);
  }
  queries.push(`${name}, ${state}, USA`);

  const placesQuery =
    locality.length >= 2 ? `${name}, ${locality}, ${state}, USA` : `${name}, ${state}, USA`;

  const seen = new Set<string>();

  async function tryGeocodeThenNominatim(q: string): Promise<{ lat: number; lng: number } | null> {
    const k = q.toLowerCase().trim();
    if (!k || seen.has(k)) return null;
    seen.add(k);

    geoCallStats.googleGeocodeCalls += 1;
    const googleHit = await geocodePlaceLine(q);
    if (googleHit) return googleHit;

    const now = Date.now();
    const wait = NOMINATIM_GAP_MS - (now - nominatimClock.lastCall);
    if (wait > 0) await sleepMs(wait);
    nominatimClock.lastCall = Date.now();

    geoCallStats.nominatimGeocodeCalls += 1;
    const nom = await geocodeNominatim(q);
    if (nom) return nom;
    return null;
  }

  if (addrHint) {
    for (const q of [`${addrHint}, USA`, `${addrHint}, ${state}, USA`]) {
      const hit = await tryGeocodeThenNominatim(q);
      if (hit) return hit;
    }
  }

  geoCallStats.googleGeocodeCalls += 1;
  const placesHit = await googlePlacesFindPlaceLatLng(
    placesQuery,
    anchor && Number.isFinite(anchor.lat) && Number.isFinite(anchor.lng)
      ? { lat: anchor.lat, lng: anchor.lng, radiusMeters: 80_000 }
      : undefined
  );
  if (placesHit) return placesHit;

  for (const q of queries) {
    const hit = await tryGeocodeThenNominatim(q);
    if (hit) return hit;
  }

  return null;
}

/**
 * Geocode web-sourced rows for map pins (lat/lng). When `anchor` is set, also fills `distance_miles`.
 */
async function enrichWebCandidatesWithGeocode(
  candidates: CompsV2Candidate[],
  anchor: { lat: number; lng: number } | null,
  budget: number,
  fallbackCity: string
): Promise<{
  list: CompsV2Candidate[];
  attempts: number;
  hits: number;
  googleGeocodeCalls: number;
  nominatimGeocodeCalls: number;
}> {
  let attempts = 0;
  let hits = 0;
  const nominatimClock = { lastCall: 0 };
  const geoCallStats = { googleGeocodeCalls: 0, nominatimGeocodeCalls: 0 };
  const list = candidates.map((c) => ({ ...c }));
  const fb = fallbackCity.trim();

  for (let i = 0; i < list.length && attempts < budget; i++) {
    const c = list[i];
    const hasGeo =
      c.geo_lat != null &&
      c.geo_lng != null &&
      Number.isFinite(c.geo_lat) &&
      Number.isFinite(c.geo_lng);
    if (hasGeo) continue;

    attempts++;

    const g = await geocodeWebCandidateLocation(c, fb, anchor, nominatimClock, geoCallStats);
    if (!g) continue;
    hits++;

    let distance_miles = c.distance_miles;
    if (
      anchor != null &&
      Number.isFinite(anchor.lat) &&
      Number.isFinite(anchor.lng) &&
      Number.isFinite(g.lat) &&
      Number.isFinite(g.lng)
    ) {
      const dist = haversineDistanceMiles(anchor.lat, anchor.lng, g.lat, g.lng);
      distance_miles = Math.round(dist * 10) / 10;
    }

    list[i] = {
      ...c,
      distance_miles,
      geo_lat: g.lat,
      geo_lng: g.lng,
    };
  }
  return {
    list,
    attempts,
    hits,
    googleGeocodeCalls: geoCallStats.googleGeocodeCalls,
    nominatimGeocodeCalls: geoCallStats.nominatimGeocodeCalls,
  };
}

export async function runGapFillPipeline(
  city: string,
  stateAbbr: string,
  propertyKinds: CompsV2PropertyKind[],
  existingNameKeys: Set<string>,
  existingUrlKeys: Set<string>,
  options?: {
    firecrawlTopN?: number;
    radiusMiles?: number;
    qualityTiers?: QualityTier[] | null;
    maxGapComps?: number;
    anchorLat?: number;
    anchorLng?: number;
    webDistanceGeocodeBudget?: number;
    tavilyMaxQueries?: number;
    tavilyResultsPerQuery?: number;
    /** Optional NDJSON / UI: emit partial diagnostics after Tavily and during Firecrawl. */
    onWebResearchProgress?: (snap: WebResearchDiagnostics) => void;
  }
): Promise<GapFillPipelineResult> {
  const radiusMiles = options?.radiusMiles ?? 100;
  const qualityTiers = options?.qualityTiers ?? null;
  const firecrawlTopN = options?.firecrawlTopN ?? 4;

  const { rows: raw, stats: tavilyStats } = await fetchTavilyGapComps(city, stateAbbr, propertyKinds, {
    radiusMiles,
    qualityTiers,
    maxGapComps: options?.maxGapComps,
    tavilyMaxQueries: options?.tavilyMaxQueries,
    tavilyResultsPerQuery: options?.tavilyResultsPerQuery,
  });

  const diagnostics = emptyWebResearchDiagnostics(true);
  diagnostics.tavily = { ...tavilyStats };
  diagnostics.firecrawl.apiConfigured = Boolean(process.env.FIRECRAWL_API_KEY?.trim());
  options?.onWebResearchProgress?.(snapshotWebResearchDiagnostics(diagnostics));

  const alatEarly = options?.anchorLat;
  const alngEarly = options?.anchorLng;
  const anchorEarly =
    alatEarly != null &&
    alngEarly != null &&
    Number.isFinite(alatEarly) &&
    Number.isFinite(alngEarly)
      ? { lat: alatEarly, lng: alngEarly }
      : null;

  const fcThrottle = { lastCall: 0 };
  const limitScrape = pLimit(1);
  const staged: (typeof raw)[number][] = [];
  let skippedDuplicateName = 0;
  let skippedDuplicateUrl = 0;

  for (const row of raw) {
    const nk = compsV2WebVsMarketDedupeKey(row.property_name, row.city, stateAbbr);
    if (!nk) continue;
    if (existingNameKeys.has(nk)) {
      skippedDuplicateName += 1;
      continue;
    }
    const uk = row.url ? canonicalUrlKeyForDedupe(row.url) : null;
    if (uk && existingUrlKeys.has(uk)) {
      skippedDuplicateUrl += 1;
      continue;
    }

    existingNameKeys.add(nk);
    if (uk) existingUrlKeys.add(uk);
    staged.push(row);
  }

  const targetByKey = buildFirecrawlTargetsByCanonicalKey(staged, firecrawlTopN);
  const orderedUrls = orderedFirecrawlScrapeUrls(targetByKey);
  const scrapeByUrl = new Map<
    string,
    Awaited<ReturnType<typeof scrapeUrlMarkdown>>
  >();

  for (const scrapeUrl of orderedUrls) {
    diagnostics.firecrawl.attempted += 1;
    const scrape = await limitScrape(() => scrapeUrlMarkdown(scrapeUrl, fcThrottle));
    scrapeByUrl.set(scrapeUrl, scrape);
    if (scrape.ok) {
      diagnostics.firecrawl.enriched += 1;
    } else if (scrape.reason === 'blocked_url') {
      diagnostics.firecrawl.blockedByPolicy += 1;
    } else {
      diagnostics.firecrawl.failedOrEmpty += 1;
    }
    options?.onWebResearchProgress?.(snapshotWebResearchDiagnostics(diagnostics));
  }

  const out: CompsV2Candidate[] = [];

  for (const row of staged) {
    let description = row.description;
    let sourceTable = row.source_table;
    const urlKey = row.url ? canonicalUrlKeyForDedupe(row.url) : null;
    const targetUrl =
      urlKey && targetByKey.has(urlKey) ? (targetByKey.get(urlKey) as string) : null;
    const scrape = targetUrl ? scrapeByUrl.get(targetUrl) : undefined;

    let pageGeo: { lat: number; lng: number } | null = null;
    if (scrape?.ok) {
      pageGeo = extractLatLngFromWebContent(scrape.html, scrape.markdown) ?? null;
      description = (description ? description + '\n\n' : '') + scrape.markdown.slice(0, 8000);
      sourceTable = 'firecrawl_gap_fill';
    }

    const fullText = `${row.property_name}\n${description ?? ''}`;
    let avgRetail = row.avg_retail_daily_rate;
    if (avgRetail == null || avgRetail <= 0) {
      const fromText = extractRateFromWebText(fullText);
      if (fromText != null) avgRetail = fromText;
    }
    const rateRange = extractRateRangeFromWebText(fullText);
    if ((avgRetail == null || avgRetail <= 0) && rateRange != null) {
      avgRetail = rateRange.mid;
    }
    let lowRate = row.low_rate;
    let highRate = row.high_rate;
    if (rateRange != null) {
      if (lowRate == null || lowRate <= 0) lowRate = rateRange.low;
      if (highRate == null || highRate <= 0) highRate = rateRange.high;
    }

    let propertyTotalSites = row.property_total_sites;
    let quantityUnits = row.quantity_of_units;
    if (propertyTotalSites == null || propertyTotalSites <= 0) {
      const sitesFromText = extractSiteCountFromWebText(fullText);
      if (sitesFromText != null) {
        propertyTotalSites = sitesFromText;
        if (quantityUnits == null || quantityUnits <= 0) quantityUnits = sitesFromText;
      }
    }

    const cityStr = row.city?.trim() ?? '';
    const stateStr = row.state?.trim() ?? stateAbbr;
    const locationDetail = buildWebResearchLocationDetail(fullText, cityStr, stateStr);

    let distance_miles = row.distance_miles;
    let geo_lat: number | null | undefined = row.geo_lat;
    let geo_lng: number | null | undefined = row.geo_lng;
    if (pageGeo) {
      geo_lat = pageGeo.lat;
      geo_lng = pageGeo.lng;
      if (
        anchorEarly &&
        Number.isFinite(anchorEarly.lat) &&
        Number.isFinite(anchorEarly.lng)
      ) {
        const dist = haversineDistanceMiles(
          anchorEarly.lat,
          anchorEarly.lng,
          pageGeo.lat,
          pageGeo.lng
        );
        distance_miles = Math.round(dist * 10) / 10;
      }
    }

    const comp = {
      ...row,
      description,
      source_table: sourceTable,
      avg_retail_daily_rate: avgRetail,
      low_rate: lowRate,
      high_rate: highRate,
      property_total_sites: propertyTotalSites,
      quantity_of_units: quantityUnits,
      location_detail: locationDetail,
      distance_miles,
      geo_lat: geo_lat ?? null,
      geo_lng: geo_lng ?? null,
    };
    const adr = effectiveAdr(comp);
    const candidate: CompsV2Candidate = {
      ...comp,
      stable_id: stableCandidateId(sourceTable, null, comp.property_name),
      source_row_id: null,
      property_type: null,
      adr_quality_tier: resolveWebResearchQualityTier(adr, fullText),
    };
    out.push(candidate);
  }

  diagnostics.pipelineOutputCount = out.length;
  diagnostics.skippedDuplicateName = skippedDuplicateName;
  diagnostics.skippedDuplicateUrl = skippedDuplicateUrl;

  let finalOut = out;
  const anchor = anchorEarly;

  if (out.length > 0) {
    const defaultCap = Math.min(MAX_WEB_GEOCODE_ATTEMPTS_PER_RUN, Math.max(1, out.length));
    const cap =
      options?.webDistanceGeocodeBudget != null && Number.isFinite(options.webDistanceGeocodeBudget)
        ? Math.max(0, Math.min(MAX_WEB_GEOCODE_ATTEMPTS_PER_RUN, Math.floor(options.webDistanceGeocodeBudget)))
        : defaultCap;
    if (cap > 0) {
      const { list, attempts, hits, googleGeocodeCalls, nominatimGeocodeCalls } =
        await enrichWebCandidatesWithGeocode(out, anchor, cap, city.trim());
      finalOut = list;
      diagnostics.webDistanceGeocodeAttempts = attempts;
      diagnostics.webDistanceGeocodeHits = hits;
      diagnostics.googleGeocodeCalls = googleGeocodeCalls;
      diagnostics.nominatimGeocodeCalls = nominatimGeocodeCalls;
      options?.onWebResearchProgress?.(snapshotWebResearchDiagnostics(diagnostics));
    }
  }

  return { candidates: finalOut, diagnostics };
}
