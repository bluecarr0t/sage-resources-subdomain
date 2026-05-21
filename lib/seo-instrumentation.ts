/**
 * Server-side checks for SEO Phase 0 instrumentation (env + live endpoints).
 * Never returns secret values—only configured / ok flags.
 */

import fs from 'fs';
import path from 'path';

export const SEO_SITE_URL =
  process.env.SITE_URL?.replace(/\/$/, '') ||
  'https://resources.sageoutdooradvisory.com';

export type EnvCheck = {
  name: string;
  configured: boolean;
  required: boolean;
  notes?: string;
};

export type HttpCheck = {
  name: string;
  url: string;
  ok: boolean;
  status?: number;
  detail?: string;
};

export type SitemapChildCount = {
  loc: string;
  urlCount: number;
};

export type SeoInstrumentationReport = {
  checkedAt: string;
  siteUrl: string;
  env: EnvCheck[];
  http: HttpCheck[];
  sitemap: {
    indexOk: boolean;
    totalUrls: number;
    children: SitemapChildCount[];
  };
  indexNow: {
    keyConfigured: boolean;
    keyFileOk: boolean;
    keyFileUrl?: string;
  };
  googleSearchConsole: {
    htmlFilePresent: boolean;
    metaTagConfigured: boolean;
  };
  ga4: {
    measurementIdConfigured: boolean;
  };
  ready: boolean;
  blockers: string[];
};

export function getEnvChecks(): EnvCheck[] {
  const indexNowKey = process.env.INDEXNOW_KEY?.trim();
  return [
    {
      name: 'NEXT_PUBLIC_GA_MEASUREMENT_ID',
      configured: Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()),
      required: true,
      notes: 'GA4 property for resources subdomain',
    },
    {
      name: 'NEXT_PUBLIC_GOOGLE_VERIFICATION_CODE',
      configured: Boolean(process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION_CODE?.trim()),
      required: false,
      notes: 'HTML tag in layout, or use public/google*.html for GSC',
    },
    {
      name: 'INDEXNOW_KEY',
      configured: Boolean(indexNowKey),
      required: true,
      notes: 'Bing/Yandex; prebuild writes public/{key}.txt',
    },
    {
      name: 'CRON_SECRET',
      configured: Boolean(process.env.CRON_SECRET?.trim()),
      required: false,
      notes: 'Recommended when IndexNow cron is enabled in vercel.json',
    },
    {
      name: 'SITE_URL',
      configured: Boolean(process.env.SITE_URL?.trim()),
      required: false,
      notes: 'Defaults to https://resources.sageoutdooradvisory.com',
    },
  ];
}

function extractLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

export async function fetchSitemapBreakdown(baseUrl: string): Promise<{
  indexOk: boolean;
  totalUrls: number;
  children: SitemapChildCount[];
}> {
  const indexUrl = `${baseUrl}/sitemap.xml`;
  const indexRes = await fetch(indexUrl, { next: { revalidate: 0 } });
  if (!indexRes.ok) {
    return { indexOk: false, totalUrls: 0, children: [] };
  }

  const indexText = await indexRes.text();
  const childLocs = extractLocs(indexText).filter((loc) => loc.endsWith('.xml'));
  const children: SitemapChildCount[] = [];
  let totalUrls = 0;

  for (const loc of childLocs) {
    const subRes = await fetch(loc, { next: { revalidate: 0 } });
    if (!subRes.ok) {
      children.push({ loc, urlCount: 0 });
      continue;
    }
    const subText = await subRes.text();
    const count = extractLocs(subText).length;
    children.push({ loc, urlCount: count });
    totalUrls += count;
  }

  return { indexOk: true, totalUrls, children };
}

