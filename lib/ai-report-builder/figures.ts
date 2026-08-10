/**
 * Figure helpers for report assembly: static maps (Google + OSM fallback),
 * WeatherSpark image fetch, and demand-driver prompt formatting.
 */

import * as https from 'https';
import * as http from 'http';
import sharp from 'sharp';
import type { DemandDriversBlock } from './types';

export type StaticMapOptions = {
  /** Google Maps zoom (regional ≈ 9, local ≈ 13) */
  zoom?: number;
  /** Width x height in pixels (max 640 without premium) */
  size?: string;
  /** Retina scale 1 or 2 */
  scale?: 1 | 2;
  maptype?: 'roadmap' | 'terrain' | 'satellite' | 'hybrid';
  /** Marker fill color (hex without # or named color) */
  markerColor?: string;
  /** Single-character marker label (Google Static Maps limit) */
  markerLabel?: string;
  apiKey?: string | null;
};

export type AreaMapKind = 'regional' | 'local';

export interface FetchedImageBuffer {
  url: string;
  buffer: Buffer;
  ext: 'png' | 'jpg' | 'webp';
  /** Which provider produced the image (for captions / diagnostics) */
  provider?: 'google' | 'osm' | 'yandex';
}

function resolveMapsApiKey(apiKey?: string | null): string {
  return (
    apiKey?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    ''
  );
}

export function buildStaticMapUrl(
  lat: number,
  lng: number,
  apiKeyOrOpts?: string | null | StaticMapOptions
): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const opts: StaticMapOptions =
    typeof apiKeyOrOpts === 'string' || apiKeyOrOpts == null
      ? { apiKey: apiKeyOrOpts }
      : apiKeyOrOpts;

  const key = resolveMapsApiKey(opts.apiKey);
  if (!key) {
    console.warn('[figures] Google Maps API key missing; skipping static map URL');
    return null;
  }

  const zoom = opts.zoom ?? 12;
  const size = opts.size ?? '640x400';
  const scale = opts.scale ?? 2;
  const maptype = opts.maptype ?? 'roadmap';
  const rawColor = (opts.markerColor ?? 'red').replace(/^#/, '').replace(/^0x/i, '');
  const named = rawColor.toLowerCase();
  const colorToken =
    named === 'red' || named === 'blue' || named === 'green'
      ? `color:${named}`
      : `color:0x${rawColor}`;
  const label = opts.markerLabel?.trim().slice(0, 1).toUpperCase() || '';
  const marker = label
    ? `${colorToken}|label:${label}|${lat},${lng}`
    : `${colorToken}|${lat},${lng}`;

  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(zoom),
    size,
    scale: String(scale),
    maptype,
    markers: marker,
    key,
  });

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

/** Regional / state-scale map with Subject marker (completed-study style). */
export function buildStateAreaMapUrl(
  lat: number,
  lng: number,
  apiKey?: string | null
): string | null {
  return buildStaticMapUrl(lat, lng, {
    zoom: 9,
    size: '640x640',
    scale: 2,
    maptype: 'roadmap',
    markerColor: 'red',
    markerLabel: 'S',
    apiKey,
  });
}

/** Local-area map with Subject marker. */
export function buildLocalAreaMapUrl(
  lat: number,
  lng: number,
  apiKey?: string | null
): string | null {
  return buildStaticMapUrl(lat, lng, {
    zoom: 13,
    size: '640x480',
    scale: 2,
    maptype: 'roadmap',
    markerColor: 'red',
    markerLabel: 'S',
    apiKey,
  });
}

export type ProximityMapMarker = {
  lat: number;
  lng: number;
  /** Single-character Google Static Maps label (A–Z / 0–9). */
  label?: string;
  /** Marker color (named or hex without #). */
  color?: string;
};

/**
 * Multi-marker Google Static Map. Omitting center/zoom lets Google auto-fit
 * the viewport to the marker set (Subject + numbered parks).
 */
