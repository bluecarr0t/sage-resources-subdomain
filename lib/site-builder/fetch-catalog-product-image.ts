/**
 * Fetch a representative product image from a manufacturer / catalog product page (HTTPS only).
 * Used by Site Builder image generation when a CCE catalog unit has unit_link.
 */

const MAX_PAGE_BYTES = 2_000_000;
const MAX_IMAGE_BYTES = 8_000_000;
const FETCH_TIMEOUT_MS = 20_000;

function execAllMatches(re: RegExp, html: string, group: number): string[] {
  const out: string[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[group]) out.push(m[group]);
  }
  return out;
}

/**
 * Collect Open Graph / Twitter image URLs from HTML (order preserved, de-duplicated).
 * Exported for unit tests.
 */
export function extractProductImageUrlsFromHtml(html: string, pageUrl: string): string[] {
  const seen = new Set<string>();
  const add = (raw: string | undefined) => {
    if (!raw?.trim()) return;
    try {
      const abs = new URL(raw.replace(/&amp;/g, '&').trim(), pageUrl).href;
      if (!seen.has(abs)) seen.add(abs);
    } catch {
      /* ignore bad URLs */
    }
  };

  const props = ['og:image', 'og:image:url', 'og:image:secure_url'];
  for (const prop of props) {
    const esc = prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const raw of execAllMatches(
      new RegExp(
        `<meta[^>]+property=["']${esc}["'][^>]*content=["']([^"']+)["']`,
        'gi'
      ),
      html,
      1
    )) {
      add(raw);
    }
    for (const raw of execAllMatches(
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]*property=["']${esc}["']`,
        'gi'
      ),
      html,
      1
    )) {
      add(raw);
    }
  }

  for (const raw of execAllMatches(
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/gi,
    html,
    1
  )) {
    add(raw);
  }
  for (const raw of execAllMatches(
    /<meta[^>]+content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/gi,
    html,
    1
  )) {
    add(raw);
  }

  return [...seen];
}

/** Basic SSRF mitigation for server-side fetch (admin route only). */
export function isHttpsUrlSafeForServerFetch(urlString: string): boolean {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '[::1]' ||
    host.endsWith('.local') ||
    host === 'metadata.google.internal'
  ) {
    return false;
  }
  if (host === '169.254.169.254' || host.startsWith('169.254.')) return false;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 10) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 127) return false;
    if (a === 0) return false;
  }
  return true;
}

const UA =
  'Mozilla/5.0 (compatible; SageResourcesSiteBuilder/1.0; +https://sageoutdooradvisory.com) AppleWebKit/537.36';

/**
 * Loads the product page, reads og:image / twitter:image, downloads the first usable raster image.
 */
export async function fetchCatalogProductImageFromPageUrl(
  pageUrl: string
): Promise<{ base64: string; mediaType: string } | null> {
  if (!isHttpsUrlSafeForServerFetch(pageUrl)) return null;

  const pageRes = await fetch(pageUrl, {
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      'User-Agent': UA,
    },
  });
  if (!pageRes.ok) return null;

  const buf = await pageRes.arrayBuffer();
  if (buf.byteLength > MAX_PAGE_BYTES) return null;

  const html = new TextDecoder('utf-8').decode(buf);
  const baseForRelative = pageRes.url || pageUrl;
  const candidates = extractProductImageUrlsFromHtml(html, baseForRelative);

  for (const imgUrl of candidates) {
    if (!isHttpsUrlSafeForServerFetch(imgUrl)) continue;
    try {
      const imgRes = await fetch(imgUrl, {
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'User-Agent': UA,
          Referer: baseForRelative,
        },
      });
      if (!imgRes.ok) continue;
      const imgType = (imgRes.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
      if (!imgType.startsWith('image/')) continue;
      if (imgType.includes('svg')) continue;
      const imgBuf = await imgRes.arrayBuffer();
      if (imgBuf.byteLength > MAX_IMAGE_BYTES || imgBuf.byteLength < 400) continue;
      return {
        base64: Buffer.from(imgBuf).toString('base64'),
        mediaType: imgType || 'image/jpeg',
      };
    } catch {
      continue;
    }
  }
  return null;
}
