function resolveAppOrigin(): string | null {
  const site = process.env.SITE_URL?.trim().replace(/\/$/, '');
  if (site) return site;
  const pub = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (pub) return pub;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '')}`;
  return null;
}

export type RevalidateGlampingOverviewNextCacheRemoteResult = {
  ok: boolean;
  skipped?: boolean;
  status?: number;
  error?: string;
};

export async function revalidateGlampingIndustryOverviewNextCacheRemote(): Promise<RevalidateGlampingOverviewNextCacheRemoteResult> {
  const secret = process.env.GLAMPING_INDUSTRY_OVERVIEW_REFRESH_SECRET?.trim();
  if (!secret) {
    return {
      ok: false,
      skipped: true,
      error: 'GLAMPING_INDUSTRY_OVERVIEW_REFRESH_SECRET is not set; Next.js tag was not invalidated',
    };
  }

  const origin = resolveAppOrigin();
  if (!origin) {
    return {
      ok: false,
      skipped: true,
      error: 'SITE_URL, NEXT_PUBLIC_SITE_URL, or VERCEL_URL is required to invalidate Next.js cache',
    };
  }

  const url = `${origin}/api/admin/glamping-industry-overview/invalidate-next-cache`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        ok: false,
        status: res.status,
        error: body.slice(0, 500) || `HTTP ${res.status}`,
      };
    }

    return { ok: true, status: res.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