export function buildProximityStaticMapUrl(
  markers: ProximityMapMarker[],
  opts?: {
    size?: string;
    scale?: 1 | 2;
    maptype?: 'roadmap' | 'terrain' | 'satellite' | 'hybrid';
    apiKey?: string | null;
  }
): string | null {
  const usable = markers.filter(
    (m) => Number.isFinite(m.lat) && Number.isFinite(m.lng)
  );
  if (usable.length === 0) return null;

  const key = resolveMapsApiKey(opts?.apiKey);
  if (!key) {
    console.warn('[figures] Google Maps API key missing; skipping proximity map URL');
    return null;
  }

  const size = opts?.size ?? '640x480';
  const scale = opts?.scale ?? 2;
  const maptype = opts?.maptype ?? 'hybrid';

  const params = new URLSearchParams({
    size,
    scale: String(scale),
    maptype,
    key,
  });

  for (const m of usable.slice(0, 8)) {
    const rawColor = (m.color ?? 'blue').replace(/^#/, '').replace(/^0x/i, '');
    const named = rawColor.toLowerCase();
    const colorToken =
      named === 'red' || named === 'blue' || named === 'green'
        ? `color:${named}`
        : `color:0x${rawColor}`;
    const label = m.label?.trim().slice(0, 1).toUpperCase() || '';
    const marker = label
      ? `${colorToken}|label:${label}|${m.lat},${m.lng}`
      : `${colorToken}|${m.lat},${m.lng}`;
    params.append('markers', marker);
  }

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

/** Subject (S) + closest national / state parks (1…n) for Demand Indicators. */
export function buildParksProximityMapUrl(
  subjectLat: number,
  subjectLng: number,
  parks: Array<{ latitude?: number | null; longitude?: number | null }>,
  opts?: {
    size?: string;
    scale?: 1 | 2;
    maptype?: 'roadmap' | 'terrain' | 'satellite' | 'hybrid';
    apiKey?: string | null;
  }
): string | null {
  if (!Number.isFinite(subjectLat) || !Number.isFinite(subjectLng)) return null;
  const markers: ProximityMapMarker[] = [
    { lat: subjectLat, lng: subjectLng, label: 'S', color: 'blue' },
  ];
  let n = 1;
  for (const p of parks) {
    if (p.latitude == null || p.longitude == null) continue;
    if (!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) continue;
    markers.push({
      lat: p.latitude,
      lng: p.longitude,
      label: String(n),
      color: 'blue',
    });
    n += 1;
    if (n > 6) break;
  }
  return buildProximityStaticMapUrl(markers, opts);
}

export async function fetchParksProximityMapImage(
  subjectLat: number,
  subjectLng: number,
  parks: Array<{ latitude?: number | null; longitude?: number | null }>
): Promise<FetchedImageBuffer | null> {
  const url = buildParksProximityMapUrl(subjectLat, subjectLng, parks, {
    size: '640x480',
    scale: 2,
    maptype: 'hybrid',
  });
  const google = await fetchStaticMapImage(url);
  if (google) return google;

  // Soft fallback: subject-centered OSM mosaic when Static Maps is unavailable.
  console.warn(
    '[figures] Google Static Maps unavailable for parks proximity map; OSM subject fallback'
  );
  return renderOsmStaticMap(subjectLat, subjectLng, {
    zoom: parks.length > 0 ? 9 : 11,
    width: 640,
    height: 480,
  });
}

/**
 * Drive-time map: major city → subject with optional encoded Directions polyline.
 * Markers: C = city origin, S = subject.
 */
export function buildDriveTimeRouteMapUrl(
  cityLat: number,
  cityLng: number,
  subjectLat: number,
  subjectLng: number,
  opts?: {
    encodedPolyline?: string | null;
    size?: string;
    scale?: 1 | 2;
    maptype?: 'roadmap' | 'terrain' | 'satellite' | 'hybrid';
    apiKey?: string | null;
  }
): string | null {
  if (
    !Number.isFinite(cityLat) ||
    !Number.isFinite(cityLng) ||
    !Number.isFinite(subjectLat) ||
    !Number.isFinite(subjectLng)
  ) {
    return null;
  }

  const key = resolveMapsApiKey(opts?.apiKey);
  if (!key) {
    console.warn('[figures] Google Maps API key missing; skipping drive-time map URL');
    return null;
  }

  const size = opts?.size ?? '640x480';
  const scale = opts?.scale ?? 2;
  const maptype = opts?.maptype ?? 'roadmap';

  const params = new URLSearchParams({
    size,
    scale: String(scale),
    maptype,
    key,
  });
  params.append('markers', `color:blue|label:C|${cityLat},${cityLng}`);
  params.append('markers', `color:red|label:S|${subjectLat},${subjectLng}`);

  const poly = opts?.encodedPolyline?.trim();
  if (poly) {
    // Static Maps path encoding — keep under URL length limits.
    const path = `color:0x1565C0FF|weight:5|enc:${poly}`;
    if (path.length < 1800) {
      params.append('path', path);
    }
  }

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

export async function fetchDriveTimeRouteMapImage(
  cityLat: number,
  cityLng: number,
  subjectLat: number,
  subjectLng: number,
  encodedPolyline?: string | null
): Promise<FetchedImageBuffer | null> {
  const url = buildDriveTimeRouteMapUrl(cityLat, cityLng, subjectLat, subjectLng, {
    encodedPolyline,
    size: '640x480',
    scale: 2,
    maptype: 'roadmap',
  });
  const google = await fetchStaticMapImage(url);
  if (google) return google;

  console.warn(
    '[figures] Google Static Maps unavailable for drive-time route; OSM subject fallback'
  );
  return renderOsmStaticMap(subjectLat, subjectLng, {
    zoom: 10,
    width: 640,
    height: 480,
  });
}

/**
 * Fetch a Google Static Maps image buffer. Soft-fails (returns null).
 */
export async function fetchStaticMapImage(
  url: string | null | undefined
): Promise<FetchedImageBuffer | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(
        `[figures] Static map fetch failed: HTTP ${res.status}${body ? ` — ${body.slice(0, 160)}` : ''}`
      );
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500 || buf.length > 5 * 1024 * 1024) return null;
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('image') && buf[0] !== 0x89 && buf[0] !== 0xff) {
      console.warn('[figures] Static map response was not an image');
      return null;
    }
    const ext: FetchedImageBuffer['ext'] =
      ct.includes('jpeg') || ct.includes('jpg')
        ? 'jpg'
        : ct.includes('webp')
          ? 'webp'
          : 'png';
    return { url, buffer: buf, ext, provider: 'google' };
  } catch (err) {
    console.warn(
      '[figures] Static map fetch error:',
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

function httpGetBuffer(
  url: string,
  headers: Record<string, string>,
  timeoutMs = 12_000
): Promise<{ status: number; buffer: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('http://') ? http : https;
    const req = lib.get(url, { headers, timeout: timeoutMs }, (res) => {
      const status = res.statusCode ?? 0;
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on('end', () => {
        resolve({
          status,
          buffer: Buffer.concat(chunks),
          contentType: String(res.headers['content-type'] ?? ''),
        });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`HTTP timeout after ${timeoutMs}ms`));
    });
  });
}

