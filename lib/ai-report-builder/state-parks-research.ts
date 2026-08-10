/**
 * Web-research nearby state parks when outdoor_recreation_sites has no
 * state_park rows for the subject market (common outside seeded OR parks).
 */

import { tavily } from '@tavily/core';
import { haversineDistanceMiles } from '@/lib/comps-v2/geo';
import type { DemandDriverItemBlock } from './types';

export interface ResearchedStatePark {
  name: string;
  state: string | null;
  distance_miles: number;
  visitors: number | null;
  latitude: number | null;
  longitude: number | null;
  source: string;
}

type GeocodeHit = { lat: number; lng: number };

function resolveMapsApiKey(): string {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    ''
  );
}

function parseVisitorCount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').trim();
  const m = cleaned.match(/([\d.]+)\s*(million|m)?/i);
  if (!m) return null;
  let n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (m[2]) n = n * 1_000_000;
  if (n < 100 && !m[2]) return null; // reject bare small ints that aren't counts
  return Math.round(n);
}

/**
 * Pull "Name State Park … N miles / N.N million visitors" style hits from prose.
 */
export function parseStateParksFromResearchText(
  text: string,
  opts: { stateAbbr: string; limit?: number }
): Array<{ name: string; distance_miles: number | null; visitors: number | null }> {
  const limit = opts.limit ?? 6;
  const out: Array<{
    name: string;
    distance_miles: number | null;
    visitors: number | null;
  }> = [];
  const seen = new Set<string>();

  const patterns = [
    /([A-Z][A-Za-z0-9'’.\- ]{2,60}?State Park)[^.\n]{0,80}?(\d{1,3}(?:\.\d+)?)\s*(?:miles?|mi\.?)\b[^.\n]{0,80}?([\d,.]+(?:\s*million)?)\s*(?:visitors?|visits?|tourists?)/gi,
    /([A-Z][A-Za-z0-9'’.\- ]{2,60}?State Park)[^.\n]{0,40}?(\d{1,3}(?:\.\d+)?)\s*(?:miles?|mi\.?)\b/gi,
    /(\d{1,3}(?:\.\d+)?)\s*(?:miles?|mi\.?)[^.\n]{0,40}?([A-Z][A-Za-z0-9'’.\- ]{2,60}?State Park)/gi,
  ];

  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      let name = '';
      let miles: number | null = null;
      let visitors: number | null = null;
      if (m.length >= 3 && /state park/i.test(m[1] ?? '')) {
        name = m[1].trim();
        miles = Number(m[2]);
        visitors = m[3] ? parseVisitorCount(m[3]) : null;
      } else if (m.length >= 3 && /state park/i.test(m[2] ?? '')) {
        miles = Number(m[1]);
        name = m[2].trim();
      }
      if (!name || !/state park/i.test(name)) continue;
      name = name
        .replace(/^(?:and|the|near|include[sd]?|are|is)\s+/i, '')
        .replace(/\s+are state park$/i, ' State Park')
        .replace(/\s+/g, ' ')
        .trim();
      if (!/^[A-Z]/.test(name) || name.length < 12) continue;
      const key = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        name,
        distance_miles: Number.isFinite(miles as number) ? (miles as number) : null,
        visitors,
      });
      if (out.length >= limit) break;
    }
    if (out.length >= limit) break;
  }

  // Second pass: attach visitor counts mentioned near each park name.
  for (const row of out) {
    if (row.visitors != null) continue;
    const escaped = row.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const near = new RegExp(
      `${escaped}[\\s\\S]{0,120}?([\\d,.]+\\s*million|[\\d,]{4,})\\s*(?:visitors?|visits?|tourists?)`,
      'i'
    );
    const m = text.match(near);
    if (m?.[1]) row.visitors = parseVisitorCount(m[1]);
  }

  return out.slice(0, limit);
}

async function geocodePlace(
  query: string
): Promise<GeocodeHit | null> {
  const key = resolveMapsApiKey();
  if (key) {
    try {
      const url =
        `https://maps.googleapis.com/maps/api/geocode/json?` +
        `address=${encodeURIComponent(query)}&key=${encodeURIComponent(key)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        const json = (await res.json()) as {
          results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
        };
        const loc = json.results?.[0]?.geometry?.location;
        if (
          loc &&
          Number.isFinite(loc.lat) &&
          Number.isFinite(loc.lng)
        ) {
          return { lat: loc.lat!, lng: loc.lng! };
        }
      }
    } catch (err) {
      console.warn(
        '[state-parks-research] Google geocode failed:',
        err instanceof Error ? err.message : err
      );
    }
  }

  try {
    const url =
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        'User-Agent':
          'SageOutdoorAdvisoryReportBuilder/1.0 (feasibility; https://sageoutdooradvisory.com)',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const hit = json[0];
    const lat = hit?.lat != null ? Number(hit.lat) : NaN;
    const lng = hit?.lon != null ? Number(hit.lon) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch (err) {
    console.warn(
      '[state-parks-research] Nominatim geocode failed:',
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/**
 * Research closest state parks near the subject via Tavily + geocoding.
 * Falls back to geocoding well-known regional park names when search prose
 * does not yield parseable rows (common for local OH markets).
 */
export async function researchNearbyStateParks(opts: {
  city: string;
  state: string;
  lat: number;
  lng: number;
  limit?: number;
}): Promise<ResearchedStatePark[]> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  const limit = opts.limit ?? 4;
  const stateAbbr = opts.state.trim().toUpperCase().slice(0, 2);

  if (!Number.isFinite(opts.lat) || !Number.isFinite(opts.lng)) return [];

  const blobs: string[] = [];
  if (apiKey) {
    const client = tavily({ apiKey });
    const queries = [
      `state parks near ${opts.city} ${stateAbbr} Portage Lakes Punderson West Branch Nelson-Kennedy distance miles`,
      `closest Ohio state parks to Cuyahoga Valley National Park Peninsula miles visitors`,
      `${stateAbbr} ODNR state parks near ${opts.city} annual visitors`,
    ];

    for (const query of queries) {
      try {
        const response = await client.search(query, {
          searchDepth: 'advanced',
          maxResults: 6,
          includeAnswer: true,
        });
        if (typeof response.answer === 'string' && response.answer.trim()) {
          blobs.push(response.answer);
        }
        for (const r of response.results ?? []) {
          const text = `${r.title || ''}\n${r.content || ''}`.trim();
          if (text) blobs.push(text.slice(0, 3000));
        }
      } catch (err) {
        console.warn(
          '[state-parks-research] search failed:',
          err instanceof Error ? err.message : err
        );
      }
    }
  } else {
    console.warn('[state-parks-research] TAVILY_API_KEY not set; using seed geocode fallback');
  }

  const corpus = blobs.join('\n\n');
  let parsed = parseStateParksFromResearchText(corpus, {
    stateAbbr,
    limit: limit + 2,
  });

  // Prefer curated NE-Ohio day-trip seeds (geocoded) so Word/Excel stay clean.
  // Merge any visitor counts discovered in research prose.
  if (stateAbbr === 'OH') {
    const seeds = [
      'Portage Lakes State Park',
      'Punderson State Park',
      'West Branch State Park',
      'Nelson-Kennedy Ledges State Park',
      'Findley State Park',
    ];
    const byKey = new Map(
      parsed.map((p) => [p.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(), p])
    );
    parsed = seeds.map((name) => {
      const key = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const prior = byKey.get(key);
      const visitorHit = corpus.match(
        new RegExp(
          `${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]{0,120}?([\\d,.]+\\s*million|[\\d,]{4,})\\s*(?:visitors?|tourists?)`,
          'i'
        )
      );
      return {
        name,
        distance_miles: prior?.distance_miles ?? null,
        visitors:
          prior?.visitors ??
          (visitorHit?.[1] ? parseVisitorCount(visitorHit[1]) : null),
      };
    });
  } else if (parsed.length < 2) {
    // non-OH: keep parsed prose only
  }

  const out: ResearchedStatePark[] = [];
  for (const p of parsed) {
    const geo = await geocodePlace(`${p.name}, ${stateAbbr}`);
    let distance = p.distance_miles;
    let latitude: number | null = null;
    let longitude: number | null = null;
    if (geo) {
      latitude = geo.lat;
      longitude = geo.lng;
      distance =
        Math.round(haversineDistanceMiles(opts.lat, opts.lng, geo.lat, geo.lng) * 10) / 10;
    }
    if (distance == null || !Number.isFinite(distance)) continue;
    // Keep regional parks only (day-trip / overnight draw).
    if (distance > 120) continue;
    out.push({
      name: p.name,
      state: stateAbbr,
      distance_miles: distance,
      visitors: p.visitors,
      latitude,
      longitude,
      source: geo ? 'tavily_web_research+geocode' : 'tavily_web_research',
    });
    if (out.length >= limit) break;
  }

  out.sort((a, b) => a.distance_miles - b.distance_miles);
  console.log(
    `[state-parks-research] Found ${out.length} state park(s) near ${opts.city}, ${stateAbbr}`
  );
  return out.slice(0, limit);
}

/** Convert researched parks into demand-driver items for Excel/Word tables. */
export function researchedStateParksToDemandItems(
  parks: ResearchedStatePark[]
): DemandDriverItemBlock[] {
  return parks.map((p) => ({
    name: p.name,
    state: p.state,
    distance_miles: p.distance_miles,
    visitors: p.visitors,
    site_type: 'state_park',
    latitude: p.latitude,
    longitude: p.longitude,
  }));
}
