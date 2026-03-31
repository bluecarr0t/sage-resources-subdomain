/**
 * Basic SSRF guard before server-side HTTP fetch/scrape (Firecrawl, etc.).
 * Blocks non-http(s), localhost, and obvious private / link-local / IPv6 special addresses.
 */

function isIpv4PrivateOrSpecial(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const oct = m.slice(1, 5).map((x) => Number(x));
  if (oct.some((n) => n > 255)) return true;
  const [a, b] = oct;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

/** Strip brackets from URL hostname like `[2001:db8::1]`. */
function ipv6LiteralHost(hostname: string): string | null {
  const h = hostname.trim();
  if (h.startsWith('[') && h.endsWith(']')) return h.slice(1, -1).toLowerCase();
  if (h.includes(':')) return h.toLowerCase();
  return null;
}

/**
 * Block IPv6 loopback, link-local (fe80::/10), ULA (fc00::/7), and IPv4-mapped private.
 */
function isIpv6LocalOrSpecial(hostForUrl: string): boolean {
  const literal = ipv6LiteralHost(hostForUrl);
  if (!literal) return false;

  if (literal === '::1' || literal === '0:0:0:0:0:0:0:1') return true;

  let ipv4FromMapped: string | null = null;
  const decMapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(literal);
  if (decMapped) ipv4FromMapped = decMapped[1];
  else {
    const hexPair = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(literal);
    if (hexPair) {
      const hi = parseInt(hexPair[1], 16);
      const lo = parseInt(hexPair[2], 16);
      if (Number.isFinite(hi) && Number.isFinite(lo)) {
        const word32 = ((hi & 0xffff) << 16) | (lo & 0xffff);
        const a = (word32 >>> 24) & 0xff;
        const b = (word32 >>> 16) & 0xff;
        const c = (word32 >>> 8) & 0xff;
        const d = word32 & 0xff;
        ipv4FromMapped = `${a}.${b}.${c}.${d}`;
      }
    }
  }
  if (ipv4FromMapped && isIpv4PrivateOrSpecial(ipv4FromMapped)) return true;

  const first = literal.split('::')[0] || literal;
  const hextets = first.split(':').filter(Boolean);
  const h0 = hextets[0];
  if (!h0) return false;

  const n = parseInt(h0, 16);
  if (!Number.isFinite(n)) return false;

  // fe80::/10 — link-local
  if (n >= 0xfe80 && n <= 0xfebf) return true;
  // fc00::/7 — unique local (fc00:: to fdff:ffff:...)
  if (n >= 0xfc00 && n <= 0xfdff) return true;
  // ::ffff:0:0/96 etc. already handled; loopback ::1 handled

  return false;
}

export function isUrlSafeForServerScrape(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '[::1]' || host.endsWith('.localhost')) return false;
    if (host === '127.0.0.1' || host === '0.0.0.0') return false;
    if (isIpv4PrivateOrSpecial(host)) return false;
    if (host.endsWith('.internal') || host.endsWith('.local') || host.endsWith('.corp')) return false;
    if (isIpv6LocalOrSpecial(host)) return false;
    return true;
  } catch {
    return false;
  }
}