/** Web-Mercator tile fractional coordinates. */
export function latLngToTileXY(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = 2 ** zoom;
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

function subjectCalloutSvg(width: number, height: number): Buffer {
  const cx = Math.round(width / 2);
  const cy = Math.round(height / 2);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <!-- pin -->
  <path d="M${cx} ${cy + 18} C${cx} ${cy + 18} ${cx - 14} ${cy - 2} ${cx - 14} ${cy - 18}
    a14 14 0 1 1 28 0 C${cx + 14} ${cy - 2} ${cx} ${cy + 18} ${cx} ${cy + 18} Z"
    fill="#E53935" stroke="#B71C1C" stroke-width="1.5"/>
  <circle cx="${cx}" cy="${cy - 18}" r="5.5" fill="#FFFFFF"/>
  <!-- Subject callout -->
  <rect x="${cx + 16}" y="${cy - 52}" width="92" height="28" rx="6" ry="6"
    fill="#1565C0" stroke="#0D47A1" stroke-width="1"/>
  <polygon points="${cx + 16},${cy - 36} ${cx + 8},${cy - 28} ${cx + 16},${cy - 30}" fill="#1565C0"/>
  <text x="${cx + 62}" y="${cy - 33}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
    font-size="14" font-weight="700" fill="#FFFFFF">Subject</text>
</svg>`;
  return Buffer.from(svg);
}

/**
 * Build a static map by mosaicking OpenStreetMap raster tiles and overlaying
 * a Subject callout. Used when Google Static Maps is unavailable (403 / not enabled).
 */
export async function renderOsmStaticMap(
  lat: number,
  lng: number,
  opts: { zoom: number; width: number; height: number }
): Promise<FetchedImageBuffer | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const { zoom, width, height } = opts;
  const tileSize = 256;
  const { x: centerTileX, y: centerTileY } = latLngToTileXY(lat, lng, zoom);
  const centerPxX = centerTileX * tileSize;
  const centerPxY = centerTileY * tileSize;
  const leftPx = centerPxX - width / 2;
  const topPx = centerPxY - height / 2;
  const x0 = Math.floor(leftPx / tileSize);
  const y0 = Math.floor(topPx / tileSize);
  const x1 = Math.floor((leftPx + width - 1) / tileSize);
  const y1 = Math.floor((topPx + height - 1) / tileSize);
  const nTiles = 2 ** zoom;

  const tiles: Array<{ tx: number; ty: number; buf: Buffer }> = [];
  const ua =
    'SageOutdoorAdvisoryReportBuilder/1.0 (feasibility-study area maps; https://sageoutdooradvisory.com)';

  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const wrappedX = ((tx % nTiles) + nTiles) % nTiles;
      if (ty < 0 || ty >= nTiles) continue;
      const tileUrl = `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${ty}.png`;
      try {
        const res = await httpGetBuffer(tileUrl, {
          'User-Agent': ua,
          Accept: 'image/png',
        });
        if (res.status < 200 || res.status >= 300) {
          console.warn(`[figures] OSM tile HTTP ${res.status} for ${tileUrl}`);
          continue;
        }
        if (res.buffer.length < 100) continue;
        tiles.push({ tx, ty, buf: res.buffer });
      } catch (err) {
        console.warn(
          '[figures] OSM tile fetch error:',
          err instanceof Error ? err.message : err
        );
      }
    }
  }

  if (tiles.length === 0) return null;

  const mosaicW = (x1 - x0 + 1) * tileSize;
  const mosaicH = (y1 - y0 + 1) * tileSize;
  const composites: sharp.OverlayOptions[] = [];
  for (const t of tiles) {
    composites.push({
      input: t.buf,
      left: (t.tx - x0) * tileSize,
      top: (t.ty - y0) * tileSize,
    });
  }

  try {
    const mosaic = await sharp({
      create: {
        width: mosaicW,
        height: mosaicH,
        channels: 3,
        background: { r: 230, g: 230, b: 230 },
      },
    })
      .composite(composites)
      .png()
      .toBuffer();

    const cropLeft = Math.max(0, Math.round(leftPx - x0 * tileSize));
    const cropTop = Math.max(0, Math.round(topPx - y0 * tileSize));
    const cropped = await sharp(mosaic)
      .extract({
        left: cropLeft,
        top: cropTop,
        width: Math.min(width, mosaicW - cropLeft),
        height: Math.min(height, mosaicH - cropTop),
      })
      .resize(width, height, { fit: 'cover' })
      .png()
      .toBuffer();

    const withMarker = await sharp(cropped)
      .composite([{ input: subjectCalloutSvg(width, height), top: 0, left: 0 }])
      .png()
      .toBuffer();

    return {
      url: `osm://z${zoom}/${lat.toFixed(5)},${lng.toFixed(5)}`,
      buffer: withMarker,
      ext: 'png',
      provider: 'osm',
    };
  } catch (err) {
    console.warn(
      '[figures] OSM mosaic render failed:',
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/**
 * Prefer Google Static Maps; fall back to OSM tile mosaic with Subject callout
 * when Google rejects the request (e.g. Static Maps API not activated → 403).
 */
export async function fetchAreaMapImage(
  lat: number,
  lng: number,
  kind: AreaMapKind
): Promise<FetchedImageBuffer | null> {
  const googleUrl =
    kind === 'regional' ? buildStateAreaMapUrl(lat, lng) : buildLocalAreaMapUrl(lat, lng);
  const google = await fetchStaticMapImage(googleUrl);
  if (google) return google;

  const dims =
    kind === 'regional'
      ? { zoom: 9, width: 640, height: 640 }
      : { zoom: 13, width: 640, height: 480 };
  console.warn(
    `[figures] Google Static Maps unavailable; rendering OSM ${kind} map fallback`
  );
  return renderOsmStaticMap(lat, lng, dims);
}

/**
 * Fetch up to 4 image buffers from URLs (WeatherSpark charts, etc.).
 * Soft-fails individual URLs; never throws.
 */
export async function fetchWeatherSparkImages(
  urls: string[]
): Promise<FetchedImageBuffer[]> {
  const selected = urls.filter(Boolean).slice(0, 4);
  const out: FetchedImageBuffer[] = [];

  for (const url of selected) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 500 || buf.length > 5 * 1024 * 1024) continue;
      const ct = res.headers.get('content-type') ?? '';
      const ext: FetchedImageBuffer['ext'] = ct.includes('png')
        ? 'png'
        : ct.includes('webp')
          ? 'webp'
          : 'jpg';
      out.push({ url, buffer: buf, ext });
    } catch {
      // soft-fail
    }
  }

  return out;
}

