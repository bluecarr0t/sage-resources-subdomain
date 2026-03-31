/**
 * Best-effort lat/lng from scraped HTML / markdown (JSON-LD, meta tags, map embeds).
 */

const LD_JSON_SCRIPT_RE =
  /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function isValidLatLng(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function tryLatLngFromObject(o: Record<string, unknown>): { lat: number; lng: number } | null {
  const latRaw =
    o.latitude ?? o.lat ?? (typeof o.geo === 'object' && o.geo ? (o.geo as Record<string, unknown>).latitude : null);
  const lngRaw =
    o.longitude ??
    o.lng ??
    o.long ??
    (typeof o.geo === 'object' && o.geo ? (o.geo as Record<string, unknown>).longitude : null);
  const lat = toNumber(latRaw);
  const lng = toNumber(lngRaw);
  if (lat != null && lng != null && isValidLatLng(lat, lng)) return { lat, lng };
  return null;
}

function walkJsonLd(node: unknown): { lat: number; lng: number } | null {
  if (node == null) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = walkJsonLd(item);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof node !== 'object') return null;
  const o = node as Record<string, unknown>;
  const t = o['@type'];
  const types = Array.isArray(t) ? t : t != null ? [t] : [];
  const typeStrs = types.map((x) => String(x).toLowerCase());
  const isGeo =
    typeStrs.some((s) => s.includes('geocoordinates')) ||
    (o.latitude != null && o.longitude != null) ||
    (o.lat != null && (o.lng != null || o.long != null));

  if (isGeo) {
    const pair = tryLatLngFromObject(o);
    if (pair) return pair;
  }

  if (o.geo) {
    const g = walkJsonLd(o.geo);
    if (g) return g;
  }
  if (o.location) {
    const loc = walkJsonLd(o.location);
    if (loc) return loc;
  }
  if (o.address && typeof o.address === 'object') {
    const a = walkJsonLd(o.address);
    if (a) return a;
  }

  if (o['@graph']) {
    const g = walkJsonLd(o['@graph']);
    if (g) return g;
  }

  for (const v of Object.values(o)) {
    if (v && typeof v === 'object') {
      const hit = walkJsonLd(v);
      if (hit) return hit;
    }
  }
  return null;
}

function extractFromLdJsonScripts(html: string): { lat: number; lng: number } | null {
  LD_JSON_SCRIPT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LD_JSON_SCRIPT_RE.exec(html)) !== null) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const hit = walkJsonLd(parsed);
      if (hit) return hit;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Google Maps place URLs often contain !3dLAT!4dLNG */
function extractFromMapsBangPattern(text: string): { lat: number; lng: number } | null {
  const m = text.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)\b/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (isValidLatLng(lat, lng)) return { lat, lng };
  return null;
}

/** Loose "latitude"/"longitude" pairs in text (JSON fragments in markdown). */
function extractFromSiblingJsonNumbers(text: string): { lat: number; lng: number } | null {
  const re =
    /["']?latitude["']?\s*:\s*(-?\d+\.?\d*)[\s\S]{0,120}?["']?longitude["']?\s*:\s*(-?\d+\.?\d*)/i;
  const m = text.match(re);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (isValidLatLng(lat, lng)) return { lat, lng };
  return null;
}

function extractFromMetaTags(html: string): { lat: number; lng: number } | null {
  const latM = html.match(
    /(?:property|name)=["'](?:og:latitude|place:location:latitude)["']\s+content=["'](-?\d+\.?\d*)["']/i
  );
  const lngM = html.match(
    /(?:property|name)=["'](?:og:longitude|place:location:longitude)["']\s+content=["'](-?\d+\.?\d*)["']/i
  );
  if (!latM || !lngM) return null;
  const lat = parseFloat(latM[1]);
  const lng = parseFloat(lngM[1]);
  if (isValidLatLng(lat, lng)) return { lat, lng };
  return null;
}

const MAX_HTML_SCAN = 200_000;

/**
 * Try to read coordinates from Firecrawl HTML and/or markdown (and Tavily-style snippets).
 */
export function extractLatLngFromWebContent(html?: string | null, markdown?: string | null): {
  lat: number;
  lng: number;
} | null {
  const h = html?.slice(0, MAX_HTML_SCAN) ?? '';
  const md = markdown ?? '';

  const fromMeta = h ? extractFromMetaTags(h) : null;
  if (fromMeta) return fromMeta;

  const fromLd = h ? extractFromLdJsonScripts(h) : null;
  if (fromLd) return fromLd;

  const combined = `${h}\n${md}`;
  const fromBang = extractFromMapsBangPattern(combined);
  if (fromBang) return fromBang;

  const fromSib = extractFromSiblingJsonNumbers(combined);
  if (fromSib) return fromSib;

  return null;
}
