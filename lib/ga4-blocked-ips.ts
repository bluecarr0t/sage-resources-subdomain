/**
 * Block listed client IPs from sending Sage GA4 hits.
 * Default includes Nick's office/home IP so local browsing does not inflate reports.
 *
 * Extra IPs: comma-separated `GA4_BLOCKED_IPS` (server-only).
 */

const DEFAULT_BLOCKED_IPS = ['47.151.154.219'] as const;

export function normalizeClientIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const first = raw.split(',')[0]?.trim() ?? '';
  if (!first) return null;

  let ip = first;
  if (ip.startsWith('::ffff:')) {
    ip = ip.slice('::ffff:'.length);
  }
  if (ip.startsWith('[') && ip.includes(']')) {
    ip = ip.slice(1, ip.indexOf(']'));
  } else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.replace(/:\d+$/, '');
  }
  return ip || null;
}

export function clientIpFromHeaders(headers: {
  get(name: string): string | null;
}): string | null {
  return (
    normalizeClientIp(headers.get('x-real-ip')) ??
    normalizeClientIp(headers.get('x-vercel-forwarded-for')) ??
    normalizeClientIp(headers.get('x-forwarded-for'))
  );
}

export function parseGa4BlockedIps(
  extra = process.env.GA4_BLOCKED_IPS
): Set<string> {
  const values: string[] = [...DEFAULT_BLOCKED_IPS];
  if (extra) {
    for (const part of extra.split(',')) {
      const ip = normalizeClientIp(part);
      if (ip) values.push(ip);
    }
  }
  return new Set(values);
}

export function isGa4BlockedClientIp(ip: string | null | undefined): boolean {
  const normalized = normalizeClientIp(ip);
  if (!normalized) return false;
  return parseGa4BlockedIps().has(normalized);
}