/**
 * Prefer temperature + tourism-score chart URLs when WeatherSpark extract
 * returns mixed assets (logos, ads, etc.).
 */
export function prioritizeWeatherSparkChartUrls(urls: string[]): string[] {
  const scored = urls.map((url, index) => {
    const u = url.toLowerCase();
    let score = 0;
    if (/temp|temperature|high.?low/i.test(u)) score += 10;
    if (/tourism|tourist/i.test(u)) score += 9;
    if (/precip|rain|snow/i.test(u)) score += 5;
    if (/comfort|humidity|cloud/i.test(u)) score += 4;
    if (/weatherspark|cloudfront|amazonaws/.test(u)) score += 2;
    if (/logo|favicon|avatar|spinner|thumbnail|ad[s]?[./]/.test(u)) score -= 20;
    return { url, score, index };
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.filter((s) => s.score > 0).map((s) => s.url);
}

/** Compact parks / outdoor visitation-style string for LLM prompts. */
export function formatParksVisitationForPrompt(
  demandDrivers: DemandDriversBlock | null | undefined
): string {
  if (!demandDrivers) return '';
  const lines: string[] = ['Parks / outdoor demand drivers:'];
  const push = (
    label: string,
    block: {
      count: number;
      top_names: string[];
      items?: Array<{
        name: string;
        distance_miles: number;
        visitors: number | null;
      }>;
      radius_miles: number;
    }
  ) => {
    if (block.items?.length) {
      const detail = block.items
        .slice(0, 5)
        .map((i) => {
          const v =
            i.visitors != null
              ? `${Math.round(i.visitors).toLocaleString()} visitors`
              : 'visitors n/a';
          return `${i.name} (${i.distance_miles} mi, ${v})`;
        })
        .join('; ');
      lines.push(`  ${label} (${block.radius_miles} mi): ${block.count} — ${detail}`);
    } else {
      lines.push(
        `  ${label} (${block.radius_miles} mi): ${block.count} — ${block.top_names.join('; ') || 'none listed'}`
      );
    }
  };
  push('National parks', demandDrivers.national_parks);
  push('Major outdoor sites', demandDrivers.major_outdoor_sites);
  push('Ski resorts', demandDrivers.ski_resorts);
  push('Wineries', demandDrivers.wineries);
  push('Major cities', demandDrivers.major_cities);
  lines.push(`  Source: ${demandDrivers.source}; fetched ${demandDrivers.fetched_at}`);
  return lines.join('\n');
}