export async function runHttpChecks(baseUrl: string): Promise<HttpCheck[]> {
  const checks: Array<{ name: string; path: string; expectIncludes?: string }> = [
    { name: 'sitemap_index', path: '/sitemap.xml', expectIncludes: '<sitemapindex' },
    { name: 'robots_txt', path: '/robots.txt', expectIncludes: 'Sitemap:' },
    { name: 'llms_txt', path: '/llms.txt', expectIncludes: 'Sage Outdoor Advisory' },
    { name: 'homepage_en', path: '/en', expectIncludes: 'Sage' },
  ];

  const results: HttpCheck[] = [];

  for (const check of checks) {
    const url = `${baseUrl}${check.path}`;
    try {
      const res = await fetch(url, { next: { revalidate: 0 } });
      const text = res.ok ? await res.text() : '';
      const contentOk = check.expectIncludes ? text.includes(check.expectIncludes) : res.ok;
      results.push({
        name: check.name,
        url,
        ok: res.ok && contentOk,
        status: res.status,
        detail: res.ok && !contentOk ? 'Unexpected response body' : undefined,
      });
    } catch (err) {
      results.push({
        name: check.name,
        url,
        ok: false,
        detail: err instanceof Error ? err.message : 'fetch failed',
      });
    }
  }

  return results;
}

export async function checkIndexNowKeyFile(baseUrl: string): Promise<{
  keyConfigured: boolean;
  keyFileOk: boolean;
  keyFileUrl?: string;
}> {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) {
    return { keyConfigured: false, keyFileOk: false };
  }

  const keyFileUrl = `${baseUrl}/${key}.txt`;
  try {
    const res = await fetch(keyFileUrl, { next: { revalidate: 0 } });
    const text = res.ok ? await res.text() : '';
    return {
      keyConfigured: true,
      keyFileOk: res.ok && text.trim() === key,
      keyFileUrl,
    };
  } catch {
    return { keyConfigured: true, keyFileOk: false, keyFileUrl };
  }
}

export function checkGoogleVerificationFiles(): {
  htmlFilePresent: boolean;
  metaTagConfigured: boolean;
} {
  let htmlFilePresent = false;
  try {
    const publicDir = path.join(process.cwd(), 'public');
    htmlFilePresent = fs
      .readdirSync(publicDir)
      .some((f) => f.startsWith('google') && f.endsWith('.html'));
  } catch {
    htmlFilePresent = false;
  }

  return {
    htmlFilePresent,
    metaTagConfigured: Boolean(process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION_CODE?.trim()),
  };
}

export async function buildSeoInstrumentationReport(
  baseUrl: string = SEO_SITE_URL
): Promise<SeoInstrumentationReport> {
  const env = getEnvChecks();
  const [http, sitemap, indexNow, gsc] = await Promise.all([
    runHttpChecks(baseUrl),
    fetchSitemapBreakdown(baseUrl),
    checkIndexNowKeyFile(baseUrl),
    Promise.resolve(checkGoogleVerificationFiles()),
  ]);

  const blockers: string[] = [];

  for (const e of env.filter((x) => x.required && !x.configured)) {
    blockers.push(`Missing env: ${e.name}`);
  }
  if (!gsc.htmlFilePresent && !gsc.metaTagConfigured) {
    blockers.push('GSC: add public/google*.html or NEXT_PUBLIC_GOOGLE_VERIFICATION_CODE');
  }
  if (!http.every((h) => h.ok)) {
    blockers.push('One or more HTTP checks failed');
  }
  if (!sitemap.indexOk || sitemap.totalUrls === 0) {
    blockers.push('Sitemap index empty or unreachable');
  }
  if (indexNow.keyConfigured && !indexNow.keyFileOk) {
    blockers.push('IndexNow key file not reachable at production URL (redeploy after setting INDEXNOW_KEY)');
  }

  return {
    checkedAt: new Date().toISOString(),
    siteUrl: baseUrl,
    env,
    http,
    sitemap,
    indexNow,
    googleSearchConsole: gsc,
    ga4: {
      measurementIdConfigured: Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()),
    },
    ready: blockers.length === 0,
    blockers,
  };
}
