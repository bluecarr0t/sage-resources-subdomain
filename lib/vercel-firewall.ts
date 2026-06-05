/**
 * Programmatic Vercel Firewall IP blocking.
 *
 * Uses the Update Firewall Configuration REST API to insert an IP Blocking rule
 * (the same "IP Blocking" list shown in the Vercel dashboard). Applied across all
 * project domains (`hostname: '*'`).
 *
 * Docs: https://vercel.com/docs/vercel-firewall/firewall-api
 *   PATCH https://api.vercel.com/v1/security/firewall/config?projectId=&teamId=
 *   { action: 'ip.insert', id: null, value: { action, hostname, ip, notes } }
 *
 * Requires env:
 *   VERCEL_FIREWALL_API_TOKEN (or VERCEL_TOKEN) — token with project firewall access
 *   VERCEL_PROJECT_ID
 *   VERCEL_TEAM_ID (required for team-scoped projects)
 */

const FIREWALL_CONFIG_ENDPOINT =
  'https://api.vercel.com/v1/security/firewall/config';

export type VercelFirewallIpAction = 'deny' | 'challenge' | 'log' | 'bypass';

export type BlockIpResult =
  | { ok: true; status: number }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; status: number; error: string };

function getToken(): string | undefined {
  return (
    process.env.VERCEL_FIREWALL_API_TOKEN?.trim() ||
    process.env.VERCEL_TOKEN?.trim() ||
    undefined
  );
}

function getProjectId(): string | undefined {
  return process.env.VERCEL_PROJECT_ID?.trim() || undefined;
}

function getTeamId(): string | undefined {
  return process.env.VERCEL_TEAM_ID?.trim() || undefined;
}

export function isVercelFirewallConfigured(): boolean {
  return Boolean(getToken() && getProjectId());
}

const IPV4_OR_CIDR =
  /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(\/\d{1,2})?$/;
// Loose IPv6 / IPv6-CIDR check — Vercel does the authoritative validation.
const IPV6_LOOSE = /^[0-9a-fA-F:]+(\/\d{1,3})?$/;

/** Accept a single IPv4/IPv6 address or CIDR range. */
export function isValidIpOrCidr(value: string): boolean {
  const v = value.trim();
  if (!v) return false;

  if (IPV4_OR_CIDR.test(v)) {
    const [addr, cidr] = v.split('/');
    const octets = addr.split('.').map(Number);
    if (octets.some((o) => o < 0 || o > 255)) return false;
    if (cidr !== undefined) {
      const bits = Number(cidr);
      if (bits < 0 || bits > 32) return false;
    }
    return true;
  }

  if (v.includes(':') && IPV6_LOOSE.test(v)) {
    return true;
  }

  return false;
}

/**
 * Insert an IP Blocking rule on the Vercel Firewall.
 * Returns a structured result; never throws.
 */
export async function blockIpOnVercelFirewall(
  ip: string,
  notes: string,
  action: VercelFirewallIpAction = 'deny'
): Promise<BlockIpResult> {
  const token = getToken();
  const projectId = getProjectId();
  const teamId = getTeamId();

  if (!token || !projectId) {
    return {
      ok: false,
      skipped: true,
      reason:
        'Vercel Firewall not configured (set VERCEL_FIREWALL_API_TOKEN/VERCEL_TOKEN and VERCEL_PROJECT_ID).',
    };
  }

  if (!isValidIpOrCidr(ip)) {
    return { ok: false, skipped: true, reason: `Invalid IP or CIDR: ${ip}` };
  }

  const params = new URLSearchParams({ projectId });
  if (teamId) params.set('teamId', teamId);

  const body = JSON.stringify({
    action: 'ip.insert',
    id: null,
    value: {
      action,
      hostname: '*',
      ip: ip.trim(),
      notes: notes.slice(0, 500),
    },
  });

  try {
    const res = await fetch(`${FIREWALL_CONFIG_ENDPOINT}?${params.toString()}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        skipped: false,
        status: res.status,
        error: text || res.statusText,
      };
    }

    return { ok: true, status: res.status };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      status: 0,
      error: error instanceof Error ? error.message : 'Unknown fetch error',
    };
  }
}
